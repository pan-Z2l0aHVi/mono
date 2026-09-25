// Package watch 维护「库内已登记 file source 所在目录」的监听集合，把内核文件系统
// 事件收敛为实际发生的可用性翻转。
//
// 依赖方向 watch → core → storage，与 ADR-0008 的单向依赖一致：它是 core 之上的编排层，
// 与 service 平级但不是 Wails Service，只由 main.go 装配、由 app.OnShutdown 收尾。
//
// 监听「目录」而不是「文件」是刻意的：文件被删后它自身的 watch 会被 fsnotify 丢弃，
// 只有父目录仍在监听，文件重建才能由目录 diff 合成出事件，自愈才成立。
package watch

import (
	"context"
	"errors"
	"log"
	"os"
	"path/filepath"
	"sync"
	"syscall"
	"time"

	"github.com/fsnotify/fsnotify"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
)

// Emitter 把一次实际发生的可用性翻转交给装配层推送；watch 不感知 Wails 与 DTO。
type Emitter func(change core.AvailabilityChange)

// AvailabilitySink 是监听侧依赖 core 的窄接缝，由 core.SourceService 实现。
type AvailabilitySink interface {
	// ApplyFileAvailability 写入口；返回 nil 表示可用性没有翻转。
	ApplyFileAvailability(ctx context.Context, sourceID string, available bool) (*core.AvailabilityChange, error)
	// ListFileSourceLocations 返回库内全部文件入口位置，监听集合以此为权威真相全量重建。
	ListFileSourceLocations(ctx context.Context) ([]string, error)
	// FileSourceIDsByLocations 按位置反查文件入口，把事件路径解析为受影响 Source。
	FileSourceIDsByLocations(ctx context.Context, locations []string) ([]core.SourceLocationRef, error)
}

// fsEvents 是 fsnotify.Watcher 的最小表面：只暴露本包真正用到的操作，
// 使单测能替换内核事件源而不依赖真实文件系统通知时序。
type fsEvents interface {
	Add(name string) error
	Remove(name string) error
	WatchList() []string
	EventChan() <-chan fsnotify.Event
	ErrorChan() <-chan error
	Close() error
}

// realFSEvents 把 fsnotify.Watcher 的 channel 字段包装成方法，
// 使 fsEvents 保持为接口而不是依赖具体实现。
type realFSEvents struct{ *fsnotify.Watcher }

func (r realFSEvents) EventChan() <-chan fsnotify.Event { return r.Events }
func (r realFSEvents) ErrorChan() <-chan error          { return r.Errors }

// var 仅为测试注入（缩短预算、替换探测判定、塞入假 watcher 验证内核无关的语义）；
// 生产代码不得在运行期改写。
var (
	newFSWatcher       = func() (fsEvents, error) { return newRealFSWatcher() }
	probeFileServable  = core.ProbeFileServable
	probeDebounce      = 300 * time.Millisecond
	reconcileInterval  = 60 * time.Second
	maxWatchedDirs     = 512
	maxWatchedPaths    = 4096
	probeQueueCapacity = 256
	maxProbeBatch      = 64
)

func newRealFSWatcher() (fsEvents, error) {
	fs, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}
	return realFSEvents{fs}, nil
}

// Watcher 维护目录监听集合。
//
// 自身状态只有目录引用计数与 fd 成本估算；路径到 Source 的解析一律回查 DB，
// 不维护易失的内存索引——重复 Source 不去重，内存索引要与 DB 双写才不出错。
type Watcher struct {
	fs   fsEvents
	sink AvailabilitySink
	emit Emitter

	mu       sync.Mutex
	dirRefs  map[string]int // 目录 → 引用它的 file source 数
	dirPaths map[string]int // 目录 → 估算占用的 fd 数（1 + 条目数）
	degraded bool
	warnOnce sync.Once

	pendMu   sync.Mutex
	pending  map[string]*time.Timer // 路径 → trailing debounce 定时器；Stop 置 nil 表示已停
	suspects map[string]bool        // 路径 → 已失败一次，等待第二个窗口确认
	probeQ   chan string
	done     chan struct{}
	stopOnce sync.Once
	wg       sync.WaitGroup
}

func NewWatcher(sink AvailabilitySink, emit Emitter) (*Watcher, error) {
	fs, err := newFSWatcher()
	if err != nil {
		return nil, err
	}
	return &Watcher{
		fs:       fs,
		sink:     sink,
		emit:     emit,
		dirRefs:  map[string]int{},
		dirPaths: map[string]int{},
		pending:  map[string]*time.Timer{},
		suspects: map[string]bool{},
		probeQ:   make(chan string, probeQueueCapacity),
		done:     make(chan struct{}),
	}, nil
}

// Start 先全量对账再启动事件循环、探测 worker 与定期对账。
func (w *Watcher) Start(ctx context.Context) error {
	if err := w.SyncSources(ctx); err != nil {
		return err
	}
	w.wg.Add(3)
	go w.runEvents(ctx)
	go w.runProbes(ctx)
	go w.runReconcile(ctx)
	return nil
}

// SyncSources 以库内已登记的 file source 为权威真相全量对账监听集合：
// 从 DB 读出全部文件入口位置，算出目标目录集，与当前监听列表求差，只对差集增删。
// 幂等，可重复调用。
func (w *Watcher) SyncSources(ctx context.Context) error {
	locations, err := w.sink.ListFileSourceLocations(ctx)
	if err != nil {
		return err
	}

	wanted := make(map[string]int, len(locations))
	for _, location := range locations {
		wanted[filepath.Dir(location)]++
	}

	w.mu.Lock()
	defer w.mu.Unlock()

	// 以 fsnotify 的实际监听列表为准，而不是以 dirRefs 为准：fsnotify 在路径收到
	// Remove/Rename 时会丢弃该路径的 watch，只看自己的记账会永远以为还在监听。
	watching := make(map[string]bool, len(w.dirRefs))
	for _, dir := range w.fs.WatchList() {
		watching[dir] = true
	}

	for dir, refs := range wanted {
		if watching[dir] {
			w.dirRefs[dir] = refs
			continue
		}
		cost := dirWatchCost(dir)
		if !w.canAfford(cost) {
			w.markDegraded()
			continue
		}
		if err := w.fs.Add(dir); err != nil {
			w.logAddFailure(dir, err)
			continue
		}
		w.dirRefs[dir] = refs
		w.dirPaths[dir] = cost
	}

	for dir := range w.dirRefs {
		if wanted[dir] > 0 {
			continue
		}
		delete(w.dirRefs, dir)
		delete(w.dirPaths, dir)
		if !watching[dir] {
			continue
		}
		if err := w.fs.Remove(dir); err != nil {
			log.Printf("interweave: remove file watch %s failed: %v", dir, err)
		}
	}
	return nil
}

// Stop 停 ticker、清 debounce 定时器、等待 goroutine 退出并关闭 fsnotify。
// 由 main.go 的 app.OnShutdown 与 defer 双保险调用，可重复调用。
func (w *Watcher) Stop() {
	w.stopOnce.Do(func() {
		close(w.done)

		w.pendMu.Lock()
		pending := w.pending
		w.pending = nil
		w.suspects = nil
		w.pendMu.Unlock()
		for _, timer := range pending {
			timer.Stop()
		}

		w.wg.Wait()
		if err := w.fs.Close(); err != nil {
			log.Printf("interweave: close file watch failed: %v", err)
		}
	})
}

// canAfford 按 fd 预算判断能否承担一个新目录的监听。
// macOS 上 fsnotify 没有 FSEvents 后端，走 kqueue：Add(dir) 会给该目录当前每个文件各开一个
// fd，成本是 1 + 条目数而不是 1，从大目录添加文件会打爆预算，因此预算与降级是必需项。
func (w *Watcher) canAfford(cost int) bool {
	if len(w.dirRefs) >= maxWatchedDirs {
		return false
	}
	total := 0
	for _, watched := range w.dirPaths {
		total += watched
	}
	return total+cost <= maxWatchedPaths
}

// dirWatchCost 估算一个目录的监听成本；读目录失败按最小成本计，
// 避免一次探测失败就放弃监听（目录可能正在被创建）。
func dirWatchCost(dir string) int {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return 1
	}
	return 1 + len(entries)
}

// markDegraded 记录降级并只告警一次：降级时功能表现为部分目录不再自动同步、
// 可用性靠手动刷新与媒体 404 兜底，不静默失败也不影响启动。
func (w *Watcher) markDegraded() {
	w.degraded = true
	w.warnOnce.Do(func() {
		log.Printf("interweave: file watch degraded; over-budget directories rely on manual refresh and media fallback")
	})
}

// logAddFailure 把单个目录的监听失败按降级处理：macOS TCC 拒绝、fd 耗尽或目录已消失
// 都是环境问题，绝不能让应用起不来，也不影响已建立的监听。
func (w *Watcher) logAddFailure(dir string, err error) {
	if isWatchResourceExhausted(err) {
		w.markDegraded()
		return
	}
	w.warnOnce.Do(func() {
		log.Printf("interweave: file watch degraded, directory %s is not watched: %v", dir, err)
	})
}

func isWatchResourceExhausted(err error) bool {
	var errno syscall.Errno
	if !errors.As(err, &errno) {
		return false
	}
	return errno == syscall.EMFILE || errno == syscall.ENOSPC
}

func (w *Watcher) runEvents(ctx context.Context) {
	defer w.wg.Done()
	for {
		select {
		case <-ctx.Done():
			return
		case <-w.done:
			return
		case event, ok := <-w.fs.EventChan():
			if !ok {
				return
			}
			w.handleEvent(event)
		case err, ok := <-w.fs.ErrorChan():
			if !ok {
				return
			}
			w.handleError(err)
		}
	}
}

// handleEvent 把内核事件收敛成「这些路径需要重探」。
//
// 只关心 Create/Write/Remove/Rename：Chmod 来自 NOTE_ATTRIB 或真实 chmod/utimes，
// 与可用性无关，跨平台一致地忽略它。
func (w *Watcher) handleEvent(event fsnotify.Event) {
	if !event.Has(fsnotify.Create) && !event.Has(fsnotify.Write) &&
		!event.Has(fsnotify.Remove) && !event.Has(fsnotify.Rename) {
		return
	}
	// 被监听目录自身消失或改名时交给定期对账：旧路径已无法定位库内位置，重探没有意义。
	if w.isWatchedDir(event.Name) {
		return
	}
	w.scheduleProbe(event.Name)
}

func (w *Watcher) isWatchedDir(path string) bool {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.dirRefs[path] > 0
}

func (w *Watcher) handleError(err error) {
	if isWatchResourceExhausted(err) {
		w.markDegraded()
		return
	}
	// 目录已消失与内核队列溢出都由定期对账兜住，这里不重复告警。
	w.warnOnce.Do(func() {
		log.Printf("interweave: file watch error: %v", err)
	})
}

// scheduleProbe 是 per-path trailing debounce：已有定时器就重新计时，
// 只有静默一个窗口后才把路径交给探测批次，一次复制产生的 Create 加若干 Write
// 因此收敛成一次探测。
func (w *Watcher) scheduleProbe(path string) {
	w.pendMu.Lock()
	defer w.pendMu.Unlock()
	if w.pending == nil {
		return
	}
	if timer, ok := w.pending[path]; ok {
		timer.Reset(probeDebounce)
		return
	}
	w.pending[path] = time.AfterFunc(probeDebounce, func() { w.enqueueProbe(path) })
}

func (w *Watcher) enqueueProbe(path string) {
	w.pendMu.Lock()
	timer, ok := w.pending[path]
	if !ok {
		w.pendMu.Unlock()
		return
	}
	// 定时器一触发就从表里删除，churn 目录不会把 pending 撑大。
	delete(w.pending, path)
	stopped := w.pending == nil
	w.pendMu.Unlock()
	timer.Stop()

	if stopped {
		return
	}
	select {
	case w.probeQ <- path:
	case <-w.done:
	}
}

// runProbes 合并同一时刻到期的路径后按批处理：风暴期的事务数由 debounce 窗口决定，
// 而不是由事件数决定。
func (w *Watcher) runProbes(ctx context.Context) {
	defer w.wg.Done()
	for {
		path, ok := w.nextProbe()
		if !ok {
			return
		}
		batch, closed := w.drainBatch(path)
		w.applyBatch(ctx, batch)
		if closed {
			return
		}
	}
}

func (w *Watcher) nextProbe() (string, bool) {
	select {
	case <-w.done:
		return "", false
	case path := <-w.probeQ:
		return path, true
	}
}

func (w *Watcher) drainBatch(first string) ([]string, bool) {
	batch := make([]string, 0, maxProbeBatch)
	batch = append(batch, first)
	for len(batch) < maxProbeBatch {
		select {
		case next, ok := <-w.probeQ:
			if !ok {
				return batch, true
			}
			batch = append(batch, next)
		default:
			return batch, false
		}
	}
	return batch, false
}

// applyBatch 探测一批路径并把「实际发生的翻转」写库后交给发射器。
func (w *Watcher) applyBatch(ctx context.Context, paths []string) {
	refs, err := w.sink.FileSourceIDsByLocations(ctx, paths)
	if err != nil {
		// 解析失败是 DB 读错误，不是关于文件的结论，因此丢弃本批而不是猜可用性。
		// 有意不重新排期：无界重试会在 DB 持续故障时按 debounce 窗口反复打库并刷日志，
		// 把一次瞬时错误放大成热循环。丢批的代价可控——路径仍在监听中，同目录的下一次
		// 文件事件会重新探测它，60s 巡检也会持续校验监听集合；DB 坏到这个程度时，
		// 手动刷新与 media 404 兜底同样写不进去，整应用已经处于降级状态。
		log.Printf("interweave: resolve watched sources failed: %v", err)
		return
	}
	sourceIDsByLocation := make(map[string][]string, len(paths))
	for _, ref := range refs {
		sourceIDsByLocation[ref.Location] = append(sourceIDsByLocation[ref.Location], ref.ID)
	}

	for _, path := range paths {
		sourceIDs := sourceIDsByLocation[path]
		if len(sourceIDs) == 0 {
			// 与库内已登记入口无关的目录变动：同一个目录里还有别的文件是正常的。
			continue
		}
		servable, _ := probeFileServable(path)
		if servable {
			w.clearSuspect(path)
		} else if !w.confirmUnavailable(path) {
			// 第一次失败只标记嫌疑并等下一个窗口复探：单次失败可能是 iCloud 重新物化、
			// 「先删后写」的保存方式或临时文件改名造成的瞬态。
			w.scheduleProbe(path)
			continue
		}
		for _, sourceID := range sourceIDs {
			w.applyAvailability(ctx, sourceID, servable)
		}
	}
}

// confirmUnavailable 实现「两次确认」：只有第二次仍失败才落库。
// 不可用方向需要确认，可用方向不需要——文件确实在那儿。
func (w *Watcher) confirmUnavailable(path string) bool {
	w.pendMu.Lock()
	defer w.pendMu.Unlock()
	if w.suspects == nil {
		return true
	}
	if w.suspects[path] {
		delete(w.suspects, path)
		return true
	}
	w.suspects[path] = true
	return false
}

func (w *Watcher) clearSuspect(path string) {
	w.pendMu.Lock()
	defer w.pendMu.Unlock()
	delete(w.suspects, path)
}

// applyAvailability 只在写库确实翻转后发事件，保证「事件先到、DB 未落」不可能发生。
func (w *Watcher) applyAvailability(ctx context.Context, sourceID string, available bool) {
	change, err := w.sink.ApplyFileAvailability(ctx, sourceID, available)
	if err != nil {
		log.Printf("interweave: apply file availability for %s failed: %v", sourceID, err)
		return
	}
	if change == nil || w.emit == nil {
		return
	}
	w.emit(*change)
}

// ReportFileUnavailable 让媒体 404 兜底与目录监听共用同一个写入口与发射出口：
// 媒体路径不需要监听，但两条信号必须遵守同一条「先落库、后发事件」的规则。
// 返回值表示库内可用性是否真的翻转。
func (w *Watcher) ReportFileUnavailable(ctx context.Context, sourceID string) (bool, error) {
	change, err := w.sink.ApplyFileAvailability(ctx, sourceID, false)
	if err != nil {
		return false, err
	}
	if change == nil || w.emit == nil {
		return false, nil
	}
	w.emit(*change)
	return true, nil
}

// runReconcile 定期全量对账，覆盖 fsnotify 静默丢失的 watch：
// 目录被改名、移走或删除后重建会让监听永久消失，只能靠重新对账找回。
func (w *Watcher) runReconcile(ctx context.Context) {
	defer w.wg.Done()
	ticker := time.NewTicker(reconcileInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-w.done:
			return
		case <-ticker.C:
			if err := w.SyncSources(ctx); err != nil {
				log.Printf("interweave: reconcile file watch failed: %v", err)
			}
		}
	}
}

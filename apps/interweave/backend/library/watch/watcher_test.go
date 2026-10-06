package watch

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"testing"
	"time"

	"github.com/fsnotify/fsnotify"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

// fakeFS 替换内核事件源：单测只验证对账、预算与语义映射，不依赖通知时序。
type fakeFS struct {
	mu       sync.Mutex
	watched  map[string]bool
	addCalls []string
	removed  []string
	addErr   map[string]error
	events   chan fsnotify.Event
	errs     chan error
}

func newFakeFS() *fakeFS {
	return &fakeFS{
		watched: map[string]bool{},
		addErr:  map[string]error{},
		events:  make(chan fsnotify.Event, 512),
		errs:    make(chan error, 8),
	}
}

func (f *fakeFS) Add(name string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if err := f.addErr[name]; err != nil {
		return err
	}
	f.watched[name] = true
	f.addCalls = append(f.addCalls, name)
	return nil
}

func (f *fakeFS) Remove(name string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.watched, name)
	f.removed = append(f.removed, name)
	return nil
}

func (f *fakeFS) WatchList() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	list := make([]string, 0, len(f.watched))
	for dir := range f.watched {
		list = append(list, dir)
	}
	return list
}

func (f *fakeFS) EventChan() <-chan fsnotify.Event { return f.events }
func (f *fakeFS) ErrorChan() <-chan error          { return f.errs }
func (f *fakeFS) Close() error                     { return nil }

// drop 模拟 fsnotify 在路径收到 Remove/Rename 时静默丢弃 watch 的行为。
func (f *fakeFS) drop(name string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.watched, name)
}

func (f *fakeFS) additions() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]string(nil), f.addCalls...)
}

func (f *fakeFS) removals() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]string(nil), f.removed...)
}

// fakeSink 记录探测批次与落库翻转，使「探测了几次」「翻转了几次」都可断言。
type fakeSink struct {
	mu        sync.Mutex
	locations []string
	sourceIDs map[string][]string
	available map[string]bool
	changes   []core.AvailabilityChange
	batches   int
	// probes 按路径统计「进入过探测批次」的次数。批次数受 drainBatch 的合并时机影响，
	// 不能当断言依据；每条路径被探测几次才是收敛的不变量。
	probes map[string]int
}

func newFakeSink(locations []string) *fakeSink {
	sink := &fakeSink{
		locations: locations,
		sourceIDs: map[string][]string{},
		available: map[string]bool{},
		probes:    map[string]int{},
	}
	for index, location := range locations {
		id := "source-" + string(rune('a'+index))
		sink.sourceIDs[location] = append(sink.sourceIDs[location], id)
		sink.available[id] = true
	}
	return sink
}

func (s *fakeSink) ListFileSourceLocations(context.Context) ([]string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]string(nil), s.locations...), nil
}

func (s *fakeSink) FileSourceIDsByLocations(_ context.Context, locations []string) ([]core.SourceLocationRef, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.batches++
	refs := make([]core.SourceLocationRef, 0, len(locations))
	for _, location := range locations {
		s.probes[location]++
		for _, id := range s.sourceIDs[location] {
			refs = append(refs, core.SourceLocationRef{ID: id, Location: location})
		}
	}
	return refs, nil
}

func (s *fakeSink) ApplyFileAvailability(_ context.Context, sourceID string, available bool) (*core.AvailabilityChange, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.available[sourceID] == available {
		return nil, nil
	}
	s.available[sourceID] = available
	change := core.AvailabilityChange{
		SourceID:  sourceID,
		Available: available,
		ChangedAt: time.Now().UnixMilli(),
	}
	s.changes = append(s.changes, change)
	return &change, nil
}

func (s *fakeSink) batchCount() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.batches
}

func (s *fakeSink) probeCountFor(location string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.probes[location]
}

func (s *fakeSink) totalProbeCount() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return sumCounts(s.probes)
}

func sumCounts(counts map[string]int) int {
	total := 0
	for _, count := range counts {
		total += count
	}
	return total
}

func (s *fakeSink) changeCount() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.changes)
}

func (s *fakeSink) availabilityOf(sourceID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.available[sourceID]
}

func (s *fakeSink) setLocations(locations []string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.locations = locations
}

func (s *fakeSink) setAvailability(sourceID string, available bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.available[sourceID] = available
}

// 事件与 debounce 都在异步侧发生：用「计数稳定在目标值」断言次数，
// 固定 sleep 断言「恰好一次」既是假阴性也是假阳性。
func waitForStableCount(t *testing.T, read func() int, want int, quiet time.Duration) {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	stableSince := time.Time{}
	for {
		current := read()
		if current != want {
			stableSince = time.Time{}
		} else if stableSince.IsZero() {
			stableSince = time.Now()
		} else if time.Since(stableSince) >= quiet {
			return
		}
		if time.Now().After(deadline) {
			t.Fatalf("expected count to settle at %d, got %d", want, read())
		}
		time.Sleep(5 * time.Millisecond)
	}
}

// useFakeFS 装入假事件源并在用例结束后还原，使同包内的集成测试能用真实 fsnotify。
func useFakeFS(t *testing.T, fs *fakeFS) {
	t.Helper()
	original := newFSWatcher
	newFSWatcher = func() (fsEvents, error) { return fs, nil }
	t.Cleanup(func() { newFSWatcher = original })
}

func useDebounce(t *testing.T, d time.Duration) {
	t.Helper()
	original := probeDebounce
	probeDebounce = d
	t.Cleanup(func() { probeDebounce = original })
}

func useServabilityProbe(t *testing.T, servable bool) {
	t.Helper()
	original := probeFileServable
	probeFileServable = func(string) (bool, *int64) {
		if !servable {
			return false, nil
		}
		size := int64(1)
		return true, &size
	}
	t.Cleanup(func() { probeFileServable = original })
}

// 同一目录被多个入口引用时只监听一次；引用归零后才停止监听。
func TestWatcherDedupsDirectoryRefs(t *testing.T) {
	fs := newFakeFS()
	useFakeFS(t, fs)
	directory := "/library/shared"
	primary := filepath.Join(directory, "primary.mp4")
	backup := filepath.Join(directory, "backup.mp4")
	sink := newFakeSink([]string{primary, backup})
	watcher, err := NewWatcher(sink, func(core.AvailabilityChange) {})
	if err != nil {
		t.Fatalf("NewWatcher error: %v", err)
	}
	t.Cleanup(watcher.Stop)

	if err := watcher.SyncSources(context.Background()); err != nil {
		t.Fatalf("SyncSources error: %v", err)
	}
	if got := fs.additions(); len(got) != 1 || got[0] != directory {
		t.Fatalf("expected a single Add for %s, got %v", directory, got)
	}

	sink.setLocations([]string{primary})
	if err := watcher.SyncSources(context.Background()); err != nil {
		t.Fatalf("SyncSources after removing one source error: %v", err)
	}
	if got := fs.removals(); len(got) != 0 {
		t.Fatalf("expected the directory to stay watched while referenced, got removals %v", got)
	}

	sink.setLocations(nil)
	if err := watcher.SyncSources(context.Background()); err != nil {
		t.Fatalf("SyncSources after removing all sources error: %v", err)
	}
	if got := fs.removals(); len(got) != 1 || got[0] != directory {
		t.Fatalf("expected Remove for %s once refs drop to zero, got %v", directory, got)
	}
}

// fd 预算耗尽必须降级而不是报错：超出的目录跳过，已有监听继续工作。
func TestWatcherBudgetDegrades(t *testing.T) {
	fs := newFakeFS()
	useFakeFS(t, fs)
	original := maxWatchedDirs
	maxWatchedDirs = 2
	t.Cleanup(func() { maxWatchedDirs = original })

	sink := newFakeSink([]string{"/library/a/one.mp4", "/library/b/two.mp4", "/library/c/three.mp4"})
	watcher, err := NewWatcher(sink, func(core.AvailabilityChange) {})
	if err != nil {
		t.Fatalf("NewWatcher error: %v", err)
	}
	t.Cleanup(watcher.Stop)

	if err := watcher.SyncSources(context.Background()); err != nil {
		t.Fatalf("expected budget overflow to degrade, not fail: %v", err)
	}
	if got := fs.additions(); len(got) != 2 {
		t.Fatalf("expected exactly 2 Add calls under the budget, got %d: %v", len(got), got)
	}
	if !watcher.degraded {
		t.Fatal("expected watcher to report degraded state")
	}
}

// 单目录监听失败（TCC 拒绝、fd 耗尽、目录已消失）不能让启动失败。
func TestWatcherAddFailureDoesNotFailSync(t *testing.T) {
	fs := newFakeFS()
	useFakeFS(t, fs)
	fs.addErr["/library/blocked"] = os.ErrPermission
	sink := newFakeSink([]string{"/library/blocked/one.mp4", "/library/fine/two.mp4"})
	watcher, err := NewWatcher(sink, func(core.AvailabilityChange) {})
	if err != nil {
		t.Fatalf("NewWatcher error: %v", err)
	}
	t.Cleanup(watcher.Stop)

	if err := watcher.SyncSources(context.Background()); err != nil {
		t.Fatalf("expected a failed Add to degrade, not fail: %v", err)
	}
	if got := fs.additions(); len(got) != 1 || got[0] != "/library/fine" {
		t.Fatalf("expected only the healthy directory to be watched, got %v", got)
	}
}

// fsnotify 会静默丢弃失效路径的 watch；定期对账必须按实际监听列表补回。
func TestWatcherReconcileRestoresLostWatch(t *testing.T) {
	fs := newFakeFS()
	useFakeFS(t, fs)
	directory := "/library/moving"
	sink := newFakeSink([]string{filepath.Join(directory, "one.mp4")})
	watcher, err := NewWatcher(sink, func(core.AvailabilityChange) {})
	if err != nil {
		t.Fatalf("NewWatcher error: %v", err)
	}
	t.Cleanup(watcher.Stop)

	if err := watcher.SyncSources(context.Background()); err != nil {
		t.Fatalf("first SyncSources error: %v", err)
	}
	fs.drop(directory)
	if err := watcher.SyncSources(context.Background()); err != nil {
		t.Fatalf("reconcile SyncSources error: %v", err)
	}
	if got := fs.additions(); len(got) != 2 {
		t.Fatalf("expected the lost watch to be re-added, additions = %v", got)
	}
}

// 风暴必须收敛成每个路径一次探测：100 个事件后每条路径恰好被探测一次。
// 批次数只做上界断言——两条路径的 debounce 定时器几乎同时到期时，drainBatch
// 按设计会把它们收进同一批，批次数在 1 与 2 之间都是合法结果，拿它做等值断言
// 就是在断言调度器的运气。收敛性由「每条路径一次」表达。
func TestWatcherDebounceCoalescesStorm(t *testing.T) {
	fs := newFakeFS()
	useFakeFS(t, fs)
	useDebounce(t, 20*time.Millisecond)
	useServabilityProbe(t, true)
	directory := "/library/storm"
	first := filepath.Join(directory, "first.mp4")
	second := filepath.Join(directory, "second.mp4")
	sink := newFakeSink([]string{first, second})
	watcher, err := NewWatcher(sink, func(core.AvailabilityChange) {})
	if err != nil {
		t.Fatalf("NewWatcher error: %v", err)
	}
	t.Cleanup(watcher.Stop)
	if err := watcher.Start(context.Background()); err != nil {
		t.Fatalf("Start error: %v", err)
	}

	for _, path := range []string{first, second} {
		for i := 0; i < 50; i++ {
			fs.events <- fsnotify.Event{Name: path, Op: fsnotify.Write}
		}
	}
	waitForStableCount(t, sink.totalProbeCount, 2, 300*time.Millisecond)
	for _, path := range []string{first, second} {
		if got := sink.probeCountFor(path); got != 1 {
			t.Fatalf("expected %s to be probed exactly once under the storm, got %d", path, got)
		}
	}
	if batches := sink.batchCount(); batches < 1 || batches > 2 {
		t.Fatalf("expected the storm to coalesce into at most 2 probe batches, got %d", batches)
	}
}

// Chmod 与被监听目录自身的事件都不产生探测：前者与可用性无关，
// 后者的旧路径已无法定位库内位置。
func TestWatcherIgnoresChmodAndWatchedDirEvents(t *testing.T) {
	fs := newFakeFS()
	useFakeFS(t, fs)
	useDebounce(t, 20*time.Millisecond)
	useServabilityProbe(t, true)
	directory := "/library/dir-events"
	file := filepath.Join(directory, "one.mp4")
	sink := newFakeSink([]string{file})
	// 从失效起步：Create 带来的「恢复」必须产生一次真实翻转。
	sink.setAvailability("source-a", false)
	watcher, err := NewWatcher(sink, func(core.AvailabilityChange) {})
	if err != nil {
		t.Fatalf("NewWatcher error: %v", err)
	}
	t.Cleanup(watcher.Stop)
	if err := watcher.Start(context.Background()); err != nil {
		t.Fatalf("Start error: %v", err)
	}

	fs.events <- fsnotify.Event{Name: file, Op: fsnotify.Chmod}
	fs.events <- fsnotify.Event{Name: directory, Op: fsnotify.Remove}
	waitForStableCount(t, sink.batchCount, 0, 200*time.Millisecond)

	// 证明管线本身是通的：真正相关的 Create 必须恰好产生一次探测。
	fs.events <- fsnotify.Event{Name: file, Op: fsnotify.Create}
	waitForStableCount(t, sink.batchCount, 1, 200*time.Millisecond)
	if got := sink.changeCount(); got != 1 {
		t.Fatalf("expected 1 recorded availability flip, got %d", got)
	}
}

// 不可用方向要两次确认：单次失败可能是 iCloud 物化或原子保存的瞬态。
// 若没有确认机制，这里会在第一个批次就翻转，batchCount 会停在 1。
func TestWatcherConfirmsUnavailableTwice(t *testing.T) {
	fs := newFakeFS()
	useFakeFS(t, fs)
	useDebounce(t, 20*time.Millisecond)
	useServabilityProbe(t, false)
	file := filepath.Join("/library/vanishing", "one.mp4")
	sink := newFakeSink([]string{file})
	watcher, err := NewWatcher(sink, func(core.AvailabilityChange) {})
	if err != nil {
		t.Fatalf("NewWatcher error: %v", err)
	}
	t.Cleanup(watcher.Stop)
	if err := watcher.Start(context.Background()); err != nil {
		t.Fatalf("Start error: %v", err)
	}

	fs.events <- fsnotify.Event{Name: file, Op: fsnotify.Remove}
	waitForStableCount(t, sink.batchCount, 2, 300*time.Millisecond)
	if got := sink.changeCount(); got != 1 {
		t.Fatalf("expected exactly 1 flip after two confirmed failures, got %d", got)
	}
	if sink.availabilityOf("source-a") {
		t.Fatal("expected the source to be recorded as unavailable")
	}
}

// 第一次失败后文件自愈时不得写入失效：可用方向不需要确认。
func TestWatcherSelfHealWithinOneEventDoesNotWriteUnavailable(t *testing.T) {
	fs := newFakeFS()
	useFakeFS(t, fs)
	useDebounce(t, 20*time.Millisecond)
	original := probeFileServable
	var probes int
	probeFileServable = func(string) (bool, *int64) {
		probes++
		if probes == 1 {
			return false, nil
		}
		size := int64(1)
		return true, &size
	}
	t.Cleanup(func() { probeFileServable = original })
	file := filepath.Join("/library/flaky", "one.mp4")
	sink := newFakeSink([]string{file})
	watcher, err := NewWatcher(sink, func(core.AvailabilityChange) {})
	if err != nil {
		t.Fatalf("NewWatcher error: %v", err)
	}
	t.Cleanup(watcher.Stop)
	if err := watcher.Start(context.Background()); err != nil {
		t.Fatalf("Start error: %v", err)
	}

	fs.events <- fsnotify.Event{Name: file, Op: fsnotify.Remove}
	waitForStableCount(t, sink.batchCount, 2, 300*time.Millisecond)
	if got := sink.changeCount(); got != 0 {
		t.Fatalf("expected no flip when the file reappears, got %d", got)
	}
}

// 只在库内真的翻转时才发事件：事件先到、DB 未落不可能发生。
func TestWatcherEmitsOnlyOnRealFlips(t *testing.T) {
	fs := newFakeFS()
	useFakeFS(t, fs)
	useDebounce(t, 20*time.Millisecond)
	useServabilityProbe(t, true)
	file := filepath.Join("/library/stable", "one.mp4")
	sink := newFakeSink([]string{file})
	var emitMu sync.Mutex
	emitted := 0
	watcher, err := NewWatcher(sink, func(core.AvailabilityChange) {
		emitMu.Lock()
		defer emitMu.Unlock()
		emitted++
	})
	if err != nil {
		t.Fatalf("NewWatcher error: %v", err)
	}
	t.Cleanup(watcher.Stop)
	if err := watcher.Start(context.Background()); err != nil {
		t.Fatalf("Start error: %v", err)
	}

	fs.events <- fsnotify.Event{Name: file, Op: fsnotify.Write}
	fs.events <- fsnotify.Event{Name: file, Op: fsnotify.Write}
	waitForStableCount(t, sink.batchCount, 1, 300*time.Millisecond)

	emitMu.Lock()
	got := emitted
	emitMu.Unlock()
	if got != 0 {
		t.Fatalf("expected no event when availability does not flip, got %d", got)
	}
}

func requireRealFS(t *testing.T) {
	t.Helper()
	if runtime.GOOS != "darwin" && runtime.GOOS != "linux" {
		t.Skipf("kernel event semantics differ outside darwin/linux, skipping on %s", runtime.GOOS)
	}
}

// 真 fsnotify + 真库：删掉被监听目录里的文件后不手动刷新应自动记为失效，
// 放回后自动恢复（自愈）。
func TestWatcherDetectsRemovalAndSelfHeal(t *testing.T) {
	requireRealFS(t)
	useDebounce(t, 50*time.Millisecond)

	db, err := storage.Open(filepath.Join(t.TempDir(), "watch.db"))
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	sources := core.NewSourceService(db, remote.NewFetcher())
	libraryDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(libraryDir, "clip.mp4"), []byte("0123456789"), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}
	view, err := core.NewResourceService(db, remote.NewFetcher()).AddFileResource(
		context.Background(), filepath.Join(libraryDir, "clip.mp4"),
	)
	if err != nil {
		t.Fatalf("AddFileResource error: %v", err)
	}
	mediaPath := view.Sources[0].Location
	sourceID := view.Sources[0].ID

	var changesMu sync.Mutex
	changes := 0
	watcher, err := NewWatcher(sources, func(core.AvailabilityChange) {
		changesMu.Lock()
		defer changesMu.Unlock()
		changes++
	})
	if err != nil {
		t.Fatalf("NewWatcher error: %v", err)
	}
	t.Cleanup(watcher.Stop)
	if err := watcher.Start(context.Background()); err != nil {
		t.Fatalf("Start error: %v", err)
	}

	// 直接读库：手动刷新本身就会写库，用它断言会让监听失效时也通过。
	readAvailability := func() bool {
		src, err := (storage.SourceStore{}).Get(context.Background(), db.SqlDB(), sourceID)
		if err != nil {
			t.Errorf("read source: %v", err)
			return true
		}
		return src.Available
	}
	waitForAvailability := func(want bool, reason string) {
		t.Helper()
		deadline := time.Now().Add(5 * time.Second)
		for time.Now().Before(deadline) {
			if readAvailability() == want {
				return
			}
			time.Sleep(20 * time.Millisecond)
		}
		t.Fatalf("timed out waiting for availability=%v: %s", want, reason)
	}

	if err := os.Remove(mediaPath); err != nil {
		t.Fatalf("remove fixture: %v", err)
	}
	waitForAvailability(false, "file was deleted")

	if err := os.WriteFile(mediaPath, []byte("0123456789"), 0o600); err != nil {
		t.Fatalf("restore fixture: %v", err)
	}
	waitForAvailability(true, "file was restored")

	changesMu.Lock()
	emitted := changes
	changesMu.Unlock()
	if emitted != 2 {
		t.Fatalf("expected 2 availability events (lose + self-heal), got %d", emitted)
	}
}

// 编辑器的原子保存形态（先写临时文件再 rename 覆盖）不应被误判为长期失效：
// 文件始终可服务，因此不应产生任何翻转。
func TestWatcherHandlesAtomicReplace(t *testing.T) {
	requireRealFS(t)
	useDebounce(t, 50*time.Millisecond)

	db, err := storage.Open(filepath.Join(t.TempDir(), "watch.db"))
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	sources := core.NewSourceService(db, remote.NewFetcher())
	libraryDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(libraryDir, "notes.md"), []byte("first"), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}
	view, err := core.NewResourceService(db, remote.NewFetcher()).AddFileResource(
		context.Background(), filepath.Join(libraryDir, "notes.md"),
	)
	if err != nil {
		t.Fatalf("AddFileResource error: %v", err)
	}
	mediaPath := view.Sources[0].Location

	var changesMu sync.Mutex
	changes := 0
	watcher, err := NewWatcher(sources, func(core.AvailabilityChange) {
		changesMu.Lock()
		defer changesMu.Unlock()
		changes++
	})
	if err != nil {
		t.Fatalf("NewWatcher error: %v", err)
	}
	t.Cleanup(watcher.Stop)
	if err := watcher.Start(context.Background()); err != nil {
		t.Fatalf("Start error: %v", err)
	}

	staged := filepath.Join(libraryDir, ".notes.md.tmp")
	if err := os.WriteFile(staged, []byte("second"), 0o600); err != nil {
		t.Fatalf("write staged fixture: %v", err)
	}
	if err := os.Rename(staged, mediaPath); err != nil {
		t.Fatalf("atomic replace: %v", err)
	}

	waitForStableCount(t, func() int {
		changesMu.Lock()
		defer changesMu.Unlock()
		return changes
	}, 0, time.Second)
}

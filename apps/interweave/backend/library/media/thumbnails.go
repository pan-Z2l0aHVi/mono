package media

import (
	"bufio"
	"bytes"
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"image"
	"image/color"
	_ "image/gif" // 注册 gif 解码器，image.Decode 按 magic 分派
	"image/jpeg"
	_ "image/png" // 注册 png 解码器
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	_ "golang.org/x/image/bmp" // 注册 bmp 解码器
	"golang.org/x/image/draw"
	_ "golang.org/x/image/tiff" // 注册 tiff 解码器

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/internal/atomicfile"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

// ThumbnailPathPrefix 是 Source 缩略图的 AssetServer 路由前缀：GET/HEAD 读取，POST 回填。
const ThumbnailPathPrefix = "/resource-thumbnail/"

// thumbnailMaxEdge 是缩略图的最长边。列表行内的缩略图盒为 40px，3x 屏 120px 已够用，
// 取 320 同时覆盖 drawer 的中图场景；生成一次后常驻磁盘，不必吝啬。
const thumbnailMaxEdge = 320

// thumbnailJPEGQuality 与前端回填路径（canvas 导出 image/jpeg 0.82）保持同一档。
const thumbnailJPEGQuality = 82

// maxThumbnailUploadBytes 限制前端回填载荷；320px JPEG q82 常规在 40KB 内，上限留足余量。
const maxThumbnailUploadBytes = 512 << 10

// ErrUnsupportedThumbnail 表示 Go 侧没有该格式的解码器（HEIC/AVIF/RAW/webp 等）。
// 调用方据此对请求返回 404，前端回退到「加载原图 + 回填」的捕获路径。
var ErrUnsupportedThumbnail = errors.New("thumbnail: unsupported image format")

// errThumbnailClosed 表示存储已关闭，不能再发起新的缩略图构建。调用方按服务端内部
// 错误处理（客户端仍活跃时回 5xx），不用 404 掩盖关停期的真实状态。
var errThumbnailClosed = errors.New("thumbnail: store closed")

// buildConcurrency 限制同时在途的缩略图构建数量：12MP 解码单张瞬时堆可达数十 MB，
// 无界并发会把多图同屏放大成内存尖峰；下限 2 保证双核机器也有基本吞吐。
func buildConcurrency() int {
	return max(2, min(runtime.GOMAXPROCS(0), 4))
}

// ThumbnailStore 管理按 Source 派生的缩略图文件缓存。
//
// 文件名 = <sourceID>.<mtime 纳秒 hex>-<字节长 hex>.jpg：版本由原文件的 mtime+size 派生，
// 用户在外部改写原文件后版本自动失效，不需要任何元数据登记。sourceID（UUID）与版本
// （hex+连字符）都不含点，首个点即是二者分界，清理时可以无歧义地还原归属。
// 缩略图是应用内部派生数据，存放在 library.db 同级目录，不触碰用户的原始文件。
//
// 并发模型：同版本（同 key）的构建按引用计数去重（singleflight），构建绑定独立上下文，
// 只在最后一个等待者离开时才取消；全部后台构建与 Prune 都纳入 wg，由 Close 排空。
// 离线读取按 sourceID 维护「最新缓存文件」索引：首次离线查询时按目录真实内容一次性
// 建立（真实 ModTime 定序），此后命中 O(1)、未命中直接 os.ErrNotExist，不再重复扫描目录。
// 字段允许零值可用（&ThumbnailStore{dir: dir}），并发状态经 ensureInit 惰性建立。
type ThumbnailStore struct {
	dir string

	mu          sync.Mutex
	inflight    map[string]*thumbCall
	buildSem    chan struct{}
	initOnce    sync.Once
	closed      bool
	closeCh     chan struct{}
	closeCtx    context.Context    // ensureInit 派生：启动期 Prune 随 Close 取消
	closeCancel context.CancelFunc // 由 Close 调用，取消 closeCtx 派生的全部工作
	wg          sync.WaitGroup

	// 离线索引，由 indexMu 保护。indexed 为 false 时 latestBySource 只是零散登记，
	// 不可作为查询依据；ensureOfflineIndex 建立后才是权威。
	indexMu        sync.RWMutex
	latestBySource map[string]cachedThumb
	indexed        bool
}

// cachedThumb 是离线索引里一个 Source 当前最新的缓存条目：文件名与该缓存文件
// 自己的真实 ModTime（不是变长 hex 版本串的字典序——那不等于写入先后）。
type cachedThumb struct {
	filename string
	modTime  time.Time
}

// thumbCall 是同 key 构建的共享状态。done 关闭即构建终结（err 已定），等待者据此取结果；
// waiters 由 mu 保护，减到零说明再无人需要结果，立即取消构建并从 inflight 摘除，
// 使后续新请求不会挂载到已取消的调用上。
type thumbCall struct {
	done    chan struct{}
	cancel  context.CancelFunc
	waiters int
	err     error
}

// ensureInit 惰性建立并发状态，使零值构造的字面量（含既有单测）保持可用。
func (t *ThumbnailStore) ensureInit() {
	t.initOnce.Do(func() {
		t.inflight = make(map[string]*thumbCall)
		t.buildSem = make(chan struct{}, buildConcurrency())
		t.closeCh = make(chan struct{})
		t.closeCtx, t.closeCancel = context.WithCancel(context.Background())
	})
}

// NewThumbnailStore 建立缓存目录；目录创建失败只影响缩略图能力，由调用方决定降级方式。
func NewThumbnailStore(dir string) (*ThumbnailStore, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("create thumbnail dir: %w", err)
	}
	return &ThumbnailStore{dir: dir}, nil
}

// Close 幂等关停：拒绝新构建，取消全部在途构建并等待其与在途 Prune 结束。
// 不等待请求侧等待者——它们监听 closeCh 自行返回；也不会死锁，构建协程的
// 阻塞点全部监听 closeCh 或 buildCtx 取消，启动期 Prune 的每一轮检查 closeCtx。
func (t *ThumbnailStore) Close() {
	t.ensureInit()
	t.mu.Lock()
	if t.closed {
		t.mu.Unlock()
		return
	}
	t.closed = true
	close(t.closeCh)
	for _, call := range t.inflight {
		call.cancel()
	}
	t.inflight = make(map[string]*thumbCall)
	t.mu.Unlock()
	// 先取消关停上下文再排空：启动期 Prune 的当前轮立即收尾，与在途构建一起
	// 被 wg.Wait 排空，mediaHandler.Close() 因此严格先于 db.Close() 完成。
	t.closeCancel()
	t.wg.Wait()
}

// thumbnailVersion 由原文件的修改时间与字节数派生缩略图版本。
func thumbnailVersion(info os.FileInfo) string {
	return fmt.Sprintf("%x-%x", info.ModTime().UnixNano(), info.Size())
}

func (t *ThumbnailStore) path(sourceID string, info os.FileInfo) string {
	return filepath.Join(t.dir, sourceID+"."+thumbnailVersion(info)+".jpg")
}

// ServeThumbnail 处理一次缩略图读取：命中缓存直接回源；未命中时按「sourceID.版本」
// 去重并发构建，等待同一份结果落盘后回源。构建绑定独立上下文而非首个请求的
// r.Context()，只在最后一个等待者离开时才取消；Go 侧解不了的格式返回
// ErrUnsupportedThumbnail，由 handler 决定 404。
// 响应带 ETag（= 版本），If-None-Match 协商由 http.ServeContent 承担。
func (t *ThumbnailStore) ServeThumbnail(w http.ResponseWriter, r *http.Request, sourceID string, originalPath string, info os.FileInfo) error {
	target := t.path(sourceID, info)
	etag := `"` + thumbnailVersion(info) + `"`
	err := t.serveFile(w, r, target, etag)
	if err == nil {
		t.recordThumbFile(target)
		return nil
	}
	if !errors.Is(err, os.ErrNotExist) {
		return err
	}
	if err := t.awaitBuild(r.Context(), sourceID+"."+thumbnailVersion(info), originalPath, target); err != nil {
		return err
	}
	if err := t.serveFile(w, r, target, etag); err != nil {
		return err
	}
	t.recordThumbFile(target)
	return nil
}

// awaitBuild 以引用计数 singleflight 等待（或发起）一次同版本构建。
// key 与落盘文件名的去 .jpg 词干一致，保证去重键与缓存版本严格对应。
func (t *ThumbnailStore) awaitBuild(ctx context.Context, key, originalPath, target string) error {
	t.ensureInit()

	t.mu.Lock()
	if t.closed {
		t.mu.Unlock()
		return errThumbnailClosed
	}
	call, joined := t.inflight[key]
	if joined {
		call.waiters++
	} else {
		buildCtx, cancel := context.WithCancel(context.Background())
		call = &thumbCall{done: make(chan struct{}), cancel: cancel, waiters: 1}
		t.inflight[key] = call
		// wg.Add 必须在锁内且确认未关闭后执行，杜绝与 Close 的 wg.Wait 并发 Add。
		t.wg.Add(1)
		go t.runBuild(buildCtx, call, key, originalPath, target)
	}
	t.mu.Unlock()

	select {
	case <-call.done:
		return call.err
	case <-ctx.Done():
		t.abandonCall(key, call)
		return ctx.Err()
	case <-t.closeCh:
		return errThumbnailClosed
	}
}

// abandonCall 处理单个等待者中途离开：仅当它是最后一个等待者时取消构建，并在同一
// 临界区内按指针身份从 inflight 摘除，防止后续活跃请求挂载到已取消的调用上。
func (t *ThumbnailStore) abandonCall(key string, call *thumbCall) {
	t.mu.Lock()
	defer t.mu.Unlock()
	call.waiters--
	if call.waiters > 0 {
		return
	}
	call.cancel()
	if t.inflight[key] == call {
		delete(t.inflight, key)
	}
}

// runBuild 是去重后的唯一构建协程：先竞争并发令牌（构建数上限），拿到后二次检查
// 目标文件（可能已被并行版本或早前构建写入），再解码缩放并原子落盘。
// 取消检查点在拿令牌前后与落盘前，已无人等待的构建不会产生无谓的磁盘写入。
func (t *ThumbnailStore) runBuild(buildCtx context.Context, call *thumbCall, key, originalPath, target string) {
	defer t.wg.Done()

	select {
	case t.buildSem <- struct{}{}:
		// 释放必须绑定在成功获取之后：未拿到令牌就提前返回的路径若执行无条件
		// 释放，会在满槽信号量上偷走其他构建的令牌，缺口最终把某个释放者
		// 永久卡死在空信号量上，Close 的 wg.Wait 随之死锁。
		defer func() { <-t.buildSem }()
	case <-buildCtx.Done():
		t.finishCall(key, call, buildCtx.Err())
		return
	case <-t.closeCh:
		t.finishCall(key, call, errThumbnailClosed)
		return
	}

	_, err := os.Stat(target)
	switch {
	case err == nil:
		t.finishCall(key, call, nil)
		return
	case !errors.Is(err, os.ErrNotExist):
		t.finishCall(key, call, err)
		return
	}

	thumb, err := buildThumbnailFn(originalPath)
	if err == nil && buildCtx.Err() != nil {
		// 构建期间所有等待者离开：结果再无人消费，不落盘。
		t.finishCall(key, call, buildCtx.Err())
		return
	}
	if err == nil {
		err = writeAtomically(target, thumb)
	}
	if err == nil {
		// 已落盘即是离线可服务的最新缓存，无论这次构建还有没有等待者。
		t.recordThumbFile(target)
	}
	t.finishCall(key, call, err)
}

// finishCall 终结一次构建：按指针身份摘除 inflight（可能已被摘除或被新调用替换），
// 定格结果并关闭 done 唤醒全部等待者。
func (t *ThumbnailStore) finishCall(key string, call *thumbCall, err error) {
	t.mu.Lock()
	if t.inflight[key] == call {
		delete(t.inflight, key)
	}
	call.err = err
	t.mu.Unlock()
	close(call.done)
}

// ServeCachedThumbnail 在原文件不可用时读取该 Source 最近写入的缓存，不访问原文件。
// 查询走离线索引：首次调用按目录真实内容一次性建索引，此后命中 O(1)、未命中直接
// os.ErrNotExist——非图片 Source 的负查询不再每次重扫目录。索引指向的文件被外部
// 清理时按 CAS 自愈移除条目，不覆盖并发登记的更新文件。
func (t *ThumbnailStore) ServeCachedThumbnail(w http.ResponseWriter, r *http.Request, sourceID string) error {
	entry, ok := t.latestCached(sourceID)
	if !ok {
		return os.ErrNotExist
	}
	err := t.serveFile(w, r, filepath.Join(t.dir, entry.filename), `"`+entry.filename+`"`)
	if errors.Is(err, os.ErrNotExist) {
		t.forgetCachedThumbCAS(sourceID, entry.filename)
	}
	return err
}

// ensureOfflineIndex 在首次离线查询时按目录真实内容一次性建立全量索引。
// 建立后离线查询不再扫描目录：2000 文件目录下每次 0.70ms 的重复遍历与
// 非图片源的负缓存风暴都由此消除。目录读不出来（被删/不可读）按空索引处理：
// 媒体兜底链路本来就以 404 收尾，之后落盘成功的文件经 recordCachedThumb 仍会进索引。
func (t *ThumbnailStore) ensureOfflineIndex() {
	t.indexMu.RLock()
	indexed := t.indexed
	t.indexMu.RUnlock()
	if indexed {
		return
	}
	t.indexMu.Lock()
	defer t.indexMu.Unlock()
	if t.indexed {
		return
	}
	latest := make(map[string]cachedThumb)
	if entries, err := readDirFn(t.dir); err == nil {
		for _, entry := range entries {
			if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".jpg") {
				continue
			}
			stem := strings.TrimSuffix(entry.Name(), ".jpg")
			dot := strings.IndexByte(stem, '.')
			if dot <= 0 {
				continue
			}
			info, err := entry.Info()
			if err != nil {
				// 条目刚被并发删除：跳过单个条目，不影响索引其余部分。
				continue
			}
			sourceID := stem[:dot]
			current, ok := latest[sourceID]
			if !ok || info.ModTime().After(current.modTime) ||
				(info.ModTime().Equal(current.modTime) && entry.Name() > current.filename) {
				latest[sourceID] = cachedThumb{filename: entry.Name(), modTime: info.ModTime()}
			}
		}
	}
	t.latestBySource = latest
	t.indexed = true
}

// latestCached 返回离线索引里该 Source 的最新缓存条目。索引已建立而未登记时
// 返回 false（即 os.ErrNotExist 语义），绝不回退到目录重扫。
func (t *ThumbnailStore) latestCached(sourceID string) (cachedThumb, bool) {
	t.ensureOfflineIndex()
	t.indexMu.RLock()
	defer t.indexMu.RUnlock()
	entry, ok := t.latestBySource[sourceID]
	return entry, ok
}

// recordThumbFile 把一个成功落盘的缓存文件登记进离线索引：文件名按「sourceID.版本」
// 解析归属（sourceID 不含点，首个点即分界），stat 取真实 ModTime 后经
// recordCachedThumb 写入。ServeThumbnail 命中/落盘与 Save 回填都经它同步更新。
func (t *ThumbnailStore) recordThumbFile(target string) {
	name := filepath.Base(target)
	dot := strings.IndexByte(name, '.')
	if dot <= 0 {
		return
	}
	info, err := os.Stat(target)
	if err != nil {
		return
	}
	t.recordCachedThumb(name[:dot], name, info.ModTime())
}

// recordCachedThumb 把 sourceID 当前最新的缓存文件登记进离线索引：
// 先走 RLock 判等快路径（同文件零写入），仅在缺失或变化时升级写锁，且只接受
// 比已登记条目更新的文件，避免并发的旧构建回写覆盖新版本。索引尚未建立时跳过：
// 离线首查会按目录真实内容整体重建，此时登记的条目只会被覆盖（文件已在盘上，不会丢）。
func (t *ThumbnailStore) recordCachedThumb(sourceID, filename string, modTime time.Time) {
	t.indexMu.RLock()
	indexed := t.indexed
	current, ok := t.latestBySource[sourceID]
	t.indexMu.RUnlock()
	if !indexed {
		return
	}
	if ok && current.filename == filename {
		return
	}
	t.indexMu.Lock()
	defer t.indexMu.Unlock()
	// 双检：拿写锁期间条目可能已被并发更新。
	current, ok = t.latestBySource[sourceID]
	if ok && current.filename == filename {
		return
	}
	if !ok || modTime.After(current.modTime) {
		t.latestBySource[sourceID] = cachedThumb{filename: filename, modTime: modTime}
	}
}

// forgetCachedThumbCAS 自愈移除索引条目：仅当条目仍指向 targetName 时才删除。
// 外部手动清理缓存目录与 pruneStale 都经它收尾；并发登记的更新文件因文件名不同
// 而不会被误删。
func (t *ThumbnailStore) forgetCachedThumbCAS(sourceID, targetName string) {
	t.indexMu.Lock()
	defer t.indexMu.Unlock()
	if entry, ok := t.latestBySource[sourceID]; ok && entry.filename == targetName {
		delete(t.latestBySource, sourceID)
	}
}

// Save 接收前端回填的缩略图（前端 WebKit 能解码 Go 解不了的格式，如 HEIC）：
// 校验为尺寸合理的 JPEG 后按当前原文件版本落盘，后续读取即可命中。原文件信息或载荷
// 不合法时返回 false，调用方给 4xx。落盘成功即同步登记进离线索引：之后原文件失效，
// 离线查询也能直接命中这次回填。
func (t *ThumbnailStore) Save(sourceID string, info os.FileInfo, data []byte) bool {
	if len(data) == 0 || len(data) > maxThumbnailUploadBytes {
		return false
	}
	config, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil || format != "jpeg" {
		return false
	}
	// 前端按 thumbnailMaxEdge 截图，这里只拦明显异常的尺寸，不重编码。
	if config.Width <= 0 || config.Height <= 0 ||
		config.Width > 4*thumbnailMaxEdge || config.Height > 4*thumbnailMaxEdge {
		return false
	}
	target := t.path(sourceID, info)
	if writeAtomically(target, data) != nil {
		return false
	}
	t.recordThumbFile(target)
	return true
}

// thumbnailPruneEntry 描述一个文件 Source 在清理时的身份与当前版本。
type thumbnailPruneEntry struct {
	SourceID string
	// Version 是按当前 mtime+size 派生的版本；原文件暂不可 stat（如离线归档盘）时为空，
	// 该 Source 的现存缩略图全部保留，等下次可用时再清。
	Version string
}

// FileSourceLister 列出库内全部文件 Source；由装配层绑定到具体存储，使 media 不依赖查询句柄。
type FileSourceLister func(ctx context.Context) ([]storage.SourceModel, error)

// Prune 按库内现行文件 Source 名单清一次过期缩略图，启动时跑一次即可。
// 原文件暂不可 stat 的 Source（离线归档盘）Version 为空，其缩略图全部保留，等可用后再清。
// 名单读取失败时整次跳过，只留垃圾不留错误。
// 纳入 wg 计量使 Close 等待在途 Prune 结束；ctx 取消在每轮清理前检查，立即收尾。
func (t *ThumbnailStore) Prune(ctx context.Context, list FileSourceLister) {
	t.ensureInit()
	t.mu.Lock()
	if t.closed {
		t.mu.Unlock()
		return
	}
	t.wg.Add(1)
	t.mu.Unlock()
	defer t.wg.Done()

	t.prune(ctx, list)
}

// StartPrune 在后台跑一次启动期清理，调用方不再自带 goroutine：协程纳入 wg 计量
// （锁内确认未关闭后才 Add），上下文用 closeCtx——Close 取消它并经 wg.Wait 排空，
// 关停链路里 mediaHandler.Close() 因此一并等完启动期清理。
func (t *ThumbnailStore) StartPrune(list FileSourceLister) {
	t.ensureInit()
	t.mu.Lock()
	if t.closed {
		t.mu.Unlock()
		return
	}
	t.wg.Add(1)
	t.mu.Unlock()
	go func() {
		defer t.wg.Done()
		t.prune(t.closeCtx, list)
	}()
}

func (t *ThumbnailStore) prune(ctx context.Context, list FileSourceLister) {
	if ctx.Err() != nil {
		return
	}
	models, err := list(ctx)
	if err != nil {
		log.Printf("interweave: thumbnail prune skipped: %v", err)
		return
	}
	entries := make([]thumbnailPruneEntry, 0, len(models))
	for _, source := range models {
		entry := thumbnailPruneEntry{SourceID: source.ID}
		if info, err := os.Stat(source.Location); core.ClassifyFileStat(err, info) == core.FileServable {
			entry.Version = thumbnailVersion(info)
		}
		entries = append(entries, entry)
	}
	t.pruneStale(ctx, entries)
}

// pruneStale 删除不再匹配当前版本的缩略图文件：运行期的版本失效
// 靠文件名天然错开，不产生需要即时回收的垃圾。无点分隔、无法归属的文件不动，
// 避免误删并行写入的临时产物；已删除 Source 的遗留文件归属明确，属于清理目标。
// ctx 在每一轮删除前检查，取消后立即收尾；被删除的文件若是离线索引登记的当前
// 条目，按 CAS 同步移除，保证索引与磁盘一致。
func (t *ThumbnailStore) pruneStale(ctx context.Context, entries []thumbnailPruneEntry) {
	byID := make(map[string]thumbnailPruneEntry, len(entries))
	for _, entry := range entries {
		byID[entry.SourceID] = entry
	}
	files, err := readDirFn(t.dir)
	if err != nil {
		return
	}
	for _, file := range files {
		if ctx.Err() != nil {
			return
		}
		name := file.Name()
		if file.IsDir() || !strings.HasSuffix(name, ".jpg") {
			continue
		}
		stem := strings.TrimSuffix(name, ".jpg")
		dot := strings.IndexByte(stem, '.')
		if dot <= 0 {
			continue
		}
		if entry, ok := byID[stem[:dot]]; ok && (entry.Version == "" || entry.Version == stem[dot+1:]) {
			continue
		}
		_ = os.Remove(filepath.Join(t.dir, name))
		t.forgetCachedThumbCAS(stem[:dot], name)
	}
}

func (t *ThumbnailStore) serveFile(w http.ResponseWriter, r *http.Request, path string, etag string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	w.Header().Set("Content-Type", "image/jpeg")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("ETag", etag)
	// ModTime 传零值：新鲜度协商完全交给 ETag，避免「缩略图文件比原文件新」这类
	// 无意义的 If-Modified-Since 语义。
	http.ServeContent(w, r, filepath.Base(path), time.Time{}, f)
	return nil
}

// writeAtomically 先写同目录临时文件再 rename：并发生成同一版本时最后写入者胜出，
// 读侧永远见到完整的 JPEG。
func writeAtomically(target string, data []byte) error {
	// 0o600：缩略图是用户图片的派生数据，数据目录可能对其他账号可遍历；
	// 沿用临时文件的 owner-only 默认权限，不给组与其他用户读权限。
	return atomicfile.WriteFile(target, data, 0o600)
}

// buildThumbnailFn 是 buildThumbnail 的注入点：单测用它构造慢速/失败的构建来验证
// 去重、取消与关停排空。生产代码不得在运行期改写。
var buildThumbnailFn = buildThumbnail

// readDirFn 是 os.ReadDir 的注入点：单测用它计数目录扫描次数，验证离线索引
// 消除了重复遍历。生产代码不得在运行期改写。
var readDirFn = os.ReadDir

// buildThumbnail 解码原文件并产出缩略图字节。格式不受支持时返回 ErrUnsupportedThumbnail。
func buildThumbnail(originalPath string) ([]byte, error) {
	file, err := os.Open(originalPath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	// 先只读头部判断格式：HEIC/RAW/视频等 Go 解不了的输入在常数内存内返回 404，
	// 不再把整个文件读进内存后才失败。
	config, format, err := image.DecodeConfig(file)
	if err != nil {
		if errors.Is(err, image.ErrFormat) {
			return nil, ErrUnsupportedThumbnail
		}
		return nil, err
	}
	if config.Width <= 0 || config.Height <= 0 {
		return nil, errors.New("thumbnail: empty image")
	}

	// EXIF 方向只从 JPEG 读：它是磁盘照片里唯一携带该标记的主流格式；解码器不应用
	// 方向，旋转/翻转会在此处补齐，保证缩略图与用户在访达里看到的朝向一致。
	orientation := uint16(1)
	if format == "jpeg" {
		if _, err := file.Seek(0, io.SeekStart); err == nil {
			orientation = jpegOrientationFromReader(file)
		}
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return nil, err
	}
	decoded, _, err := image.Decode(file)
	if err != nil {
		if errors.Is(err, image.ErrFormat) {
			return nil, ErrUnsupportedThumbnail
		}
		return nil, err
	}

	scaled := fitThumbnail(decoded)
	if scaled == nil {
		return nil, errors.New("thumbnail: empty image")
	}
	var out bytes.Buffer
	if err := jpeg.Encode(&out, applyOrientation(scaled, orientation), &jpeg.Options{Quality: thumbnailJPEGQuality}); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

// fitThumbnail 等比缩到最长边不超过 thumbnailMaxEdge，只缩小不放大。
// 旋转不改变最长边，因此先缩后旋的顺序不引入额外失真。
func fitThumbnail(src image.Image) *image.RGBA {
	bounds := src.Bounds()
	width, height := bounds.Dx(), bounds.Dy()
	if width <= 0 || height <= 0 {
		return nil
	}
	scale := math.Min(1, float64(thumbnailMaxEdge)/math.Max(float64(width), float64(height)))
	targetW := max(1, int(math.Round(float64(width)*scale)))
	targetH := max(1, int(math.Round(float64(height)*scale)))
	dst := image.NewRGBA(image.Rect(0, 0, targetW, targetH))
	// BiLinear 相比 CatmullRom 大幅降低缩放分配与 CPU，是 12MP 图构建耗时里仅次于
	// JPEG 解码的第二大头寸。320px 输出经人工并排抽检确认无可见差异（10 类样本：
	// 细线、文字截图、棋盘、圆环、条纹、渐变、风景、人像、噪点、UI 虚线，
	// CatmullRom 与 BiLinear 各自渲染真实 320px 输出后对比）。
	draw.BiLinear.Scale(dst, dst.Bounds(), src, bounds, draw.Over, nil)
	return dst
}

// applyOrientation 按 EXIF 方向变换缩放后的小图。方向 5/7（镜像变体）按对应旋转档处理：
// 它们来自镜像传感器，实拍照片几乎不出现，为它们引入翻转分支不值得。
func applyOrientation(src *image.RGBA, orientation uint16) image.Image {
	if orientation <= 1 || orientation > 8 {
		return src
	}
	bounds := src.Bounds()
	width, height := bounds.Dx(), bounds.Dy()
	outW, outH := width, height
	if orientation >= 5 {
		outW, outH = height, width
	}
	dst := image.NewRGBA(image.Rect(0, 0, outW, outH))
	at := func(x, y int) color.RGBA { return src.RGBAAt(bounds.Min.X+x, bounds.Min.Y+y) }
	for y := 0; y < outH; y++ {
		for x := 0; x < outW; x++ {
			switch orientation {
			case 2: // 水平镜像
				dst.SetRGBA(x, y, at(width-1-x, y))
			case 3: // 旋转 180°
				dst.SetRGBA(x, y, at(width-1-x, height-1-y))
			case 4: // 垂直镜像
				dst.SetRGBA(x, y, at(x, height-1-y))
			case 5: // 转置（主对角线镜像）
				dst.SetRGBA(x, y, at(y, x))
			case 6: // 旋转 90° 顺时针
				dst.SetRGBA(x, y, at(y, height-1-x))
			case 7: // 反转置（反对角线镜像）
				dst.SetRGBA(x, y, at(width-1-y, height-1-x))
			case 8: // 旋转 90° 逆时针
				dst.SetRGBA(x, y, at(width-1-y, x))
			}
		}
	}
	return dst
}

// jpegOrientationFromReader 从 JPEG 头部流里解析 EXIF 方向标签（0x0112）；缺失、越界或
// 解析失败一律返回 1。只读到 SOS 之前，不读取熵编码数据，也不把整张图留在内存里。
func jpegOrientationFromReader(r io.Reader) uint16 {
	reader := bufio.NewReader(r)
	var soi [2]byte
	if _, err := io.ReadFull(reader, soi[:]); err != nil || soi[0] != 0xFF || soi[1] != 0xD8 {
		return 1
	}
	for {
		marker, err := nextJPEGMarker(reader)
		if err != nil {
			return 1
		}
		// 无长度载荷的标记：RSTn/TEM 跳过即可。
		if marker == 0x01 || (marker >= 0xD0 && marker <= 0xD7) {
			continue
		}
		if marker == 0xD9 || marker == 0xDA { // EOI / SOS：EXIF 不可能再出现
			return 1
		}
		var lengthBytes [2]byte
		if _, err := io.ReadFull(reader, lengthBytes[:]); err != nil {
			return 1
		}
		segmentLength := int(binary.BigEndian.Uint16(lengthBytes[:]))
		if segmentLength < 2 {
			return 1
		}
		payloadLength := segmentLength - 2
		if marker == 0xE1 && payloadLength >= 8 {
			payload := make([]byte, payloadLength)
			if _, err := io.ReadFull(reader, payload); err != nil {
				return 1
			}
			if string(payload[:6]) == "Exif\x00\x00" {
				return exifOrientation(payload[6:])
			}
			continue
		}
		if _, err := io.CopyN(io.Discard, reader, int64(payloadLength)); err != nil {
			return 1
		}
	}
}

// nextJPEGMarker 读到下一个标记码，跳过 0xFF 填充字节。
func nextJPEGMarker(reader *bufio.Reader) (byte, error) {
	b, err := reader.ReadByte()
	if err != nil {
		return 0, err
	}
	if b != 0xFF {
		return 0, errors.New("thumbnail: expected JPEG marker")
	}
	for {
		marker, err := reader.ReadByte()
		if err != nil {
			return 0, err
		}
		if marker != 0xFF {
			return marker, nil
		}
	}
}

// exifOrientation 在 TIFF 载荷的 IFD0 里读方向标签。任何异常形状都按无方向处理。
func exifOrientation(tiff []byte) uint16 {
	if len(tiff) < 8 {
		return 1
	}
	var order binary.ByteOrder = binary.BigEndian
	switch {
	case tiff[0] == 'I' && tiff[1] == 'I':
		order = binary.LittleEndian
	case tiff[0] == 'M' && tiff[1] == 'M':
	default:
		return 1
	}
	if order.Uint16(tiff[2:4]) != 42 {
		return 1
	}
	ifd0 := int(order.Uint32(tiff[4:8]))
	if ifd0 < 2 || ifd0+2 > len(tiff) {
		return 1
	}
	entryCount := int(order.Uint16(tiff[ifd0 : ifd0+2]))
	for i := 0; i < entryCount; i++ {
		entry := ifd0 + 2 + i*12
		if entry+12 > len(tiff) {
			return 1
		}
		if order.Uint16(tiff[entry:entry+2]) != 0x0112 { // Orientation
			continue
		}
		if order.Uint16(tiff[entry+2:entry+4]) != 3 { // SHORT
			return 1
		}
		// count=1 的 SHORT 内联在 4 字节值字段的前两字节里。
		value := order.Uint16(tiff[entry+8 : entry+10])
		if value >= 1 && value <= 8 {
			return value
		}
		return 1
	}
	return 1
}

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
// 字段允许零值可用（&ThumbnailStore{dir: dir}），并发状态经 ensureInit 惰性建立。
type ThumbnailStore struct {
	dir string

	mu       sync.Mutex
	inflight map[string]*thumbCall
	buildSem chan struct{}
	initOnce sync.Once
	closed   bool
	closeCh  chan struct{}
	wg       sync.WaitGroup
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
// 阻塞点全部监听 closeCh 或 buildCtx 取消。
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
		return nil
	}
	if !errors.Is(err, os.ErrNotExist) {
		return err
	}
	if err := t.awaitBuild(r.Context(), sourceID+"."+thumbnailVersion(info), originalPath, target); err != nil {
		return err
	}
	return t.serveFile(w, r, target, etag)
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
func (t *ThumbnailStore) ServeCachedThumbnail(w http.ResponseWriter, r *http.Request, sourceID string) error {
	entries, err := os.ReadDir(t.dir)
	if err != nil {
		return err
	}
	var latest os.FileInfo
	var name string
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasPrefix(entry.Name(), sourceID+".") || !strings.HasSuffix(entry.Name(), ".jpg") {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		if latest == nil || info.ModTime().After(latest.ModTime()) || (info.ModTime().Equal(latest.ModTime()) && entry.Name() > name) {
			latest, name = info, entry.Name()
		}
	}
	if latest == nil {
		return os.ErrNotExist
	}
	return t.serveFile(w, r, filepath.Join(t.dir, name), `"`+name+`"`)
}

// Save 接收前端回填的缩略图（前端 WebKit 能解码 Go 解不了的格式，如 HEIC）：
// 校验为尺寸合理的 JPEG 后按当前原文件版本落盘，后续读取即可命中。原文件信息或载荷
// 不合法时返回 false，调用方给 4xx。
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
	return writeAtomically(t.path(sourceID, info), data) == nil
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
// 纳入 wg 计量使 Close 等待在途 Prune 结束（取消透传属后续 PR）。
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

func (t *ThumbnailStore) prune(ctx context.Context, list FileSourceLister) {
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
	t.pruneStale(entries)
}

// pruneStale 删除不再匹配当前版本的缩略图文件：运行期的版本失效
// 靠文件名天然错开，不产生需要即时回收的垃圾。无点分隔、无法归属的文件不动，
// 避免误删并行写入的临时产物；已删除 Source 的遗留文件归属明确，属于清理目标。
func (t *ThumbnailStore) pruneStale(entries []thumbnailPruneEntry) {
	byID := make(map[string]thumbnailPruneEntry, len(entries))
	for _, entry := range entries {
		byID[entry.SourceID] = entry
	}
	files, err := os.ReadDir(t.dir)
	if err != nil {
		return
	}
	for _, file := range files {
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

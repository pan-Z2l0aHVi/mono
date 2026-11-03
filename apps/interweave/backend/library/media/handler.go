package media

import (
	"context"
	"errors"
	"io"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

// PathPrefix 是本地 Source 媒体文件的唯一 AssetServer 路由前缀。
const PathPrefix = "/resource-media/"

// PendingPathPrefix 是尚未持久化媒体授权的唯一 AssetServer 路由前缀。
const PendingPathPrefix = "/pending-resource-media/"

// unavailableQueueDepth 限制待回写的不可达 Source 数量。队列满时丢弃而不是阻塞响应：
// 下一次媒体请求或目录监听会补上同一个结论。
const unavailableQueueDepth = 256

type sourceStore interface {
	Get(ctx context.Context, q storage.Queryer, id string) (storage.SourceModel, error)
}

// AvailabilityReporter 接收「文件确实不可达」的回写请求。nil 表示不启用兜底。
// 返回值表示库内可用性是否真的翻转，调用方据此决定是否推送事件。
type AvailabilityReporter interface {
	ReportFileUnavailable(ctx context.Context, sourceID string) (bool, error)
}

type Handler struct {
	sources  sourceStore
	query    storage.Queryer
	previews *PendingPreviewRegistry
	thumbs   *ThumbnailStore
	reporter AvailabilityReporter

	unavailableCh  chan string
	closeOnce      sync.Once
	drainCompleted chan struct{}
}

// statFile 允许单测注入 stat 错误：以 root 或属主身份运行时 chmod 拦不住权限错误，
// 只能靠替换函数构造 EACCES 场景。生产代码不得在运行期改写。
var statFile = os.Stat

func NewHandler(sources sourceStore, query storage.Queryer, previews *PendingPreviewRegistry, thumbs *ThumbnailStore, reporter AvailabilityReporter) *Handler {
	h := &Handler{
		sources:        sources,
		query:          query,
		previews:       previews,
		thumbs:         thumbs,
		reporter:       reporter,
		unavailableCh:  make(chan string, unavailableQueueDepth),
		drainCompleted: make(chan struct{}),
	}
	go h.drainUnavailable()
	return h
}

// Close 关闭回写队列并等待在途回写结束，避免应用退出时丢结论。
func (h *Handler) Close() {
	h.closeOnce.Do(func() { close(h.unavailableCh) })
	<-h.drainCompleted
}

// 单 worker 串行回写：缩略图列表里一个坏文件会同时打出十几个 404，
// 逐请求起 goroutine 只会把同一个结论写很多遍。
func (h *Handler) drainUnavailable() {
	defer close(h.drainCompleted)
	for sourceID := range h.unavailableCh {
		if h.reporter == nil {
			continue
		}
		if _, err := h.reporter.ReportFileUnavailable(context.Background(), sourceID); err != nil {
			log.Printf("interweave: report unavailable source %s failed: %v", sourceID, err)
		}
	}
}

// Middleware 拦截媒体前缀，其余请求继续交给 Wails 前端 AssetServer。
func (h *Handler) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, PathPrefix) &&
			!strings.HasPrefix(r.URL.Path, PendingPathPrefix) &&
			!strings.HasPrefix(r.URL.Path, ThumbnailPathPrefix) {
			next.ServeHTTP(w, r)
			return
		}
		h.ServeHTTP(w, r)
	})
}

// ServeHTTP 只按 Source 身份或 pending token 读取本地文件，不接受调用方路径。
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// POST 只属于缩略图回填；媒体与 pending 是纯读路由，其余方法保持 405。
	thumbnailRoute := strings.HasPrefix(r.URL.Path, ThumbnailPathPrefix)
	methodAllowed := r.Method == http.MethodGet || r.Method == http.MethodHead ||
		(thumbnailRoute && r.Method == http.MethodPost)
	if !methodAllowed {
		w.Header().Set("Allow", "GET, HEAD")
		if thumbnailRoute {
			w.Header().Set("Allow", "GET, HEAD, POST")
		}
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("X-Content-Type-Options", "nosniff")

	if strings.HasPrefix(r.URL.Path, PendingPathPrefix) {
		h.servePendingPreview(w, r)
		return
	}
	if strings.HasPrefix(r.URL.Path, ThumbnailPathPrefix) {
		h.serveThumbnailRoute(w, r)
		return
	}
	if !strings.HasPrefix(r.URL.Path, PathPrefix) {
		http.NotFound(w, r)
		return
	}

	sourceID := strings.TrimPrefix(r.URL.Path, PathPrefix)
	if sourceID == "" || strings.ContainsAny(sourceID, `/\\`) {
		http.NotFound(w, r)
		return
	}

	source, err := h.sources.Get(r.Context(), h.query, sourceID)
	if err != nil || source.Type != storage.SourceTypeFile || !source.Available {
		// 库内已经是不可用（或已删除），无需回写：ApplyFileAvailability 会是幂等 no-op。
		http.NotFound(w, r)
		return
	}
	h.serveLocalFileForSource(w, r, sourceID, source.Location)
}

// serveThumbnailRoute 处理缩略图读取与前端回填。回填走同一路由的 POST：缩略图是
// 按 Source 派生的缓存，身份就是 Source 本身，不需要独立的 Wails Service 方法。
func (h *Handler) serveThumbnailRoute(w http.ResponseWriter, r *http.Request) {
	sourceID := strings.TrimPrefix(r.URL.Path, ThumbnailPathPrefix)
	if sourceID == "" || strings.ContainsAny(sourceID, `/\\`) || h.thumbs == nil {
		http.NotFound(w, r)
		return
	}
	source, err := h.sources.Get(r.Context(), h.query, sourceID)
	if err != nil || source.Type != storage.SourceTypeFile || !source.Available {
		// 与媒体读取同一套语义：库内不可用（或已删除）一律 404。
		http.NotFound(w, r)
		return
	}

	info, ok := h.statAvailableOriginal(w, r, sourceID, source.Location)
	if !ok {
		return
	}
	if r.Method == http.MethodPost {
		h.saveThumbnail(w, r, sourceID, source.Location, info)
		return
	}
	if err := h.thumbs.ServeThumbnail(w, r, sourceID, source.Location, info); err != nil {
		if errors.Is(err, ErrUnsupportedThumbnail) {
			// Go 解不了的格式（HEIC 等）交给前端回填路径：前端按 404 回退到原图捕获。
			http.NotFound(w, r)
			return
		}
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
	}
}

// saveThumbnail 接收前端捕获的缩略图并落盘。成功回 204；载荷无效回 415，
// 让前端保持「本次会话直接用捕获结果」的现状，下次挂载再试。
func (h *Handler) saveThumbnail(w http.ResponseWriter, r *http.Request, sourceID string, location string, info os.FileInfo) {
	data, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxThumbnailUploadBytes))
	if err != nil {
		http.Error(w, http.StatusText(http.StatusRequestEntityTooLarge), http.StatusRequestEntityTooLarge)
		return
	}
	if !h.thumbs.Save(sourceID, info, data) {
		http.Error(w, http.StatusText(http.StatusUnsupportedMediaType), http.StatusUnsupportedMediaType)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// statAvailableOriginal 复用媒体读取的可用性语义：stat 失败时把结论回写并给 404。
func (h *Handler) statAvailableOriginal(w http.ResponseWriter, r *http.Request, sourceID string, location string) (os.FileInfo, bool) {
	info, err := statFile(location)
	if err != nil || !info.Mode().IsRegular() {
		if sourceID != "" && core.FileDefinitelyUnavailable(err, info) {
			h.enqueueUnavailable(sourceID)
		}
		http.NotFound(w, r)
		return nil, false
	}
	return info, true
}

func (h *Handler) servePendingPreview(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimPrefix(r.URL.Path, PendingPathPrefix)
	if token == "" || strings.ContainsAny(token, `/\\`) || h.previews == nil {
		http.NotFound(w, r)
		return
	}
	location, exists := h.previews.Get(token)
	if !exists {
		http.NotFound(w, r)
		return
	}
	// pending 预览还没有 Source 身份，文件不可达时无处回写。
	h.serveLocalFileForSource(w, r, "", location)
}

// serveLocalFileForSource 在「库内记为可用、实际取不到」时把结论回写：
// 这是目录监听之外的第二条信号，覆盖用户真的去打开的场景。sourceID 为空表示
// 没有 Source 身份可回写（pending 预览）。原文件永远 no-store：可用性随时可能翻转，
// 缓存过期语义交给缩略图路径的 ETag 协商，这里不做任何浏览器缓存。
func (h *Handler) serveLocalFileForSource(w http.ResponseWriter, r *http.Request, sourceID string, location string) {
	w.Header().Set("Cache-Control", "no-store")
	info, err := statFile(location)
	if err != nil || !info.Mode().IsRegular() {
		if sourceID != "" && core.FileDefinitelyUnavailable(err, info) {
			h.enqueueUnavailable(sourceID)
		}
		http.NotFound(w, r)
		return
	}
	file, err := os.Open(location)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer file.Close()

	if contentType := mime.TypeByExtension(filepath.Ext(location)); contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}
	http.ServeContent(w, r, filepath.Base(location), info.ModTime(), file)
}

func (h *Handler) enqueueUnavailable(sourceID string) {
	if h.reporter == nil {
		return
	}
	select {
	case h.unavailableCh <- sourceID:
	default:
		log.Printf("interweave: unavailable report queue full, dropping source %s", sourceID)
	}
}

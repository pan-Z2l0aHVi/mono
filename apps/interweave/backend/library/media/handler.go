package media

import (
	"context"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

// PathPrefix 是本地 Source 媒体文件的唯一 AssetServer 路由前缀。
const PathPrefix = "/resource-media/"

// PendingPathPrefix 是尚未持久化媒体授权的唯一 AssetServer 路由前缀。
const PendingPathPrefix = "/pending-resource-media/"

type sourceStore interface {
	Get(ctx context.Context, q storage.Queryer, id string) (storage.SourceModel, error)
}

type Handler struct {
	sources  sourceStore
	query    storage.Queryer
	previews *PendingPreviewRegistry
}

func NewHandler(sources sourceStore, query storage.Queryer, previews *PendingPreviewRegistry) *Handler {
	return &Handler{sources: sources, query: query, previews: previews}
}

// Middleware 拦截媒体前缀，其余请求继续交给 Wails 前端 AssetServer。
func (h *Handler) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, PathPrefix) && !strings.HasPrefix(r.URL.Path, PendingPathPrefix) {
			next.ServeHTTP(w, r)
			return
		}
		h.ServeHTTP(w, r)
	})
}

// ServeHTTP 只按 Source 身份或 pending token 读取本地文件，不接受调用方路径。
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")

	if strings.HasPrefix(r.URL.Path, PendingPathPrefix) {
		h.servePendingPreview(w, r)
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
		http.NotFound(w, r)
		return
	}
	serveLocalFile(w, r, source.Location)
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
	serveLocalFile(w, r, location)
}

func serveLocalFile(w http.ResponseWriter, r *http.Request, location string) {
	info, err := os.Stat(location)
	if err != nil || !info.Mode().IsRegular() {
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

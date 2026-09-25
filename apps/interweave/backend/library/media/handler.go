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

type sourceStore interface {
	Get(ctx context.Context, q storage.Queryer, id string) (storage.SourceModel, error)
}

type Handler struct {
	sources sourceStore
	query   storage.Queryer
}

func NewHandler(sources sourceStore, query storage.Queryer) *Handler {
	return &Handler{sources: sources, query: query}
}

// Middleware 拦截媒体前缀，其余请求继续交给 Wails 前端 AssetServer。
func (h *Handler) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, PathPrefix) {
			next.ServeHTTP(w, r)
			return
		}
		h.ServeHTTP(w, r)
	})
}

// ServeHTTP 只按 Source 身份读取已持久化的可用本地文件，不接受调用方路径。
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
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

	info, err := os.Stat(source.Location)
	if err != nil || !info.Mode().IsRegular() {
		http.NotFound(w, r)
		return
	}
	file, err := os.Open(source.Location)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer file.Close()

	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	if contentType := mime.TypeByExtension(filepath.Ext(source.Location)); contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}
	http.ServeContent(w, r, filepath.Base(source.Location), info.ModTime(), file)
}

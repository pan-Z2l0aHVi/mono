package media

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

func openTestDB(t *testing.T) *storage.DB {
	t.Helper()
	db, err := storage.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func insertSource(t *testing.T, db *storage.DB, source storage.SourceModel) {
	t.Helper()
	ctx := context.Background()
	resources := storage.ResourceStore{}
	sources := storage.SourceStore{}
	if err := resources.Insert(ctx, db.SqlDB(), storage.ResourceModel{
		ID:        source.ResourceID,
		Title:     "media test",
		CreatedAt: time.Now().UnixMilli(),
		UpdatedAt: time.Now().UnixMilli(),
	}); err != nil {
		t.Fatalf("insert resource: %v", err)
	}
	if err := sources.Insert(ctx, db.SqlDB(), source); err != nil {
		t.Fatalf("insert source: %v", err)
	}
}

func TestHandlerServesAvailableFileSourceWithRange(t *testing.T) {
	db := openTestDB(t)
	mediaPath := filepath.Join(t.TempDir(), "sample.mp4")
	if err := os.WriteFile(mediaPath, []byte("0123456789"), 0o600); err != nil {
		t.Fatalf("write media fixture: %v", err)
	}
	insertSource(t, db, storage.SourceModel{
		ID:           "source-video",
		ResourceID:   "resource-video",
		Type:         storage.SourceTypeFile,
		Location:     mediaPath,
		Available:    true,
		IsPreferred:  true,
		MetadataJSON: "",
		CreatedAt:    time.Now().UnixMilli(),
		UpdatedAt:    time.Now().UnixMilli(),
	})

	handler := NewHandler(storage.SourceStore{}, db.SqlDB())
	request := httptest.NewRequest(http.MethodGet, PathPrefix+"source-video", nil)
	request.Header.Set("Range", "bytes=2-5")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusPartialContent {
		t.Fatalf("expected 206, got %d: %s", response.Code, response.Body.String())
	}
	if response.Body.String() != "2345" {
		t.Fatalf("expected ranged bytes 2345, got %q", response.Body.String())
	}
	if contentType := response.Header().Get("Content-Type"); contentType != "video/mp4" {
		t.Fatalf("expected video/mp4, got %q", contentType)
	}
	if cacheControl := response.Header().Get("Cache-Control"); cacheControl != "no-store" {
		t.Fatalf("expected no-store, got %q", cacheControl)
	}
}

func TestHandlerRejectsUnavailableNonFileAndInvalidRequests(t *testing.T) {
	db := openTestDB(t)
	availablePath := filepath.Join(t.TempDir(), "available.png")
	if err := os.WriteFile(availablePath, []byte("image"), 0o600); err != nil {
		t.Fatalf("write media fixture: %v", err)
	}
	now := time.Now().UnixMilli()
	insertSource(t, db, storage.SourceModel{
		ID: "unavailable", ResourceID: "resource-unavailable", Type: storage.SourceTypeFile,
		Location: availablePath, Available: false, IsPreferred: true, CreatedAt: now, UpdatedAt: now,
	})
	insertSource(t, db, storage.SourceModel{
		ID: "url", ResourceID: "resource-url", Type: storage.SourceTypeURL,
		Location: "https://example.com/video.mp4", Available: true, IsPreferred: true, CreatedAt: now, UpdatedAt: now,
	})

	handler := NewHandler(storage.SourceStore{}, db.SqlDB())
	for _, test := range []struct {
		name   string
		method string
		path   string
		status int
	}{
		{name: "unknown source", method: http.MethodGet, path: PathPrefix + "missing", status: http.StatusNotFound},
		{name: "unavailable file", method: http.MethodGet, path: PathPrefix + "unavailable", status: http.StatusNotFound},
		{name: "url source", method: http.MethodGet, path: PathPrefix + "url", status: http.StatusNotFound},
		{name: "nested path", method: http.MethodGet, path: PathPrefix + "source/child", status: http.StatusNotFound},
		{name: "encoded slash", method: http.MethodGet, path: PathPrefix + "source%2F" + "child", status: http.StatusNotFound},
		{name: "unsupported method", method: http.MethodPost, path: PathPrefix + "url", status: http.StatusMethodNotAllowed},
	} {
		t.Run(test.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, httptest.NewRequest(test.method, test.path, nil))
			if response.Code != test.status {
				t.Fatalf("expected %d, got %d", test.status, response.Code)
			}
		})
	}
}

func TestHandlerMiddlewareFallsBackToDefaultAssetHandler(t *testing.T) {
	db := openTestDB(t)
	handler := NewHandler(storage.SourceStore{}, db.SqlDB())
	middleware := handler.Middleware(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	response := httptest.NewRecorder()
	middleware.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/index.html", nil))
	if response.Code != http.StatusNoContent {
		t.Fatalf("expected default handler response, got %d", response.Code)
	}
}

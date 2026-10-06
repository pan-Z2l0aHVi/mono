package media

import (
	"context"
	"errors"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync"
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

// newTestHandler 建 handler 并在用例结束前排空回写 worker，避免测试遗留 goroutine。
func newTestHandler(t *testing.T, sources sourceStore, query storage.Queryer, previews *PendingPreviewRegistry, reporter AvailabilityReporter) *Handler {
	t.Helper()
	handler := NewHandler(sources, query, previews, reporter)
	t.Cleanup(handler.Close)
	return handler
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

	handler := newTestHandler(t, storage.SourceStore{}, db.SqlDB(), NewPendingPreviewRegistry(), nil)
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

	handler := newTestHandler(t, storage.SourceStore{}, db.SqlDB(), NewPendingPreviewRegistry(), nil)
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

// recordingReporter 记录媒体兜底回写的 Source 身份与错误，便于断言「报了什么」而不只是「响应码」。
type recordingReporter struct {
	mu        sync.Mutex
	sourceIDs []string
	err       error
}

func (r *recordingReporter) ReportFileUnavailable(_ context.Context, sourceID string) (bool, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.sourceIDs = append(r.sourceIDs, sourceID)
	return true, r.err
}

func (r *recordingReporter) recorded() []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	return append([]string(nil), r.sourceIDs...)
}

// waitForReports 轮询等待回写抵达：回写在独立 worker 上异步发生，固定 sleep 是竞态假阴性。
func waitForReports(t *testing.T, reporter *recordingReporter, want int) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for len(reporter.recorded()) < want {
		if time.Now().After(deadline) {
			t.Fatalf("expected %d unavailable reports, got %d", want, len(reporter.recorded()))
		}
		time.Sleep(5 * time.Millisecond)
	}
}

// assertNoReport 先等 worker 处理完在途消息再断言「没有上报」，避免假通过。
func assertNoReport(t *testing.T, reporter *recordingReporter) {
	t.Helper()
	deadline := time.Now().Add(200 * time.Millisecond)
	for {
		if got := reporter.recorded(); len(got) != 0 {
			t.Fatalf("expected no unavailable report, got %v", got)
		}
		if time.Now().After(deadline) {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
}

// 库内记为可用、实际取不到时必须回写：这是目录监听之外的第二条信号。
func TestHandlerReportsFileAbsentThoughRecordedAvailable(t *testing.T) {
	db := openTestDB(t)
	missing := filepath.Join(t.TempDir(), "deleted.mp4")
	insertSource(t, db, storage.SourceModel{
		ID: "source-missing", ResourceID: "resource-missing", Type: storage.SourceTypeFile,
		Location: missing, Available: true, IsPreferred: true,
		CreatedAt: time.Now().UnixMilli(), UpdatedAt: time.Now().UnixMilli(),
	})
	reporter := &recordingReporter{}
	handler := newTestHandler(t, storage.SourceStore{}, db.SqlDB(), NewPendingPreviewRegistry(), reporter)

	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, PathPrefix+"source-missing", nil))
	if response.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", response.Code)
	}

	waitForReports(t, reporter, 1)
	if got := reporter.recorded()[0]; got != "source-missing" {
		t.Fatalf("expected report for source-missing, got %q", got)
	}
}

// 目录或管道占位同样不可服务，也应回写：媒体请求必然 404。
func TestHandlerReportsNonRegularFile(t *testing.T) {
	db := openTestDB(t)
	insertSource(t, db, storage.SourceModel{
		ID: "source-dir", ResourceID: "resource-dir", Type: storage.SourceTypeFile,
		Location: t.TempDir(), Available: true, IsPreferred: true,
		CreatedAt: time.Now().UnixMilli(), UpdatedAt: time.Now().UnixMilli(),
	})
	reporter := &recordingReporter{}
	handler := newTestHandler(t, storage.SourceStore{}, db.SqlDB(), NewPendingPreviewRegistry(), reporter)

	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, PathPrefix+"source-dir", nil))
	if response.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", response.Code)
	}

	waitForReports(t, reporter, 1)
}

// 权限类错误不能推断文件已消失：以 root 或属主身份运行时 chmod 拦不住，
// 因此注入 stat 函数构造 EACCES。
func TestHandlerDoesNotReportPermissionError(t *testing.T) {
	db := openTestDB(t)
	present := filepath.Join(t.TempDir(), "locked.mp4")
	if err := os.WriteFile(present, []byte("0123456789"), 0o600); err != nil {
		t.Fatalf("write media fixture: %v", err)
	}
	insertSource(t, db, storage.SourceModel{
		ID: "source-locked", ResourceID: "resource-locked", Type: storage.SourceTypeFile,
		Location: present, Available: true, IsPreferred: true,
		CreatedAt: time.Now().UnixMilli(), UpdatedAt: time.Now().UnixMilli(),
	})
	restore := statFile
	statFile = func(string) (os.FileInfo, error) {
		return nil, &fs.PathError{Op: "stat", Path: present, Err: fs.ErrPermission}
	}
	t.Cleanup(func() { statFile = restore })

	reporter := &recordingReporter{}
	handler := newTestHandler(t, storage.SourceStore{}, db.SqlDB(), NewPendingPreviewRegistry(), reporter)

	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, PathPrefix+"source-locked", nil))
	if response.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", response.Code)
	}

	assertNoReport(t, reporter)
}

// pending 预览还没有 Source 身份，文件不可达时无处回写。
func TestHandlerDoesNotReportPendingPreview(t *testing.T) {
	previews := NewPendingPreviewRegistry()
	pendingPath := filepath.Join(t.TempDir(), "pending.mp4")
	if err := os.WriteFile(pendingPath, []byte("0123456789"), 0o600); err != nil {
		t.Fatalf("write pending fixture: %v", err)
	}
	token, err := previews.Register(pendingPath)
	if err != nil {
		t.Fatalf("register pending preview: %v", err)
	}
	if err := os.Remove(pendingPath); err != nil {
		t.Fatalf("remove pending fixture: %v", err)
	}
	reporter := &recordingReporter{}
	handler := newTestHandler(t, storage.SourceStore{}, nil, previews, reporter)

	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, PendingPathPrefix+token, nil))
	if response.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", response.Code)
	}

	assertNoReport(t, reporter)
}

// 回写失败不能改变 404 响应：媒体请求的结果只取决于文件本身。
func TestHandlerKeeps404WhenReporterFails(t *testing.T) {
	db := openTestDB(t)
	insertSource(t, db, storage.SourceModel{
		ID: "source-failing", ResourceID: "resource-failing", Type: storage.SourceTypeFile,
		Location: filepath.Join(t.TempDir(), "deleted.mp4"), Available: true, IsPreferred: true,
		CreatedAt: time.Now().UnixMilli(), UpdatedAt: time.Now().UnixMilli(),
	})
	reporter := &recordingReporter{err: errors.New("db unavailable")}
	handler := newTestHandler(t, storage.SourceStore{}, db.SqlDB(), NewPendingPreviewRegistry(), reporter)

	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, PathPrefix+"source-failing", nil))
	if response.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", response.Code)
	}

	waitForReports(t, reporter, 1)
}

func TestHandlerMiddlewareFallsBackToDefaultAssetHandler(t *testing.T) {
	db := openTestDB(t)
	handler := newTestHandler(t, storage.SourceStore{}, db.SqlDB(), NewPendingPreviewRegistry(), nil)
	middleware := handler.Middleware(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	response := httptest.NewRecorder()
	middleware.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/index.html", nil))
	if response.Code != http.StatusNoContent {
		t.Fatalf("expected default handler response, got %d", response.Code)
	}
}

func TestHandlerServesPendingPreviewWithRangeAndRevokesReleasedToken(t *testing.T) {
	mediaPath := filepath.Join(t.TempDir(), "pending.mp4")
	if err := os.WriteFile(mediaPath, []byte("0123456789"), 0o600); err != nil {
		t.Fatalf("write media fixture: %v", err)
	}
	previews := NewPendingPreviewRegistry()
	token, err := previews.Register(mediaPath)
	if err != nil {
		t.Fatalf("register pending preview: %v", err)
	}
	handler := newTestHandler(t, storage.SourceStore{}, nil, previews, nil)

	request := httptest.NewRequest(http.MethodGet, PendingPathPrefix+token, nil)
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
	if nosniff := response.Header().Get("X-Content-Type-Options"); nosniff != "nosniff" {
		t.Fatalf("expected nosniff, got %q", nosniff)
	}

	headResponse := httptest.NewRecorder()
	handler.ServeHTTP(headResponse, httptest.NewRequest(http.MethodHead, PendingPathPrefix+token, nil))
	if headResponse.Code != http.StatusOK || headResponse.Body.Len() != 0 {
		t.Fatalf("expected empty HEAD 200, got status=%d body=%q", headResponse.Code, headResponse.Body.String())
	}

	previews.Release(token)
	for _, test := range []struct {
		name   string
		method string
		path   string
		status int
	}{
		{name: "released token", method: http.MethodGet, path: PendingPathPrefix + token, status: http.StatusNotFound},
		{name: "unknown token", method: http.MethodGet, path: PendingPathPrefix + "unknown", status: http.StatusNotFound},
		{name: "nested path", method: http.MethodGet, path: PendingPathPrefix + token + "/child", status: http.StatusNotFound},
		{name: "unsupported method", method: http.MethodPost, path: PendingPathPrefix + token, status: http.StatusMethodNotAllowed},
	} {
		t.Run(test.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, httptest.NewRequest(test.method, test.path, nil))
			if response.Code != test.status {
				t.Fatalf("expected %d, got %d", response.Code, test.status)
			}
		})
	}
}

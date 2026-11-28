package library

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/media"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

func TestRuntimeStartAndCloseIdempotent(t *testing.T) {
	rt, err := NewRuntime(RuntimeOptions{DataDir: t.TempDir()})
	if err != nil {
		t.Fatalf("NewRuntime error: %v", err)
	}

	file := filepath.Join(t.TempDir(), "preview.png")
	if err := os.WriteFile(file, []byte("png"), 0o600); err != nil {
		t.Fatalf("write preview fixture: %v", err)
	}
	prepared, err := rt.Core().PrepareFilePreview(file)
	if err != nil {
		t.Fatalf("PrepareFilePreview error: %v", err)
	}
	if prepared.Token == "" || prepared.MediaURL == "" {
		t.Fatalf("expected image preview token and media URL, got %+v", prepared)
	}

	rt.Start(context.Background())
	rt.Start(context.Background()) // 重复 Start 必须幂等

	if err := rt.Close(); err != nil {
		t.Fatalf("first Close error: %v", err)
	}
	if err := rt.Close(); err != nil {
		t.Fatalf("second Close error: %v", err)
	}

	rec := httptest.NewRecorder()
	rt.MediaHandler().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, prepared.MediaURL, nil))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected pending preview to be cleared on Runtime.Close (404), got %d", rec.Code)
	}

	// Close 之后调用 Start 必须是安全空操作。
	rt.Start(context.Background())
}

func TestRuntimeCloseWithoutStart(t *testing.T) {
	rt, err := NewRuntime(RuntimeOptions{DataDir: t.TempDir()})
	if err != nil {
		t.Fatalf("NewRuntime error: %v", err)
	}
	if err := rt.Close(); err != nil {
		t.Fatalf("Close without Start error: %v", err)
	}
}

// 并发 ServeHTTP 404 与 Runtime.Close() 竞速：
// 验证媒体 404 回写队列关闭保护不会触发 send on closed channel panic，
// 且 -race 下无数据竞争。
func TestRuntimeConcurrentServeHTTP404AndClose(t *testing.T) {
	rt, err := NewRuntime(RuntimeOptions{DataDir: t.TempDir()})
	if err != nil {
		t.Fatalf("NewRuntime error: %v", err)
	}
	t.Cleanup(func() { _ = rt.Close() })

	mediaDir := t.TempDir()
	missingFile := filepath.Join(mediaDir, "vanished.mp4")
	if err := os.WriteFile(missingFile, []byte("0123456789"), 0o600); err != nil {
		t.Fatalf("write media fixture: %v", err)
	}
	view, err := rt.Core().CreateResource(context.Background(), core.CreateResourceInput{
		Kind:     storage.SourceTypeFile,
		Location: missingFile,
	})
	if err != nil {
		t.Fatalf("CreateResource error: %v", err)
	}
	sourceID := view.Sources[0].ID

	// 删除底层文件，使后续 ServeHTTP 命中「库内可用、实际不存在」404 回写路径。
	if err := os.Remove(missingFile); err != nil {
		t.Fatalf("remove media fixture: %v", err)
	}

	rt.Start(context.Background())

	const workers = 16
	const requestsPerWorker = 25
	startGate := make(chan struct{})
	var wg sync.WaitGroup

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-startGate
			for j := 0; j < requestsPerWorker; j++ {
				rec := httptest.NewRecorder()
				req := httptest.NewRequest(http.MethodGet, media.PathPrefix+sourceID, nil)
				rt.MediaHandler().ServeHTTP(rec, req)
				if rec.Code != http.StatusNotFound {
					t.Errorf("expected 404 for missing file, got %d", rec.Code)
					return
				}
			}
		}()
	}

	// 与 404 洪峰并发触发两次 Close，验证幂等与无 panic。
	var closeWg sync.WaitGroup
	for i := 0; i < 2; i++ {
		closeWg.Add(1)
		go func() {
			defer closeWg.Done()
			<-startGate
			if err := rt.Close(); err != nil {
				t.Errorf("concurrent Close error: %v", err)
			}
		}()
	}

	close(startGate)
	wg.Wait()
	closeWg.Wait()
}

func TestRuntimeCloseShutsDownRecoveryScans(t *testing.T) {
	rt, err := NewRuntime(RuntimeOptions{DataDir: t.TempDir()})
	if err != nil {
		t.Fatalf("NewRuntime error: %v", err)
	}
	if err := rt.Close(); err != nil {
		t.Fatalf("Close error: %v", err)
	}
	if _, err := rt.Core().StartRecoveryScan([]string{"s1"}, t.TempDir()); err == nil {
		t.Fatal("expected StartRecoveryScan to fail after Runtime.Close")
	}
}

func TestRuntimeConcurrentStartAndClose(t *testing.T) {
	rt, err := NewRuntime(RuntimeOptions{DataDir: t.TempDir()})
	if err != nil {
		t.Fatalf("NewRuntime error: %v", err)
	}
	start := make(chan struct{})
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		<-start
		rt.Start(context.Background())
	}()
	go func() {
		defer wg.Done()
		<-start
		if err := rt.Close(); err != nil {
			t.Errorf("Close error: %v", err)
		}
	}()
	close(start)
	wg.Wait()
	if err := rt.Close(); err != nil {
		t.Fatalf("final Close error: %v", err)
	}
}

func TestRuntimeLocalMediaServerLifecycle(t *testing.T) {
	rt, err := NewRuntime(RuntimeOptions{
		DataDir:                t.TempDir(),
		EnableLocalMediaServer: true,
		IsProduction:           false,
	})
	if err != nil {
		t.Fatalf("NewRuntime with local media server error: %v", err)
	}
	defer func() { _ = rt.Close() }()

	if !strings.HasPrefix(rt.MediaURLBuilder().SourceMediaURL("s1"), "http://127.0.0.1:") {
		t.Fatalf("expected MediaURLBuilder to point to loopback local server, got %q", rt.MediaURLBuilder().SourceMediaURL("s1"))
	}

	file := filepath.Join(t.TempDir(), "clip.mp4")
	if err := os.WriteFile(file, []byte("fake-mp4-bytes"), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}
	prepared, err := rt.Core().PrepareFilePreview(file)
	if err != nil {
		t.Fatalf("PrepareFilePreview error: %v", err)
	}
	if !strings.HasPrefix(prepared.MediaURL, "http://127.0.0.1:") {
		t.Fatalf("expected loopback URL for pending preview, got %q", prepared.MediaURL)
	}

	resp, err := http.Get(prepared.MediaURL)
	if err != nil {
		t.Fatalf("GET local media preview error: %v", err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 from local media server, got %d", resp.StatusCode)
	}

	if err := rt.Close(); err != nil {
		t.Fatalf("Close error: %v", err)
	}
	// 关闭后本地端口应拒绝连接。
	if resp2, err := http.Get(prepared.MediaURL); err == nil {
		_ = resp2.Body.Close()
		t.Fatalf("expected local media server to be closed, got status %d", resp2.StatusCode)
	}
}

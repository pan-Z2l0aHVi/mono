package library

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
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
	token, err := rt.PendingPreviews().Register(file)
	if err != nil {
		t.Fatalf("register pending preview: %v", err)
	}

	rt.Start(context.Background())
	rt.Start(context.Background()) // 重复 Start 必须幂等

	if err := rt.Close(); err != nil {
		t.Fatalf("first Close error: %v", err)
	}
	if err := rt.Close(); err != nil {
		t.Fatalf("second Close error: %v", err)
	}

	if _, exists := rt.PendingPreviews().Get(token); exists {
		t.Fatal("expected PendingPreviews to be cleared on Runtime.Close")
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
	if _, err := rt.Core().RecoveryScans().Start([]string{"s1"}, t.TempDir()); err == nil {
		t.Fatal("expected RecoveryScans().Start to fail after Runtime.Close")
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

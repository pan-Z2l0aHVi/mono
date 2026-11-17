package media

import (
	"os"
	"path/filepath"
	"testing"
)

func writePreviewFixture(t *testing.T, directory string, name string) string {
	t.Helper()
	location := filepath.Join(directory, name)
	if err := os.WriteFile(location, []byte(name), 0o600); err != nil {
		t.Fatalf("write preview fixture: %v", err)
	}
	return location
}

func TestPendingPreviewRegistryEvictsLeastRecentlyUsed(t *testing.T) {
	directory := t.TempDir()
	registry := newPendingPreviewRegistry(2)
	first, err := registry.Register(writePreviewFixture(t, directory, "first.png"))
	if err != nil {
		t.Fatalf("register first preview: %v", err)
	}
	second, err := registry.Register(writePreviewFixture(t, directory, "second.png"))
	if err != nil {
		t.Fatalf("register second preview: %v", err)
	}
	if _, ok := registry.Get(first); !ok {
		t.Fatal("expected first preview before eviction")
	}
	third, err := registry.Register(writePreviewFixture(t, directory, "third.png"))
	if err != nil {
		t.Fatalf("register third preview: %v", err)
	}

	if _, ok := registry.Get(second); ok {
		t.Fatal("expected least recently used preview to be evicted")
	}
	if _, ok := registry.Get(first); !ok {
		t.Fatal("expected refreshed preview to remain registered")
	}
	if _, ok := registry.Get(third); !ok {
		t.Fatal("expected newest preview to remain registered")
	}
	if registry.recent.Len() != 2 || len(registry.entries) != 2 {
		t.Fatalf("expected capacity 2, got entries=%d recent=%d", len(registry.entries), registry.recent.Len())
	}
}

func TestPendingPreviewRegistryReleaseClearAndValidation(t *testing.T) {
	directory := t.TempDir()
	location := writePreviewFixture(t, directory, "preview.mp4")
	registry := newPendingPreviewRegistry(2)
	token, err := registry.Register(location)
	if err != nil {
		t.Fatalf("register preview: %v", err)
	}
	if token == "" || token == location {
		t.Fatalf("expected opaque token, got %q", token)
	}
	if _, ok := registry.Get(location); ok {
		t.Fatal("expected file path to be rejected as token")
	}
	if !registry.Release(token) || registry.Release(token) {
		t.Fatal("expected release to be successful and idempotent")
	}

	first, err := registry.Register(location)
	if err != nil {
		t.Fatalf("register first preview: %v", err)
	}
	if _, err := registry.Register(location); err != nil {
		t.Fatalf("register second preview: %v", err)
	}
	registry.Clear()
	if _, ok := registry.Get(first); ok {
		t.Fatal("expected clear to revoke all previews")
	}
}

func TestPendingPreviewRegistryReportsEvictions(t *testing.T) {
	directory := t.TempDir()
	registry := newPendingPreviewRegistry(2)
	var evicted []string
	// 回调在锁外执行，且此刻 token 已失效：宿主可以安全地查表并发送事件。
	registry.SetEvictHandler(func(token string) {
		evicted = append(evicted, token)
		if _, ok := registry.Get(token); ok {
			t.Errorf("expected evicted token %q to be gone when reported", token)
		}
	})

	first, err := registry.Register(writePreviewFixture(t, directory, "first.png"))
	if err != nil {
		t.Fatalf("register first preview: %v", err)
	}
	second, err := registry.Register(writePreviewFixture(t, directory, "second.png"))
	if err != nil {
		t.Fatalf("register second preview: %v", err)
	}
	third, err := registry.Register(writePreviewFixture(t, directory, "third.png"))
	if err != nil {
		t.Fatalf("register third preview: %v", err)
	}
	if len(evicted) != 1 || evicted[0] != first {
		t.Fatalf("expected only first token to be reported, got %v", evicted)
	}

	// 显式释放与退出清理都不属于容量淘汰，不应回调。
	registry.Release(second)
	registry.Release(third)
	registry.Clear()
	if len(evicted) != 1 {
		t.Fatalf("expected release and clear to stay silent, got %v", evicted)
	}
}

func TestPendingPreviewRegistryRejectsMissingAndNonRegularFiles(t *testing.T) {
	directory := t.TempDir()
	registry := newPendingPreviewRegistry(1)
	if _, err := registry.Register(filepath.Join(directory, "missing.png")); err == nil {
		t.Fatal("expected missing file registration to fail")
	}
	if _, err := registry.Register(directory); err == nil {
		t.Fatal("expected directory registration to fail")
	}
}

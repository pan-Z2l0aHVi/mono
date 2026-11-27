//go:build darwin

package service

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

// 真机读写往返：native 的文本剪贴板是 cgo 调用 NSPasteboard，纯 Go 替身证明不了它的接线。
// 用例结束时把剪贴板恢复成用例前的值。
func TestClipboardTextRoundTrip(t *testing.T) {
	ctx := context.Background()
	service := NewOSService()

	original, err := service.ReadClipboardText(ctx)
	if err != nil {
		t.Fatalf("read original clipboard text: %v", err)
	}
	if original != "" {
		t.Cleanup(func() { _ = service.WriteClipboardText(context.Background(), original) })
	}

	value := "interweave clipboard round trip\n第二行"
	if err := service.WriteClipboardText(ctx, value); err != nil {
		t.Fatalf("write clipboard text: %v", err)
	}
	actual, err := service.ReadClipboardText(ctx)
	if err != nil {
		t.Fatalf("read clipboard text back: %v", err)
	}
	if actual != value {
		t.Fatalf("expected %q, got %q", value, actual)
	}
}

func TestClipboardFilePathRoundTrip(t *testing.T) {
	ctx := context.Background()
	service := NewOSService()

	originalText, _ := service.ReadClipboardText(ctx)
	if originalText != "" {
		t.Cleanup(func() { _ = service.WriteClipboardText(context.Background(), originalText) })
	}

	file := filepath.Join(t.TempDir(), " sample file .txt ")
	if err := os.WriteFile(file, []byte("hello"), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}
	resolved, err := filepath.EvalSymlinks(file)
	if err != nil {
		resolved = file
	}

	if err := service.WriteClipboardFilePath(ctx, resolved); err != nil {
		t.Fatalf("write clipboard file path: %v", err)
	}
	paths, err := service.GetClipboardFilePaths(ctx)
	if err != nil {
		t.Fatalf("read clipboard file paths back: %v", err)
	}
	if len(paths) != 1 || paths[0] != resolved {
		t.Fatalf("expected [%q], got %v", resolved, paths)
	}
}

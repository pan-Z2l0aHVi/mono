//go:build darwin

package service

import (
	"context"
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

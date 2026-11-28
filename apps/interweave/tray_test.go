package main

import (
	"bytes"
	"encoding/binary"
	"image/png"
	"testing"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func TestTrayIconsEmbedded(t *testing.T) {
	for name, icon := range map[string][]byte{
		"macOS template": trayTemplateIcon,
		"Linux PNG":      trayIconForLinux,
		"Windows ICO":    trayIconForWindows,
	} {
		if len(icon) == 0 {
			t.Fatalf("expected embedded %s tray icon bytes to be non-empty", name)
		}
	}

	// 校验 Windows ICO 包含高 DPI 托盘与桌面全档位，且四角透明（macOS 风格圆角）。
	if len(trayIconForWindows) < 6 {
		t.Fatal("invalid Windows ICO header")
	}
	count := int(binary.LittleEndian.Uint16(trayIconForWindows[4:6]))
	seen := make(map[int]bool, count)
	for i := 0; i < count; i++ {
		off := 6 + i*16
		w := int(trayIconForWindows[off])
		if w == 0 {
			w = 256
		}
		sz := int(binary.LittleEndian.Uint32(trayIconForWindows[off+8 : off+12]))
		imgOff := int(binary.LittleEndian.Uint32(trayIconForWindows[off+12 : off+16]))
		img, err := png.Decode(bytes.NewReader(trayIconForWindows[imgOff : imgOff+sz]))
		if err != nil {
			t.Fatalf("expected PNG frame at %dx%d: %v", w, w, err)
		}
		_, _, _, a := img.At(0, 0).RGBA()
		if a != 0 {
			t.Fatalf("expected transparent rounded corner at %dx%d, got alpha=%d", w, w, a)
		}
		seen[w] = true
	}
	for _, want := range []int{16, 20, 24, 32, 40, 48, 64, 128, 256} {
		if !seen[want] {
			t.Fatalf("Windows ICO missing expected %dx%d frame", want, want)
		}
	}
}

func TestTrayIconsForPlatform(t *testing.T) {
	macIcon, macTemplate := trayIconsFor("darwin")
	if len(macTemplate) == 0 || len(macIcon) != 0 {
		t.Fatal("macOS should use a template icon only")
	}
	if !bytes.Equal(macTemplate, trayTemplateIcon) {
		t.Fatal("macOS template icon must come from the supplied asset")
	}

	winIcon, winTemplate := trayIconsFor("windows")
	if len(winTemplate) != 0 || !bytes.Equal(winIcon, trayIconForWindows) {
		t.Fatal("Windows should reuse the rounded colored app icon ICO")
	}

	linuxIcon, linuxTemplate := trayIconsFor("linux")
	if len(linuxTemplate) != 0 || !bytes.Equal(linuxIcon, trayIconForLinux) {
		t.Fatal("Linux should use a PNG icon only; Wails cannot decode ICO for the Linux tray")
	}
}

func TestTrayLightModeCheckbox(t *testing.T) {
	menu, item := buildTrayMenu(false, nil, nil, nil)
	if item == nil || !item.IsCheckbox() {
		t.Fatal("light mode must be a checkbox menu item")
	}
	if got := item.Label(); got != trayMenuLightMode {
		t.Fatalf("expected fixed label %q, got %q", trayMenuLightMode, got)
	}
	if item.Checked() {
		t.Fatal("light mode must start unchecked in normal mode")
	}

	item.SetChecked(true)
	menu.Update()
	if !item.Checked() {
		t.Fatal("expected light mode checkbox to reflect the authoritative state")
	}

	_, checkedItem := buildTrayMenu(true, nil, nil, nil)
	if !checkedItem.Checked() {
		t.Fatal("light mode must start checked when already in light mode")
	}
}

func TestMainWindowControllerStateListenerDispose(t *testing.T) {
	controller := &mainWindowController{}
	calls := 0
	dispose := controller.addStateListener(func(bool) { calls++ })

	controller.setLightMode(true)
	if calls != 1 {
		t.Fatalf("expected state listener to be called once, got %d", calls)
	}

	// 托盘随设置销毁时必须注销监听，重建后不能叠加旧菜单的刷新回调。
	dispose()
	controller.setLightMode(false)
	if calls != 1 {
		t.Fatalf("expected disposed state listener not to be called, got %d extra calls", calls-1)
	}
}

// TestMainWindowCloseHookReleasesWebView 钉住轻量模式销毁 WebView 的关键分支：
// 主动销毁的关闭事件不能被取消，Wails 默认监听器才会 close 原生窗口并释放 WKWebView；
// 用户关闭仍交给 shell（最小化到托盘时取消，走 Hide 保留 WebView）。
func TestMainWindowCloseHookReleasesWebView(t *testing.T) {
	controller := &mainWindowController{}
	shellCloses := 0
	controller.onClosing = func(event *application.WindowEvent) {
		shellCloses++
		event.Cancel()
	}

	intent := &windowCloseIntent{}
	hook := controller.closeHook(intent)

	userClose := application.NewWindowEvent()
	hook(userClose)
	if shellCloses != 1 || !userClose.IsCancelled() {
		t.Fatalf("user close must be delegated to shell and cancellable, shellCloses=%d cancelled=%v", shellCloses, userClose.IsCancelled())
	}

	// 轻量模式：意图置位后关闭事件既不进 shell，也不取消，交给 Wails 默认监听器销毁窗口。
	intent.destroyRequested.Store(true)
	lightClose := application.NewWindowEvent()
	hook(lightClose)
	if shellCloses != 1 || lightClose.IsCancelled() {
		t.Fatalf("light-mode destroy must bypass shell without cancelling, shellCloses=%d cancelled=%v", shellCloses, lightClose.IsCancelled())
	}
	if intent.destroyRequested.Load() {
		t.Fatal("destroy intent must be consumed exactly once")
	}

	// 新窗口的关闭不受旧窗口意图影响。
	nextIntent := &windowCloseIntent{}
	nextClose := application.NewWindowEvent()
	controller.closeHook(nextIntent)(nextClose)
	if shellCloses != 2 || !nextClose.IsCancelled() {
		t.Fatalf("new window close must still go through shell, shellCloses=%d cancelled=%v", shellCloses, nextClose.IsCancelled())
	}
}

type stubTrayHandle struct {
	destroyed int
}

func (h *stubTrayHandle) Destroy() {
	h.destroyed++
}

func TestSystemTrayControllerSyncsWithSetting(t *testing.T) {
	created := 0
	var handles []*stubTrayHandle
	enabled := false

	controller := newSystemTrayController(
		func() bool { return enabled },
		func() trayHandle {
			created++
			h := &stubTrayHandle{}
			handles = append(handles, h)
			return h
		},
		func(handle trayHandle) { handle.Destroy() },
	)

	// 初始关闭：不创建托盘。
	controller.Sync()
	if created != 0 {
		t.Fatalf("expected no tray created when initially disabled, got %d", created)
	}

	// 开启后创建一次；重复开启保持幂等。
	enabled = true
	controller.Sync()
	controller.Sync()
	if created != 1 {
		t.Fatalf("expected exactly 1 tray created when enabled, got %d", created)
	}
	if handles[0].destroyed != 0 {
		t.Fatalf("expected active tray not to be destroyed, got %d", handles[0].destroyed)
	}

	// 关闭后立即移除已有托盘；重复关闭不重复销毁。
	enabled = false
	controller.Sync()
	controller.Sync()
	if handles[0].destroyed != 1 {
		t.Fatalf("expected tray to be destroyed once when disabled, got %d", handles[0].destroyed)
	}

	// 再次开启可重新创建新托盘。
	enabled = true
	controller.Sync()
	if created != 2 {
		t.Fatalf("expected tray to be recreated when re-enabled, got %d", created)
	}
}

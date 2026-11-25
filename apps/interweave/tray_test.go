package main

import (
	"bytes"
	"testing"
)

func TestTrayIconsEmbedded(t *testing.T) {
	for name, icon := range map[string][]byte{
		"macOS template":        trayTemplateIcon,
		"Windows light taskbar": trayIconForLightTaskbar,
		"Windows dark taskbar":  trayIconForDarkTaskbar,
	} {
		if len(icon) == 0 {
			t.Fatalf("expected embedded %s tray icon bytes to be non-empty", name)
		}
	}
}

func TestTrayIconsForPlatform(t *testing.T) {
	macIcon, macDark, macTemplate := trayIconsFor("darwin")
	if len(macTemplate) == 0 || len(macIcon) != 0 || len(macDark) != 0 {
		t.Fatal("macOS should use a template icon only")
	}
	if !bytes.Equal(macTemplate, trayTemplateIcon) {
		t.Fatal("macOS template icon must come from the supplied asset")
	}

	winIcon, winDark, winTemplate := trayIconsFor("windows")
	if len(winTemplate) != 0 || !bytes.Equal(winIcon, trayIconForLightTaskbar) || !bytes.Equal(winDark, trayIconForDarkTaskbar) {
		t.Fatal("Windows should map dark artwork to light taskbars and light artwork to dark taskbars")
	}
}

func TestTrayLightModeLabel(t *testing.T) {
	if got := trayLightModeLabel(false); got != trayMenuEnterLightMode {
		t.Fatalf("expected %q in normal mode, got %q", trayMenuEnterLightMode, got)
	}
	if got := trayLightModeLabel(true); got != trayMenuExitLightMode {
		t.Fatalf("expected %q in light mode, got %q", trayMenuExitLightMode, got)
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

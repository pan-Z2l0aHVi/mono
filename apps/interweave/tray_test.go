package main

import "testing"

func TestTrayIconEmbedded(t *testing.T) {
	if len(trayIcon) == 0 {
		t.Fatal("expected embedded tray icon bytes to be non-empty")
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

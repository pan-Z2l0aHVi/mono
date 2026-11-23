package main

import "testing"

func TestTrayIconEmbedded(t *testing.T) {
	if len(trayIcon) == 0 {
		t.Fatal("expected embedded tray icon bytes to be non-empty")
	}
}

func TestHandleWindowCloseMinimizesToTrayWhenEnabled(t *testing.T) {
	cancelled := false
	hidden := false

	handled := handleWindowClose(
		true,
		func() { cancelled = true },
		func() { hidden = true },
	)

	if !handled {
		t.Fatal("expected handleWindowClose to return true when minimizeToTray is enabled")
	}
	if !cancelled {
		t.Fatal("expected close event to be cancelled when minimizeToTray is enabled")
	}
	if !hidden {
		t.Fatal("expected window to be hidden when minimizeToTray is enabled")
	}
}

func TestHandleWindowCloseAllowsExitWhenDisabled(t *testing.T) {
	cancelled := false
	hidden := false

	handled := handleWindowClose(
		false,
		func() { cancelled = true },
		func() { hidden = true },
	)

	if handled {
		t.Fatal("expected handleWindowClose to return false when minimizeToTray is disabled")
	}
	if cancelled || hidden {
		t.Fatalf("expected neither cancel nor hide when disabled, got cancelled=%v hidden=%v", cancelled, hidden)
	}
}

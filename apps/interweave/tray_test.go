package main

import "testing"

func TestTrayIconEmbedded(t *testing.T) {
	if len(trayIcon) == 0 {
		t.Fatal("expected embedded tray icon bytes to be non-empty")
	}
}

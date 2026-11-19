package main

import (
	"path/filepath"
	"testing"
)

func TestAppDescriptionCarriesVersion(t *testing.T) {
	if got := appDescription("1.2.3"); got != "Interweave 1.2.3 桌面应用" {
		t.Fatalf("native about panel has no version field of its own, so the description must carry it; got %q", got)
	}
}

func TestMainWindowEnablesMacTabFocus(t *testing.T) {
	opts := mainWindowOptions()
	if !opts.Mac.WebviewPreferences.TabFocusesLinks.IsSet() || !opts.Mac.WebviewPreferences.TabFocusesLinks.Get() {
		t.Fatalf("expected Mac.WebviewPreferences.TabFocusesLinks to be enabled so Tab reaches buttons and links on macOS")
	}
}

func TestWebviewUserDataDirUsesDataSubdirectory(t *testing.T) {
	dir := filepath.Join("data", "interweave-dev")
	if got, want := webviewUserDataDir(dir), filepath.Join(dir, "webview"); got != want {
		t.Fatalf("expected WebView2 data path %q, got %q", want, got)
	}
}

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
	opts := mainWindowOptionsFor("darwin")
	if !opts.Mac.WebviewPreferences.TabFocusesLinks.IsSet() || !opts.Mac.WebviewPreferences.TabFocusesLinks.Get() {
		t.Fatalf("expected Mac.WebviewPreferences.TabFocusesLinks to be enabled so Tab reaches buttons and links on macOS")
	}
	if opts.Frameless {
		t.Fatal("expected macOS window not to be frameless")
	}
	if !opts.UseApplicationMenu {
		t.Fatal("expected macOS window to keep UseApplicationMenu enabled")
	}
}

func TestMainWindowUsesFramelessIntegratedTitleBarOnWindows(t *testing.T) {
	opts := mainWindowOptionsFor("windows")
	if !opts.Frameless {
		t.Fatal("expected Windows window to enable Frameless for integrated titlebar")
	}
	if opts.UseApplicationMenu {
		t.Fatal("expected Windows window to disable native Win32 menu bar")
	}
	if !opts.Windows.NonClientRegionSupport {
		t.Fatal("expected Windows window to enable NonClientRegionSupport for native drag/snap")
	}
}

func TestWebviewUserDataDirUsesDataSubdirectory(t *testing.T) {
	dir := filepath.Join("data", "interweave-dev")
	if got, want := webviewUserDataDir(dir), filepath.Join(dir, "webview"); got != want {
		t.Fatalf("expected WebView2 data path %q, got %q", want, got)
	}
}

func TestWindowsOptionsAnchorWebView2ToTaggedDataDir(t *testing.T) {
	dir, err := dataDirAt(t.TempDir())
	if err != nil {
		t.Fatalf("dataDirAt: %v", err)
	}
	if filepath.Base(dir) != appDataDirName {
		t.Fatalf("expected data dir to carry the build-tag name %q, got %q", appDataDirName, dir)
	}
	opts := windowsOptions(dir)
	if got, want := opts.WebviewUserDataPath, filepath.Join(dir, "webview"); got != want {
		t.Fatalf("expected WebView2 user data at %q, got %q", want, got)
	}
}

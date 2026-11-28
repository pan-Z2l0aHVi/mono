package main

import (
	"path/filepath"
	"testing"

	"github.com/wailsapp/wails/v3/pkg/application"

	menucontract "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu"
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
		t.Fatal("expected Windows window to enable NonClientRegionSupport for native drag")
	}
}

func TestWindowsSnapLayoutsEnabledByDefault(t *testing.T) {
	t.Setenv(disableWindowsSnapEnv, "")
	opts := mainWindowOptionsFor("windows")
	if !opts.Windows.WebView2CompositionHosting {
		t.Fatal("expected WebView2CompositionHosting so the custom maximize button can provide Snap Layouts")
	}
	if mainWindowOptionsFor("darwin").Windows.WebView2CompositionHosting {
		t.Fatal("expected non-Windows window to leave WebView2CompositionHosting disabled")
	}
}

func TestWindowsSnapLayoutsFallbackSwitch(t *testing.T) {
	for _, value := range []string{"1", "true", "YES"} {
		t.Run(value, func(t *testing.T) {
			t.Setenv(disableWindowsSnapEnv, value)
			if mainWindowOptionsFor("windows").Windows.WebView2CompositionHosting {
				t.Fatalf("expected %s=%q to disable composition hosting", disableWindowsSnapEnv, value)
			}
		})
	}
}

func TestDispatchMenuRoleRoutesAllWindowAndAppRoles(t *testing.T) {
	var called []string
	actions := menuRoleActions{
		showAbout:   func() { called = append(called, "about") },
		quit:        func() { called = append(called, "quit") },
		minimise:    func() { called = append(called, "minimise") },
		closeWindow: func() { called = append(called, "close") },
	}

	for _, role := range []string{
		menucontract.RoleAbout,
		menucontract.RoleQuit,
		menucontract.RoleMinimise,
		menucontract.RoleCloseWindow,
	} {
		if !dispatchMenuRole(role, actions) {
			t.Fatalf("expected role %q to be handled", role)
		}
	}
	if dispatchMenuRole("unknown-role", actions) {
		t.Fatal("expected unknown role to return false")
	}
	want := []string{"about", "quit", "minimise", "close"}
	if len(called) != len(want) {
		t.Fatalf("expected %v, got %v", want, called)
	}
	for i := range want {
		if called[i] != want[i] {
			t.Fatalf("expected %v, got %v", want, called)
		}
	}
}

func TestWebviewUserDataDirUsesDataSubdirectory(t *testing.T) {
	dir := filepath.Join("data", "interweave-dev")
	if got, want := webviewUserDataDir(dir), filepath.Join(dir, "webview"); got != want {
		t.Fatalf("expected WebView2 data path %q, got %q", want, got)
	}
}

func TestMacOptionsAllowMinimizeToTrayWithoutTerminating(t *testing.T) {
	opts := macOptions()
	if opts.ApplicationShouldTerminateAfterLastWindowClosed {
		t.Fatal("expected Mac.ApplicationShouldTerminateAfterLastWindowClosed to be false so window.Hide() does not terminate the app on macOS")
	}
	if opts.ActivationPolicy != application.ActivationPolicyRegular {
		t.Fatalf("expected Mac.ActivationPolicy to start as Regular, got %v", opts.ActivationPolicy)
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
	if !opts.DisableQuitOnLastWindowClosed {
		t.Fatal("expected Windows app to survive WebView destruction in light mode")
	}
}

func TestLinuxOptionsKeepAppAliveInLightMode(t *testing.T) {
	if !linuxOptions().DisableQuitOnLastWindowClosed {
		t.Fatal("expected Linux app to survive WebView destruction in light mode")
	}
}

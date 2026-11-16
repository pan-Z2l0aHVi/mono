package menu

import "testing"

// 命令值是跨进程契约：Go 发什么、前端分派什么。逐字钉住，任何一侧改名先让这个测试变红。
func TestCommandValues(t *testing.T) {
	pairs := []struct {
		command Command
		want    string
	}{
		{CommandAddResource, "add-resource"},
		{CommandImportFromClipboard, "import-from-clipboard"},
		{CommandImportFromLink, "import-from-link"},
		{CommandRefreshLibrary, "refresh-library"},
		{CommandToggleSidebar, "toggle-sidebar"},
		{CommandToggleFilterBar, "toggle-filter-bar"},
		{CommandFocusSearch, "focus-search"},
		{CommandNavigateBack, "navigate-back"},
		{CommandNavigateForward, "navigate-forward"},
		{CommandOpenSettings, "open-settings"},
		{CommandCheckForUpdates, "check-for-updates"},
		{CommandOpenDocumentation, "open-documentation"},
		{CommandReloadWindow, "reload-window"},
		{CommandOpenDevTools, "open-devtools"},
		{CommandCopyAsPlainText, "copy-as-plain-text"},
		{CommandPasteAsPlainText, "paste-as-plain-text"},
		{CommandMaximiseWindow, "maximise-window"},
		{CommandZoomIn, "zoom-in"},
		{CommandZoomOut, "zoom-out"},
		{CommandZoomReset, "zoom-reset"},
	}
	for _, pair := range pairs {
		if string(pair.command) != pair.want {
			t.Errorf("expected command %q, got %q", pair.want, pair.command)
		}
		if !IsCommand(pair.want) {
			t.Errorf("expected %q to be a known command", pair.want)
		}
	}
}

func TestCommandEventName(t *testing.T) {
	if CommandEventName != "menu:command" {
		t.Fatalf("unexpected event name %q", CommandEventName)
	}
}

func TestIsCommand(t *testing.T) {
	if !IsCommand("add-resource") {
		t.Fatal("expected a known command to be accepted")
	}
	// 旧命令名不再合法：前端若还认得它，说明两侧契约漂移了。
	for _, retired := range []string{"paste-files", "refresh-availability", "unknown-command", ""} {
		if IsCommand(retired) {
			t.Fatalf("expected %q to be rejected", retired)
		}
	}
}

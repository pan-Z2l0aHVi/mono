package menu

import "testing"

// 命令值是跨进程契约：Go 发什么、前端分派什么。逐字钉住，任何一侧改名先让这个测试变红。
func TestCommandValues(t *testing.T) {
	pairs := []struct {
		command Command
		want    string
	}{
		{CommandAddResource, "add-resource"},
		{CommandPasteFiles, "paste-files"},
		{CommandRefreshAvailability, "refresh-availability"},
		{CommandToggleSidebar, "toggle-sidebar"},
		{CommandOpenSettings, "open-settings"},
		{CommandReloadWindow, "reload-window"},
		{CommandOpenDevTools, "open-devtools"},
		{CommandOpenDocumentation, "open-documentation"},
	}
	for _, pair := range pairs {
		if string(pair.command) != pair.want {
			t.Errorf("expected command %q, got %q", pair.want, pair.command)
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
	if IsCommand("unknown-command") {
		t.Fatal("expected an unknown command to be rejected")
	}
	if IsCommand("") {
		t.Fatal("expected the empty string to be rejected")
	}
}

package updater

import (
	"strings"
	"testing"
)

func TestParseApplyUpdateArgs(t *testing.T) {
	hash := strings.Repeat("a", 64)
	got, err := parseApplyUpdateArgs([]string{
		"--pid=1234",
		"--source=/tmp/staged.dmg",
		"--target=/Applications/Interweave.app",
		"--sha256=" + hash,
		"--version=0.4.0",
		"--bundle-id=com.greypan.interweave",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.OldPID != 1234 || got.ExpectedHash != hash || got.Version != "0.4.0" {
		t.Fatalf("unexpected parsed args: %+v", got)
	}

	if _, err := parseApplyUpdateArgs([]string{"--pid=0", "--source=a", "--target=b", "--sha256=" + hash}); err == nil {
		t.Fatal("expected error when pid <= 0")
	}
	if _, err := parseApplyUpdateArgs([]string{"--pid=1", "--source=a", "--target=b", "--sha256=short"}); err == nil {
		t.Fatal("expected error for invalid sha256")
	}
}

func TestParseWatchdogRelaunchArgs(t *testing.T) {
	hash := strings.Repeat("b", 64)
	got, err := parseWatchdogRelaunchArgs([]string{
		"--old-pid=4321",
		"--target=C:\\Program Files\\Interweave\\Interweave.exe",
		"--sha256=" + strings.ToUpper(hash),
		"--done-event=Local\\Done",
		"--ready-event=Local\\Ready",
		"--start-event=Local\\Start",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.OldPID != 4321 || got.ExpectedHash != hash || got.DoneEvent != `Local\Done` || got.ReadyEvent != `Local\Ready` || got.StartEvent != `Local\Start` {
		t.Fatalf("unexpected parsed watchdog args: %+v", got)
	}

	if _, err := parseWatchdogRelaunchArgs([]string{"--old-pid=4321"}); err == nil {
		t.Fatal("expected error when --target is missing")
	}
	if _, err := parseWatchdogRelaunchArgs([]string{"--target=foo.exe", "--sha256=invalid"}); err == nil {
		t.Fatal("expected error for invalid --sha256")
	}
}

func TestHandleSubcommandPassthrough(t *testing.T) {
	handled, code := HandleSubcommand([]string{"interweave"})
	if handled || code != 0 {
		t.Fatalf("expected passthrough (false, 0), got (%v, %d)", handled, code)
	}
	handled, code = HandleSubcommand([]string{"interweave", "--some-other-flag"})
	if handled || code != 0 {
		t.Fatalf("expected passthrough for unknown flag, got (%v, %d)", handled, code)
	}
}

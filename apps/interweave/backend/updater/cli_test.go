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

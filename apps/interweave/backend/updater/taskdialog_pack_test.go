package updater

import (
	"encoding/binary"
	"testing"
)

func TestPackTaskDialogAMD64Layout(t *testing.T) {
	buttons := packTaskDialogButtonsAMD64([]taskDialogButtonSpec{
		{ButtonID: 1001, ButtonText: 0x1122334455667788},
		{ButtonID: 1002, ButtonText: 0x8877665544332211},
	})
	if len(buttons) != 24 {
		t.Fatalf("expected 24 bytes for 2 buttons, got %d", len(buttons))
	}
	if got := int32(binary.LittleEndian.Uint32(buttons[0:4])); got != 1001 {
		t.Fatalf("button 0 id = %d, want 1001", got)
	}
	if got := binary.LittleEndian.Uint64(buttons[4:12]); got != 0x1122334455667788 {
		t.Fatalf("button 0 text ptr = %#x", got)
	}
	if got := int32(binary.LittleEndian.Uint32(buttons[12:16])); got != 1002 {
		t.Fatalf("button 1 id = %d, want 1002", got)
	}

	cfg := packTaskDialogConfigAMD64(taskDialogConfigSpec{
		Flags:           0x00000809,
		WindowTitle:     0x1001,
		MainInstruction: 0x2002,
		Content:         0x3003,
		ButtonCount:     2,
		Buttons:         0x4004,
		DefaultButton:   1001,
		Callback:        0x5005,
		CallbackData:    0x6006,
		Width:           240,
	})
	if len(cfg) != 160 {
		t.Fatalf("expected 160 bytes, got %d", len(cfg))
	}
	if got := binary.LittleEndian.Uint32(cfg[0:4]); got != 160 {
		t.Fatalf("cbSize = %d, want 160", got)
	}
	if got := binary.LittleEndian.Uint32(cfg[20:24]); got != 0x00000809 {
		t.Fatalf("dwFlags = %#x", got)
	}
	if got := binary.LittleEndian.Uint64(cfg[44:52]); got != 0x2002 {
		t.Fatalf("pszMainInstruction offset 44 = %#x", got)
	}
	if got := binary.LittleEndian.Uint64(cfg[140:148]); got != 0x5005 {
		t.Fatalf("pfCallback offset 140 = %#x", got)
	}
	if got := binary.LittleEndian.Uint32(cfg[156:160]); got != 240 {
		t.Fatalf("cxWidth offset 156 = %d", got)
	}
}

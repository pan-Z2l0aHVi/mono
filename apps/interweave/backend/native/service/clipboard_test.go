package service

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"unicode/utf16"
)

func TestNormalizeClipboardFilePathsKeepsExistingRegularFilesOnce(t *testing.T) {
	dir := t.TempDir()
	first := filepath.Join(dir, "first.txt")
	second := filepath.Join(dir, "second.txt")
	if err := os.WriteFile(first, []byte("first"), 0o600); err != nil {
		t.Fatalf("write first fixture: %v", err)
	}
	if err := os.WriteFile(second, []byte("second"), 0o600); err != nil {
		t.Fatalf("write second fixture: %v", err)
	}

	paths := normalizeClipboardFilePaths([]string{first, first, second, dir, filepath.Join(dir, "missing.txt"), " "})
	if len(paths) != 2 {
		t.Fatalf("expected 2 normalized paths, got %v", paths)
	}
	if paths[0] != first || paths[1] != second {
		t.Fatalf("unexpected normalized paths: %v", paths)
	}
}

func TestParseClipboardURIList(t *testing.T) {
	input := "# comment\nfile:///tmp/one%20file.txt\r\nhttps://example.com/two.txt\n\nfile:///tmp/three.txt"
	paths := parseClipboardURIList(input)
	if len(paths) != 2 {
		t.Fatalf("expected 2 file paths, got %v", paths)
	}
	expected := "/tmp/one file.txt"
	expectedSecond := "/tmp/three.txt"
	if runtime.GOOS == "windows" {
		expected = `tmp\one file.txt`
		expectedSecond = `tmp\three.txt`
	}
	if paths[0] != expected || paths[1] != expectedSecond {
		t.Fatalf("unexpected file URI paths: %v", paths)
	}
}

func TestDecodeUTF16BufferStopsAtTerminator(t *testing.T) {
	longPath := `C:\Users\Example\Documents\a-much-longer-file-name.txt`
	shortPath := `C:\a.txt`
	buffer := make([]uint16, 64)

	longEnd := copy(buffer, utf16.Encode([]rune(longPath)))
	buffer[longEnd] = 0
	shortStart := longEnd + 1
	shortEnd := shortStart + copy(buffer[shortStart:], utf16.Encode([]rune(shortPath)))
	buffer[shortEnd] = 0
	copy(buffer[shortEnd+1:], utf16.Encode([]rune("stale residue")))

	if actual := decodeUTF16Buffer(buffer[:shortStart]); actual != longPath {
		t.Fatalf("expected long path %q, got %q", longPath, actual)
	}
	if actual := decodeUTF16Buffer(buffer[shortStart : shortEnd+1]); actual != shortPath {
		t.Fatalf("expected short path %q, got %q", shortPath, actual)
	}
	if actual := decodeUTF16Buffer(buffer); actual != longPath {
		t.Fatalf("expected first terminated path %q, got %q", longPath, actual)
	}
}

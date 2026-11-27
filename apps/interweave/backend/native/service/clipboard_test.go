package service

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"unicode/utf16"
)

func TestNormalizeClipboardFilePathsKeepsFilesAndDirectoriesOnce(t *testing.T) {
	dir := t.TempDir()
	first := filepath.Join(dir, "first.txt")
	second := filepath.Join(dir, "second.txt")
	if err := os.WriteFile(first, []byte("first"), 0o600); err != nil {
		t.Fatalf("write first fixture: %v", err)
	}
	if err := os.WriteFile(second, []byte("second"), 0o600); err != nil {
		t.Fatalf("write second fixture: %v", err)
	}
	folder := filepath.Join(dir, "folder")
	if err := os.Mkdir(folder, 0o700); err != nil {
		t.Fatalf("create folder fixture: %v", err)
	}

	// 目录保序去重后原样保留：递归展开与过滤是导入链的职责，这里只筛掉不存在与空串。
	paths := normalizeClipboardFilePaths([]string{first, first, second, folder, filepath.Join(dir, "missing.txt"), " "})
	if len(paths) != 3 {
		t.Fatalf("expected 3 normalized paths, got %v", paths)
	}
	if paths[0] != first || paths[1] != second || paths[2] != folder {
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

// 空串写剪贴板是 no-op：调用方在没有内容可写时就该跳过，这里再清一次是破坏性副作用。
func TestWriteClipboardTextIgnoresEmptyText(t *testing.T) {
	if err := NewOSService().WriteClipboardText(context.Background(), ""); err != nil {
		t.Fatalf("expected empty text to be a no-op, got %v", err)
	}
}

// 取消后的请求不触碰系统剪贴板。
func TestClipboardTextHonoursCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	service := NewOSService()
	if _, err := service.ReadClipboardText(ctx); err == nil {
		t.Fatal("expected a cancelled read to fail")
	}
	if err := service.WriteClipboardText(ctx, "text"); err == nil {
		t.Fatal("expected a cancelled write to fail")
	}
}

func TestWriteClipboardFilePathValidatesInput(t *testing.T) {
	service := NewOSService()

	if err := service.WriteClipboardFilePath(context.Background(), "   "); err == nil {
		t.Fatal("expected blank file path to fail")
	}
	if err := service.WriteClipboardFilePath(context.Background(), filepath.Join(t.TempDir(), "missing.txt")); err == nil {
		t.Fatal("expected missing file path to fail")
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := service.WriteClipboardFilePath(ctx, t.TempDir()); err == nil {
		t.Fatal("expected cancelled context to fail")
	}
}

func TestFormatClipboardFileURI(t *testing.T) {
	actual := formatClipboardFileURI("/tmp/one file.txt")
	if actual != "file:///tmp/one%20file.txt\r\n" {
		t.Fatalf("unexpected formatted file URI: %q", actual)
	}
}

package atomicfile

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWriteFileReplacesContent(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "settings.json")

	if err := WriteFile(target, []byte("first"), 0o600); err != nil {
		t.Fatalf("first write: %v", err)
	}
	if err := WriteFile(target, []byte("second"), 0o600); err != nil {
		t.Fatalf("second write: %v", err)
	}

	data, err := os.ReadFile(target)
	if err != nil {
		t.Fatalf("read back: %v", err)
	}
	if string(data) != "second" {
		t.Fatalf("expected the second write to win, got %q", data)
	}
}

func TestWriteFileAppliesPerm(t *testing.T) {
	target := filepath.Join(t.TempDir(), "settings.json")
	if err := WriteFile(target, []byte("{}"), 0o600); err != nil {
		t.Fatalf("write: %v", err)
	}
	info, err := os.Stat(target)
	if err != nil {
		t.Fatalf("stat: %v", err)
	}
	if perm := info.Mode().Perm(); perm != 0o600 {
		t.Fatalf("expected 0600, got %o", perm)
	}
}

// 临时文件必须落在目标同目录，且成功后不残留：跨目录 rename 在多数平台上不是原子的，
// 残留的临时文件会堆积成垃圾。
func TestWriteFileLeavesNoTempFile(t *testing.T) {
	dir := t.TempDir()
	if err := WriteFile(filepath.Join(dir, "settings.json"), []byte("{}"), 0o600); err != nil {
		t.Fatalf("write: %v", err)
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("read dir: %v", err)
	}
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), ".") {
			t.Fatalf("unexpected temp file left behind: %s", entry.Name())
		}
	}
	if len(entries) != 1 {
		t.Fatalf("expected exactly the target file, got %d entries", len(entries))
	}
}

func TestWriteFileFailsOnMissingDirectory(t *testing.T) {
	err := WriteFile(filepath.Join(t.TempDir(), "missing", "settings.json"), []byte("{}"), 0o600)
	if err == nil {
		t.Fatal("expected an error when the target directory does not exist")
	}
}

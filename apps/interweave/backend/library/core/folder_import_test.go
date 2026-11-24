package core

import (
	"context"
	"os"
	"path/filepath"
	"slices"
	"testing"
)

// resolveFixtureRoot 把夹具根解析为真实路径：ExpandImportPaths 顶层会跟随符号链接，
// macOS 的 /var/folders 实际位于 /private/var/folders，期望值必须与解析后的路径对齐。
func resolveFixtureRoot(t *testing.T, root string) string {
	t.Helper()
	resolved, err := filepath.EvalSymlinks(root)
	if err != nil {
		t.Fatal(err)
	}
	return resolved
}

func TestExpandImportPathsWalksDirectoriesAndKeepsFiles(t *testing.T) {
	root := resolveFixtureRoot(t, t.TempDir())
	writeFile := func(rel string) {
		path := filepath.Join(root, rel)
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte("x"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	writeFile("a.png")
	writeFile("nested/b.md")
	writeFile("nested/deeper/c.mov")
	standalone := filepath.Join(root, "single.md")
	if err := os.WriteFile(standalone, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	service := NewLibrary(nil, nil)
	// 目录与文件混选，且重复选中同一目录、以及已随父目录展开的子目录：
	// 目录只展开一次、只计一个，文件去重；最终清单全局按字典序产出，不依赖选中顺序。
	expansion, err := service.ExpandImportPaths(context.Background(), []string{
		root,
		root,
		filepath.Join(root, "nested"),
		standalone,
		filepath.Join(root, "nested", "b.md"),
	})
	if err != nil {
		t.Fatal(err)
	}
	files := expansion.Files
	want := []string{
		filepath.Join(root, "a.png"),
		filepath.Join(root, "nested", "b.md"),
		filepath.Join(root, "nested", "deeper", "c.mov"),
		standalone,
	}
	if !slices.Equal(files, want) {
		t.Fatalf("got %v, want %v", files, want)
	}
	if expansion.Folders != 1 {
		t.Fatalf("folders = %d, want 1", expansion.Folders)
	}
}

func TestExpandImportPathsSkipsHiddenEntriesAndSymlinks(t *testing.T) {
	root := resolveFixtureRoot(t, t.TempDir())
	writeFile := func(rel string) {
		path := filepath.Join(root, rel)
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte("x"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	writeFile("keep.png")
	writeFile(".hidden.png")
	writeFile(".cache/nested.png")
	writeFile("project/.git/config")
	writeFile("project/real.md")

	if err := os.Symlink(filepath.Join(root, "keep.png"), filepath.Join(root, "alias.png")); err != nil {
		t.Skipf("symlink unavailable: %v", err)
	}

	service := NewLibrary(nil, nil)
	expansion, err := service.ExpandImportPaths(context.Background(), []string{root})
	if err != nil {
		t.Fatal(err)
	}

	want := []string{
		filepath.Join(root, "keep.png"),
		filepath.Join(root, "project", "real.md"),
	}
	if !slices.Equal(expansion.Files, want) {
		t.Fatalf("got %v, want %v", expansion.Files, want)
	}
	if expansion.Folders != 1 {
		t.Fatalf("folders = %d, want 1", expansion.Folders)
	}
}

func TestExpandImportPathsKeepsChildrenOfExplicitHiddenRoot(t *testing.T) {
	// 用户显式选中的隐藏目录就是导入意图：只过滤其内部隐藏项，根目录名不拦。
	root := filepath.Join(t.TempDir(), ".imports")
	if err := os.MkdirAll(root, 0o755); err != nil {
		t.Fatal(err)
	}
	root = resolveFixtureRoot(t, root)
	if err := os.WriteFile(filepath.Join(root, "doc.md"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, ".stash.png"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	service := NewLibrary(nil, nil)
	expansion, err := service.ExpandImportPaths(context.Background(), []string{root})
	if err != nil {
		t.Fatal(err)
	}

	want := filepath.Join(root, "doc.md")
	if len(expansion.Files) != 1 || expansion.Files[0] != want {
		t.Fatalf("got %v, want [%s]", expansion.Files, want)
	}
	if expansion.Folders != 1 {
		t.Fatalf("folders = %d, want 1", expansion.Folders)
	}
}

func TestExpandImportPathsResolvesExplicitSymlinks(t *testing.T) {
	// 顶层条目按显式意图跟随符号链接：链接文件纳入目标文件、链接目录按目标递归；
	// 目录内部的符号链接仍被跳过（同 TestExpandImportPathsSkipsHiddenEntriesAndSymlinks）。
	root := resolveFixtureRoot(t, t.TempDir())
	targetDir := filepath.Join(root, "real-dir")
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		t.Fatal(err)
	}
	inside := filepath.Join(targetDir, "doc.md")
	if err := os.WriteFile(inside, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	targetFile := filepath.Join(root, "real.png")
	if err := os.WriteFile(targetFile, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	dirLink := filepath.Join(root, "dir-link")
	if err := os.Symlink(targetDir, dirLink); err != nil {
		t.Skipf("symlink unavailable: %v", err)
	}
	fileLink := filepath.Join(root, "file-link")
	if err := os.Symlink(targetFile, fileLink); err != nil {
		t.Skipf("symlink unavailable: %v", err)
	}

	service := NewLibrary(nil, nil)
	expansion, err := service.ExpandImportPaths(context.Background(), []string{dirLink, fileLink})
	if err != nil {
		t.Fatal(err)
	}

	// 产出的是解析后的真实目标路径；同一真实文件（file-link 与目标重复）只保留一份。
	want := []string{inside, targetFile}
	if !slices.Equal(expansion.Files, want) {
		t.Fatalf("got %v, want %v", expansion.Files, want)
	}
	if expansion.Folders != 1 {
		t.Fatalf("folders = %d, want 1", expansion.Folders)
	}
}

func TestExpandImportPathsSkipsMissingEntries(t *testing.T) {
	root := resolveFixtureRoot(t, t.TempDir())
	file := filepath.Join(root, "a.png")
	if err := os.WriteFile(file, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	service := NewLibrary(nil, nil)
	// 选中到展开之间被删除的条目只影响自身；空串按无效输入整体报错（防御路径，面板不会给出）。
	expansion, err := service.ExpandImportPaths(context.Background(), []string{file, filepath.Join(root, "missing")})
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(expansion.Files, []string{file}) {
		t.Fatalf("got %v, want [%s]", expansion.Files, file)
	}
	if expansion.Folders != 0 {
		t.Fatalf("folders = %d, want 0", expansion.Folders)
	}
	if _, err := service.ExpandImportPaths(context.Background(), []string{"   "}); err == nil {
		t.Fatal("expected error for empty input")
	}
}

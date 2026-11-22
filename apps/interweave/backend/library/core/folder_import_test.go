package core

import (
	"context"
	"os"
	"path/filepath"
	"slices"
	"testing"
)

func TestExpandImportPathsWalksDirectoriesAndKeepsFiles(t *testing.T) {
	root := t.TempDir()
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

	service := NewResourceService(nil, nil)
	// 目录与文件混选：目录递归展开，文件原样保留，重复（目录内文件被同时选中）去重。
	files, err := service.ExpandImportPaths(context.Background(), []string{root, standalone, filepath.Join(root, "nested", "b.md")})
	if err != nil {
		t.Fatal(err)
	}

	// 目录与文件混选：目录递归展开，文件原样保留，重复（目录内文件被同时选中）去重；
	// 最终清单全局按字典序产出，不依赖选中顺序。
	want := []string{
		filepath.Join(root, "a.png"),
		filepath.Join(root, "nested", "b.md"),
		filepath.Join(root, "nested", "deeper", "c.mov"),
		standalone,
	}
	if !slices.Equal(files, want) {
		t.Fatalf("got %v, want %v", files, want)
	}
}

func TestExpandImportPathsSkipsHiddenEntriesAndSymlinks(t *testing.T) {
	root := t.TempDir()
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

	service := NewResourceService(nil, nil)
	files, err := service.ExpandImportPaths(context.Background(), []string{root})
	if err != nil {
		t.Fatal(err)
	}

	want := []string{
		filepath.Join(root, "keep.png"),
		filepath.Join(root, "project", "real.md"),
	}
	if !slices.Equal(files, want) {
		t.Fatalf("got %v, want %v", files, want)
	}
}

func TestExpandImportPathsKeepsChildrenOfExplicitHiddenRoot(t *testing.T) {
	// 用户显式选中的隐藏目录就是导入意图：只过滤其内部隐藏项，根目录名不拦。
	root := filepath.Join(t.TempDir(), ".imports")
	if err := os.MkdirAll(root, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "doc.md"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, ".stash.png"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	service := NewResourceService(nil, nil)
	files, err := service.ExpandImportPaths(context.Background(), []string{root})
	if err != nil {
		t.Fatal(err)
	}

	want := filepath.Join(root, "doc.md")
	if len(files) != 1 || files[0] != want {
		t.Fatalf("got %v, want [%s]", files, want)
	}
}

func TestExpandImportPathsSkipsMissingAndSpecialEntries(t *testing.T) {
	root := t.TempDir()
	file := filepath.Join(root, "a.png")
	if err := os.WriteFile(file, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	service := NewResourceService(nil, nil)
	// 选中到展开之间被删除的条目只影响自身；空串按无效输入整体报错（防御路径，面板不会给出）。
	files, err := service.ExpandImportPaths(context.Background(), []string{file, filepath.Join(root, "missing")})
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(files, []string{file}) {
		t.Fatalf("got %v, want [%s]", files, file)
	}
	if _, err := service.ExpandImportPaths(context.Background(), []string{"   "}); err == nil {
		t.Fatal("expected error for empty input")
	}
}

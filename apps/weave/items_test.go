package main

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAddFilesDedupeAndTags(t *testing.T) {
	db := openTestDB(t)
	items, _, _, _ := newTestServices(t, db)
	ctx := context.Background()
	dir := t.TempDir()
	p1 := writeFile(t, dir, "a.md", "# title")
	// 构造合法 PNG IHDR：签名(8) + 长度(4) + "IHDR"(4) + 宽(4) + 高(4)
	ihdr := "\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + string([]byte{0, 0, 0, 1, 0, 0, 0, 2}) + strings.Repeat("\x00", 13)
	p2 := writeFile(t, dir, "b.png", ihdr)

	res, err := items.AddFiles(ctx, []string{p1, p2}, []string{"docs/notes"})
	if err != nil {
		t.Fatalf("添加文件: %v", err)
	}
	if res.Added != 2 || res.Failed != 0 {
		t.Fatalf("添加结果错误: %+v", res)
	}
	// 再次添加应去重
	res2, err := items.AddFiles(ctx, []string{p1}, nil)
	if err != nil || res2.Added != 0 || res2.Skipped != 1 {
		t.Fatalf("去重失败: %+v err=%v", res2, err)
	}

	// 元数据
	all, err := items.ListItems(ctx, ListQuery{})
	if err != nil || len(all) != 2 {
		t.Fatalf("列表错误: %v %d", err, len(all))
	}
	var img *Item
	for i := range all {
		if all[i].Mime == "image/png" {
			img = &all[i]
		}
	}
	if img == nil || img.Width != 1 || img.Height != 2 {
		t.Fatalf("图像尺寸提取失败: %+v", img)
	}
	// 标签
	got, err := items.GetItem(ctx, img.ID)
	if err != nil || len(got.Tags) != 1 || got.Tags[0].Path != "docs/notes" {
		t.Fatalf("标签未挂载: %+v err=%v", got.Tags, err)
	}
}

func TestAddUrlValidation(t *testing.T) {
	db := openTestDB(t)
	items, _, _, _ := newTestServices(t, db)
	ctx := context.Background()

	if _, err := items.AddUrl(ctx, "ftp://bad", nil); err == nil {
		t.Fatalf("非法 scheme 应报错")
	}
	item, err := items.AddUrl(ctx, "https://example.com/photo.png", []string{"web"})
	if err != nil {
		t.Fatalf("添加 URL: %v", err)
	}
	if item.Kind != "url" || item.Name != "photo.png" {
		t.Fatalf("URL 条目错误: %+v", item)
	}
}

func TestAddFolderFlatIndexAndTagFilter(t *testing.T) {
	db := openTestDB(t)
	items, tags, _, _ := newTestServices(t, db)
	ctx := context.Background()
	root := t.TempDir()
	sub := filepath.Join(root, "sub")
	if err := os.MkdirAll(sub, 0o755); err != nil {
		t.Fatal(err)
	}
	writeFile(t, root, "one.txt", "1")
	writeFile(t, sub, "two.txt", "2")

	res, err := items.AddFolder(ctx, root, []string{"library"})
	if err != nil || res.Added != 2 {
		t.Fatalf("添加文件夹: %+v err=%v", res, err)
	}
	// 标签过滤：含子孙
	_, _ = tags.CreateTag(ctx, "deep", "library")
	all, err := items.ListItems(ctx, ListQuery{TagPath: "library"})
	if err != nil || len(all) != 2 {
		t.Fatalf("标签过滤错误: %v %d", err, len(all))
	}
	// 名称搜索
	all, err = items.ListItems(ctx, ListQuery{Search: "two"})
	if err != nil || len(all) != 1 || all[0].Name != "two.txt" {
		t.Fatalf("名称搜索错误: %+v err=%v", all, err)
	}
}

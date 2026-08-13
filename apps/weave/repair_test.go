package main

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"testing"
)

func TestRescanDetectsBrokenAndNewFiles(t *testing.T) {
	db := openTestDB(t)
	items, _, repairs, index := newTestServices(t, db)
	ctx := context.Background()
	root := t.TempDir()
	p := writeFile(t, root, "keep.txt", "keep")

	// 监听根内先入库一个文件
	if _, err := items.AddFolder(ctx, root, nil); err != nil {
		t.Fatalf("添加文件夹: %v", err)
	}
	// 删除源文件 -> 断链
	if err := os.Remove(p); err != nil {
		t.Fatal(err)
	}
	// 新增一个文件（补齐）
	writeFile(t, root, "new.txt", "new")

	res, err := index.Rescan(ctx)
	if err != nil {
		t.Fatalf("扫描: %v", err)
	}
	if res.Broken != 1 || res.NewItems != 1 || res.Verified != 0 {
		t.Fatalf("扫描结果错误: %+v", res)
	}
	open, _ := repairs.ListRepairs(ctx, "open")
	if len(open) != 1 || open[0].ItemName != "keep.txt" {
		t.Fatalf("修复队列错误: %+v", open)
	}
}

func TestRepairCandidateAndManual(t *testing.T) {
	db := openTestDB(t)
	items, _, repairs, _ := newTestServices(t, db)
	ctx := context.Background()
	root := t.TempDir()
	orig := writeFile(t, root, "photo.png", "\x89PNG\r\n\x1a\n"+string(make([]byte, 24)))
	writeFile(t, root, "other.txt", "x")

	if _, err := items.AddFolder(ctx, root, nil); err != nil {
		t.Fatalf("添加文件夹: %v", err)
	}
	// 移动并改名
	moved := filepath.Join(root, "renamed.png")
	if err := os.Rename(orig, moved); err != nil {
		t.Fatal(err)
	}

	res, err := index_Rescan(t, db, items, repairs)
	if err != nil {
		t.Fatalf("扫描: %v", err)
	}
	if res.Broken != 1 {
		t.Fatalf("应检测到断链: %+v", res)
	}
	open, _ := repairs.ListRepairs(ctx, "open")
	if len(open) != 1 {
		t.Fatalf("修复队列错误: %+v", open)
	}
	cands, err := repairs.GetCandidates(ctx, open[0].ID)
	if err != nil || len(cands) == 0 {
		t.Fatalf("候选应为空: %+v err=%v", cands, err)
	}
	found := false
	for _, c := range cands {
		if c.Path == moved {
			found = true
		}
	}
	if !found {
		t.Fatalf("候选应包含移动后的文件: %+v", cands)
	}
	// 手动修复
	if err := repairs.Repair(ctx, open[0].ID, moved); err != nil {
		t.Fatalf("手动修复: %v", err)
	}
	item, err := items.GetItem(ctx, open[0].ItemID)
	if err != nil || item.Status != "ok" || item.Locator != moved {
		t.Fatalf("修复后条目错误: %+v err=%v", item, err)
	}
}

func TestRepairAutoUnique(t *testing.T) {
	db := openTestDB(t)
	items, _, repairs, _ := newTestServices(t, db)
	ctx := context.Background()
	root := t.TempDir()
	orig := writeFile(t, root, "doc.txt", "same-content")
	if _, err := items.AddFolder(ctx, root, nil); err != nil {
		t.Fatalf("添加文件夹: %v", err)
	}
	// 移动到子目录（保持同名+同内容）
	sub := filepath.Join(root, "moved")
	if err := os.MkdirAll(sub, 0o755); err != nil {
		t.Fatal(err)
	}
	moved := filepath.Join(sub, "doc.txt")
	if err := os.Rename(orig, moved); err != nil {
		t.Fatal(err)
	}
	// 扫描并自动修复
	res, err := index_Rescan(t, db, items, repairs)
	if err != nil {
		t.Fatalf("扫描: %v", err)
	}
	if res.Broken != 1 {
		t.Fatalf("应检测到断链: %+v", res)
	}
	// 唯一强匹配候选（同名+同大小）应自动修复
	item, err := items.GetItem(ctx, listFirstID(t, db))
	if err != nil {
		t.Fatal(err)
	}
	if item.Status != "ok" || item.Locator != moved {
		t.Fatalf("应自动修复: %+v", item)
	}
}

// index_Rescan 辅助：构造 index 并扫描。
func index_Rescan(t *testing.T, db *sql.DB, items *ItemService, repairs *RepairService) (RescanResult, error) {
	t.Helper()
	index := NewIndexService(db, items, repairs, noopEmit)
	return index.Rescan(context.Background())
}

func listFirstID(t *testing.T, db *sql.DB) string {
	t.Helper()
	items := NewItemService(db, noopEmit)
	all, err := items.ListItems(context.Background(), ListQuery{})
	if err != nil || len(all) == 0 {
		t.Fatalf("无条目: %v", err)
	}
	return all[0].ID
}

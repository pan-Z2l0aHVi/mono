package backend

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestWatcherIndexesAndTracksChanges(t *testing.T) {
	db := openTestDB(t)
	items, _, repairs, _ := newTestServices(t, db)
	ctx := context.Background()
	root := t.TempDir()

	// 登记监听根
	watch := NewWatchService(db, items, repairs, noopEmit)
	if _, err := watch.AddWatchRoot(ctx, root); err != nil {
		t.Fatalf("登记监听根: %v", err)
	}
	if err := watch.Start(ctx); err != nil {
		t.Fatalf("启动监听: %v", err)
	}
	defer watch.Stop()

	// 新建文件 -> watcher 自动入库
	p := filepath.Join(root, "created.txt")
	if err := os.WriteFile(p, []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}
	eventually(t, 5*time.Second, "watcher 自动入库新文件", func() bool {
		all, _ := items.ListItems(ctx, ListQuery{})
		return len(all) == 1
	})

	// 删除文件 -> 断链 + 修复项
	if err := os.Remove(p); err != nil {
		t.Fatal(err)
	}
	eventually(t, 5*time.Second, "watcher 检测断链", func() bool {
		open, _ := repairs.ListRepairs(ctx, "open")
		return len(open) == 1
	})

	// 恢复文件 -> 自动恢复
	if err := os.WriteFile(p, []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}
	eventually(t, 5*time.Second, "watcher 恢复条目", func() bool {
		item, _ := items.ListItems(ctx, ListQuery{})
		return len(item) == 1 && item[0].Status == "ok"
	})
}

func TestWatcherRenamesItem(t *testing.T) {
	db := openTestDB(t)
	items, _, _, _ := newTestServices(t, db)
	ctx := context.Background()
	root := t.TempDir()
	orig := writeFile(t, root, "a.txt", "data")

	watch := NewWatchService(db, items, NewRepairService(db, noopEmit), noopEmit)
	if _, err := items.AddFiles(ctx, []string{orig}, nil); err != nil {
		t.Fatalf("添加文件: %v", err)
	}
	if err := watch.Start(ctx); err != nil {
		t.Fatalf("启动监听: %v", err)
	}
	defer watch.Stop()

	moved := filepath.Join(root, "b.txt")
	if err := os.Rename(orig, moved); err != nil {
		t.Fatal(err)
	}
	eventually(t, 5*time.Second, "watcher 跟随重命名", func() bool {
		all, _ := items.ListItems(ctx, ListQuery{})
		return len(all) == 1 && all[0].Locator == moved && all[0].Status == "ok"
	})
}

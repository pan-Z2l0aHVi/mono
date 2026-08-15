package backend

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func noopEmit(name string, data any) {}

func openTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := openDB(filepath.Join(t.TempDir(), "interweave.db"))
	if err != nil {
		t.Fatalf("打开测试数据库: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func newTestServices(t *testing.T, db *sql.DB) (items *ItemService, tags *TagService, repairs *RepairService, index *IndexService) {
	t.Helper()
	items = NewItemService(db, noopEmit)
	tags = NewTagService(db, noopEmit)
	repairs = NewRepairService(db, noopEmit)
	index = NewIndexService(db, items, repairs, noopEmit)
	return items, tags, repairs, index
}

// writeFile 在测试目录中创建文件并返回绝对路径。
func writeFile(t *testing.T, dir, name, content string) string {
	t.Helper()
	p := filepath.Join(dir, name)
	if err := writeFileAt(p, content); err != nil {
		t.Fatalf("写文件 %s: %v", p, err)
	}
	return p
}

func writeFileAt(path, content string) error {
	return os.WriteFile(path, []byte(content), 0o644)
}

// eventually 轮询等待条件成立。
func eventually(t *testing.T, timeout time.Duration, desc string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(50 * time.Millisecond)
	}
	t.Fatalf("等待超时: %s", desc)
}

var _ = context.Background

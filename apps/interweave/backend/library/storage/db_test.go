package storage_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

func openTestDB(t *testing.T) *storage.DB {
	t.Helper()
	tmpDir, err := os.MkdirTemp("", "interweave-storage-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(tmpDir) })

	db, err := storage.Open(filepath.Join(tmpDir, "test.db"))
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

// 钉住每连接 pragma：连接池中后开的连接也必须强制外键与 busy_timeout，
// 而不是只作用于 Open 时执行 PRAGMA 的那条连接。
func TestOpenConfiguresEveryPooledConnection(t *testing.T) {
	ctx := context.Background()
	db := openTestDB(t)

	// 依次占住两个池连接：首个复用建表连接，第二个必然是新拨号的连接。
	first, err := db.SqlDB().Conn(ctx)
	if err != nil {
		t.Fatalf("failed to get first pooled conn: %v", err)
	}
	defer first.Close()

	second, err := db.SqlDB().Conn(ctx)
	if err != nil {
		t.Fatalf("failed to get second pooled conn: %v", err)
	}
	defer second.Close()

	if _, err := second.ExecContext(ctx, `
		INSERT INTO sources (id, resource_id, type, location, available, is_preferred, order_index, metadata_json, created_at, updated_at)
		VALUES ('orphan', 'missing-resource', 'file', '/tmp/orphan', 0, 0, 0, '', 0, 0)
	`); err == nil {
		t.Fatal("expected foreign key violation on pooled connection, got nil")
	}

	var foreignKeys int
	if err := second.QueryRowContext(ctx, `PRAGMA foreign_keys`).Scan(&foreignKeys); err != nil {
		t.Fatalf("failed to read foreign_keys pragma: %v", err)
	}
	if foreignKeys != 1 {
		t.Errorf("expected foreign_keys=1 on pooled connection, got %d", foreignKeys)
	}

	var busyTimeout int
	if err := second.QueryRowContext(ctx, `PRAGMA busy_timeout`).Scan(&busyTimeout); err != nil {
		t.Fatalf("failed to read busy_timeout pragma: %v", err)
	}
	if busyTimeout != 5000 {
		t.Errorf("expected busy_timeout=5000 on pooled connection, got %d", busyTimeout)
	}

	// journal_mode 持久化在库文件中，对任何连接都应可见。
	var journalMode string
	if err := second.QueryRowContext(ctx, `PRAGMA journal_mode`).Scan(&journalMode); err != nil {
		t.Fatalf("failed to read journal_mode pragma: %v", err)
	}
	if journalMode != "wal" {
		t.Errorf("expected journal_mode=wal on pooled connection, got %q", journalMode)
	}
}

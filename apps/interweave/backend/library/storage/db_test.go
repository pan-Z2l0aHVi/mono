package storage_test

import (
	"context"
	"os"
	"path/filepath"
	"strings"
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

// idx_sources_type_location 必须接住两类热路径：按 (type, location) 反查 Source 与
// 文件位置全量列表。语句与 SourceStore.ListSourcesByLocations / ListFileSourceLocations
// 逐字一致（source_store.go 不在本次改动范围，改写查询时需同步此处）。
// 断言口径：凡触及 sources 表的计划都必须走该索引——既排除全表扫描，也排除
// 退化回 idx_sources_resource_id 或主键扫描。
func TestLocationQueriesPlanThroughSourcesTypeLocationIndex(t *testing.T) {
	ctx := context.Background()
	db := openTestDB(t)

	seedSource := func(id, srcType, location string) {
		t.Helper()
		now := int64(1_700_000_000_000)
		if err := (storage.ResourceStore{}).Insert(ctx, db.SqlDB(), storage.ResourceModel{
			ID: "resource-" + id, Title: id, CreatedAt: now, UpdatedAt: now,
		}); err != nil {
			t.Fatalf("insert resource %s: %v", id, err)
		}
		if err := (storage.SourceStore{}).Insert(ctx, db.SqlDB(), storage.SourceModel{
			ID: id, ResourceID: "resource-" + id, Type: storage.SourceType(srcType),
			Location: location, Available: true, IsPreferred: true, CreatedAt: now, UpdatedAt: now,
		}); err != nil {
			t.Fatalf("insert source %s: %v", id, err)
		}
	}
	seedSource("src-file-a", "file", "/library/a.png")
	seedSource("src-file-b", "file", "/library/b.png")
	seedSource("src-url-a", "url", "https://example.com/a.png")

	cases := []struct {
		name  string
		query string
		args  []any
	}{
		{
			name: "ListSourcesByLocations",
			query: `
				SELECT id, resource_id, type, location, available, is_preferred, order_index, metadata_json, created_at, updated_at
				FROM sources WHERE type = ? AND location IN (?, ?)
			`,
			args: []any{"file", "/library/a.png", "/library/b.png"},
		},
		{
			name:  "ListFileSourceLocations",
			query: `SELECT location FROM sources WHERE type = 'file'`,
		},
	}
	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			rows, err := db.SqlDB().QueryContext(ctx, "EXPLAIN QUERY PLAN "+testCase.query, testCase.args...)
			if err != nil {
				t.Fatalf("explain query plan: %v", err)
			}
			defer rows.Close()
			var details []string
			for rows.Next() {
				var id, parent, notUsed int
				var detail string
				if err := rows.Scan(&id, &parent, &notUsed, &detail); err != nil {
					t.Fatalf("scan plan row: %v", err)
				}
				details = append(details, detail)
			}
			if err := rows.Err(); err != nil {
				t.Fatalf("read plan rows: %v", err)
			}
			for _, detail := range details {
				if strings.Contains(detail, "sources") && !strings.Contains(detail, "idx_sources_type_location") {
					t.Fatalf("sources access bypassed idx_sources_type_location: %q (full plan: %q)", detail, details)
				}
			}
			if !strings.Contains(strings.Join(details, " | "), "idx_sources_type_location") {
				t.Fatalf("expected plan to use idx_sources_type_location, got %q", details)
			}
		})
	}
}

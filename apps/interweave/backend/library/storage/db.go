package storage

import (
	"context"
	"database/sql"
	"fmt"
	"sync"

	_ "modernc.org/sqlite"
)

// Queryer 抽象查询执行器，使 store 既能直接使用只读连接（并发读），也能在事务内组合写操作。
type Queryer interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

// 为本地单库写入维持可预测的一致性边界。
type DB struct {
	db      *sql.DB
	writeMu sync.Mutex
}

// 以本地优先的可靠性配置打开资源库。
func Open(dsn string) (*DB, error) {
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite database: %w", err)
	}

	pragmas := []string{
		"PRAGMA journal_mode = WAL;",
		"PRAGMA foreign_keys = ON;",
		"PRAGMA busy_timeout = 5000;",
	}

	for _, pragma := range pragmas {
		if _, err := db.Exec(pragma); err != nil {
			_ = db.Close()
			return nil, fmt.Errorf("failed to execute %q: %w", pragma, err)
		}
	}

	sdb := &DB{db: db}
	if err := sdb.initSchema(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("failed to initialize schema: %w", err)
	}

	return sdb, nil
}

// 让应用退出时有序释放本地资源。
func (d *DB) Close() error {
	return d.db.Close()
}

func (d *DB) initSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS resources (
		id TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		note TEXT NOT NULL,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS sources (
		id TEXT PRIMARY KEY,
		resource_id TEXT NOT NULL,
		type TEXT NOT NULL,
		location TEXT NOT NULL,
		available INTEGER NOT NULL,
		is_preferred INTEGER NOT NULL,
		order_index INTEGER NOT NULL,
		metadata_json TEXT NOT NULL DEFAULT '',
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL,
		FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS tags (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL UNIQUE,
		created_at INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS taggings (
		resource_id TEXT NOT NULL,
		tag_id TEXT NOT NULL,
		created_at INTEGER NOT NULL,
		PRIMARY KEY(resource_id, tag_id),
		FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE,
		FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_sources_resource_id ON sources(resource_id);
	CREATE INDEX IF NOT EXISTS idx_taggings_resource_id ON taggings(resource_id);
	CREATE INDEX IF NOT EXISTS idx_taggings_tag_id ON taggings(tag_id);
	`
	_, err := d.db.Exec(schema)
	return err
}

// 将写入串行化，使跨表不变量在事务中成立。
func (d *DB) WithTx(ctx context.Context, fn func(tx *sql.Tx) error) error {
	d.writeMu.Lock()
	defer d.writeMu.Unlock()

	tx, err := d.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p)
		}
	}()

	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}

	return tx.Commit()
}

// 只向同一后端边界内暴露只读查询所需的连接。
func (d *DB) SqlDB() *sql.DB {
	return d.db
}

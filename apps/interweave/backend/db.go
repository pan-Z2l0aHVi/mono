package backend

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/adrg/xdg"
	_ "modernc.org/sqlite"
)

// newID 生成 32 位十六进制随机 ID，用于所有主键。
func newID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(err) // crypto/rand 失败属于不可恢复的系统错误
	}
	return hex.EncodeToString(b)
}

func nowMillis() int64 { return time.Now().UnixMilli() }

// openDB 用给定路径打开 SQLite 并执行幂等迁移。
func openDB(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", path+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)")
	if err != nil {
		return nil, fmt.Errorf("打开数据库 %s: %w", path, err)
	}
	if err := migrate(db); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}

// OpenStore 打开（必要时创建）库数据库，并执行幂等迁移。
func OpenStore() (*sql.DB, error) {
	dir, err := xdg.DataFile("interweave")
	if err != nil {
		return nil, fmt.Errorf("解析 xdg 数据目录: %w", err)
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("创建数据目录 %s: %w", dir, err)
	}
	return openDB(filepath.Join(dir, "interweave.db"))
}

func migrate(db *sql.DB) error {
	schema := []string{
		`CREATE TABLE IF NOT EXISTS items (
			id TEXT PRIMARY KEY,
			kind TEXT NOT NULL CHECK (kind IN ('file','url')),
			name TEXT NOT NULL,
			locator TEXT NOT NULL UNIQUE,
			mime TEXT NOT NULL DEFAULT '',
			size INTEGER NOT NULL DEFAULT 0,
			mtime INTEGER NOT NULL DEFAULT 0,
			width INTEGER NOT NULL DEFAULT 0,
			height INTEGER NOT NULL DEFAULT 0,
			duration_ms INTEGER NOT NULL DEFAULT 0,
			status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','broken')),
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			last_verified_at INTEGER NOT NULL DEFAULT 0
		)`,
		`CREATE INDEX IF NOT EXISTS idx_items_kind ON items(kind)`,
		`CREATE INDEX IF NOT EXISTS idx_items_status ON items(status)`,
		`CREATE TABLE IF NOT EXISTS tags (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			path TEXT NOT NULL UNIQUE,
			parent_id TEXT REFERENCES tags(id) ON DELETE CASCADE
		)`,
		`CREATE INDEX IF NOT EXISTS idx_tags_parent ON tags(parent_id)`,
		`CREATE TABLE IF NOT EXISTS item_tags (
			item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
			tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
			PRIMARY KEY (item_id, tag_id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag_id)`,
		`CREATE TABLE IF NOT EXISTS watch_roots (
			id TEXT PRIMARY KEY,
			path TEXT NOT NULL UNIQUE,
			created_at INTEGER NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS repair_jobs (
			id TEXT PRIMARY KEY,
			item_id TEXT NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
			state TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open','auto_fixed','manual_fixed','dismissed')),
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		)`,
	}
	for _, stmt := range schema {
		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("迁移失败: %w", err)
		}
	}
	return nil
}

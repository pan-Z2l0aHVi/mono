package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"
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

// openStore 打开（必要时创建）库数据库，并执行幂等迁移。
func openStore() (*sql.DB, error) {
	dir, err := xdg.DataFile("weave")
	if err != nil {
		return nil, fmt.Errorf("解析 xdg 数据目录: %w", err)
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("创建数据目录 %s: %w", dir, err)
	}
	return openDB(filepath.Join(dir, "weave.db"))
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

// ---- settings ----

func getSetting(db *sql.DB, key string) (string, error) {
	var v string
	err := db.QueryRow(`SELECT value FROM settings WHERE key = ?`, key).Scan(&v)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return v, err
}

func setSetting(ctx context.Context, db *sql.DB, key, value string) error {
	_, err := db.ExecContext(ctx, `INSERT INTO settings(key, value) VALUES(?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value`, key, value)
	return err
}

// ---- items ----

type itemRow struct {
	ID             string
	Kind           string
	Name           string
	Locator        string
	Mime           string
	Size           int64
	Mtime          int64
	Width          int
	Height         int
	DurationMs     int64
	Status         string
	CreatedAt      int64
	UpdatedAt      int64
	LastVerifiedAt int64
}

func scanItem(s interface{ Scan(...any) error }) (*itemRow, error) {
	var r itemRow
	err := s.Scan(&r.ID, &r.Kind, &r.Name, &r.Locator, &r.Mime, &r.Size, &r.Mtime,
		&r.Width, &r.Height, &r.DurationMs, &r.Status, &r.CreatedAt, &r.UpdatedAt, &r.LastVerifiedAt)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

const itemColumns = `id, kind, name, locator, mime, size, mtime, width, height, duration_ms, status, created_at, updated_at, last_verified_at`

func getItem(ctx context.Context, db *sql.DB, id string) (*itemRow, error) {
	row := db.QueryRowContext(ctx, `SELECT `+itemColumns+` FROM items WHERE id = ?`, id)
	r, err := scanItem(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return r, err
}

func getItemByLocator(ctx context.Context, db *sql.DB, locator string) (*itemRow, error) {
	row := db.QueryRowContext(ctx, `SELECT `+itemColumns+` FROM items WHERE locator = ?`, locator)
	r, err := scanItem(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return r, err
}

func listFileLocators(ctx context.Context, db *sql.DB) ([]string, error) {
	rows, err := db.QueryContext(ctx, `SELECT locator FROM items WHERE kind = 'file'`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var loc string
		if err := rows.Scan(&loc); err != nil {
			return nil, err
		}
		out = append(out, loc)
	}
	return out, rows.Err()
}

func insertItem(ctx context.Context, db *sql.DB, r *itemRow) error {
	_, err := db.ExecContext(ctx, `INSERT INTO items (`+itemColumns+`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		r.ID, r.Kind, r.Name, r.Locator, r.Mime, r.Size, r.Mtime, r.Width, r.Height, r.DurationMs,
		r.Status, r.CreatedAt, r.UpdatedAt, r.LastVerifiedAt)
	return err
}

func updateItemRow(ctx context.Context, db *sql.DB, r *itemRow) error {
	_, err := db.ExecContext(ctx, `UPDATE items SET name=?, locator=?, mime=?, size=?, mtime=?, width=?, height=?,
		duration_ms=?, status=?, updated_at=?, last_verified_at=? WHERE id=?`,
		r.Name, r.Locator, r.Mime, r.Size, r.Mtime, r.Width, r.Height, r.DurationMs,
		r.Status, r.UpdatedAt, r.LastVerifiedAt, r.ID)
	return err
}

func deleteItems(ctx context.Context, db *sql.DB, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	placeholders := strings.TrimSuffix(strings.Repeat("?,", len(ids)), ",")
	args := make([]any, 0, len(ids))
	for _, id := range ids {
		args = append(args, id)
	}
	_, err := db.ExecContext(ctx, `DELETE FROM items WHERE id IN (`+placeholders+`)`, args...)
	return err
}

func countBroken(ctx context.Context, db *sql.DB) (int, error) {
	var n int
	err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM items WHERE status = 'broken'`).Scan(&n)
	return n, err
}

// ---- tags ----

type tagRow struct {
	ID       string
	Name     string
	Path     string
	ParentID string
}

func scanTag(s interface{ Scan(...any) error }) (*tagRow, error) {
	var r tagRow
	if err := s.Scan(&r.ID, &r.Name, &r.Path, &r.ParentID); err != nil {
		return nil, err
	}
	return &r, nil
}

func getTagByPath(ctx context.Context, db *sql.DB, path string) (*tagRow, error) {
	row := db.QueryRowContext(ctx, `SELECT id, name, path, COALESCE(parent_id, '') FROM tags WHERE path = ?`, path)
	r, err := scanTag(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return r, err
}

func getTag(ctx context.Context, db *sql.DB, id string) (*tagRow, error) {
	row := db.QueryRowContext(ctx, `SELECT id, name, path, COALESCE(parent_id, '') FROM tags WHERE id = ?`, id)
	r, err := scanTag(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return r, err
}

func listTags(ctx context.Context, db *sql.DB) ([]*tagRow, error) {
	rows, err := db.QueryContext(ctx, `SELECT id, name, path, COALESCE(parent_id, '') FROM tags ORDER BY path`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*tagRow
	for rows.Next() {
		r, err := scanTag(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func insertTag(ctx context.Context, db *sql.DB, r *tagRow) error {
	var parent any
	if r.ParentID != "" {
		parent = r.ParentID
	}
	_, err := db.ExecContext(ctx, `INSERT INTO tags(id, name, path, parent_id) VALUES (?,?,?,?)`,
		r.ID, r.Name, r.Path, parent)
	return err
}

func updateTagPath(ctx context.Context, db *sql.DB, id, name, path string) error {
	_, err := db.ExecContext(ctx, `UPDATE tags SET name = ?, path = ? WHERE id = ?`, name, path, id)
	return err
}

// listTagChildren 返回某标签的直接子标签。
func listTagChildren(ctx context.Context, db *sql.DB, parentID string) ([]*tagRow, error) {
	rows, err := db.QueryContext(ctx, `SELECT id, name, path, COALESCE(parent_id, '') FROM tags WHERE parent_id = ? ORDER BY path`, parentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*tagRow
	for rows.Next() {
		r, err := scanTag(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func tagItemCount(ctx context.Context, db *sql.DB, tagID string) (int, error) {
	t, err := getTag(ctx, db, tagID)
	if err != nil {
		return 0, err
	}
	if t == nil {
		return 0, nil
	}
	// 含子孙标签的条目数（父标签选择默认包含子孙）
	var n int
	err = db.QueryRowContext(ctx, `SELECT COUNT(DISTINCT it.item_id) FROM item_tags it JOIN tags t ON t.id = it.tag_id
		WHERE t.path = ? OR t.path LIKE ?`, t.Path, t.Path+"/%").Scan(&n)
	return n, err
}

// tagsOfItem 返回条目的标签引用（按 path 排序）。
func tagsOfItem(ctx context.Context, db *sql.DB, itemID string) ([]TagRef, error) {
	rows, err := db.QueryContext(ctx, `SELECT t.id, t.path FROM item_tags it JOIN tags t ON t.id = it.tag_id
		WHERE it.item_id = ? ORDER BY t.path`, itemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]TagRef, 0)
	for rows.Next() {
		var ref TagRef
		if err := rows.Scan(&ref.ID, &ref.Path); err != nil {
			return nil, err
		}
		out = append(out, ref)
	}
	return out, rows.Err()
}

func setItemTags(ctx context.Context, db *sql.DB, itemID string, tagIDs []string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.ExecContext(ctx, `DELETE FROM item_tags WHERE item_id = ?`, itemID); err != nil {
		return err
	}
	for _, tid := range tagIDs {
		if _, err := tx.ExecContext(ctx, `INSERT OR IGNORE INTO item_tags(item_id, tag_id) VALUES (?,?)`, itemID, tid); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// resolveTagPaths 把路径式标签名解析为叶子标签 ID；不存在的标签自动创建（路径上每一级都创建）。
// 只返回每条路径的叶子标签：父标签由路径与继承语义隐含，不重复挂载。
func resolveTagPaths(ctx context.Context, db *sql.DB, paths []string) ([]string, error) {
	var ids []string
	for _, p := range paths {
		p = strings.Trim(strings.TrimSpace(p), "/")
		if p == "" {
			continue
		}
		segments := strings.Split(p, "/")
		var curPath string
		var parentID string
		var leafID string
		for _, seg := range segments {
			seg = strings.TrimSpace(seg)
			if seg == "" {
				continue
			}
			curPath = strings.Trim(curPath+"/"+seg, "/")
			t, err := getTagByPath(ctx, db, curPath)
			if err != nil {
				return nil, err
			}
			if t == nil {
				t = &tagRow{ID: newID(), Name: seg, Path: curPath, ParentID: parentID}
				if err := insertTag(ctx, db, t); err != nil {
					return nil, err
				}
			}
			parentID = t.ID
			leafID = t.ID
		}
		ids = append(ids, leafID)
	}
	return ids, nil
}

// ---- watch roots ----

func listWatchRoots(ctx context.Context, db *sql.DB) ([]WatchRoot, error) {
	rows, err := db.QueryContext(ctx, `SELECT id, path, created_at FROM watch_roots ORDER BY path`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]WatchRoot, 0)
	for rows.Next() {
		var r WatchRoot
		var created int64
		if err := rows.Scan(&r.ID, &r.Path, &created); err != nil {
			return nil, err
		}
		r.ItemCount = 0 // 由调用方补充
		out = append(out, r)
	}
	return out, rows.Err()
}

func getWatchRoot(ctx context.Context, db *sql.DB, path string) (*WatchRoot, error) {
	var r WatchRoot
	var created int64
	err := db.QueryRowContext(ctx, `SELECT id, path, created_at FROM watch_roots WHERE path = ?`, path).Scan(&r.ID, &r.Path, &created)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func insertWatchRoot(ctx context.Context, db *sql.DB, r *WatchRoot) error {
	_, err := db.ExecContext(ctx, `INSERT INTO watch_roots(id, path, created_at) VALUES (?,?,?)`, r.ID, r.Path, nowMillis())
	return err
}

func deleteWatchRoot(ctx context.Context, db *sql.DB, id string) error {
	_, err := db.ExecContext(ctx, `DELETE FROM watch_roots WHERE id = ?`, id)
	return err
}

// ---- repair jobs ----

func getOpenRepairByItem(ctx context.Context, db *sql.DB, itemID string) (*RepairItem, error) {
	row := db.QueryRowContext(ctx, `SELECT id, item_id, state, created_at, updated_at FROM repair_jobs WHERE item_id = ? AND state = 'open'`, itemID)
	var r RepairItem
	if err := row.Scan(&r.ID, &r.ItemID, &r.State, &r.CreatedAt, &r.UpdatedAt); err == sql.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, err
	}
	return &r, nil
}

func openRepairJob(ctx context.Context, db *sql.DB, itemID string) (*RepairItem, error) {
	existing, err := getOpenRepairByItem(ctx, db, itemID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return existing, nil
	}
	r := &RepairItem{ID: newID(), ItemID: itemID, State: "open", CreatedAt: nowMillis(), UpdatedAt: nowMillis()}
	_, err = db.ExecContext(ctx, `INSERT INTO repair_jobs(id, item_id, state, created_at, updated_at) VALUES (?,?,?,?,?)`,
		r.ID, r.ItemID, r.State, r.CreatedAt, r.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return r, nil
}

func closeRepairJob(ctx context.Context, db *sql.DB, itemID, state string) error {
	_, err := db.ExecContext(ctx, `UPDATE repair_jobs SET state = ?, updated_at = ? WHERE item_id = ? AND state = 'open'`, state, nowMillis(), itemID)
	return err
}

func listRepairJobs(ctx context.Context, db *sql.DB, state string) ([]RepairItem, error) {
	query := `SELECT r.id, r.item_id, r.state, r.created_at, r.updated_at, i.name, i.locator FROM repair_jobs r JOIN items i ON i.id = r.item_id`
	var args []any
	if state != "" {
		query += ` WHERE r.state = ?`
		args = append(args, state)
	}
	query += ` ORDER BY r.updated_at DESC`
	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]RepairItem, 0)
	for rows.Next() {
		r := RepairItem{Candidates: []string{}}
		if err := rows.Scan(&r.ID, &r.ItemID, &r.State, &r.CreatedAt, &r.UpdatedAt, &r.ItemName, &r.ItemPath); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func countOpenRepairs(ctx context.Context, db *sql.DB) (int, error) {
	var n int
	err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM repair_jobs WHERE state = 'open'`).Scan(&n)
	return n, err
}

// itemsInDir 返回某个目录下（不含子目录）的所有文件条目 locator。
func itemsInDir(ctx context.Context, db *sql.DB, dir string) ([]string, error) {
	prefix := dir + string(filepath.Separator)
	rows, err := db.QueryContext(ctx, `SELECT locator FROM items WHERE kind = 'file' AND locator LIKE ?`, prefix+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var loc string
		if err := rows.Scan(&loc); err != nil {
			return nil, err
		}
		out = append(out, loc)
	}
	return out, rows.Err()
}

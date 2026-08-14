package backend

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
)

// WatchService 后台监听监听根与条目父目录，近实时发现断链/移动/新文件。
type WatchService struct {
	db      *sql.DB
	items   *ItemService
	repairs *RepairService
	emit    func(name string, data any)

	mu       sync.Mutex
	fsw      *fsnotify.Watcher
	dirs     map[string]bool // 已监听目录（绝对路径）
	roots    []string        // 监听根（用于判断递归索引范围）
	running  bool
	stop     chan struct{}
	eventsCh chan fsnotify.Event
}

func NewWatchService(db *sql.DB, items *ItemService, repairs *RepairService, emit func(name string, data any)) *WatchService {
	return &WatchService{db: db, items: items, repairs: repairs, emit: emit, dirs: map[string]bool{}, eventsCh: make(chan fsnotify.Event, 256)}
}

// Start 初始化监听并启动事件循环。
func (s *WatchService) Start(ctx context.Context) error {
	fsw, err := fsnotify.NewWatcher()
	if err != nil {
		return fmt.Errorf("创建文件监听器: %w", err)
	}
	s.mu.Lock()
	s.fsw = fsw
	s.stop = make(chan struct{})
	s.running = true
	s.mu.Unlock()

	// 初始登记：监听根递归 + 文件条目父目录
	roots, err := listWatchRoots(ctx, s.db)
	if err != nil {
		return err
	}
	for _, r := range roots {
		s.roots = append(s.roots, r.Path)
	}
	all, err := s.items.listAllItemsForWatcher(ctx)
	if err != nil {
		return err
	}
	parentDirs := map[string]bool{}
	for _, it := range all {
		if it.Kind == "file" {
			parentDirs[filepath.Dir(it.Locator)] = true
		}
	}
	for _, root := range roots {
		_ = s.watchTree(root.Path)
	}
	for dir := range parentDirs {
		_ = s.watchDir(dir)
	}

	go s.eventLoop(ctx)
	if s.emit != nil {
		s.emit("interweave:watcher-status", map[string]any{"running": true})
	}
	return nil
}

// Stop 停止监听。
func (s *WatchService) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.running {
		return
	}
	s.running = false
	close(s.stop)
	if s.fsw != nil {
		_ = s.fsw.Close()
	}
	if s.emit != nil {
		s.emit("interweave:watcher-status", map[string]any{"running": false})
	}
}

func (s *WatchService) watchDir(dir string) error {
	abs, err := filepath.Abs(dir)
	if err != nil {
		return err
	}
	if fi, err := os.Stat(abs); err != nil || !fi.IsDir() {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.dirs[abs] {
		return nil
	}
	if s.fsw == nil {
		return nil
	}
	if err := s.fsw.Add(abs); err != nil {
		return err
	}
	s.dirs[abs] = true
	return nil
}

// watchTree 递归监听一个目录树（目录新增时由事件循环增量补充）。
func (s *WatchService) watchTree(root string) error {
	return filepath.WalkDir(root, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			if isHidden(p) && p != root {
				return filepath.SkipDir
			}
			return s.watchDir(p)
		}
		return nil
	})
}

func (s *WatchService) underRoot(path string) bool {
	for _, root := range s.roots {
		if path == root || strings.HasPrefix(path, root+string(filepath.Separator)) {
			return true
		}
	}
	return false
}

func (s *WatchService) unwatchDir(dir string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.fsw != nil {
		_ = s.fsw.Remove(dir)
	}
	delete(s.dirs, dir)
}

// eventLoop 以短窗口批处理事件，避免高频率操作互相干扰。
func (s *WatchService) eventLoop(ctx context.Context) {
	batch := map[fsnotify.Op][]string{}
	var ops []fsnotify.Op
	flush := func() {
		if len(batch) == 0 {
			return
		}
		s.processBatch(ctx, batch)
		batch = map[fsnotify.Op][]string{}
		ops = nil
	}
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-s.stop:
			return
		case <-ctx.Done():
			return
		case ev, ok := <-s.fsw.Events:
			if !ok {
				return
			}
			key := ev.Op &^ fsnotify.Chmod
			if key == 0 {
				continue
			}
			if _, seen := batch[key]; !seen {
				ops = append(ops, key)
			}
			batch[key] = append(batch[key], ev.Name)
		case err, ok := <-s.fsw.Errors:
			if !ok {
				return
			}
			if s.emit != nil {
				s.emit("interweave:watcher-status", map[string]any{"running": true, "error": err.Error()})
			}
		case <-ticker.C:
			flush()
		}
	}
}

func (s *WatchService) processBatch(ctx context.Context, batch map[fsnotify.Op][]string) {
	creates := batch[fsnotify.Create]
	removes := batch[fsnotify.Remove]
	writes := batch[fsnotify.Write]
	renames := batch[fsnotify.Rename]
	consumed := map[string]bool{}

	// 1) 先处理重命名：目录迁移 + 条目跟随（inotify 成对；kqueue 可能只有 old）
	for i := 0; i < len(renames); i++ {
		oldPath := renames[i]
		newPath := ""
		if i+1 < len(renames) {
			newPath = renames[i+1]
			i++
		}
		// 单事件重命名：从 create 事件里找目标（目录或大小吻合的文件）
		if newPath == "" || !pathExists(newPath) {
			for _, c := range creates {
				if consumed[c] || !pathExists(c) {
					continue
				}
				newPath = c
				consumed[c] = true
				break
			}
		}
		if newPath == "" {
			continue
		}
		s.handleRename(ctx, oldPath, newPath)
		if consumed[newPath] {
			continue
		}
	}

	// 2) 处理剩余 create（未被重命名认领的）
	for _, p := range creates {
		if consumed[p] {
			continue
		}
		s.handleCreate(ctx, p)
	}
	// 3) 被动刷新指纹
	for _, p := range writes {
		s.handleWrite(ctx, p)
	}
	// 4) 断链
	for _, p := range removes {
		s.handleRemove(ctx, p)
	}
}

func pathExists(p string) bool {
	_, err := os.Stat(p)
	return err == nil
}

func (s *WatchService) handleCreate(ctx context.Context, path string) {
	fi, err := os.Stat(path)
	if err != nil {
		return
	}
	if fi.IsDir() {
		_ = s.watchDir(path)
		if s.underRoot(path) {
			// 索引该目录内的新文件（扁平）
			_ = filepath.WalkDir(path, func(p string, d os.DirEntry, err error) error {
				if err != nil {
					return nil
				}
				if d.IsDir() {
					if isHidden(p) && p != path {
						return filepath.SkipDir
					}
					return s.watchDir(p)
				}
				if isHidden(p) {
					return nil
				}
				return s.indexNewFile(ctx, p)
			})
		}
		return
	}
	s.indexNewFile(ctx, path)
}

func (s *WatchService) indexNewFile(ctx context.Context, path string) error {
	existing, err := getItemByLocator(ctx, s.db, path)
	if err != nil {
		return err
	}
	if existing != nil {
		return s.repairs.repairIfRestored(ctx, existing)
	}
	if !s.underRoot(path) {
		return nil // 单文件条目父目录下的新文件不自动入库
	}
	_, err = s.items.AddFiles(ctx, []string{path}, nil)
	return err
}

func (s *WatchService) handleWrite(ctx context.Context, path string) {
	item, err := getItemByLocator(ctx, s.db, path)
	if err != nil || item == nil {
		return
	}
	// 被动刷新指纹：内容变动不产生事件
	fi, err := os.Stat(path)
	if err != nil || fi.IsDir() {
		return
	}
	if fi.Size() != item.Size || fi.ModTime().UnixMilli() != item.Mtime {
		item.Size = fi.Size()
		item.Mtime = fi.ModTime().UnixMilli()
		item.UpdatedAt = nowMillis()
		item.LastVerifiedAt = nowMillis()
		_ = updateItemRow(ctx, s.db, item)
	}
}

func (s *WatchService) handleRemove(ctx context.Context, path string) {
	if fi, err := os.Stat(path); err == nil && fi.IsDir() {
		// 目录被删除：移除监听并标记其下条目断链
		for dir := range s.dirs {
			if dir == path || strings.HasPrefix(dir, path+string(filepath.Separator)) {
				s.unwatchDir(dir)
			}
		}
		_ = s.repairs.markAllBrokenForPath(ctx, path)
		return
	}
	item, err := getItemByLocator(ctx, s.db, path)
	if err != nil || item == nil {
		return
	}
	_ = s.repairs.markBroken(ctx, item)
}

func (s *WatchService) handleRename(ctx context.Context, oldPath, newPath string) {
	// 目录移动：迁移监听并（在监听根内）索引新文件
	if _, isDir := s.dirs[oldPath]; isDir {
		s.unwatchDir(oldPath)
		if fi, err := os.Stat(newPath); err == nil && fi.IsDir() {
			_ = s.watchTree(newPath)
			if s.underRoot(newPath) {
				_ = filepath.WalkDir(newPath, func(p string, d os.DirEntry, err error) error {
					if err != nil {
						return nil
					}
					if d.IsDir() {
						return nil
					}
					if isHidden(p) {
						return nil
					}
					return s.indexNewFile(ctx, p)
				})
			}
		}
	}
	item, err := getItemByLocator(ctx, s.db, oldPath)
	if err != nil || item == nil {
		return
	}
	if fi, err := os.Stat(newPath); err == nil && !fi.IsDir() {
		// 移动 + 目标存在：视为唯一候选，直接更新定位符（最强修复信号）
		s.adoptItem(ctx, item, newPath, fi)
		return
	}
	_ = s.repairs.markBroken(ctx, item)
}

// adoptItem 把条目的定位符更新到新位置（重命名/移动的唯一候选修复）。
func (s *WatchService) adoptItem(ctx context.Context, item *itemRow, newPath string, fi os.FileInfo) {
	item.Locator = newPath
	item.Name = filepath.Base(newPath)
	item.Status = "ok"
	item.Size = fi.Size()
	item.Mtime = fi.ModTime().UnixMilli()
	item.UpdatedAt = nowMillis()
	item.LastVerifiedAt = nowMillis()
	if item.Mime == "" {
		item.Mime = detectMime(newPath)
	}
	_ = updateItemRow(ctx, s.db, item)
	if s.emit != nil {
		s.emit("interweave:items-changed", map[string]string{"reason": "rename"})
	}
}

// ListWatchRoots 返回监听根列表。
func (s *WatchService) ListWatchRoots(ctx context.Context) ([]WatchRoot, error) {
	roots, err := listWatchRoots(ctx, s.db)
	if err != nil {
		return nil, err
	}
	for i := range roots {
		count, err := s.countItemsUnder(ctx, roots[i].Path)
		if err != nil {
			return nil, err
		}
		roots[i].ItemCount = count
	}
	return nonNilSlice(roots), nil
}

// AddWatchRoot 登记监听根并立即索引（幂等）。
func (s *WatchService) AddWatchRoot(ctx context.Context, path string) (WatchRoot, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return WatchRoot{}, err
	}
	fi, err := os.Stat(abs)
	if err != nil || !fi.IsDir() {
		return WatchRoot{}, fmt.Errorf("目录不存在: %s", abs)
	}
	existing, err := getWatchRoot(ctx, s.db, abs)
	if err != nil {
		return WatchRoot{}, err
	}
	if existing != nil {
		return *existing, nil
	}
	root := WatchRoot{ID: newID(), Path: abs}
	if err := insertWatchRoot(ctx, s.db, &root); err != nil {
		return WatchRoot{}, err
	}
	s.mu.Lock()
	s.roots = append(s.roots, abs)
	s.mu.Unlock()
	// 通过 AddFolder 索引目录内文件并保持同一语义
	if _, err := s.items.AddFolder(ctx, abs, nil); err != nil {
		return WatchRoot{}, err
	}
	_ = s.watchTree(abs)
	return root, nil
}

// RemoveWatchRoot 移除监听根（不删除条目）。
func (s *WatchService) RemoveWatchRoot(ctx context.Context, id string) error {
	roots, err := listWatchRoots(ctx, s.db)
	if err != nil {
		return err
	}
	for _, r := range roots {
		if r.ID == id {
			s.mu.Lock()
			filtered := s.roots[:0]
			for _, p := range s.roots {
				if p != r.Path {
					filtered = append(filtered, p)
				}
			}
			s.roots = filtered
			s.mu.Unlock()
			break
		}
	}
	return deleteWatchRoot(ctx, s.db, id)
}

func (s *WatchService) countItemsUnder(ctx context.Context, root string) (int, error) {
	prefix := root + string(filepath.Separator)
	var n int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM items WHERE kind='file' AND (locator = ? OR locator LIKE ?)`, root, prefix+"%").Scan(&n)
	return n, err
}

// ---- watch roots CRUD ----

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

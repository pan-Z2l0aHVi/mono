package main

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// ItemService 负责条目的查询与入库（可寻址资源：file / url）。
type ItemService struct {
	db   *sql.DB
	emit func(name string, data any)
}

func NewItemService(db *sql.DB, emit func(name string, data any)) *ItemService {
	return &ItemService{db: db, emit: emit}
}

func (s *ItemService) changed(reason string) {
	if s.emit != nil {
		s.emit("weave:items-changed", map[string]string{"reason": reason})
	}
}

// ListItems 按过滤条件查询条目（TagPath 含子孙标签）。
func (s *ItemService) ListItems(ctx context.Context, query ListQuery) ([]Item, error) {
	var where []string
	var args []any
	if query.Kind != "" {
		where = append(where, "i.kind = ?")
		args = append(args, query.Kind)
	}
	if query.Status != "" {
		where = append(where, "i.status = ?")
		args = append(args, query.Status)
	}
	if query.Search != "" {
		where = append(where, "i.name LIKE ?")
		args = append(args, "%"+query.Search+"%")
	}
	if query.TagPath != "" {
		tag, err := getTagByPath(ctx, s.db, strings.Trim(query.TagPath, "/"))
		if err != nil {
			return nil, err
		}
		if tag == nil {
			return []Item{}, nil
		}
		// 标签继承：匹配该标签及其所有子孙标签的 path 前缀
		where = append(where, "EXISTS (SELECT 1 FROM item_tags it JOIN tags t ON t.id = it.tag_id WHERE it.item_id = i.id AND (t.path = ? OR t.path LIKE ?))")
		args = append(args, tag.Path, tag.Path+"/%")
	}
	sqlWhere := ""
	if len(where) > 0 {
		sqlWhere = " WHERE " + strings.Join(where, " AND ")
	}
	sqlOrder := " ORDER BY i.updated_at DESC, i.name"
	if query.Limit > 0 {
		sqlOrder += fmt.Sprintf(" LIMIT %d", query.Limit)
	}
	if query.Offset > 0 {
		sqlOrder += fmt.Sprintf(" OFFSET %d", query.Offset)
	}
	rows, err := s.db.QueryContext(ctx, `SELECT `+itemColumns+` FROM items i`+sqlWhere+sqlOrder, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]Item, 0)
	for rows.Next() {
		r, err := scanItem(rows)
		if err != nil {
			return nil, err
		}
		item, err := s.toItem(ctx, r)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return nonNilSlice(items), nil
}

// GetItem 返回单个条目。
func (s *ItemService) GetItem(ctx context.Context, id string) (Item, error) {
	r, err := getItem(ctx, s.db, id)
	if err != nil {
		return Item{}, err
	}
	if r == nil {
		return Item{}, fmt.Errorf("条目不存在: %s", id)
	}
	return s.toItem(ctx, r)
}

func (s *ItemService) toItem(ctx context.Context, r *itemRow) (Item, error) {
	tags, err := tagsOfItem(ctx, s.db, r.ID)
	if err != nil {
		return Item{}, err
	}
	return Item{
		ID: r.ID, Kind: r.Kind, Name: r.Name, Locator: r.Locator, Mime: r.Mime,
		Size: r.Size, Mtime: r.Mtime, Width: r.Width, Height: r.Height,
		DurationMs: r.DurationMs, Status: r.Status, Tags: tags,
		CreatedAt: r.CreatedAt, UpdatedAt: r.UpdatedAt,
	}, nil
}

// AddFiles 添加一个或多个文件（保持原位，仅登记）。
func (s *ItemService) AddFiles(ctx context.Context, paths []string, tagPaths []string) (AddResult, error) {
	res := AddResult{Items: []Item{}}
	tagIDs, err := resolveTagPaths(ctx, s.db, tagPaths)
	if err != nil {
		return res, err
	}
	for _, p := range paths {
		abs, err := filepath.Abs(p)
		if err != nil {
			res.Failed++
			continue
		}
		info, err := os.Stat(abs)
		if err != nil || info.IsDir() {
			res.Failed++
			continue
		}
		existing, err := getItemByLocator(ctx, s.db, abs)
		if err != nil {
			return res, err
		}
		if existing != nil {
			res.Skipped++
			continue
		}
		item, err := s.createFileItem(ctx, abs, info, tagIDs)
		if err != nil {
			res.Failed++
			continue
		}
		res.Added++
		res.Items = append(res.Items, item)
	}
	s.changed("add-files")
	return res, nil
}

// AddUrl 添加远程资源链接。
func (s *ItemService) AddUrl(ctx context.Context, rawURL string, tagPaths []string) (Item, error) {
	u, err := url.Parse(rawURL)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return Item{}, fmt.Errorf("无效的 URL: %s", rawURL)
	}
	name := filepath.Base(u.Path)
	if name == "" || name == "." || name == "/" {
		name = u.Host
	}
	tagIDs, err := resolveTagPaths(ctx, s.db, tagPaths)
	if err != nil {
		return Item{}, err
	}
	now := nowMillis()
	r := &itemRow{
		ID: newID(), Kind: "url", Name: name, Locator: rawURL,
		Status: "ok", CreatedAt: now, UpdatedAt: now, LastVerifiedAt: now,
	}
	if err := insertItem(ctx, s.db, r); err != nil {
		return Item{}, err
	}
	if len(tagIDs) > 0 {
		if err := setItemTags(ctx, s.db, r.ID, tagIDs); err != nil {
			return Item{}, err
		}
	}
	item, err := s.toItem(ctx, r)
	if err != nil {
		return Item{}, err
	}
	s.changed("add-url")
	return item, nil
}

// AddFolder 递归索引目录内每个文件为扁平条目，并登记为监听根。
func (s *ItemService) AddFolder(ctx context.Context, path string, tagPaths []string) (AddResult, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return AddResult{}, err
	}
	info, err := os.Stat(abs)
	if err != nil {
		return AddResult{}, err
	}
	if !info.IsDir() {
		return s.AddFiles(ctx, []string{abs}, tagPaths)
	}
	if _, err := getWatchRoot(ctx, s.db, abs); err != nil {
		return AddResult{}, err
	}
	// 登记监听根（幂等）
	root, err := getWatchRoot(ctx, s.db, abs)
	if err != nil {
		return AddResult{}, err
	}
	if root == nil {
		if err := insertWatchRoot(ctx, s.db, &WatchRoot{ID: newID(), Path: abs}); err != nil {
			return AddResult{}, err
		}
	}
	tagIDs, err := resolveTagPaths(ctx, s.db, tagPaths)
	if err != nil {
		return AddResult{}, err
	}
	res := AddResult{Items: []Item{}}
	err = filepath.WalkDir(abs, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return nil // 跳过无权限子树
		}
		if isHidden(p) {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if d.IsDir() {
			return nil
		}
		fi, err := d.Info()
		if err != nil || !fi.Mode().IsRegular() {
			return nil
		}
		existing, err := getItemByLocator(ctx, s.db, p)
		if err != nil {
			return err
		}
		if existing != nil {
			res.Skipped++
			return nil
		}
		item, err := s.createFileItem(ctx, p, fi, tagIDs)
		if err != nil {
			res.Failed++
			return nil
		}
		res.Added++
		res.Items = append(res.Items, item)
		return nil
	})
	if err != nil {
		return res, err
	}
	s.changed("add-folder")
	return res, nil
}

func (s *ItemService) createFileItem(ctx context.Context, abs string, info os.FileInfo, tagIDs []string) (Item, error) {
	mimeType := detectMime(abs)
	w, h := 0, 0
	duration := int64(0)
	if strings.HasPrefix(mimeType, "image/") {
		w, h = imageSize(abs)
	} else if mimeType == "video/mp4" || mimeType == "audio/mp4" {
		duration = mp4Duration(abs)
	}
	now := nowMillis()
	r := &itemRow{
		ID: newID(), Kind: "file", Name: filepath.Base(abs), Locator: abs,
		Mime: mimeType, Size: info.Size(), Mtime: info.ModTime().UnixMilli(),
		Width: w, Height: h, DurationMs: duration,
		Status: "ok", CreatedAt: now, UpdatedAt: now, LastVerifiedAt: now,
	}
	if err := insertItem(ctx, s.db, r); err != nil {
		return Item{}, err
	}
	if len(tagIDs) > 0 {
		if err := setItemTags(ctx, s.db, r.ID, tagIDs); err != nil {
			return Item{}, err
		}
	}
	return s.toItem(ctx, r)
}

// RemoveItems 删除条目（仅移除登记，不删除源文件）。
func (s *ItemService) RemoveItems(ctx context.Context, ids []string) error {
	if err := deleteItems(ctx, s.db, ids); err != nil {
		return err
	}
	s.changed("remove-items")
	return nil
}

// UpdateItemName 更新条目显示名。
func (s *ItemService) UpdateItemName(ctx context.Context, id, name string) error {
	r, err := getItem(ctx, s.db, id)
	if err != nil {
		return err
	}
	if r == nil {
		return fmt.Errorf("条目不存在: %s", id)
	}
	r.Name = strings.TrimSpace(name)
	r.UpdatedAt = nowMillis()
	if err := updateItemRow(ctx, s.db, r); err != nil {
		return err
	}
	s.changed("update-item")
	return nil
}

// SetItemTags 用路径式标签名集合替换条目标签。
func (s *ItemService) SetItemTags(ctx context.Context, id string, tagPaths []string) error {
	tagIDs, err := resolveTagPaths(ctx, s.db, tagPaths)
	if err != nil {
		return err
	}
	if err := setItemTags(ctx, s.db, id, tagIDs); err != nil {
		return err
	}
	s.changed("update-item-tags")
	return nil
}

// OpenItemLocation 在系统文件管理器中定位源文件。
func (s *ItemService) OpenItemLocation(ctx context.Context, id string) error {
	r, err := getItem(ctx, s.db, id)
	if err != nil {
		return err
	}
	if r == nil || r.Kind != "file" {
		return fmt.Errorf("条目不存在或不是文件: %s", id)
	}
	if runtime.GOOS == "windows" {
		return exec.Command("explorer", "/select,"+r.Locator).Start()
	}
	return exec.Command("open", "-R", r.Locator).Start()
}

// OpenItem 用系统默认应用打开源文件。
func (s *ItemService) OpenItem(ctx context.Context, id string) error {
	r, err := getItem(ctx, s.db, id)
	if err != nil {
		return err
	}
	if r == nil {
		return fmt.Errorf("条目不存在: %s", id)
	}
	if r.Kind == "url" {
		if runtime.GOOS == "windows" {
			return exec.Command("rundll32", "url.dll,FileProtocolHandler", r.Locator).Start()
		}
		return exec.Command("open", r.Locator).Start()
	}
	if runtime.GOOS == "windows" {
		return exec.Command("rundll32", "url.dll,FileProtocolHandler", r.Locator).Start()
	}
	return exec.Command("open", r.Locator).Start()
}

// PickFiles 打开系统文件选择器（多选）。
func (s *ItemService) PickFiles() ([]string, error) {
	app := application.Get()
	if app == nil {
		return nil, fmt.Errorf("应用未就绪")
	}
	dlg := app.Dialog.OpenFileWithOptions(&application.OpenFileDialogOptions{
		Title: "选择要入库的文件", CanChooseFiles: true, CanChooseDirectories: false, AllowsMultipleSelection: true,
	})
	paths, err := dlg.PromptForMultipleSelection()
	if err != nil {
		return nil, err
	}
	return nonNilSlice(paths), nil
}

// PickFolder 打开系统目录选择器。
func (s *ItemService) PickFolder() (string, error) {
	app := application.Get()
	if app == nil {
		return "", fmt.Errorf("应用未就绪")
	}
	dlg := app.Dialog.OpenFileWithOptions(&application.OpenFileDialogOptions{
		Title: "选择要入库的文件夹", CanChooseFiles: false, CanChooseDirectories: true, AllowsMultipleSelection: false,
	})
	return dlg.PromptForSingleSelection()
}

// itemByLocatorForWatcher 供 watcher 使用：按路径查找条目。
func (s *ItemService) itemByLocatorForWatcher(ctx context.Context, locator string) (*itemRow, error) {
	return getItemByLocator(ctx, s.db, locator)
}

// listAllItemsForWatcher 供 watcher/rescan 使用。
func (s *ItemService) listAllItemsForWatcher(ctx context.Context) ([]*itemRow, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT `+itemColumns+` FROM items`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*itemRow
	for rows.Next() {
		r, err := scanItem(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func isHidden(path string) bool {
	base := filepath.Base(path)
	return strings.HasPrefix(base, ".")
}

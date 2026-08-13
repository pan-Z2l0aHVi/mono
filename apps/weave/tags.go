package main

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

// TagService 负责路径式层级标签的管理（Bear 模型：单父树、父选含子孙）。
type TagService struct {
	db   *sql.DB
	emit func(name string, data any)
}

func NewTagService(db *sql.DB, emit func(name string, data any)) *TagService {
	return &TagService{db: db, emit: emit}
}

func (s *TagService) changed() {
	if s.emit != nil {
		s.emit("weave:tags-changed", map[string]string{})
	}
}

// ListTags 返回完整标签树（每个节点带直接条目数与子节点）。
func (s *TagService) ListTags(ctx context.Context) ([]Tag, error) {
	rows, err := listTags(ctx, s.db)
	if err != nil {
		return nil, err
	}
	byID := map[string]*Tag{}
	var roots []*Tag
	for _, r := range rows {
		count, err := tagItemCount(ctx, s.db, r.ID)
		if err != nil {
			return nil, err
		}
		t := &Tag{ID: r.ID, Name: r.Name, Path: r.Path, ParentID: r.ParentID, ItemCount: count}
		byID[r.ID] = t
		if r.ParentID == "" || byID[r.ParentID] == nil {
			roots = append(roots, t)
		} else {
			byID[r.ParentID].Children = append(byID[r.ParentID].Children, t)
		}
	}
	out := make([]Tag, 0, len(roots))
	for _, r := range roots {
		out = append(out, *r)
	}
	return out, nil
}

// CreateTag 创建标签。name 可为单个标签名（配合 parentPath）或完整路径（如 a/b/c）。
// 路径中间层不存在时自动创建。
func (s *TagService) CreateTag(ctx context.Context, name string, parentPath string) (Tag, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return Tag{}, fmt.Errorf("标签名不能为空")
	}
	if strings.Contains(name, "/") {
		if strings.TrimSpace(parentPath) != "" {
			return Tag{}, fmt.Errorf("name 含 / 时不能同时提供 parentPath")
		}
		ids, err := resolveTagPaths(ctx, s.db, []string{name})
		if err != nil {
			return Tag{}, err
		}
		if len(ids) == 0 {
			return Tag{}, fmt.Errorf("无效标签路径: %s", name)
		}
		leaf, err := getTag(ctx, s.db, ids[len(ids)-1])
		if err != nil {
			return Tag{}, err
		}
		s.changed()
		return Tag{ID: leaf.ID, Name: leaf.Name, Path: leaf.Path, ParentID: leaf.ParentID}, nil
	}
	parentPath = strings.Trim(strings.TrimSpace(parentPath), "/")
	ids, err := resolveTagPaths(ctx, s.db, []string{parentPath})
	if err != nil {
		return Tag{}, err
	}
	var parentID string
	if len(ids) > 0 {
		parentID = ids[len(ids)-1]
	}
	path := strings.Trim(parentPath+"/"+name, "/")
	if existing, _ := getTagByPath(ctx, s.db, path); existing != nil {
		return Tag{}, fmt.Errorf("标签已存在: %s", path)
	}
	r := &tagRow{ID: newID(), Name: name, Path: path, ParentID: parentID}
	if err := insertTag(ctx, s.db, r); err != nil {
		return Tag{}, err
	}
	s.changed()
	return Tag{ID: r.ID, Name: r.Name, Path: r.Path, ParentID: r.ParentID}, nil
}

// RenameTag 重命名标签最后一段，并批量更新所有子孙的路径前缀。
func (s *TagService) RenameTag(ctx context.Context, path, newName string) error {
	t, err := getTagByPath(ctx, s.db, strings.Trim(path, "/"))
	if err != nil {
		return err
	}
	if t == nil {
		return fmt.Errorf("标签不存在: %s", path)
	}
	newName = strings.TrimSpace(newName)
	if newName == "" || strings.Contains(newName, "/") {
		return fmt.Errorf("标签名不能为空且不能包含 /: %q", newName)
	}
	parent := ""
	if t.ParentID != "" {
		p, err := getTag(ctx, s.db, t.ParentID)
		if err != nil {
			return err
		}
		if p != nil {
			parent = p.Path
		}
	}
	newPath := strings.Trim(parent+"/"+newName, "/")
	if other, _ := getTagByPath(ctx, s.db, newPath); other != nil && other.ID != t.ID {
		return fmt.Errorf("目标路径已存在: %s", newPath)
	}
	if err := updateTagPath(ctx, s.db, t.ID, newName, newPath); err != nil {
		return err
	}
	if err := rewriteTagSubtree(ctx, s.db, t.Path, newPath); err != nil {
		return err
	}
	s.changed()
	return nil
}

// MoveTag 把标签（含子树）移动到 newParentPath 下。
func (s *TagService) MoveTag(ctx context.Context, path, newParentPath string) error {
	t, err := getTagByPath(ctx, s.db, strings.Trim(path, "/"))
	if err != nil {
		return err
	}
	if t == nil {
		return fmt.Errorf("标签不存在: %s", path)
	}
	if strings.Trim(newParentPath, "/") == "" {
		newParentPath = ""
	}
	// 防止移动到自身子树下形成环
	if newParentPath != "" && (newParentPath == t.Path || strings.HasPrefix(newParentPath, t.Path+"/")) {
		return fmt.Errorf("不能把标签移动到自身子树下: %s -> %s", t.Path, newParentPath)
	}
	ids, err := resolveTagPaths(ctx, s.db, []string{newParentPath})
	if err != nil {
		return err
	}
	newParentID := ""
	if len(ids) > 0 {
		newParentID = ids[len(ids)-1]
	}
	newPath := strings.Trim(newParentPath+"/"+t.Name, "/")
	if other, _ := getTagByPath(ctx, s.db, newPath); other != nil && other.ID != t.ID {
		return fmt.Errorf("目标路径已存在: %s", newPath)
	}
	if err := updateTagPath(ctx, s.db, t.ID, t.Name, newPath); err != nil {
		return err
	}
	if _, err := s.db.ExecContext(ctx, `UPDATE tags SET parent_id = ? WHERE id = ?`, newParentID, t.ID); err != nil {
		return err
	}
	if err := rewriteTagSubtree(ctx, s.db, t.Path, newPath); err != nil {
		return err
	}
	s.changed()
	return nil
}

// DeleteTag 删除标签及其整个子树（条目的其他标签保留）。
func (s *TagService) DeleteTag(ctx context.Context, path string) error {
	t, err := getTagByPath(ctx, s.db, strings.Trim(path, "/"))
	if err != nil {
		return err
	}
	if t == nil {
		return fmt.Errorf("标签不存在: %s", path)
	}
	// 删除子树：先按路径前缀删除（ON DELETE CASCADE 会清理 item_tags）
	if _, err := s.db.ExecContext(ctx, `DELETE FROM tags WHERE path = ? OR path LIKE ?`, t.Path, t.Path+"/%"); err != nil {
		return err
	}
	s.changed()
	return nil
}

// rewriteTagSubtree 把旧前缀替换为新前缀（Rename/Move 共用）。
func rewriteTagSubtree(ctx context.Context, db *sql.DB, oldPath, newPath string) error {
	if oldPath == newPath {
		return nil
	}
	_, err := db.ExecContext(ctx, `UPDATE tags SET path = ? || substr(path, length(?) + 1) WHERE path LIKE ? || '/%'`,
		newPath, oldPath, oldPath)
	return err
}

package main

import (
	"context"
	"testing"
)

func TestTagTreeCreationAndAutoParents(t *testing.T) {
	db := openTestDB(t)
	_, tags, _, _ := newTestServices(t, db)
	ctx := context.Background()

	// 创建多级标签：路径中间层自动创建
	leaf, err := tags.CreateTag(ctx, "alpha", "work/project")
	if err != nil {
		t.Fatalf("创建标签: %v", err)
	}
	if leaf.Path != "work/project/alpha" {
		t.Fatalf("路径错误: %s", leaf.Path)
	}
	root, err := tags.CreateTag(ctx, "notes", "")
	if err != nil {
		t.Fatalf("创建根标签: %v", err)
	}
	if root.Path != "notes" {
		t.Fatalf("根标签路径错误: %s", root.Path)
	}

	tree, err := tags.ListTags(ctx)
	if err != nil {
		t.Fatalf("列出标签: %v", err)
	}
	if len(tree) != 2 {
		t.Fatalf("根标签数量错误: %d", len(tree))
	}
	// work -> project -> alpha
	work := findTag(tree, "work")
	if work == nil || len(work.Children) != 1 || work.Children[0].Path != "work/project" {
		t.Fatalf("标签树结构错误: %+v", tree)
	}
}

func TestTagRenameRewritesSubtree(t *testing.T) {
	db := openTestDB(t)
	_, tags, _, _ := newTestServices(t, db)
	ctx := context.Background()

	_, _ = tags.CreateTag(ctx, "a/b/c", "")
	if err := tags.RenameTag(ctx, "a/b", "x"); err != nil {
		t.Fatalf("重命名: %v", err)
	}
	// 子孙路径前缀应更新：a/b -> a/x，a/b/c -> a/x/c
	if _, err := tags.CreateTag(ctx, "d", "a/x"); err != nil {
		t.Fatalf("重命名后创建子孙失败: %v", err)
	}
	if old, _ := getTagByPath(ctx, db, "a/b"); old != nil {
		t.Fatalf("旧路径 a/b 不应存在")
	}
	if old, _ := getTagByPath(ctx, db, "a/b/c"); old != nil {
		t.Fatalf("旧路径 a/b/c 不应存在")
	}
	if x, _ := getTagByPath(ctx, db, "a/x"); x == nil {
		t.Fatalf("新路径 a/x 应存在")
	}
	if c, _ := getTagByPath(ctx, db, "a/x/c"); c == nil {
		t.Fatalf("子孙路径应重写为 a/x/c")
	}
}

func TestTagMoveAndDeleteSubtree(t *testing.T) {
	db := openTestDB(t)
	items, tags, _, _ := newTestServices(t, db)
	ctx := context.Background()

	_, _ = tags.CreateTag(ctx, "work/proj", "")
	_, _ = tags.CreateTag(ctx, "personal", "")
	// 给 personal 打一个条目
	res, err := items.AddFiles(ctx, []string{writeFile(t, t.TempDir(), "a.txt", "hello")}, []string{"personal"})
	if err != nil || res.Added != 1 {
		t.Fatalf("添加文件: %v res=%+v", err, res)
	}
	if err := tags.MoveTag(ctx, "work", "personal"); err != nil {
		t.Fatalf("移动标签: %v", err)
	}
	// 删除子树后条目保留
	if err := tags.DeleteTag(ctx, "personal/work"); err != nil {
		t.Fatalf("删除标签: %v", err)
	}
	item, err := items.ListItems(ctx, ListQuery{})
	if err != nil || len(item) != 1 {
		t.Fatalf("条目应保留: %v", err)
	}
}

func findTag(tags []Tag, name string) *Tag {
	for i := range tags {
		if tags[i].Name == name {
			return &tags[i]
		}
	}
	return nil
}

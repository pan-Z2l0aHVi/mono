package core_test

import (
	"context"
	"slices"
	"testing"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

// 标签颜色的全部价值在于「同名同色」：跨资源、跨调用、跨重启都必须一致。
func TestTagColorIsStableForSameName(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()
	resService := core.NewResourceService(db, remote.NewFetcher())
	tagService := core.NewTagService(db)

	first, err := resService.AddFileResource(ctx, tempFile(t, "tag-color-a-*.txt"))
	if err != nil {
		t.Fatalf("AddFileResource error: %v", err)
	}
	second, err := resService.AddFileResource(ctx, tempFile(t, "tag-color-b-*.txt"))
	if err != nil {
		t.Fatalf("AddFileResource error: %v", err)
	}

	created, err := tagService.AddTagToResource(ctx, first.Resource.ID, "Tokyo")
	if err != nil {
		t.Fatalf("AddTagToResource error: %v", err)
	}
	if !slices.Contains(storage.TagColors, created.Color) {
		t.Fatalf("expected color within vocabulary, got %q", created.Color)
	}

	// 同一资源重复打标：复用身份，也复用颜色。
	reused, err := tagService.AddTagToResource(ctx, first.Resource.ID, "Tokyo")
	if err != nil {
		t.Fatalf("AddTagToResource reuse error: %v", err)
	}
	if reused.Color != created.Color {
		t.Errorf("expected reuse on same resource to keep color %q, got %q", created.Color, reused.Color)
	}

	// 另一个资源上的同名标签：颜色必须一致，否则列表里两行同名标签长得不一样。
	other, err := tagService.AddTagToResource(ctx, second.Resource.ID, "Tokyo")
	if err != nil {
		t.Fatalf("AddTagToResource on second resource error: %v", err)
	}
	if other.Color != created.Color {
		t.Errorf("expected same color across resources, got %q and %q", created.Color, other.Color)
	}

	// 视图装配是前端唯一入口，它带出的颜色必须与写入时一致。
	view, err := resService.GetResource(ctx, second.Resource.ID)
	if err != nil {
		t.Fatalf("GetResource error: %v", err)
	}
	if len(view.Tags) != 1 {
		t.Fatalf("expected single tag in view, got %+v", view.Tags)
	}
	if view.Tags[0].Color != created.Color {
		t.Errorf("expected assembled view to carry color %q, got %q", created.Color, view.Tags[0].Color)
	}
}

// 随机分配要真的在闭集上散开，否则「随机」只是换了种方式产出同一个颜色。
func TestTagColorsVaryAcrossNewTags(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()
	resService := core.NewResourceService(db, remote.NewFetcher())
	tagService := core.NewTagService(db)
	view, err := resService.AddFileResource(ctx, tempFile(t, "tag-color-spread-*.txt"))
	if err != nil {
		t.Fatalf("AddFileResource error: %v", err)
	}

	seen := make(map[storage.TagColor]bool, 40)
	names := []string{
		"a", "b", "c", "d", "e", "f", "g", "h", "i", "j",
		"k", "l", "m", "n", "o", "p", "q", "r", "s", "t",
		"u", "v", "w", "x", "y", "z", "aa", "bb", "cc", "dd",
		"ee", "ff", "gg", "hh", "ii", "jj", "kk", "ll", "mm", "nn",
	}
	for _, name := range names {
		tag, err := tagService.AddTagToResource(ctx, view.Resource.ID, name)
		if err != nil {
			t.Fatalf("AddTagToResource(%q) error: %v", name, err)
		}
		if !slices.Contains(storage.TagColors, tag.Color) {
			t.Fatalf("tag %q got color %q outside the vocabulary", name, tag.Color)
		}
		seen[tag.Color] = true
	}
	if len(seen) < 2 {
		t.Errorf("expected %d new tags to spread across colors, got %d distinct", len(names), len(seen))
	}
}

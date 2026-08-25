package core_test

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

func setupTestDB(t *testing.T) (*storage.DB, func()) {
	t.Helper()
	tmpDir, err := os.MkdirTemp("", "interweave-core-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	dbPath := filepath.Join(tmpDir, "test.db")
	db, err := storage.Open(dbPath)
	if err != nil {
		_ = os.RemoveAll(tmpDir)
		t.Fatalf("failed to open test db: %v", err)
	}
	cleanup := func() {
		_ = db.Close()
		_ = os.RemoveAll(tmpDir)
	}
	return db, cleanup
}

func tempFile(t *testing.T, name string) string {
	t.Helper()
	f, err := os.CreateTemp("", name)
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	f.Close()
	t.Cleanup(func() { _ = os.Remove(f.Name()) })
	return f.Name()
}

// 在 core 接缝验证资源视图装配与同名标签复用。
func TestCoreSeamRules(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	resService := core.NewResourceService(db, remote.NewFetcher())
	tagService := core.NewTagService(db)
	ctx := context.Background()

	view, err := resService.AddFileResource(ctx, tempFile(t, "core-*.txt"))
	if err != nil {
		t.Fatalf("AddFileResource error: %v", err)
	}
	if len(view.Sources) != 1 || !view.Sources[0].IsPreferred {
		t.Fatalf("expected single preferred source in view, got %+v", view.Sources)
	}

	tag1, err := tagService.AddTagToResource(ctx, view.Resource.ID, "Tokyo")
	if err != nil {
		t.Fatalf("AddTagToResource error: %v", err)
	}
	tag2, err := tagService.AddTagToResource(ctx, view.Resource.ID, "Tokyo")
	if err != nil {
		t.Fatalf("AddTagToResource duplicate error: %v", err)
	}
	if tag1.ID != tag2.ID {
		t.Errorf("expected same tag ID for identical name, got %s and %s", tag1.ID, tag2.ID)
	}

	reloaded, err := resService.GetResource(ctx, view.Resource.ID)
	if err != nil {
		t.Fatalf("GetResource error: %v", err)
	}
	if len(reloaded.Tags) != 1 || reloaded.Tags[0].Name != "Tokyo" {
		t.Errorf("expected single Tokyo tag in view, got %+v", reloaded.Tags)
	}
}

// 钉住哨兵错误的身份与空切片契约，避免文案相同但哨兵漂移导致测试假绿。
func TestCoreErrorIdentityAndEmptySlices(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	resService := core.NewResourceService(db, remote.NewFetcher())
	srcService := core.NewSourceService(db, remote.NewFetcher())
	tagService := core.NewTagService(db)
	mapService := core.NewMapService(db, resService)
	ctx := context.Background()

	if _, err := resService.GetResource(ctx, "missing"); !errors.Is(err, core.ErrResourceNotFound) {
		t.Errorf("expected core.ErrResourceNotFound, got %v", err)
	}
	if _, err := tagService.AddTagToResource(ctx, "missing", "Tokyo"); !errors.Is(err, core.ErrResourceNotFound) {
		t.Errorf("expected core.ErrResourceNotFound for missing resource, got %v", err)
	}

	view, err := resService.AddFileResource(ctx, tempFile(t, "err-*.txt"))
	if err != nil {
		t.Fatalf("AddFileResource error: %v", err)
	}

	// 唯一入口不允许删除。
	if err := srcService.RemoveSource(ctx, view.Sources[0].ID); !errors.Is(err, core.ErrCannotRemoveOnlySource) {
		t.Errorf("expected core.ErrCannotRemoveOnlySource, got %v", err)
	}
	// 文件入口不允许刷新。
	if _, err := srcService.RefreshURLSource(ctx, view.Sources[0].ID); !errors.Is(err, core.ErrOnlyURLSourceRefreshable) {
		t.Errorf("expected core.ErrOnlyURLSourceRefreshable, got %v", err)
	}

	// 空库的全局 Map 与列表保持非 nil 空切片，避免前端收到 null。
	list, err := resService.ListResources(ctx)
	if err != nil {
		t.Fatalf("ListResources error: %v", err)
	}
	if list == nil {
		t.Errorf("expected non-nil empty resource list, got nil")
	}
	global, err := mapService.GetGlobalMap(ctx)
	if err != nil {
		t.Fatalf("GetGlobalMap error: %v", err)
	}
	if global.TagNodes == nil || global.TagEdges == nil {
		t.Errorf("expected non-nil empty map slices, got nodes=%v edges=%v", global.TagNodes == nil, global.TagEdges == nil)
	}
}

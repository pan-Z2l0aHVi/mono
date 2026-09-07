package core_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

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
	// 跨过毫秒边界，使复用路径回传的 CreatedAt 可与首次创建时间区分。
	time.Sleep(2 * time.Millisecond)
	tag2, err := tagService.AddTagToResource(ctx, view.Resource.ID, "Tokyo")
	if err != nil {
		t.Fatalf("AddTagToResource duplicate error: %v", err)
	}
	if tag1.ID != tag2.ID {
		t.Errorf("expected same tag ID for identical name, got %s and %s", tag1.ID, tag2.ID)
	}
	if tag1.CreatedAt != tag2.CreatedAt {
		t.Errorf("expected reused tag to report original CreatedAt %d, got %d", tag1.CreatedAt, tag2.CreatedAt)
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
	mapService := core.NewMapService(db)
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

// 纳入 Source 前必须确认归属目标存在，且 URL 路径在抓取前短路，不为无效目标等待 10 秒。
func TestSourceAddChecksExistenceBeforeFetch(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	resService := core.NewResourceService(db, remote.NewFetcher())
	srcService := core.NewSourceService(db, remote.NewFetcher())
	ctx := context.Background()

	if _, err := srcService.AddFileSource(ctx, "missing", tempFile(t, "add-*.txt")); !errors.Is(err, core.ErrResourceNotFound) {
		t.Errorf("expected core.ErrResourceNotFound for AddFileSource on missing resource, got %v", err)
	}

	// 计数桩服务器：只要发出请求就说明短路失败。
	var requests int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&requests, 1)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	if _, err := srcService.AddURLSource(ctx, "missing", srv.URL); !errors.Is(err, core.ErrResourceNotFound) {
		t.Errorf("expected core.ErrResourceNotFound for AddURLSource on missing resource, got %v", err)
	}
	if _, err := srcService.ReplaceURLSource(ctx, "missing", srv.URL); !errors.Is(err, core.ErrSourceNotFound) {
		t.Errorf("expected core.ErrSourceNotFound for ReplaceURLSource on missing source, got %v", err)
	}
	if _, err := srcService.ReplaceFileSource(ctx, "missing", tempFile(t, "replace-*.txt")); !errors.Is(err, core.ErrSourceNotFound) {
		t.Errorf("expected core.ErrSourceNotFound for ReplaceFileSource on missing source, got %v", err)
	}
	if got := atomic.LoadInt32(&requests); got != 0 {
		t.Errorf("expected no fetch for missing targets, got %d requests", got)
	}

	// 正常归属不受存在性检查影响。
	view, err := resService.AddFileResource(ctx, tempFile(t, "exists-*.txt"))
	if err != nil {
		t.Fatalf("AddFileResource error: %v", err)
	}
	if _, err := srcService.AddFileSource(ctx, view.Resource.ID, tempFile(t, "second-*.txt")); err != nil {
		t.Errorf("AddFileSource on existing resource error: %v", err)
	}
}

// 钉住 LIKE 通配符转义：查询中的 % 与 _ 只按字面匹配，不再退化为全匹配。
func TestSearchEscapesLikeWildcards(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	resService := core.NewResourceService(db, remote.NewFetcher())
	tagService := core.NewTagService(db)
	ctx := context.Background()

	pct, err := resService.AddFileResource(ctx, tempFile(t, "a%b-*.txt"))
	if err != nil {
		t.Fatalf("AddFileResource error: %v", err)
	}
	if _, err := resService.AddFileResource(ctx, tempFile(t, "ab-*.txt")); err != nil {
		t.Fatalf("AddFileResource error: %v", err)
	}

	found, err := resService.SearchResources(ctx, "%")
	if err != nil {
		t.Fatalf("SearchResources error: %v", err)
	}
	if len(found) != 1 || found[0].Resource.ID != pct.Resource.ID {
		t.Errorf("expected search %% to match only the resource with a literal %% in its title, got %d results", len(found))
	}

	plain, err := resService.AddFileResource(ctx, tempFile(t, "plain-*.txt"))
	if err != nil {
		t.Fatalf("AddFileResource error: %v", err)
	}
	for _, name := range []string{"go_lang", "golang", "100%"} {
		if _, err := tagService.AddTagToResource(ctx, plain.Resource.ID, name); err != nil {
			t.Fatalf("AddTagToResource(%q) error: %v", name, err)
		}
	}

	underscoreTags, err := tagService.SuggestTags(ctx, "_", 10)
	if err != nil {
		t.Fatalf("SuggestTags error: %v", err)
	}
	if len(underscoreTags) != 1 || underscoreTags[0].Name != "go_lang" {
		t.Errorf("expected search _ to match only the literal underscore tag, got %+v", underscoreTags)
	}

	percentTags, err := tagService.SuggestTags(ctx, "%", 10)
	if err != nil {
		t.Fatalf("SuggestTags error: %v", err)
	}
	if len(percentTags) != 1 || percentTags[0].Name != "100%" {
		t.Errorf("expected search %% to match only the literal percent tag, got %+v", percentTags)
	}
}

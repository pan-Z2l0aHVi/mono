package service_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

func newTestServices(t *testing.T) (*service.ResourceService, *service.SourceService, *service.TagService, *service.MapService, func()) {
	t.Helper()
	db, cleanup := setupTestDB(t)
	fetcher := remote.NewFetcher()
	resService := service.NewResourceService(db, fetcher)
	srcService := service.NewSourceService(db, fetcher)
	tagService := service.NewTagService(db)
	mapService := service.NewMapService(db, resService)
	return resService, srcService, tagService, mapService, cleanup
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

// 验证标题、备注、列表、搜索与删除的维护路径。
func TestResourceMaintenanceOperations(t *testing.T) {
	resService, _, tagService, _, cleanup := newTestServices(t)
	defer cleanup()
	ctx := context.Background()

	path := tempFile(t, "maint-*.txt")
	res, err := resService.AddFileResource(ctx, path)
	if err != nil {
		t.Fatalf("AddFileResource error: %v", err)
	}

	updated, err := resService.UpdateResourceTitle(ctx, res.ID, "  整理后的标题  ")
	if err != nil {
		t.Fatalf("UpdateResourceTitle error: %v", err)
	}
	if updated.Title != "整理后的标题" {
		t.Errorf("expected trimmed title, got %q", updated.Title)
	}

	updated, err = resService.UpdateResourceNote(ctx, res.ID, "个人备注")
	if err != nil {
		t.Fatalf("UpdateResourceNote error: %v", err)
	}
	if updated.Note != "个人备注" {
		t.Errorf("expected note, got %q", updated.Note)
	}

	listed, err := resService.ListResources(ctx)
	if err != nil {
		t.Fatalf("ListResources error: %v", err)
	}
	if len(listed) != 1 {
		t.Fatalf("expected 1 resource in list, got %d", len(listed))
	}

	if _, err := tagService.AddTagToResource(ctx, res.ID, "Tokyo"); err != nil {
		t.Fatalf("AddTagToResource error: %v", err)
	}

	// 标题、备注、标签与来源路径都应参与搜索。
	for _, query := range []string{"整理后", "个人备注", "Tokyo", "maint-"} {
		found, err := resService.SearchResources(ctx, query)
		if err != nil {
			t.Fatalf("SearchResources(%q) error: %v", query, err)
		}
		if len(found) != 1 {
			t.Errorf("expected search %q to find 1 resource, got %d", query, len(found))
		}
	}

	if err := resService.DeleteResource(ctx, res.ID); err != nil {
		t.Fatalf("DeleteResource error: %v", err)
	}
	if _, err := resService.GetResource(ctx, res.ID); err == nil || err.Error() != "resource not found" {
		t.Errorf("expected resource not found after delete, got %v", err)
	}
	if err := resService.DeleteResource(ctx, res.ID); err == nil || err.Error() != "resource not found" {
		t.Errorf("expected resource not found on second delete, got %v", err)
	}
}

// 验证 URL 纳入、刷新与替换路径的可用性写入。
func TestURLSourceOperations(t *testing.T) {
	resService, srcService, _, _, cleanup := newTestServices(t)
	defer cleanup()
	ctx := context.Background()

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<title>Remote Title</title>`))
	}))
	defer ts.Close()

	// URL 纳入成功时标题取自页面，且首个 Source 自动成为首选。
	res, err := resService.AddURLResource(ctx, ts.URL)
	if err != nil {
		t.Fatalf("AddURLResource error: %v", err)
	}
	if res.Title != "Remote Title" {
		t.Errorf("expected title from page, got %q", res.Title)
	}
	if len(res.Sources) != 1 || !res.Sources[0].Available || !res.Sources[0].IsPreferred {
		t.Errorf("expected single available preferred source, got %+v", res.Sources)
	}

	// 显式刷新维持可用入口。
	refreshed, err := srcService.RefreshURLSource(ctx, res.Sources[0].ID)
	if err != nil {
		t.Fatalf("RefreshURLSource error: %v", err)
	}
	if !refreshed.Available {
		t.Errorf("expected refreshed source to stay available")
	}

	// 文件 Source 不允许刷新。
	filePath := tempFile(t, "src-*.txt")
	fileSrc, err := srcService.AddFileSource(ctx, res.ID, filePath)
	if err != nil {
		t.Fatalf("AddFileSource error: %v", err)
	}
	if _, err := srcService.RefreshURLSource(ctx, fileSrc.ID); err == nil || err.Error() != "only URL sources can be refreshed" {
		t.Errorf("expected only URL sources error, got %v", err)
	}

	// 替换 URL 保留顺位与首选角色，只改变入口本身。
	replaced, err := srcService.ReplaceURLSource(ctx, fileSrc.ID, ts.URL)
	if err != nil {
		t.Fatalf("ReplaceURLSource error: %v", err)
	}
	if replaced.IsPreferred {
		t.Errorf("expected replaced non-preferred source to stay non-preferred")
	}
	if replaced.Type != "url" || !replaced.Available {
		t.Errorf("expected replaced source to be available url, got %+v", replaced)
	}

	// 失败或超时的抓取仍创建入口，但可用性为 false。
	bad := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer bad.Close()
	unavail, err := resService.AddURLResource(ctx, bad.URL)
	if err != nil {
		t.Fatalf("AddURLResource unavailable error: %v", err)
	}
	if unavail.Sources[0].Available {
		t.Errorf("expected unavailable source, got available")
	}
}

// 验证首选切换与首选删除后的顺位延续。
func TestPreferredSourceSwitching(t *testing.T) {
	resService, srcService, _, _, cleanup := newTestServices(t)
	defer cleanup()
	ctx := context.Background()

	res, err := resService.AddFileResource(ctx, tempFile(t, "pref-*.txt"))
	if err != nil {
		t.Fatalf("AddFileResource error: %v", err)
	}
	firstID := res.Sources[0].ID

	second, err := srcService.AddFileSource(ctx, res.ID, tempFile(t, "pref2-*.txt"))
	if err != nil {
		t.Fatalf("AddFileSource error: %v", err)
	}

	// 显式切换到第二个 Source。
	if err := srcService.SetPreferredSource(ctx, res.ID, second.ID); err != nil {
		t.Fatalf("SetPreferredSource error: %v", err)
	}
	after, _ := resService.GetResource(ctx, res.ID)
	if after.PreferredID != second.ID {
		t.Errorf("expected preferred %s, got %s", second.ID, after.PreferredID)
	}

	// 切换不存在的 Source 明确报错。
	if err := srcService.SetPreferredSource(ctx, res.ID, "missing"); err == nil || err.Error() != "source not found on resource" {
		t.Errorf("expected source not found on resource, got %v", err)
	}

	// 删除首选后按顺位延续到最早添加的剩余 Source。
	if err := srcService.RemoveSource(ctx, second.ID); err != nil {
		t.Fatalf("RemoveSource error: %v", err)
	}
	afterRemove, _ := resService.GetResource(ctx, res.ID)
	if afterRemove.PreferredID != firstID {
		t.Errorf("expected preferred to fall back to %s, got %s", firstID, afterRemove.PreferredID)
	}
}

// 验证标签移除、建议与错误映射。
func TestTagRemovalSuggestionAndErrors(t *testing.T) {
	resService, _, tagService, _, cleanup := newTestServices(t)
	defer cleanup()
	ctx := context.Background()

	res, err := resService.AddFileResource(ctx, tempFile(t, "tag-*.txt"))
	if err != nil {
		t.Fatalf("AddFileResource error: %v", err)
	}

	tokyo, _ := tagService.AddTagToResource(ctx, res.ID, "Tokyo")
	if _, err := tagService.AddTagToResource(ctx, res.ID, "Travel"); err != nil {
		t.Fatalf("AddTagToResource error: %v", err)
	}

	suggested, err := tagService.SuggestTags(ctx, "to", 10)
	if err != nil {
		t.Fatalf("SuggestTags error: %v", err)
	}
	if len(suggested) != 1 || !strings.EqualFold(suggested[0].Name, "Tokyo") {
		t.Errorf("expected suggestion for 'to' to include Tokyo, got %+v", suggested)
	}

	if err := tagService.RemoveTagFromResource(ctx, res.ID, tokyo.ID); err != nil {
		t.Fatalf("RemoveTagFromResource error: %v", err)
	}
	after, _ := resService.GetResource(ctx, res.ID)
	if len(after.Tags) != 1 || after.Tags[0].Name != "Travel" {
		t.Errorf("expected only Travel remaining, got %+v", after.Tags)
	}

	// 不存在的归属、资源与标签都给出明确错误。
	if err := tagService.RemoveTagFromResource(ctx, res.ID, tokyo.ID); err == nil || err.Error() != "tagging not found on resource" {
		t.Errorf("expected tagging not found, got %v", err)
	}
	if _, err := tagService.AddTagToResource(ctx, "missing", "Tokyo"); err == nil || err.Error() != "resource not found" {
		t.Errorf("expected resource not found, got %v", err)
	}
}

// 验证 reviewer 指出的边界路径：刷新不存在 Source、局部探索不存在 Tag、删除非首选 Source。
func TestEdgeErrorPathsAndRemoval(t *testing.T) {
	resService, srcService, tagService, mapService, cleanup := newTestServices(t)
	defer cleanup()
	ctx := context.Background()

	// 刷新不存在的 Source 给出明确文案。
	if _, err := srcService.RefreshURLSource(ctx, "missing"); err == nil || err.Error() != "source not found" {
		t.Errorf("expected source not found for refresh, got %v", err)
	}

	// 局部探索不存在的 Tag 给出明确文案。
	if _, err := mapService.GetLocalMap(ctx, "missing"); err == nil || err.Error() != "tag not found" {
		t.Errorf("expected tag not found for local map, got %v", err)
	}

	res, err := resService.AddFileResource(ctx, tempFile(t, "edge-*.txt"))
	if err != nil {
		t.Fatalf("AddFileResource error: %v", err)
	}
	firstID := res.Sources[0].ID

	// 删除非首选 Source 不触发回退，首选保持原样。
	second, err := srcService.AddFileSource(ctx, res.ID, tempFile(t, "edge2-*.txt"))
	if err != nil {
		t.Fatalf("AddFileSource error: %v", err)
	}
	if err := srcService.RemoveSource(ctx, second.ID); err != nil {
		t.Fatalf("RemoveSource non-preferred error: %v", err)
	}
	after, _ := resService.GetResource(ctx, res.ID)
	if len(after.Sources) != 1 || after.PreferredID != firstID {
		t.Errorf("expected preferred %s with 1 source, got %+v", firstID, after.Sources)
	}

	// 同名标签重复添加在 Resource 视图上只保留一条归属。
	if _, err := tagService.AddTagToResource(ctx, res.ID, "Dedup"); err != nil {
		t.Fatalf("AddTagToResource error: %v", err)
	}
	if _, err := tagService.AddTagToResource(ctx, res.ID, "Dedup"); err != nil {
		t.Fatalf("AddTagToResource duplicate error: %v", err)
	}
	tagged, _ := resService.GetResource(ctx, res.ID)
	if len(tagged.Tags) != 1 || tagged.Tags[0].Name != "Dedup" {
		t.Errorf("expected single Dedup tag, got %+v", tagged.Tags)
	}
}

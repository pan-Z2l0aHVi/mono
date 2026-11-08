package service_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	coreLibrary "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
	libraryMedia "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/media"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

func newTestServices(t *testing.T) (*service.ResourceService, *service.SourceService, *service.TagService, *service.MapService, func()) {
	t.Helper()
	db, cleanup := setupTestDB(t)
	fetcher := remote.NewFetcher()
	coreResource := coreLibrary.NewResourceService(db, fetcher)
	coreSource := coreLibrary.NewSourceService(db, fetcher)
	coreTag := coreLibrary.NewTagService(db)
	coreMap := coreLibrary.NewMapService(db)
	resService := service.NewResourceService(coreResource, libraryMedia.NewPendingPreviewRegistry())
	srcService := service.NewSourceService(coreSource, coreResource)
	tagService := service.NewTagService(coreTag, coreResource)
	mapService := service.NewMapService(coreMap)
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

// sourceByID 在变更后的 Resource 视图里找回发生变化的入口；变更类方法直接回传
// ResourceDTO，变更后的 Source 在 sources 里按 id 可取。
func sourceByID(dto *service.ResourceDTO, sourceID string) *service.SourceDTO {
	for i := range dto.Sources {
		if dto.Sources[i].ID == sourceID {
			return &dto.Sources[i]
		}
	}
	return nil
}

// sourceByLocation 按归一化前的输入路径找回刚变更的入口（测试场景里位置唯一）。
func sourceByLocation(dto *service.ResourceDTO, location string) *service.SourceDTO {
	for i := range dto.Sources {
		if dto.Sources[i].Location == location {
			return &dto.Sources[i]
		}
	}
	return nil
}

// preferredID 从 Resource 视图派生首选入口；DTO 用 SourceDTO.is_preferred 承载唯一首选。
func preferredID(dto *service.ResourceDTO) string {
	for i := range dto.Sources {
		if dto.Sources[i].IsPreferred {
			return dto.Sources[i].ID
		}
	}
	return ""
}

// 重复提示的 service 契约：只回带展示字段的命中项，未命中回非 nil 空切片（前端据此判定零打扰）。
func TestFindResourceLocationMatchesReturnsPromptFields(t *testing.T) {
	resService, _, _, _, cleanup := newTestServices(t)
	defer cleanup()
	ctx := context.Background()

	path := tempFile(t, "prompt-*.txt")
	added, err := addFileResource(ctx, resService, path)
	if err != nil {
		t.Fatalf("addFileResource error: %v", err)
	}

	matches, err := resService.FindResourceLocationMatches(ctx, path, storage.SourceTypeFile)
	if err != nil {
		t.Fatalf("FindResourceLocationMatches error: %v", err)
	}
	if len(matches) != 1 {
		t.Fatalf("expected one match, got %+v", matches)
	}
	if matches[0].ResourceID != added.ID {
		t.Errorf("expected resource_id %s, got %s", added.ID, matches[0].ResourceID)
	}
	if matches[0].Title != added.Title {
		t.Errorf("expected title %q, got %q", added.Title, matches[0].Title)
	}
	if matches[0].Location != added.Sources[0].Location {
		t.Errorf("expected location %q, got %q", added.Sources[0].Location, matches[0].Location)
	}

	empty, err := resService.FindResourceLocationMatches(ctx, tempFile(t, "absent-*.txt"), storage.SourceTypeFile)
	if err != nil {
		t.Fatalf("FindResourceLocationMatches (miss) error: %v", err)
	}
	if empty == nil || len(empty) != 0 {
		t.Errorf("expected a non-nil empty match list, got %+v", empty)
	}

	if _, err := resService.FindResourceLocationMatches(ctx, path, storage.SourceTypeURL); err == nil {
		t.Error("expected a normalize error when a local path is looked up as a URL, got nil")
	}
}

// 验证标题、备注、列表与删除的维护路径。
func TestResourceMaintenanceOperations(t *testing.T) {
	resService, _, tagService, _, cleanup := newTestServices(t)
	defer cleanup()
	ctx := context.Background()

	path := tempFile(t, "maint-*.txt")
	res, err := addFileResource(ctx, resService, path)
	if err != nil {
		t.Fatalf("addFileResource error: %v", err)
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
	res, err := addURLResource(ctx, resService, ts.URL)
	if err != nil {
		t.Fatalf("addURLResource error: %v", err)
	}
	if res.Title != "Remote Title" {
		t.Errorf("expected title from page, got %q", res.Title)
	}
	if len(res.Sources) != 1 || !res.Sources[0].Available || !res.Sources[0].IsPreferred {
		t.Errorf("expected single available preferred source, got %+v", res.Sources)
	}
	if res.Kind != service.ResourceKindWeb || res.SizeBytes != nil {
		t.Errorf("expected URL resource kind web without size, got kind=%q size=%v", res.Kind, res.SizeBytes)
	}

	refreshed, err := srcService.RefreshURLSource(ctx, res.Sources[0].ID)
	if err != nil {
		t.Fatalf("RefreshURLSource error: %v", err)
	}
	if refreshedSource := sourceByID(refreshed, res.Sources[0].ID); refreshedSource == nil || !refreshedSource.Available {
		t.Errorf("expected refreshed source to stay available, got %+v", refreshed.Sources)
	}

	filePath := tempFile(t, "src-*.txt")
	added, err := srcService.AddFileSource(ctx, res.ID, filePath)
	if err != nil {
		t.Fatalf("AddFileSource error: %v", err)
	}
	fileSrc := sourceByLocation(added, filePath)
	if fileSrc == nil {
		t.Fatalf("expected the added source in the returned resource view, got %+v", added.Sources)
	}
	if _, err := srcService.RefreshURLSource(ctx, fileSrc.ID); err == nil || err.Error() != "only URL sources can be refreshed" {
		t.Errorf("expected only URL sources error, got %v", err)
	}

	// 替换 URL 保留顺位与首选角色，只改变入口本身。
	replaced, err := srcService.ReplaceURLSource(ctx, fileSrc.ID, ts.URL)
	if err != nil {
		t.Fatalf("ReplaceURLSource error: %v", err)
	}
	replacedSource := sourceByID(replaced, fileSrc.ID)
	if replacedSource == nil {
		t.Fatalf("expected the replaced source in the returned resource view, got %+v", replaced.Sources)
	}
	if replacedSource.IsPreferred {
		t.Errorf("expected replaced non-preferred source to stay non-preferred")
	}
	if replacedSource.Type != storage.SourceTypeURL || !replacedSource.Available {
		t.Errorf("expected replaced source to be available url, got %+v", replacedSource)
	}

	// 失败或超时的抓取仍创建入口，但可用性为 false。
	bad := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer bad.Close()
	unavail, err := addURLResource(ctx, resService, bad.URL)
	if err != nil {
		t.Fatalf("addURLResource unavailable error: %v", err)
	}
	if unavail.Sources[0].Available {
		t.Errorf("expected unavailable source, got available")
	}
}

// 验证文件 Resource 的权威 kind、原始字节数，以及显式同路径刷新可以恢复可用状态。
func TestFileResourceDisplayMetadataAndRefresh(t *testing.T) {
	resService, srcService, _, _, cleanup := newTestServices(t)
	defer cleanup()
	ctx := context.Background()

	path := filepath.Join(t.TempDir(), "metadata.json")
	if err := os.WriteFile(path, []byte("123456789"), 0o644); err != nil {
		t.Fatalf("failed to write fixture: %v", err)
	}
	res, err := addFileResource(ctx, resService, path)
	if err != nil {
		t.Fatalf("addFileResource error: %v", err)
	}
	if res.Kind != service.ResourceKindJSON {
		t.Errorf("expected JSON kind, got %q", res.Kind)
	}
	if res.SizeBytes == nil || *res.SizeBytes != 9 {
		t.Errorf("expected 9-byte size, got %v", res.SizeBytes)
	}

	sourceID := res.Sources[0].ID
	orderIndex := res.Sources[0].OrderIndex
	if err := os.Remove(path); err != nil {
		t.Fatalf("failed to remove fixture: %v", err)
	}
	refreshed, err := srcService.RefreshFileSource(ctx, sourceID)
	if err != nil {
		t.Fatalf("RefreshFileSource unavailable error: %v", err)
	}
	if refreshedSource := sourceByID(refreshed, sourceID); refreshedSource == nil || refreshedSource.Available {
		t.Errorf("expected missing file to be unavailable after refresh, got %+v", refreshed.Sources)
	}

	if err := os.WriteFile(path, []byte("123456789"), 0o644); err != nil {
		t.Fatalf("failed to restore fixture: %v", err)
	}
	refreshed, err = srcService.RefreshFileSource(ctx, sourceID)
	if err != nil {
		t.Fatalf("RefreshFileSource restored error: %v", err)
	}
	restoredSource := sourceByID(refreshed, sourceID)
	if restoredSource == nil || !restoredSource.Available || restoredSource.Location != path ||
		restoredSource.OrderIndex != orderIndex || !restoredSource.IsPreferred {
		t.Errorf("expected same source identity/location/order to become available, got %+v", refreshed.Sources)
	}

	after, err := resService.GetResource(ctx, res.ID)
	if err != nil {
		t.Fatalf("GetResource after refresh error: %v", err)
	}
	if after.SizeBytes == nil || *after.SizeBytes != 9 || after.Kind != service.ResourceKindJSON {
		t.Errorf("expected refreshed display metadata, got kind=%q size=%v", after.Kind, after.SizeBytes)
	}
}

// URL 刷新与文件刷新是类型特定能力，调用错误类型不能悄悄修改入口。
func TestFileSourceRefreshTypeAndErrorPaths(t *testing.T) {
	resService, srcService, _, _, cleanup := newTestServices(t)
	defer cleanup()
	ctx := context.Background()

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<title>Remote</title>`))
	}))
	defer ts.Close()

	res, err := addURLResource(ctx, resService, ts.URL)
	if err != nil {
		t.Fatalf("addURLResource error: %v", err)
	}
	if _, err := srcService.RefreshFileSource(ctx, res.Sources[0].ID); err == nil || err.Error() != "only file sources can be refreshed" {
		t.Errorf("expected file refresh type error, got %v", err)
	}
	if _, err := srcService.RefreshFileSource(ctx, "missing"); err == nil || err.Error() != "source not found" {
		t.Errorf("expected source not found for missing file refresh, got %v", err)
	}
}

// 验证首选切换与首选删除后的顺位延续。
func TestPreferredSourceSwitching(t *testing.T) {
	resService, srcService, _, _, cleanup := newTestServices(t)
	defer cleanup()
	ctx := context.Background()

	res, err := addFileResource(ctx, resService, tempFile(t, "pref-*.txt"))
	if err != nil {
		t.Fatalf("addFileResource error: %v", err)
	}
	firstID := res.Sources[0].ID

	secondPath := tempFile(t, "pref2-*.txt")
	secondRes, err := srcService.AddFileSource(ctx, res.ID, secondPath)
	if err != nil {
		t.Fatalf("AddFileSource error: %v", err)
	}
	second := sourceByLocation(secondRes, secondPath)
	if second == nil {
		t.Fatalf("expected the added source in the returned resource view, got %+v", secondRes.Sources)
	}

	after, err := srcService.SetPreferredSource(ctx, res.ID, second.ID)
	if err != nil {
		t.Fatalf("SetPreferredSource error: %v", err)
	}
	if got := preferredID(after); got != second.ID {
		t.Errorf("expected preferred %s, got %s", second.ID, got)
	}

	if _, err := srcService.SetPreferredSource(ctx, res.ID, "missing"); err == nil || err.Error() != "source not found on resource" {
		t.Errorf("expected source not found on resource, got %v", err)
	}

	// 删除首选后按顺位延续到最早添加的剩余 Source。
	afterRemove, err := srcService.RemoveSource(ctx, second.ID)
	if err != nil {
		t.Fatalf("RemoveSource error: %v", err)
	}
	if got := preferredID(afterRemove); got != firstID {
		t.Errorf("expected preferred to fall back to %s, got %s", firstID, got)
	}
}

func TestTagRemovalSuggestionAndErrors(t *testing.T) {
	resService, _, tagService, _, cleanup := newTestServices(t)
	defer cleanup()
	ctx := context.Background()

	res, err := addFileResource(ctx, resService, tempFile(t, "tag-*.txt"))
	if err != nil {
		t.Fatalf("addFileResource error: %v", err)
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

	if _, err := srcService.RefreshURLSource(ctx, "missing"); err == nil || err.Error() != "source not found" {
		t.Errorf("expected source not found for refresh, got %v", err)
	}

	if _, err := mapService.GetLocalMap(ctx, "missing"); err == nil || err.Error() != "tag not found" {
		t.Errorf("expected tag not found for local map, got %v", err)
	}

	res, err := addFileResource(ctx, resService, tempFile(t, "edge-*.txt"))
	if err != nil {
		t.Fatalf("addFileResource error: %v", err)
	}
	firstID := res.Sources[0].ID

	// 删除非首选 Source 不触发回退，首选保持原样。
	secondPath := tempFile(t, "edge2-*.txt")
	secondRes, err := srcService.AddFileSource(ctx, res.ID, secondPath)
	if err != nil {
		t.Fatalf("AddFileSource error: %v", err)
	}
	second := sourceByLocation(secondRes, secondPath)
	if second == nil {
		t.Fatalf("expected the added source in the returned resource view, got %+v", secondRes.Sources)
	}
	after, err := srcService.RemoveSource(ctx, second.ID)
	if err != nil {
		t.Fatalf("RemoveSource non-preferred error: %v", err)
	}
	if len(after.Sources) != 1 || preferredID(after) != firstID {
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

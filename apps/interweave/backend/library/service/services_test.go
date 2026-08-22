package service_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	coreLibrary "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

func setupTestDB(t *testing.T) (*storage.DB, func()) {
	t.Helper()
	tmpDir, err := os.MkdirTemp("", "interweave-test-*")
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

func TestResourceAndSourceLifecycle(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	fetcher := remote.NewFetcher()
	coreResource := coreLibrary.NewResourceService(db, fetcher)
	coreSource := coreLibrary.NewSourceService(db, fetcher)
	coreTag := coreLibrary.NewTagService(db)
	resService := service.NewResourceService(coreResource)
	srcService := service.NewSourceService(coreSource)
	tagService := service.NewTagService(coreTag)

	ctx := context.Background()

	// 覆盖一个 Resource 的完整入口与标签维护路径。
	tmpFile, err := os.CreateTemp("", "testfile-*.txt")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	resDTO, err := resService.AddFileResource(ctx, tmpFile.Name())
	if err != nil {
		t.Fatalf("AddFileResource error: %v", err)
	}
	if len(resDTO.Sources) != 1 {
		t.Fatalf("expected 1 source, got %d", len(resDTO.Sources))
	}
	if !resDTO.Sources[0].Available {
		t.Errorf("expected file source to be available")
	}
	if !resDTO.Sources[0].IsPreferred {
		t.Errorf("expected first source to be preferred")
	}

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<title>Remote Site</title>`))
	}))
	defer ts.Close()

	srcDTO, err := srcService.AddURLSource(ctx, resDTO.ID, ts.URL)
	if err != nil {
		t.Fatalf("AddURLSource error: %v", err)
	}
	if srcDTO.IsPreferred {
		t.Errorf("expected additional source NOT to be preferred automatically")
	}
	if !srcDTO.Available {
		t.Errorf("expected url source to be available")
	}

	updatedRes, err := resService.GetResource(ctx, resDTO.ID)
	if err != nil {
		t.Fatalf("GetResource error: %v", err)
	}
	if len(updatedRes.Sources) != 2 {
		t.Errorf("expected 2 sources, got %d", len(updatedRes.Sources))
	}
	if updatedRes.PreferredID != resDTO.Sources[0].ID {
		t.Errorf("expected first source to remain preferred")
	}

	tag1, err := tagService.AddTagToResource(ctx, resDTO.ID, "  Golang  ")
	if err != nil {
		t.Fatalf("AddTagToResource error: %v", err)
	}
	if tag1.Name != "Golang" {
		t.Errorf("expected standardized tag name 'Golang', got %q", tag1.Name)
	}

	// 验证输入差异不会分裂同一标签。
	tag2, err := tagService.AddTagToResource(ctx, resDTO.ID, "Golang")
	if err != nil {
		t.Fatalf("AddTagToResource second error: %v", err)
	}
	if tag1.ID != tag2.ID {
		t.Errorf("expected same tag ID for identical standardized name, got %s and %s", tag1.ID, tag2.ID)
	}

	// 验证首选入口删除后仍保留稳定访问路径。
	firstSourceID := resDTO.Sources[0].ID
	if err := srcService.RemoveSource(ctx, firstSourceID); err != nil {
		t.Fatalf("RemoveSource error: %v", err)
	}

	resAfterRemove, err := resService.GetResource(ctx, resDTO.ID)
	if err != nil {
		t.Fatalf("GetResource error: %v", err)
	}
	if len(resAfterRemove.Sources) != 1 {
		t.Fatalf("expected 1 source remaining, got %d", len(resAfterRemove.Sources))
	}
	if !resAfterRemove.Sources[0].IsPreferred {
		t.Errorf("expected remaining source to become preferred")
	}

	// 验证 Resource 不会失去所有入口。
	if err := srcService.RemoveSource(ctx, resAfterRemove.Sources[0].ID); err == nil {
		t.Errorf("expected error when removing only remaining source, got nil")
	}

	// 验证替换只改变入口本身。
	newTmpFile, _ := os.CreateTemp("", "new-test-*.txt")
	defer os.Remove(newTmpFile.Name())
	newTmpFile.Close()

	replacedSrc, err := srcService.ReplaceFileSource(ctx, resAfterRemove.Sources[0].ID, newTmpFile.Name())
	if err != nil {
		t.Fatalf("ReplaceFileSource error: %v", err)
	}
	if !replacedSrc.IsPreferred {
		t.Errorf("expected replaced source to keep is_preferred=true")
	}
	if replacedSrc.Location != newTmpFile.Name() {
		t.Errorf("expected location to be updated to %s, got %s", newTmpFile.Name(), replacedSrc.Location)
	}
}

func TestMapServiceDerivedExploration(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	fetcher := remote.NewFetcher()
	coreResource := coreLibrary.NewResourceService(db, fetcher)
	coreTag := coreLibrary.NewTagService(db)
	coreMap := coreLibrary.NewMapService(db, coreResource)
	resService := service.NewResourceService(coreResource)
	tagService := service.NewTagService(coreTag)
	mapService := service.NewMapService(coreMap)

	ctx := context.Background()

	// 构造跨主题、桥接与未标记资源，验证 Map 的可解释性。
	f1, _ := os.CreateTemp("", "f1-*.txt")
	defer os.Remove(f1.Name())
	f1.Close()
	f2, _ := os.CreateTemp("", "f2-*.txt")
	defer os.Remove(f2.Name())
	f2.Close()
	f3, _ := os.CreateTemp("", "f3-*.txt")
	defer os.Remove(f3.Name())
	f3.Close()

	r1, _ := resService.AddFileResource(ctx, f1.Name())
	r2, _ := resService.AddFileResource(ctx, f2.Name())
	_, _ = resService.AddFileResource(ctx, f3.Name())

	tTokyo, _ := tagService.AddTagToResource(ctx, r1.ID, "Tokyo")
	_, _ = tagService.AddTagToResource(ctx, r1.ID, "Photography")

	_, _ = tagService.AddTagToResource(ctx, r2.ID, "Tokyo")
	_, _ = tagService.AddTagToResource(ctx, r2.ID, "Travel")

	globalMap, err := mapService.GetGlobalMap(ctx)
	if err != nil {
		t.Fatalf("GetGlobalMap error: %v", err)
	}

	if globalMap.TotalResourceCount != 3 {
		t.Errorf("expected TotalResourceCount = 3, got %d", globalMap.TotalResourceCount)
	}
	if globalMap.UnconnectedCount != 1 {
		t.Errorf("expected UnconnectedCount = 1, got %d", globalMap.UnconnectedCount)
	}
	if len(globalMap.TagNodes) != 3 {
		t.Errorf("expected 3 tag nodes, got %d", len(globalMap.TagNodes))
	}

	// 验证局部探索只暴露当前主题的直接上下文。
	localMap, err := mapService.GetLocalMap(ctx, tTokyo.ID)
	if err != nil {
		t.Fatalf("GetLocalMap error: %v", err)
	}
	if len(localMap.Resources) != 2 {
		t.Errorf("expected 2 resources with Tokyo, got %d", len(localMap.Resources))
	}
	if len(localMap.CooccurringTags) != 2 {
		t.Errorf("expected 2 cooccurring tags (Photography, Travel), got %d", len(localMap.CooccurringTags))
	}
}

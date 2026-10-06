package storage

import (
	"context"
	"path/filepath"
	"testing"
	"time"
)

func openStoreTestDB(t *testing.T) *DB {
	t.Helper()
	db, err := Open(filepath.Join(t.TempDir(), "store.db"))
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func seedStoreSource(t *testing.T, db *DB, id string, resourceID string, srcType SourceType, location string) {
	t.Helper()
	now := time.Now().UnixMilli()
	if err := (ResourceStore{}).Insert(context.Background(), db.SqlDB(), ResourceModel{
		ID: resourceID, Title: id, CreatedAt: now, UpdatedAt: now,
	}); err != nil {
		t.Fatalf("insert resource %s: %v", resourceID, err)
	}
	if err := (SourceStore{}).Insert(context.Background(), db.SqlDB(), SourceModel{
		ID: id, ResourceID: resourceID, Type: srcType, Location: location,
		Available: true, IsPreferred: true, CreatedAt: now, UpdatedAt: now,
	}); err != nil {
		t.Fatalf("insert source %s: %v", id, err)
	}
}

// 位置反查必须按类型过滤，并跨批次合并：同一路径既能是文件入口也能是 URL 入口，
// 两个方向都不得把另一种类型混进结果。
func TestListSourcesByLocationsFiltersTypeAndChunks(t *testing.T) {
	original := locationQueryBatch
	locationQueryBatch = 1
	t.Cleanup(func() { locationQueryBatch = original })

	db := openStoreTestDB(t)
	shared := "/library/shared/clip.mp4"
	seedStoreSource(t, db, "file-a", "resource-a", SourceTypeFile, shared)
	seedStoreSource(t, db, "file-b", "resource-b", SourceTypeFile, "/library/other/notes.md")
	seedStoreSource(t, db, "file-c", "resource-c", SourceTypeFile, "/library/third/pic.png")
	seedStoreSource(t, db, "url-d", "resource-d", SourceTypeURL, shared)

	sources, err := (SourceStore{}).ListSourcesByLocations(
		context.Background(), db.SqlDB(),
		SourceTypeFile,
		[]string{shared, "/library/other/notes.md", "/library/third/pic.png"},
	)
	if err != nil {
		t.Fatalf("ListSourcesByLocations error: %v", err)
	}
	ids := make(map[string]bool, len(sources))
	for _, src := range sources {
		ids[src.ID] = true
		if src.Type != SourceTypeFile {
			t.Fatalf("expected only file sources, got %s with type %s", src.ID, src.Type)
		}
	}
	if len(ids) != 3 || !ids["file-a"] || !ids["file-b"] || !ids["file-c"] {
		t.Fatalf("expected file-a, file-b and file-c across chunks, got %v", ids)
	}
	if ids["url-d"] {
		t.Fatal("expected the URL source to be excluded from a file-only lookup")
	}

	urlSources, err := (SourceStore{}).ListSourcesByLocations(context.Background(), db.SqlDB(), SourceTypeURL, []string{shared})
	if err != nil {
		t.Fatalf("ListSourcesByLocations (URL) error: %v", err)
	}
	if len(urlSources) != 1 || urlSources[0].ID != "url-d" {
		t.Fatalf("expected only url-d for a URL lookup, got %+v", urlSources)
	}

	locations, err := (SourceStore{}).ListFileSourceLocations(context.Background(), db.SqlDB())
	if err != nil {
		t.Fatalf("ListFileSourceLocations error: %v", err)
	}
	locationSet := make(map[string]bool, len(locations))
	for _, location := range locations {
		locationSet[location] = true
	}
	if len(locationSet) != 3 {
		t.Fatalf("expected 3 distinct file locations, got %v", locations)
	}
}

// 空位置集合是调用方的常态（事件批次里全是无关路径），必须返回空而非报错。
func TestListSourcesByLocationsWithNoLocations(t *testing.T) {
	db := openStoreTestDB(t)
	sources, err := (SourceStore{}).ListSourcesByLocations(context.Background(), db.SqlDB(), SourceTypeFile, nil)
	if err != nil {
		t.Fatalf("expected no error for empty locations, got %v", err)
	}
	if len(sources) != 0 {
		t.Fatalf("expected no sources, got %+v", sources)
	}
}

// 监听集合的反查是按类型委托的薄包装，语义必须与直接调用一致。
func TestListFileSourcesByLocationsDelegatesToTypedLookup(t *testing.T) {
	db := openStoreTestDB(t)
	seedStoreSource(t, db, "file-a", "resource-a", SourceTypeFile, "/library/a.png")
	seedStoreSource(t, db, "url-a", "resource-b", SourceTypeURL, "/library/a.png")

	sources, err := (SourceStore{}).ListFileSourcesByLocations(context.Background(), db.SqlDB(), []string{"/library/a.png"})
	if err != nil {
		t.Fatalf("ListFileSourcesByLocations error: %v", err)
	}
	if len(sources) != 1 || sources[0].ID != "file-a" {
		t.Fatalf("expected only file-a, got %+v", sources)
	}
}

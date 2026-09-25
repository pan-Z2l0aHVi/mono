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

// 位置反查必须只返回文件 Source，并跨批次合并：
// 同一路径既能是文件入口也能是 URL 入口，URL 不得混进监听集合。
func TestListFileSourcesByLocationsFiltersTypeAndChunks(t *testing.T) {
	original := locationQueryBatch
	locationQueryBatch = 1
	t.Cleanup(func() { locationQueryBatch = original })

	db := openStoreTestDB(t)
	shared := "/library/shared/clip.mp4"
	seedStoreSource(t, db, "file-a", "resource-a", SourceTypeFile, shared)
	seedStoreSource(t, db, "file-b", "resource-b", SourceTypeFile, "/library/other/notes.md")
	seedStoreSource(t, db, "file-c", "resource-c", SourceTypeFile, "/library/third/pic.png")
	seedStoreSource(t, db, "url-d", "resource-d", SourceTypeURL, shared)

	sources, err := (SourceStore{}).ListFileSourcesByLocations(
		context.Background(), db.SqlDB(),
		[]string{shared, "/library/other/notes.md", "/library/third/pic.png"},
	)
	if err != nil {
		t.Fatalf("ListFileSourcesByLocations error: %v", err)
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
func TestListFileSourcesByLocationsWithNoLocations(t *testing.T) {
	db := openStoreTestDB(t)
	sources, err := (SourceStore{}).ListFileSourcesByLocations(context.Background(), db.SqlDB(), nil)
	if err != nil {
		t.Fatalf("expected no error for empty locations, got %v", err)
	}
	if len(sources) != 0 {
		t.Fatalf("expected no sources, got %+v", sources)
	}
}

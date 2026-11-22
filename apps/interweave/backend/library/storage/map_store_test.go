package storage

import (
	"context"
	"testing"
	"time"
)

func seedTagging(t *testing.T, db *DB, resourceID string, tagID string) {
	t.Helper()
	if err := (TaggingStore{}).Insert(context.Background(), db.SqlDB(), TaggingModel{
		ResourceID: resourceID, TagID: tagID, CreatedAt: time.Now().UnixMilli(),
	}); err != nil {
		t.Fatalf("insert tagging %s/%s: %v", resourceID, tagID, err)
	}
}

// seedMapFixture 构造手工可推演的共现拓扑：
//
//	resource-1: alpha, beta
//	resource-2: alpha, beta, gamma
//	resource-3: gamma
func seedMapFixture(t *testing.T, db *DB) {
	t.Helper()
	seedStoreSource(t, db, "r1", "resource-1", SourceTypeFile, "/map/r1.png")
	seedStoreSource(t, db, "r2", "resource-2", SourceTypeFile, "/map/r2.png")
	seedStoreSource(t, db, "r3", "resource-3", SourceTypeFile, "/map/r3.png")
	seedStoreTag(t, db, "alpha")
	seedStoreTag(t, db, "beta")
	seedStoreTag(t, db, "gamma")
	seedTagging(t, db, "resource-1", "tag-alpha")
	seedTagging(t, db, "resource-1", "tag-beta")
	seedTagging(t, db, "resource-2", "tag-alpha")
	seedTagging(t, db, "resource-2", "tag-beta")
	seedTagging(t, db, "resource-2", "tag-gamma")
	seedTagging(t, db, "resource-3", "tag-gamma")
}

// TagEdges 的权重用 COUNT(*) 取代 COUNT(DISTINCT resource_id)：恒等性依赖 taggings
// 主键 (resource_id, tag_id)——同一资源对同一标签至多一行，分组内行数就是去重后的
// 共享资源数。期望权重全部由 fixture 手工推导，不回读查询表达式。
func TestTagEdgesWeightsMatchHandComputedSharedResources(t *testing.T) {
	db := openStoreTestDB(t)
	seedMapFixture(t, db)

	edges, err := (MapStore{}).TagEdges(context.Background(), db.SqlDB())
	if err != nil {
		t.Fatalf("TagEdges: %v", err)
	}
	weights := make(map[[2]string]int, len(edges))
	for _, edge := range edges {
		weights[[2]string{edge.SourceTagID, edge.TargetTagID}] = edge.Weight
	}
	expected := map[[2]string]int{
		{"tag-alpha", "tag-beta"}:  2, // resource-1 与 resource-2
		{"tag-alpha", "tag-gamma"}: 1, // resource-2
		{"tag-beta", "tag-gamma"}:  1, // resource-2
	}
	if len(edges) != len(expected) {
		t.Fatalf("expected %d edges, got %d: %+v", len(expected), len(edges), edges)
	}
	for pair, want := range expected {
		if weights[pair] != want {
			t.Fatalf("edge %v: expected weight %d, got %d (all: %+v)", pair, want, weights[pair], edges)
		}
	}
}

// CooccurringTags 与 TagEdges 同理：主键保证固定标签对内 resource_id 不重复，
// COUNT(*) 的权重必须等于手工推导的共享资源数。
func TestCooccurringTagsWeightsMatchHandComputedSharedResources(t *testing.T) {
	db := openStoreTestDB(t)
	seedMapFixture(t, db)

	neighbors, err := (MapStore{}).CooccurringTags(context.Background(), db.SqlDB(), "tag-alpha")
	if err != nil {
		t.Fatalf("CooccurringTags: %v", err)
	}
	weights := make(map[string]int, len(neighbors))
	for _, node := range neighbors {
		weights[node.TagID] = node.ResourceCount
	}
	if len(neighbors) != 2 {
		t.Fatalf("expected 2 neighbor tags, got %d: %+v", len(neighbors), neighbors)
	}
	if weights["tag-beta"] != 2 { // resource-1 与 resource-2
		t.Fatalf("expected beta weight 2, got %d (all: %+v)", weights["tag-beta"], neighbors)
	}
	if weights["tag-gamma"] != 1 { // resource-2
		t.Fatalf("expected gamma weight 1, got %d (all: %+v)", weights["tag-gamma"], neighbors)
	}
}

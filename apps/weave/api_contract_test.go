package main

import (
	"context"
	"encoding/json"
	"os"
	"testing"
)

func assertEmptyJSONArray[T any](t *testing.T, name string, values []T) {
	t.Helper()
	if values == nil {
		t.Fatalf("%s 应返回非 nil 空 slice", name)
	}
	if len(values) != 0 {
		t.Fatalf("%s 应为空，got %d entries", name, len(values))
	}
	encoded, err := json.Marshal(values)
	if err != nil {
		t.Fatalf("编码 %s: %v", name, err)
	}
	if string(encoded) != "[]" {
		t.Fatalf("%s 应编码为 []，got %s", name, encoded)
	}
}

func TestWailsCollectionContractUsesEmptyArrays(t *testing.T) {
	db := openTestDB(t)
	items, tags, repairs, index := newTestServices(t, db)
	watch := NewWatchService(db, items, repairs, noopEmit)
	ctx := context.Background()

	listedItems, err := items.ListItems(ctx, ListQuery{})
	if err != nil {
		t.Fatalf("列出空库条目: %v", err)
	}
	assertEmptyJSONArray(t, "ListItems", listedItems)

	listedTags, err := tags.ListTags(ctx)
	if err != nil {
		t.Fatalf("列出空标签树: %v", err)
	}
	assertEmptyJSONArray(t, "ListTags", listedTags)

	listedRepairs, err := repairs.ListRepairs(ctx, "")
	if err != nil {
		t.Fatalf("列出空修复队列: %v", err)
	}
	assertEmptyJSONArray(t, "ListRepairs", listedRepairs)

	listedRoots, err := watch.ListWatchRoots(ctx)
	if err != nil {
		t.Fatalf("列出空监听根: %v", err)
	}
	assertEmptyJSONArray(t, "ListWatchRoots", listedRoots)

	addResult, err := items.AddFiles(ctx, []string{}, nil)
	if err != nil {
		t.Fatalf("添加空文件集合: %v", err)
	}
	assertEmptyJSONArray(t, "AddFiles.items", addResult.Items)

	folderResult, err := items.AddFolder(ctx, t.TempDir(), nil)
	if err != nil {
		t.Fatalf("添加空目录: %v", err)
	}
	assertEmptyJSONArray(t, "AddFolder.items", folderResult.Items)

	file := writeFile(t, t.TempDir(), "missing.txt", "content")
	if _, err := items.AddFiles(ctx, []string{file}, nil); err != nil {
		t.Fatalf("添加候选测试文件: %v", err)
	}
	if err := os.Remove(file); err != nil {
		t.Fatalf("删除候选测试文件: %v", err)
	}
	if _, err := index.Rescan(ctx); err != nil {
		t.Fatalf("扫描断链文件: %v", err)
	}
	openRepairs, err := repairs.ListRepairs(ctx, "open")
	if err != nil || len(openRepairs) != 1 {
		t.Fatalf("获取断链修复项: repairs=%+v err=%v", openRepairs, err)
	}
	if openRepairs[0].Candidates == nil {
		t.Fatal("RepairItem.candidates 应为非 nil 空 slice")
	}
	candidates, err := repairs.GetCandidates(ctx, openRepairs[0].ID)
	if err != nil {
		t.Fatalf("计算空候选: %v", err)
	}
	assertEmptyJSONArray(t, "GetCandidates", candidates)

	assertEmptyJSONArray(t, "PickFiles cancel normalization", nonNilSlice[string](nil))
}

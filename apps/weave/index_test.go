package main

import (
	"context"
	"testing"
)

func TestGetStatsEmptyTotalSize(t *testing.T) {
	db := openTestDB(t)
	_, _, _, index := newTestServices(t, db)

	stats, err := index.GetStats(context.Background())
	if err != nil {
		t.Fatalf("获取空库统计: %v", err)
	}
	if stats.TotalSize != 0 {
		t.Fatalf("空库总大小应为 0, got %d", stats.TotalSize)
	}
}

func TestGetStatsTotalSize(t *testing.T) {
	db := openTestDB(t)
	items, _, _, index := newTestServices(t, db)
	ctx := context.Background()
	dir := t.TempDir()

	paths := []string{
		writeFile(t, dir, "one.txt", "abc"),
		writeFile(t, dir, "two.txt", "12345678"),
	}
	if _, err := items.AddFiles(ctx, paths, nil); err != nil {
		t.Fatalf("添加文件: %v", err)
	}

	stats, err := index.GetStats(ctx)
	if err != nil {
		t.Fatalf("获取库统计: %v", err)
	}
	const wantTotalSize = 11
	if stats.TotalSize != wantTotalSize {
		t.Fatalf("总大小错误: got %d want %d", stats.TotalSize, wantTotalSize)
	}
}

package core

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

// 打开内部装配测试用的临时库。
func openTestDB(t *testing.T) *storage.DB {
	t.Helper()
	db, err := storage.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

// countingQueryer 只统计装配路径经过的查询次数，其余执行原样委托。
type countingQueryer struct {
	storage.Queryer
	queries int
}

func (c *countingQueryer) QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	c.queries++
	return c.Queryer.QueryContext(ctx, query, args...)
}

// failingQueryer 对命中模式的查询注入故障，模拟装配读路径损坏。
type failingQueryer struct {
	storage.Queryer
	failPattern string
}

func (f *failingQueryer) QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	if strings.Contains(query, f.failPattern) {
		return nil, errors.New("injected assembly failure")
	}
	return f.Queryer.QueryContext(ctx, query, args...)
}

// 建立四个带首选来源的资源，前三个各带两个标签，末尾保持无标签。
func seedAssemblerFixtures(t *testing.T, ctx context.Context, db *storage.DB) []Resource {
	t.Helper()
	resService := NewResourceService(db, remote.NewFetcher())
	tagService := NewTagService(db)

	fixtures := make([]Resource, 0, 4)
	for i := 0; i < 4; i++ {
		path := filepath.Join(t.TempDir(), fmt.Sprintf("assembler-%d.txt", i))
		if err := os.WriteFile(path, []byte("x"), 0o644); err != nil {
			t.Fatalf("failed to write fixture file: %v", err)
		}
		view, err := resService.AddFileResource(ctx, path)
		if err != nil {
			t.Fatalf("AddFileResource error: %v", err)
		}
		if i < 3 {
			// Tokyo 跨资源复用，TopicN 仅归属当前资源。
			if _, err := tagService.AddTagToResource(ctx, view.Resource.ID, "Tokyo"); err != nil {
				t.Fatalf("AddTagToResource error: %v", err)
			}
			if _, err := tagService.AddTagToResource(ctx, view.Resource.ID, fmt.Sprintf("Topic%d", i)); err != nil {
				t.Fatalf("AddTagToResource error: %v", err)
			}
		}
		fixtures = append(fixtures, view.Resource)
	}
	return fixtures
}

// 批量装配把来源与标签各收敛为一次 IN 查询；N 个资源不再产生 2N+1 次读取。
func TestViewAssemblerBatchesQueries(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	resources := seedAssemblerFixtures(t, ctx, db)

	counter := &countingQueryer{Queryer: db.SqlDB()}
	views, err := (viewAssembler{}).assembleMany(ctx, counter, resources)
	if err != nil {
		t.Fatalf("assembleMany error: %v", err)
	}
	if got := counter.queries; got != 2 {
		t.Errorf("expected 2 batched queries for %d resources, got %d", len(resources), got)
	}
	if len(views) != len(resources) {
		t.Fatalf("expected %d views, got %d", len(resources), len(views))
	}
	for i, view := range views {
		if view.Resource.ID != resources[i].ID {
			t.Errorf("expected view %d for %s, got %s", i, resources[i].ID, view.Resource.ID)
		}
		if len(view.Sources) != 1 || !view.Sources[0].IsPreferred {
			t.Errorf("expected single preferred source for %s, got %+v", view.Resource.ID, view.Sources)
		}
		if i < 3 {
			// 同毫秒归属不保证先后，只断言标签集合完整。
			names := map[string]bool{view.Tags[0].Name: true, view.Tags[1].Name: true}
			if !names["Tokyo"] || !names[fmt.Sprintf("Topic%d", i)] {
				t.Errorf("expected Tokyo and Topic%d for %s, got %+v", i, view.Resource.ID, view.Tags)
			}
		} else if view.Tags == nil || len(view.Tags) != 0 {
			t.Errorf("expected non-nil empty tags for untagged %s, got %+v", view.Resource.ID, view.Tags)
		}
	}
}

// 按 ID 装配共用同一批量化读路径，相对 assembleMany 只增加一次资源行查询，
// 且输出顺序与传入 ID 顺序一致，库内已不存在的 ID 不产出视图。
func TestViewAssemblerAssemblesByIDs(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	resources := seedAssemblerFixtures(t, ctx, db)

	ids := make([]string, 0, len(resources)+1)
	for _, res := range resources {
		ids = append(ids, res.ID)
	}
	ids = append(ids, "missing-id")

	counter := &countingQueryer{Queryer: db.SqlDB()}
	views, err := (viewAssembler{}).assembleByIDs(ctx, counter, ids)
	if err != nil {
		t.Fatalf("assembleByIDs error: %v", err)
	}
	if got := counter.queries; got != 3 {
		t.Errorf("expected 3 queries (resource rows + sources + tags), got %d", got)
	}
	if len(views) != len(resources) {
		t.Fatalf("expected missing id to be skipped, got %d views", len(views))
	}
	for i, view := range views {
		if view.Resource.ID != ids[i] {
			t.Errorf("expected view %d for %s, got %s", i, ids[i], view.Resource.ID)
		}
	}
}

// 装配读路径损坏时整体失败且不产出残缺视图，供 GetLocalMap 以同一模式快速失败。
func TestViewAssemblerFailsFastOnFault(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	resources := seedAssemblerFixtures(t, ctx, db)

	for _, pattern := range []string{"FROM sources", "JOIN taggings"} {
		faulted := &failingQueryer{Queryer: db.SqlDB(), failPattern: pattern}
		views, err := (viewAssembler{}).assembleMany(ctx, faulted, resources)
		if err == nil {
			t.Fatalf("expected error with fault pattern %q", pattern)
		}
		if views != nil {
			t.Errorf("expected no partial views with fault pattern %q", pattern)
		}
	}
}

// 超过单批 IN 上限时按批分片：跨批合并后顺序与来源/标签归属不变，
// 资源超量时列表/搜索/地图退化为多次批查询而不是整体报错。
func TestViewAssemblerChunksLargeBatches(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	origBatch := inQueryBatch
	inQueryBatch = 3
	t.Cleanup(func() { inQueryBatch = origBatch })

	resources := seedAssemblerFixtures(t, ctx, db)

	counter := &countingQueryer{Queryer: db.SqlDB()}
	views, err := (viewAssembler{}).assembleMany(ctx, counter, resources)
	if err != nil {
		t.Fatalf("assembleMany error: %v", err)
	}
	// 4 个资源按 3 一批分两片，每片来源+标签各一次。
	if got := counter.queries; got != 4 {
		t.Errorf("expected 4 chunked queries for %d resources, got %d", len(resources), got)
	}
	if len(views) != len(resources) {
		t.Fatalf("expected %d views, got %d", len(resources), len(views))
	}
	for i, view := range views {
		if view.Resource.ID != resources[i].ID {
			t.Errorf("expected view %d for %s, got %s", i, resources[i].ID, view.Resource.ID)
		}
		if len(view.Sources) != 1 || !view.Sources[0].IsPreferred {
			t.Errorf("expected single preferred source for %s across chunks, got %+v", view.Resource.ID, view.Sources)
		}
		if i < 3 {
			names := map[string]bool{view.Tags[0].Name: true, view.Tags[1].Name: true}
			if !names["Tokyo"] || !names[fmt.Sprintf("Topic%d", i)] {
				t.Errorf("expected Tokyo and Topic%d for %s across chunks, got %+v", i, view.Resource.ID, view.Tags)
			}
		} else if view.Tags == nil || len(view.Tags) != 0 {
			t.Errorf("expected non-nil empty tags for untagged %s, got %+v", view.Resource.ID, view.Tags)
		}
	}

	ids := make([]string, 0, len(resources)+1)
	for _, res := range resources {
		ids = append(ids, res.ID)
	}
	ids = append(ids, "missing-id")

	idCounter := &countingQueryer{Queryer: db.SqlDB()}
	byIDViews, err := (viewAssembler{}).assembleByIDs(ctx, idCounter, ids)
	if err != nil {
		t.Fatalf("assembleByIDs error: %v", err)
	}
	// GetByIDs 两批 + 来源两批 + 标签两批。
	if got := idCounter.queries; got != 6 {
		t.Errorf("expected 6 chunked queries for %d ids, got %d", len(ids), got)
	}
	if len(byIDViews) != len(resources) {
		t.Fatalf("expected missing id to be skipped, got %d views", len(byIDViews))
	}
	for i, view := range byIDViews {
		if view.Resource.ID != ids[i] {
			t.Errorf("expected view %d for %s across chunks, got %s", i, ids[i], view.Resource.ID)
		}
	}
}

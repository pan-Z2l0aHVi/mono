package core_test

import (
	"context"
	"errors"
	"sync"
	"testing"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

func TestCreateResourceBatchConcurrent(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()
	lib := core.NewLibrary(db, remote.NewFetcher())

	const total = 12
	inputs := make([]core.CreateResourceInput, 0, total)
	for range total {
		inputs = append(inputs, core.CreateResourceInput{
			Kind:     storage.SourceTypeFile,
			Location: tempFile(t, "batch-*.txt"),
		})
	}

	var mu sync.Mutex
	seen := make(map[int]bool, total)
	results := lib.CreateResourceBatch(context.Background(), inputs, 4, func(result core.CreateResourceBatchResult) {
		mu.Lock()
		defer mu.Unlock()
		if seen[result.Index] {
			t.Errorf("index %d reported twice", result.Index)
		}
		seen[result.Index] = true
	})

	if len(results) != total {
		t.Fatalf("expected %d results, got %d", total, len(results))
	}
	if len(seen) != total {
		t.Fatalf("expected %d progress callbacks, got %d", total, len(seen))
	}
	for index, result := range results {
		if result.Index != index {
			t.Errorf("result %d reports index %d", index, result.Index)
		}
		if result.Err != nil || result.View == nil {
			t.Errorf("result %d failed: %v", index, result.Err)
		}
	}

	views, err := lib.ListResources(context.Background())
	if err != nil {
		t.Fatalf("ListResources error: %v", err)
	}
	if len(views) != total {
		t.Fatalf("expected %d persisted resources, got %d", total, len(views))
	}
}

func TestCreateResourceBatchCancelSkipsPending(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()
	lib := core.NewLibrary(db, remote.NewFetcher())

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	inputs := []core.CreateResourceInput{
		{Kind: storage.SourceTypeFile, Location: tempFile(t, "cancel-*.txt")},
		{Kind: storage.SourceTypeFile, Location: tempFile(t, "cancel-*.txt")},
	}
	results := lib.CreateResourceBatch(ctx, inputs, 2, nil)

	for _, result := range results {
		if !errors.Is(result.Err, context.Canceled) {
			t.Errorf("expected canceled result, got %v", result.Err)
		}
		if result.View != nil {
			t.Errorf("expected no view for canceled item, got %+v", result.View)
		}
	}
}

func TestCreateResourceBatchCancelAfterPartialCompletion(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()
	lib := core.NewLibrary(db, remote.NewFetcher())

	const total = 4
	inputs := make([]core.CreateResourceInput, 0, total)
	for range total {
		inputs = append(inputs, core.CreateResourceInput{
			Kind:     storage.SourceTypeFile,
			Location: tempFile(t, "partial-*.txt"),
		})
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	// 单 worker + 首项结算即取消：已完成的项保留结果，后续项按 ctx 错误结算。
	var once sync.Once
	results := lib.CreateResourceBatch(ctx, inputs, 1, func(core.CreateResourceBatchResult) {
		once.Do(cancel)
	})

	created, canceled := 0, 0
	for _, result := range results {
		switch {
		case result.Err == nil && result.View != nil:
			created++
		case errors.Is(result.Err, context.Canceled):
			canceled++
		default:
			t.Errorf("unexpected result: view=%v err=%v", result.View != nil, result.Err)
		}
	}
	if created == 0 || canceled == 0 {
		t.Fatalf("expected partial completion before cancel, got created=%d canceled=%d", created, canceled)
	}
	if created+canceled != total {
		t.Fatalf("expected every item to settle, got %d/%d", created+canceled, total)
	}
}

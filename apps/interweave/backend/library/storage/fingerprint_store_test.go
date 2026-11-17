package storage

import (
	"context"
	"testing"
)

func TestFingerprintStoreUpsertIsIdempotentAndKeepsHash(t *testing.T) {
	ctx := context.Background()
	db := openStoreTestDB(t)
	store := FingerprintStore{}
	seedStoreSource(t, db, "s1", "r1", SourceTypeFile, "/lib/a.bin")
	state := FingerprintState{Size: 3, Modified: 10, Identity: "id", Changed: 7}

	if err := store.Upsert(ctx, db.SqlDB(), "s1", "/lib/a.bin", state); err != nil {
		t.Fatalf("Upsert error: %v", err)
	}
	if err := store.UpdateHashIfStateMatches(ctx, db.SqlDB(), "s1", "/lib/a.bin", state, "h1"); err != nil {
		t.Fatalf("UpdateHashIfStateMatches error: %v", err)
	}
	// 同一属性重复 upsert 不得清掉已算好的 hash。
	if err := store.Upsert(ctx, db.SqlDB(), "s1", "/lib/a.bin", state); err != nil {
		t.Fatalf("second Upsert error: %v", err)
	}
	got, err := store.Get(ctx, db.SqlDB(), "s1")
	if err != nil {
		t.Fatalf("Get error: %v", err)
	}
	if got.Hash != "h1" || got.Size != 3 {
		t.Fatalf("expected hash kept after identical upsert, got %+v", got)
	}
}

func TestFingerprintStoreAttributeChangeClearsHash(t *testing.T) {
	ctx := context.Background()
	db := openStoreTestDB(t)
	store := FingerprintStore{}
	seedStoreSource(t, db, "s1", "r1", SourceTypeFile, "/lib/a.bin")
	state := FingerprintState{Size: 3, Modified: 10, Identity: "id", Changed: 7}
	_ = store.Upsert(ctx, db.SqlDB(), "s1", "/lib/a.bin", state)
	_ = store.UpdateHashIfStateMatches(ctx, db.SqlDB(), "s1", "/lib/a.bin", state, "h1")

	changed := state
	changed.Size = 4
	if err := store.Upsert(ctx, db.SqlDB(), "s1", "/lib/a.bin", changed); err != nil {
		t.Fatalf("Upsert error: %v", err)
	}
	got, _ := store.Get(ctx, db.SqlDB(), "s1")
	if got.Hash != "" || got.Size != 4 {
		t.Fatalf("expected hash cleared on attribute change, got %+v", got)
	}
}

func TestFingerprintStoreGuardedUpdateRejectsStaleState(t *testing.T) {
	ctx := context.Background()
	db := openStoreTestDB(t)
	store := FingerprintStore{}
	seedStoreSource(t, db, "s1", "r1", SourceTypeFile, "/lib/a.bin")
	state := FingerprintState{Size: 3, Modified: 10, Identity: "id", Changed: 7}
	_ = store.Upsert(ctx, db.SqlDB(), "s1", "/lib/a.bin", state)

	stale := state
	stale.Modified = 99
	if err := store.UpdateHashIfStateMatches(ctx, db.SqlDB(), "s1", "/lib/a.bin", stale, "late"); err != nil {
		t.Fatalf("UpdateHashIfStateMatches error: %v", err)
	}
	if hash, ok, err := store.HashIfStateMatches(ctx, db.SqlDB(), "s1", "/lib/a.bin", stale); err != nil || ok || hash != "" {
		t.Fatalf("expected stale state to match nothing, got %q %v %v", hash, ok, err)
	}
	got, _ := store.Get(ctx, db.SqlDB(), "s1")
	if got.Hash != "" {
		t.Fatalf("stale update must not write hash, got %+v", got)
	}
}

func TestFingerprintStoreRequiresLiveFileSource(t *testing.T) {
	ctx := context.Background()
	db := openStoreTestDB(t)
	store := FingerprintStore{}
	seedStoreSource(t, db, "s1", "r1", SourceTypeFile, "/lib/a.bin")
	state := FingerprintState{Size: 3}

	// 位置与 Source 当前位置不一致：Upsert 不写入。
	if err := store.Upsert(ctx, db.SqlDB(), "s1", "/lib/moved.bin", state); err != nil {
		t.Fatalf("Upsert error: %v", err)
	}
	if got, _ := store.Get(ctx, db.SqlDB(), "s1"); got != (FingerprintState{}) {
		t.Fatalf("expected no row for mismatched location, got %+v", got)
	}

	_ = store.Upsert(ctx, db.SqlDB(), "s1", "/lib/a.bin", state)
	// 删除 Source 后，guarded update 的 EXISTS 守卫必须拦下写入。
	if _, err := db.SqlDB().ExecContext(ctx, `UPDATE sources SET location='/lib/b.bin' WHERE id='s1'`); err != nil {
		t.Fatalf("move source: %v", err)
	}
	if err := store.UpdateHashIfStateMatches(ctx, db.SqlDB(), "s1", "/lib/a.bin", state, "h"); err != nil {
		t.Fatalf("UpdateHashIfStateMatches error: %v", err)
	}
	if got, _ := store.Get(ctx, db.SqlDB(), "s1"); got.Hash != "" {
		t.Fatalf("expected EXISTS guard to block hash write, got %+v", got)
	}
}

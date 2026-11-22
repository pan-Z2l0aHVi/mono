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

func TestFingerprintStoreGetHidesRecordForReplacedLocation(t *testing.T) {
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

	// 入口被替换到一个暂时不可用的新路径，且没有新的 Record 写入：
	// 旧位置与旧 hash 不得再被读出，否则找回扫描会拿旧文件的内容给新入口做匹配。
	if err := (SourceStore{}).Replace(ctx, db.SqlDB(), "s1", SourceTypeFile, "/lib/missing.bin", false, "", 1); err != nil {
		t.Fatalf("Replace error: %v", err)
	}
	if got, err := store.Get(ctx, db.SqlDB(), "s1"); err != nil || got != (FingerprintState{}) {
		t.Fatalf("expected stale fingerprint hidden after replace, got %+v %v", got, err)
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

func seedFingerprintRow(t *testing.T, db *DB, sourceID, location string, state FingerprintState) {
	t.Helper()
	if _, err := db.SqlDB().ExecContext(context.Background(), `INSERT INTO source_fingerprints (source_id, location, size, modified, identity, changed, hash) VALUES (?,?,?,?,?,?,?)`,
		sourceID, location, state.Size, state.Modified, state.Identity, state.Changed, state.Hash); err != nil {
		t.Fatalf("seed fingerprint row: %v", err)
	}
}

// ListAll 必须带回全部 7 列，回填预过滤才能做完整的 location+属性+hash 判断。
func TestFingerprintStoreListAllReturnsFullRecords(t *testing.T) {
	ctx := context.Background()
	db := openStoreTestDB(t)
	store := FingerprintStore{}
	seedStoreSource(t, db, "s1", "r1", SourceTypeFile, "/lib/a.bin")
	state := FingerprintState{Size: 3, Modified: 10, Identity: "id", Changed: 7, Hash: "h1"}
	seedFingerprintRow(t, db, "s1", "/lib/a.bin", state)

	got, err := store.ListAll(ctx, db.SqlDB())
	if err != nil {
		t.Fatalf("ListAll error: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("expected one record, got %d", len(got))
	}
	if got[0].SourceID != "s1" || got[0].Location != "/lib/a.bin" || got[0].State != state {
		t.Fatalf("expected full 7-column record, got %+v", got[0])
	}
}

// 情况 A：预过滤时无记录，写回插入新行并带上 hash。
func TestFingerprintStoreBackfillInsertCreatesRowForMissingRecord(t *testing.T) {
	ctx := context.Background()
	db := openStoreTestDB(t)
	store := FingerprintStore{}
	seedStoreSource(t, db, "s1", "r1", SourceTypeFile, "/lib/a.bin")
	state := FingerprintState{Size: 3, Modified: 10, Identity: "id", Changed: 7, Hash: "bg-hash"}

	if err := store.WriteBackfill(ctx, db.SqlDB(), []FingerprintBackfill{{SourceID: "s1", Location: "/lib/a.bin", State: state}}); err != nil {
		t.Fatalf("WriteBackfill error: %v", err)
	}
	got, err := store.Get(ctx, db.SqlDB(), "s1")
	if err != nil {
		t.Fatalf("Get error: %v", err)
	}
	if got.Hash != "bg-hash" || got.Size != 3 || got.Identity != "id" {
		t.Fatalf("expected backfill row with hash, got %+v", got)
	}
}

// 情况 A 的 CAS：预过滤之后前台已经并发写入的行不得被滞留批次覆盖；
// 仅当目标行仍无 hash 且属性与本次结果一致时才补写。
func TestFingerprintStoreBackfillInsertOnlyFillsEmptyMatchingRow(t *testing.T) {
	ctx := context.Background()
	db := openStoreTestDB(t)
	store := FingerprintStore{}
	state := FingerprintState{Size: 3, Modified: 10, Identity: "id", Changed: 7, Hash: "bg-hash"}
	seedStoreSource(t, db, "s-hash", "r-hash", SourceTypeFile, "/lib/a.bin")
	seedStoreSource(t, db, "s-changed", "r-changed", SourceTypeFile, "/lib/b.bin")
	seedStoreSource(t, db, "s-empty", "r-empty", SourceTypeFile, "/lib/c.bin")

	// 前台已写入 hash：不覆盖。
	seedFingerprintRow(t, db, "s-hash", "/lib/a.bin", FingerprintState{Size: 3, Modified: 10, Identity: "id", Changed: 7, Hash: "fg-hash"})
	// 前台已更新属性（size=4，hash 空）：不覆盖，也不改属性。
	seedFingerprintRow(t, db, "s-changed", "/lib/b.bin", FingerprintState{Size: 4, Modified: 10, Identity: "id", Changed: 7})
	// 行存在、hash 空、属性一致：允许补写。
	seedFingerprintRow(t, db, "s-empty", "/lib/c.bin", FingerprintState{Size: 3, Modified: 10, Identity: "id", Changed: 7})

	batch := []FingerprintBackfill{
		{SourceID: "s-hash", Location: "/lib/a.bin", State: state},
		{SourceID: "s-changed", Location: "/lib/b.bin", State: state},
		{SourceID: "s-empty", Location: "/lib/c.bin", State: state},
	}
	if err := store.WriteBackfill(ctx, db.SqlDB(), batch); err != nil {
		t.Fatalf("WriteBackfill error: %v", err)
	}
	if got, _ := store.Get(ctx, db.SqlDB(), "s-hash"); got.Hash != "fg-hash" {
		t.Fatalf("foreground hash must survive, got %+v", got)
	}
	if got, _ := store.Get(ctx, db.SqlDB(), "s-changed"); got.Size != 4 || got.Hash != "" {
		t.Fatalf("foreground attributes must survive, got %+v", got)
	}
	if got, _ := store.Get(ctx, db.SqlDB(), "s-empty"); got.Hash != "bg-hash" {
		t.Fatalf("expected empty matching row to be filled, got %+v", got)
	}
}

// source 在预过滤之后被移走：INSERT ... SELECT 无行，什么也不写。
func TestFingerprintStoreBackfillInsertSkipsWhenSourceMoved(t *testing.T) {
	ctx := context.Background()
	db := openStoreTestDB(t)
	store := FingerprintStore{}
	seedStoreSource(t, db, "s1", "r1", SourceTypeFile, "/lib/c.bin")
	state := FingerprintState{Size: 3, Modified: 10, Identity: "id", Changed: 7, Hash: "bg-hash"}

	if err := store.WriteBackfill(ctx, db.SqlDB(), []FingerprintBackfill{{SourceID: "s1", Location: "/lib/a.bin", State: state}}); err != nil {
		t.Fatalf("WriteBackfill error: %v", err)
	}
	if got, _ := store.Get(ctx, db.SqlDB(), "s1"); got != (FingerprintState{}) {
		t.Fatalf("expected no row when source no longer matches location, got %+v", got)
	}
}

// 情况 B：预过滤读到旧快照，写回在旧快照仍一致时替换为新属性与 hash；
// source 被替换到新位置时记录随之跟进。
func TestFingerprintStoreBackfillUpdateReplacesMatchingSnapshot(t *testing.T) {
	ctx := context.Background()
	db := openStoreTestDB(t)
	store := FingerprintStore{}
	old := FingerprintState{Size: 3, Modified: 10, Identity: "id", Changed: 7}
	seedStoreSource(t, db, "s1", "r1", SourceTypeFile, "/lib/a.bin")
	seedStoreSource(t, db, "s2", "r2", SourceTypeFile, "/lib/moved.bin")
	seedFingerprintRow(t, db, "s1", "/lib/a.bin", old)
	seedFingerprintRow(t, db, "s2", "/lib/old.bin", old)

	if err := store.WriteBackfill(ctx, db.SqlDB(), []FingerprintBackfill{
		{
			SourceID: "s1", Location: "/lib/a.bin",
			State:     FingerprintState{Size: 3, Modified: 10, Identity: "id", Changed: 7, Hash: "bg-hash"},
			HadRecord: true, Old: FingerprintRecord{SourceID: "s1", Location: "/lib/a.bin", State: old},
		},
		{
			SourceID: "s2", Location: "/lib/moved.bin",
			State:     FingerprintState{Size: 5, Modified: 20, Identity: "id2", Changed: 9, Hash: "moved-hash"},
			HadRecord: true, Old: FingerprintRecord{SourceID: "s2", Location: "/lib/old.bin", State: old},
		},
	}); err != nil {
		t.Fatalf("WriteBackfill error: %v", err)
	}
	if got, _ := store.Get(ctx, db.SqlDB(), "s1"); got.Hash != "bg-hash" || got.Size != 3 {
		t.Fatalf("expected matching snapshot to be updated with hash, got %+v", got)
	}
	if got, _ := store.Get(ctx, db.SqlDB(), "s2"); got.Hash != "moved-hash" || got.Size != 5 {
		t.Fatalf("expected record to follow replaced source, got %+v", got)
	}
}

// 情况 B 的 CAS：前台在预过滤之后并发更新了记录（属性或位置已变），滞留批次不得覆盖。
func TestFingerprintStoreBackfillUpdateNeverClobbersForegroundRow(t *testing.T) {
	ctx := context.Background()
	db := openStoreTestDB(t)
	store := FingerprintStore{}
	old := FingerprintState{Size: 3, Modified: 10, Identity: "id", Changed: 7}
	staleBatch := func(sourceID, location string) []FingerprintBackfill {
		return []FingerprintBackfill{{
			SourceID: sourceID, Location: location,
			State:     FingerprintState{Size: 3, Modified: 10, Identity: "id", Changed: 7, Hash: "bg-hash"},
			HadRecord: true, Old: FingerprintRecord{SourceID: sourceID, Location: location, State: old},
		}}
	}
	seedStoreSource(t, db, "s-attrs", "r-attrs", SourceTypeFile, "/lib/a.bin")
	seedStoreSource(t, db, "s-moved", "r-moved", SourceTypeFile, "/lib/elsewhere.bin")
	seedFingerprintRow(t, db, "s-attrs", "/lib/a.bin", old)
	seedFingerprintRow(t, db, "s-moved", "/lib/a.bin", old)

	// 前台按新属性 Upsert（文件已变，hash 被清空）：旧快照 CAS 失配，批次不得写入。
	if err := store.Upsert(ctx, db.SqlDB(), "s-attrs", "/lib/a.bin", FingerprintState{Size: 9, Modified: 10, Identity: "id", Changed: 7}); err != nil {
		t.Fatalf("foreground Upsert error: %v", err)
	}
	if err := store.WriteBackfill(ctx, db.SqlDB(), staleBatch("s-attrs", "/lib/a.bin")); err != nil {
		t.Fatalf("WriteBackfill error: %v", err)
	}
	if got, _ := store.Get(ctx, db.SqlDB(), "s-attrs"); got.Size != 9 || got.Hash != "" {
		t.Fatalf("foreground attributes must survive stale batch, got %+v", got)
	}

	// 前台把 source 挪到新位置：EXISTS 守卫拦下写入，旧行保持原样。
	if err := store.WriteBackfill(ctx, db.SqlDB(), staleBatch("s-moved", "/lib/a.bin")); err != nil {
		t.Fatalf("WriteBackfill error: %v", err)
	}
	var location, hash string
	if err := db.SqlDB().QueryRowContext(ctx, `SELECT location, hash FROM source_fingerprints WHERE source_id='s-moved'`).Scan(&location, &hash); err != nil {
		t.Fatalf("read raw row: %v", err)
	}
	if location != "/lib/a.bin" || hash != "" {
		t.Fatalf("expected EXISTS guard to block stale batch, got location=%s hash=%s", location, hash)
	}
}

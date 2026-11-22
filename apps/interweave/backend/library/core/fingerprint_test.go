package core

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

func seedFileSource(t *testing.T, db *storage.DB, id, location string) {
	t.Helper()
	// 两条语句分开执行：多语句 Exec 的参数按语句各自从头绑定，混用会错位。
	if _, err := db.SqlDB().Exec(`INSERT INTO resources VALUES (?, 'title','',0,0)`, id); err != nil {
		t.Fatal(err)
	}
	if _, err := db.SqlDB().Exec(`INSERT INTO sources VALUES (?,?,'file',?,1,0,0,'',0,0)`, id, id, location); err != nil {
		t.Fatal(err)
	}
}

func newRecorderFixture(t *testing.T, location string) (*FingerprintRecorder, *storage.DB) {
	t.Helper()
	db, err := storage.Open(filepath.Join(t.TempDir(), "library.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.SqlDB().Exec(`INSERT INTO resources VALUES ('r','title','',0,0); INSERT INTO sources VALUES ('s','r','file',?,1,1,0,'',0,0)`, location); err != nil {
		t.Fatal(err)
	}
	return newFingerprintRecorder(db), db
}

func waitForHash(t *testing.T, recorder *FingerprintRecorder, want string) {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		if state, err := recorder.Get(context.Background(), "s"); err == nil && state.Hash == want {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	state, _ := recorder.Get(context.Background(), "s")
	t.Fatalf("expected hash %q, got %+v", want, state)
}

func TestFingerprintRecorderSnapshotsAndHashes(t *testing.T) {
	file := filepath.Join(t.TempDir(), "a.txt")
	if err := os.WriteFile(file, []byte("hello"), 0o600); err != nil {
		t.Fatal(err)
	}
	recorder, _ := newRecorderFixture(t, file)

	recorder.Record("s", file)
	state, err := recorder.Get(context.Background(), "s")
	if err != nil {
		t.Fatal(err)
	}
	if state.Size != 5 {
		t.Fatalf("expected synchronous attribute snapshot, got %+v", state)
	}
	want, err := hashFile(context.Background(), file)
	if err != nil {
		t.Fatal(err)
	}
	waitForHash(t, recorder, want)
}

func TestFingerprintRecorderSkipsNonServable(t *testing.T) {
	dir := t.TempDir()
	recorder, _ := newRecorderFixture(t, dir)

	recorder.Record("s", dir)
	state, err := recorder.Get(context.Background(), "s")
	if err != nil {
		t.Fatal(err)
	}
	if state != (fileFingerprint{}) {
		t.Fatalf("expected no fingerprint for a directory, got %+v", state)
	}
}

func TestFingerprintRecorderAbortsHashWhenFileChangedMidway(t *testing.T) {
	file := filepath.Join(t.TempDir(), "a.txt")
	if err := os.WriteFile(file, []byte("hello"), 0o600); err != nil {
		t.Fatal(err)
	}
	recorder, _ := newRecorderFixture(t, file)
	info, err := os.Stat(file)
	if err != nil {
		t.Fatal(err)
	}
	stale := fingerprintInfo(file, info)
	if err := recorder.db.WithTx(context.Background(), func(tx *sql.Tx) error {
		return recorder.store.Upsert(context.Background(), tx, "s", file, stale)
	}); err != nil {
		t.Fatal(err)
	}
	// 记录之后文件被改写：按旧属性算出的 hash 不得落库。
	if err := os.WriteFile(file, []byte("hello, changed"), 0o600); err != nil {
		t.Fatal(err)
	}

	recorder.hashIfStillCurrent(context.Background(), "s", file, stale)
	state, err := recorder.Get(context.Background(), "s")
	if err != nil {
		t.Fatal(err)
	}
	if state.Hash != "" {
		t.Fatalf("expected aborted hash, got %+v", state)
	}
}

// 冷启动预过滤：位置未变、属性一致且已有 hash 的文件不得再被哈希或写库。
// 用「故意写坏的 hash 在回填后原样保留」做证明：若回填重算，7 列 CAS 会把
// 正确 hash 原子写回，断言立刻变红；空 hash 与无记录的文件则必须被补齐，
// 证明预过滤没有把需要处理的文件一并跳过。
func TestBackfillSkipsUnchangedFilesWithoutRehashing(t *testing.T) {
	ctx := context.Background()
	db, err := storage.Open(filepath.Join(t.TempDir(), "library.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	folder := t.TempDir()
	makeFile := func(name, content string) (string, fileFingerprint) {
		t.Helper()
		path := filepath.Join(folder, name)
		if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
			t.Fatal(err)
		}
		info, err := os.Stat(path)
		if err != nil {
			t.Fatal(err)
		}
		return path, fingerprintInfo(path, info)
	}
	frozenPath, frozenState := makeFile("frozen.txt", "unchanged and already hashed")
	freshPath, freshState := makeFile("fresh.txt", "recorded but never hashed")
	newPath, _ := makeFile("new.txt", "no record at all")

	seedFileSource(t, db, "s_frozen", frozenPath)
	seedFileSource(t, db, "s_fresh", freshPath)
	seedFileSource(t, db, "s_new", newPath)
	if _, err := db.SqlDB().Exec(`INSERT INTO source_fingerprints VALUES ('s_frozen',?,?,?,?,?,'stale-not-real')`,
		frozenPath, frozenState.Size, frozenState.Modified, frozenState.Identity, frozenState.Changed); err != nil {
		t.Fatal(err)
	}
	if _, err := db.SqlDB().Exec(`INSERT INTO source_fingerprints VALUES ('s_fresh',?,?,?,?,?,'')`,
		freshPath, freshState.Size, freshState.Modified, freshState.Identity, freshState.Changed); err != nil {
		t.Fatal(err)
	}

	recorder := newFingerprintRecorder(db)
	recorder.Backfill(ctx)

	frozenGot, err := recorder.Get(ctx, "s_frozen")
	if err != nil {
		t.Fatal(err)
	}
	if frozenGot.Hash != "stale-not-real" || frozenGot.Size != frozenState.Size {
		t.Fatalf("unchanged file must not be re-hashed or rewritten, got %+v", frozenGot)
	}
	freshWant, err := hashFile(ctx, freshPath)
	if err != nil {
		t.Fatal(err)
	}
	freshGot, err := recorder.Get(ctx, "s_fresh")
	if err != nil {
		t.Fatal(err)
	}
	if freshGot.Hash != freshWant {
		t.Fatalf("expected empty-hash record to be filled, got %+v", freshGot)
	}
	newWant, err := hashFile(ctx, newPath)
	if err != nil {
		t.Fatal(err)
	}
	newGot, err := recorder.Get(ctx, "s_new")
	if err != nil {
		t.Fatal(err)
	}
	if newGot.Hash != newWant || newGot.Size != int64(len("no record at all")) {
		t.Fatalf("expected missing record to be created, got %+v", newGot)
	}
}

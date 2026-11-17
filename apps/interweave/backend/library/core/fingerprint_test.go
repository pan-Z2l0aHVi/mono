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

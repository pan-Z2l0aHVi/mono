package core

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

func TestRecoveryMatchesHashAndNameAndRejectsChangedCandidate(t *testing.T) {
	ctx := context.Background()
	root := t.TempDir()
	db, err := storage.Open(filepath.Join(root, "library.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	original := filepath.Join(root, "lost", "original.txt")
	content := []byte("source content")
	_, err = db.SqlDB().Exec(`INSERT INTO resources VALUES ('r','title','',0,0); INSERT INTO sources VALUES ('s','r','file',?,0,1,0,'',0,0)`, original)
	if err != nil {
		t.Fatal(err)
	}
	originalFile := filepath.Join(root, "seed")
	if err = os.WriteFile(originalFile, content, 0600); err != nil {
		t.Fatal(err)
	}
	hash, err := hashFile(ctx, originalFile)
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.SqlDB().Exec(`INSERT INTO source_fingerprints VALUES ('s',?,?,0,'',0,?)`, original, len(content), hash)
	if err != nil {
		t.Fatal(err)
	}
	folder := filepath.Join(root, "scan")
	if err = os.Mkdir(folder, 0700); err != nil {
		t.Fatal(err)
	}
	sameContent := filepath.Join(folder, "renamed.txt")
	sameName := filepath.Join(folder, "original.txt")
	if err = os.WriteFile(sameContent, content, 0600); err != nil {
		t.Fatal(err)
	}
	if err = os.WriteFile(sameName, []byte("different length and content"), 0600); err != nil {
		t.Fatal(err)
	}
	svc := NewSourceService(db, remote.NewFetcher())
	results := map[string]RecoveryCandidate{}
	if err = svc.ScanRecovery(ctx, []string{"s"}, folder, func(_ RecoveryProgress, c *RecoveryCandidate) {
		if c != nil {
			results[c.Path] = *c
		}
	}); err != nil {
		t.Fatal(err)
	}
	if got := results[sameContent].MatchReasons; len(got) != 1 || got[0] != "hash" {
		t.Fatalf("renamed content match: %v", got)
	}
	if got := results[sameName].MatchReasons; len(got) != 1 || got[0] != "name" {
		t.Fatalf("changed same-name match: %v", got)
	}
	if err = os.WriteFile(sameContent, []byte("changed"), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err = svc.ReplaceScannedFileSource(ctx, "s", sameContent, results[sameContent].Snapshot); err == nil {
		t.Fatal("changed candidate accepted")
	}
}

// 扫描中断由 WalkDir 回调里的 `ctx.Err()` 承担，所以要真的走进遍历：source 得存在且不可用，
// 目录得有内容，取消发生在 report 首次回调之后。用「已取消的 ctx + 不存在的 source」跑不到那段代码，
// 错误来自 sources.Get，取消分支等于没有测试证据。
func TestRecoveryCancelled(t *testing.T) {
	root := t.TempDir()
	db, err := storage.Open(filepath.Join(root, "library.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	missing := filepath.Join(root, "lost", "gone.txt")
	_, err = db.SqlDB().Exec(`INSERT INTO resources VALUES ('r','title','',0,0);
 INSERT INTO sources VALUES ('s','r','file',?,0,1,0,'',0,0)`, missing)
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.SqlDB().Exec(`INSERT INTO source_fingerprints VALUES ('s',?,0,0,'',0,'')`, missing)
	if err != nil {
		t.Fatal(err)
	}
	folder := filepath.Join(root, "scan")
	if err = os.Mkdir(folder, 0700); err != nil {
		t.Fatal(err)
	}
	if err = os.WriteFile(filepath.Join(folder, "candidate.txt"), []byte("candidate"), 0600); err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	svc := NewSourceService(db, remote.NewFetcher())
	var callbacks int
	err = svc.ScanRecovery(ctx, []string{"s"}, folder, func(RecoveryProgress, *RecoveryCandidate) {
		callbacks++
		// 首个回调意味着已经进了遍历，此后再取消才落在 `ctx.Err()` 上。
		cancel()
	})
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("cancelled scan error = %v, want context.Canceled", err)
	}
	if callbacks == 0 {
		t.Fatal("cancelled before the walk reported progress")
	}
}

func TestRecoveryDeduplicatesFileIdentityWithoutLosingNameMatches(t *testing.T) {
	ctx := context.Background()
	root := t.TempDir()
	db, err := storage.Open(filepath.Join(root, "library.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	_, err = db.SqlDB().Exec(`INSERT INTO resources VALUES ('r','title','',0,0);
 INSERT INTO sources VALUES ('byHash','r','file','/lost/missing.bin',0,1,0,'',0,0);
 INSERT INTO sources VALUES ('byName','r','file','/lost/original.txt',0,0,1,'',0,0)`)
	if err != nil {
		t.Fatal(err)
	}
	folder := filepath.Join(root, "scan")
	if err = os.Mkdir(folder, 0700); err != nil {
		t.Fatal(err)
	}
	first := filepath.Join(folder, "a.txt")
	alias := filepath.Join(folder, "original.txt")
	copyPath := filepath.Join(folder, "z.txt")
	for _, p := range []string{first, copyPath} {
		if err = os.WriteFile(p, []byte("same content"), 0600); err != nil {
			t.Fatal(err)
		}
	}
	if err = os.Link(first, alias); err != nil {
		t.Fatal(err)
	}
	hash, err := hashFile(ctx, first)
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.SqlDB().Exec(`INSERT INTO source_fingerprints VALUES ('byHash','/lost/missing.bin',?,0,'',0,?)`, len("same content"), hash)
	if err != nil {
		t.Fatal(err)
	}
	svc := NewSourceService(db, remote.NewFetcher())
	got := map[string][]RecoveryCandidate{}
	var checked int
	err = svc.ScanRecovery(ctx, []string{"byHash", "byName"}, folder, func(p RecoveryProgress, c *RecoveryCandidate) {
		checked = p.Checked
		if c != nil {
			got[c.SourceID] = append(got[c.SourceID], *c)
		}
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(got["byHash"]) != 2 {
		t.Fatalf("expected one hardlink and one independent copy, got %+v", got["byHash"])
	}
	if len(got["byName"]) != 1 || got["byName"][0].Path != alias {
		t.Fatalf("matching alias was lost: %+v", got["byName"])
	}
	if checked != 2 {
		t.Fatalf("expected two distinct physical files checked, got %d", checked)
	}
}

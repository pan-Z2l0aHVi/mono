package core

import (
	"bytes"
	"context"
	"errors"
	"fmt"
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

// 硬链接别名进入结果通道常常早于主哈希 outcome：4MB 主文件还在哈希时，别名消息已经
// 到达聚合器。别名必须暂存到主哈希裁决之后 flush，否则会用空 hash 抢先写 matched，
// 把本应由主路径产出的 "hash" 命中挤丢。文件足够大让「别名先到」成为压倒性序，
// 但断言对两种到达序都成立。
func TestRecoveryAliasArrivingBeforePrimaryHashKeepsHashReason(t *testing.T) {
	ctx := context.Background()
	root := t.TempDir()
	db, err := storage.Open(filepath.Join(root, "library.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	_, err = db.SqlDB().Exec(`INSERT INTO resources VALUES ('r','title','',0,0);
 INSERT INTO sources VALUES ('s','r','file','/lost/z_alias.bin',0,1,0,'',0,0)`)
	if err != nil {
		t.Fatal(err)
	}
	folder := filepath.Join(root, "scan")
	if err = os.Mkdir(folder, 0700); err != nil {
		t.Fatal(err)
	}
	primary := filepath.Join(folder, "a_primary.bin")
	alias := filepath.Join(folder, "z_alias.bin")
	content := bytes.Repeat([]byte("interweave-alias-order-probe-"), 1<<17) // 约 4MB
	if err = os.WriteFile(primary, content, 0600); err != nil {
		t.Fatal(err)
	}
	if err = os.Link(primary, alias); err != nil {
		t.Fatal(err)
	}
	hash, err := hashFile(ctx, primary)
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.SqlDB().Exec(`INSERT INTO source_fingerprints VALUES ('s','/lost/z_alias.bin',?,0,'',0,?)`, len(content), hash)
	if err != nil {
		t.Fatal(err)
	}

	svc := NewSourceService(db, remote.NewFetcher())
	var candidates []RecoveryCandidate
	var checked int
	if err = svc.ScanRecovery(ctx, []string{"s"}, folder, func(p RecoveryProgress, c *RecoveryCandidate) {
		checked = p.Checked
		if c != nil {
			candidates = append(candidates, *c)
		}
	}); err != nil {
		t.Fatal(err)
	}
	if len(candidates) != 1 {
		t.Fatalf("expected exactly one candidate for the single fileKey, got %+v", candidates)
	}
	if candidates[0].Path != primary {
		t.Fatalf("expected primary path to win the matched slot, got %+v", candidates[0])
	}
	if got := candidates[0].MatchReasons; len(got) != 1 || got[0] != "hash" {
		t.Fatalf("expected the hash reason to survive alias ordering, got %v", got)
	}
	if checked != 1 {
		t.Fatalf("expected hardlink group counted once, got %d", checked)
	}
}

// 主哈希读失败（chmod 000 后 os.Open 被拒）时 outcome 仍必须回传，等待中的别名
// 靠 identity/name 裁决而不是悬空；扫描正常结束，不丢 name 候选。
func TestRecoveryAliasResolvesWhenPrimaryHashFails(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("root ignores file mode, hash failure cannot be simulated")
	}
	ctx := context.Background()
	root := t.TempDir()
	db, err := storage.Open(filepath.Join(root, "library.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	_, err = db.SqlDB().Exec(`INSERT INTO resources VALUES ('r','title','',0,0);
 INSERT INTO sources VALUES ('hashTarget','r','file','/lost/p_fail.bin',0,1,0,'',0,0);
 INSERT INTO sources VALUES ('nameTarget','r','file','/lost/alias.bin',0,0,1,'',0,0)`)
	if err != nil {
		t.Fatal(err)
	}
	folder := filepath.Join(root, "scan")
	if err = os.Mkdir(folder, 0700); err != nil {
		t.Fatal(err)
	}
	primary := filepath.Join(folder, "p_fail.bin")
	content := bytes.Repeat([]byte("unreadable"), 100)
	if err = os.WriteFile(primary, content, 0600); err != nil {
		t.Fatal(err)
	}
	alias := filepath.Join(folder, "alias.bin")
	if err = os.Link(primary, alias); err != nil {
		t.Fatal(err)
	}
	// chmod 会更新 ctime，必须在 chmod 之后取属性，让指纹行与扫描期看到的快照一致。
	if err = os.Chmod(primary, 0000); err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(primary)
	if err != nil {
		t.Fatal(err)
	}
	state := fingerprintInfo(primary, info)
	// 指纹行的 identity 置空，避免 identity 命中盖过要验证的 name/hash 行为。
	_, err = db.SqlDB().Exec(`INSERT INTO source_fingerprints VALUES ('hashTarget','/lost/p_fail.bin',?,0,'',0,'never-computed')`,
		state.Size)
	if err != nil {
		t.Fatal(err)
	}

	svc := NewSourceService(db, remote.NewFetcher())
	got := map[string][]RecoveryCandidate{}
	if err = svc.ScanRecovery(ctx, []string{"hashTarget", "nameTarget"}, folder, func(_ RecoveryProgress, c *RecoveryCandidate) {
		if c != nil {
			got[c.SourceID] = append(got[c.SourceID], *c)
		}
	}); err != nil {
		t.Fatalf("scan must finish without hanging on the failed hash: %v", err)
	}
	if len(got["hashTarget"]) != 1 || got["hashTarget"][0].Path != primary {
		t.Fatalf("expected alias to resolve by name after primary hash failure, got %+v", got["hashTarget"])
	}
	if r := got["hashTarget"][0].MatchReasons; len(r) != 1 || r[0] != "name" {
		t.Fatalf("expected name-only reasons for failed hash, got %v", r)
	}
	if len(got["nameTarget"]) != 1 || got["nameTarget"][0].Path != alias {
		t.Fatalf("expected name target to keep its alias candidate, got %+v", got["nameTarget"])
	}
}

// 大树扫描的 report 回调必须被节流到有界量级，同时节流不得吞掉任何候选与终态进度。
func TestRecoveryThrottlesProgressCallbacks(t *testing.T) {
	ctx := context.Background()
	root := t.TempDir()
	db, err := storage.Open(filepath.Join(root, "library.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	_, err = db.SqlDB().Exec(`INSERT INTO resources VALUES ('r','title','',0,0);
 INSERT INTO sources VALUES ('s','r','file','/lost/match_me.txt',0,1,0,'',0,0)`)
	if err != nil {
		t.Fatal(err)
	}
	folder := filepath.Join(root, "scan")
	if err = os.Mkdir(folder, 0700); err != nil {
		t.Fatal(err)
	}
	const totalFiles = 1200
	matchPath := filepath.Join(folder, "match_me.txt")
	matchContent := []byte("match-me")
	if err = os.WriteFile(matchPath, matchContent, 0600); err != nil {
		t.Fatal(err)
	}
	hash, err := hashFile(ctx, matchPath)
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.SqlDB().Exec(`INSERT INTO source_fingerprints VALUES ('s','/lost/match_me.txt',?,0,'',0,?)`, len(matchContent), hash)
	if err != nil {
		t.Fatal(err)
	}
	for i := range totalFiles {
		if err = os.WriteFile(filepath.Join(folder, fmt.Sprintf("f_%04d.txt", i)), []byte("filler"), 0600); err != nil {
			t.Fatal(err)
		}
	}

	svc := NewSourceService(db, remote.NewFetcher())
	var calls int
	var lastProgress RecoveryProgress
	candidates := map[string]RecoveryCandidate{}
	if err = svc.ScanRecovery(ctx, []string{"s"}, folder, func(p RecoveryProgress, c *RecoveryCandidate) {
		calls++
		lastProgress = p
		if c != nil {
			candidates[c.SourceID] = *c
		}
	}); err != nil {
		t.Fatal(err)
	}
	if calls == 0 || calls > 100 {
		t.Fatalf("expected bounded callback count in (0, 100], got %d", calls)
	}
	if lastProgress.Checked != totalFiles+1 || lastProgress.Skipped != 0 {
		t.Fatalf("terminal progress must carry final counts, got %+v", lastProgress)
	}
	c := candidates["s"]
	// 目标位置与文件同名，reasons 固定为 identity → hash → name 中的 hash + name。
	if c.Path != matchPath || len(c.MatchReasons) != 2 || c.MatchReasons[0] != "hash" || c.MatchReasons[1] != "name" {
		t.Fatalf("throttling must not lose candidates, got %+v", c)
	}
}

// 并行哈希在途时取消：必须 promptly 返回 context.Canceled，排空不卡死。
func TestRecoveryCancelDuringHashingReturnsContextError(t *testing.T) {
	root := t.TempDir()
	db, err := storage.Open(filepath.Join(root, "library.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	_, err = db.SqlDB().Exec(`INSERT INTO resources VALUES ('r','title','',0,0);
 INSERT INTO sources VALUES ('big','r','file','/lost/a_big.bin',0,1,0,'',0,0);
 INSERT INTO sources VALUES ('small','r','file','/lost/z_small.txt',0,0,1,'',0,0)`)
	if err != nil {
		t.Fatal(err)
	}
	folder := filepath.Join(root, "scan")
	if err = os.Mkdir(folder, 0700); err != nil {
		t.Fatal(err)
	}
	bigPath := filepath.Join(folder, "a_big.bin")
	bigContent := bytes.Repeat([]byte{0xA5}, 8<<20)
	if err = os.WriteFile(bigPath, bigContent, 0600); err != nil {
		t.Fatal(err)
	}
	bigHash, err := hashFile(context.Background(), bigPath)
	if err != nil {
		t.Fatal(err)
	}
	smallPath := filepath.Join(folder, "z_small.txt")
	smallContent := []byte("cancel-me")
	if err = os.WriteFile(smallPath, smallContent, 0600); err != nil {
		t.Fatal(err)
	}
	smallHash, err := hashFile(context.Background(), smallPath)
	if err != nil {
		t.Fatal(err)
	}
	// 两条语句分开执行：多语句 Exec 的参数按语句各自从头绑定，混用会错位。
	_, err = db.SqlDB().Exec(`INSERT INTO source_fingerprints VALUES ('big','/lost/a_big.bin',?,0,'',0,?)`,
		len(bigContent), bigHash)
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.SqlDB().Exec(`INSERT INTO source_fingerprints VALUES ('small','/lost/z_small.txt',?,0,'',0,?)`,
		len(smallContent), smallHash)
	if err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	svc := NewSourceService(db, remote.NewFetcher())
	var callbacks int
	err = svc.ScanRecovery(ctx, []string{"big", "small"}, folder, func(_ RecoveryProgress, c *RecoveryCandidate) {
		callbacks++
		if c != nil {
			cancel()
		}
	})
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("cancelled scan with hashing in flight: error = %v, want context.Canceled", err)
	}
	if callbacks == 0 {
		t.Fatal("cancelled before any callback")
	}
}

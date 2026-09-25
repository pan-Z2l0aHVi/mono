package core

import (
	"context"
	"errors"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"syscall"
	"testing"
	"time"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/internal/normalize"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

func openAvailabilityDB(t *testing.T) *storage.DB {
	t.Helper()
	db, err := storage.Open(filepath.Join(t.TempDir(), "availability.db"))
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func seedResource(t *testing.T, db *storage.DB, id string) {
	t.Helper()
	now := time.Now().UnixMilli()
	if err := (storage.ResourceStore{}).Insert(context.Background(), db.SqlDB(), storage.ResourceModel{
		ID: id, Title: id, CreatedAt: now, UpdatedAt: now,
	}); err != nil {
		t.Fatalf("insert resource %s: %v", id, err)
	}
}

// seedSource 直接落库一条 Source，使用例能自由设定 available、首选角色与既有元数据。
func seedSource(t *testing.T, db *storage.DB, id string, srcType storage.SourceType, location string, available bool, preferred bool, metadataJSON string) {
	t.Helper()
	seedResource(t, db, "resource-"+id)
	now := time.Now().UnixMilli()
	if err := (storage.SourceStore{}).Insert(context.Background(), db.SqlDB(), storage.SourceModel{
		ID: id, ResourceID: "resource-" + id, Type: srcType, Location: location,
		Available: available, IsPreferred: preferred, MetadataJSON: metadataJSON,
		CreatedAt: now, UpdatedAt: now,
	}); err != nil {
		t.Fatalf("insert source %s: %v", id, err)
	}
}

func readSource(t *testing.T, db *storage.DB, id string) storage.SourceModel {
	t.Helper()
	src, err := (storage.SourceStore{}).Get(context.Background(), db.SqlDB(), id)
	if err != nil {
		t.Fatalf("read source %s: %v", id, err)
	}
	return src
}

func writeFixture(t *testing.T, path string) {
	t.Helper()
	if err := os.WriteFile(path, []byte("0123456789"), 0o600); err != nil {
		t.Fatalf("write fixture %s: %v", path, err)
	}
}

func TestApplyFileAvailabilityReportsRealFlip(t *testing.T) {
	db := openAvailabilityDB(t)
	seedSource(t, db, "source-flip", storage.SourceTypeFile, filepath.Join(t.TempDir(), "gone.mp4"), true, true, "")
	svc := NewSourceService(db, remote.NewFetcher())

	change, err := svc.ApplyFileAvailability(context.Background(), "source-flip", false)
	if err != nil {
		t.Fatalf("ApplyFileAvailability error: %v", err)
	}
	if change == nil {
		t.Fatal("expected a change for a real flip, got nil")
	}
	if change.SourceID != "source-flip" || change.ResourceID != "resource-source-flip" {
		t.Fatalf("unexpected change identity: %+v", change)
	}
	if change.Type != storage.SourceTypeFile || change.Available || change.ChangedAt == 0 {
		t.Fatalf("unexpected change payload: %+v", change)
	}
	if stored := readSource(t, db, "source-flip"); stored.Available {
		t.Fatal("expected availability persisted as false")
	}
}

// 同值必须是完全 no-op：不写 updated_at，否则每次文件写入事件都会搅乱列表排序。
func TestApplyFileAvailabilitySameValueKeepsUpdatedAt(t *testing.T) {
	db := openAvailabilityDB(t)
	present := filepath.Join(t.TempDir(), "here.mp4")
	writeFixture(t, present)
	seedSource(t, db, "source-stable", storage.SourceTypeFile, present, true, true, "")
	svc := NewSourceService(db, remote.NewFetcher())
	before := readSource(t, db, "source-stable")

	// 跨过毫秒边界，使任何实际写入都会留下可辨认的时间戳差异。
	time.Sleep(2 * time.Millisecond)
	change, err := svc.ApplyFileAvailability(context.Background(), "source-stable", true)
	if err != nil {
		t.Fatalf("ApplyFileAvailability error: %v", err)
	}
	if change != nil {
		t.Fatalf("expected no change for identical availability, got %+v", change)
	}
	if after := readSource(t, db, "source-stable"); after.UpdatedAt != before.UpdatedAt {
		t.Fatalf("expected updated_at untouched (%d), got %d", before.UpdatedAt, after.UpdatedAt)
	}
}

// Source 已删不是错误：移除 Resource 会级联删掉它的 Source。
func TestApplyFileAvailabilityOnMissingSourceIsNotError(t *testing.T) {
	db := openAvailabilityDB(t)
	svc := NewSourceService(db, remote.NewFetcher())

	change, err := svc.ApplyFileAvailability(context.Background(), "source-absent", false)
	if err != nil {
		t.Fatalf("expected no error for missing source, got %v", err)
	}
	if change != nil {
		t.Fatalf("expected no change for missing source, got %+v", change)
	}
}

func TestApplyFileAvailabilityRejectsNonFileSource(t *testing.T) {
	db := openAvailabilityDB(t)
	seedSource(t, db, "source-url", storage.SourceTypeURL, "https://example.com", true, true, "")
	svc := NewSourceService(db, remote.NewFetcher())

	if _, err := svc.ApplyFileAvailability(context.Background(), "source-url", false); !errors.Is(err, ErrOnlyFileSourceRefreshable) {
		t.Fatalf("expected ErrOnlyFileSourceRefreshable, got %v", err)
	}
}

// size 只在翻转的是首选文件 Source 时才有值：size 由首选 Source 派生。
func TestApplyFileAvailabilityCarriesSizeOnlyForPreferred(t *testing.T) {
	db := openAvailabilityDB(t)
	directory := t.TempDir()
	primary := filepath.Join(directory, "primary.mp4")
	backup := filepath.Join(directory, "backup.mp4")
	writeFixture(t, primary)
	writeFixture(t, backup)
	seedSource(t, db, "source-primary", storage.SourceTypeFile, primary, true, true, "")
	seedSource(t, db, "source-backup", storage.SourceTypeFile, backup, true, false, "")
	svc := NewSourceService(db, remote.NewFetcher())

	// 先把首选翻成不可用再翻回可用，使翻转真实发生且 size 应当有值。
	disabled, err := svc.ApplyFileAvailability(context.Background(), "source-primary", false)
	if err != nil || disabled == nil {
		t.Fatalf("expected preferred disable to be reported, change=%+v err=%v", disabled, err)
	}
	restored, err := svc.ApplyFileAvailability(context.Background(), "source-primary", true)
	if err != nil || restored == nil {
		t.Fatalf("expected preferred restore to be reported, change=%+v err=%v", restored, err)
	}
	if restored.SizeBytes == nil || *restored.SizeBytes != 10 {
		t.Fatalf("expected size 10 for preferred flip, got %+v", restored.SizeBytes)
	}

	disableBackup, err := svc.ApplyFileAvailability(context.Background(), "source-backup", false)
	if err != nil || disableBackup == nil {
		t.Fatalf("expected backup disable to be reported, change=%+v err=%v", disableBackup, err)
	}
	restoreBackup, err := svc.ApplyFileAvailability(context.Background(), "source-backup", true)
	if err != nil || restoreBackup == nil {
		t.Fatalf("expected backup restore to be reported, change=%+v err=%v", restoreBackup, err)
	}
	if restoreBackup.SizeBytes != nil {
		t.Fatalf("expected no size for non-preferred flip, got %d", *restoreBackup.SizeBytes)
	}
}

// 三态的核心：无法判定不落库，保留原值与 updated_at。
func TestProbeURLSourceOnOpenKeepsValueWhenInconclusive(t *testing.T) {
	origBudget := probeBudgetOnOpen
	probeBudgetOnOpen = 100 * time.Millisecond
	t.Cleanup(func() { probeBudgetOnOpen = origBudget })

	db := openAvailabilityDB(t)
	hanging := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		select {
		case <-r.Context().Done():
		case <-time.After(30 * time.Second):
		}
	}))
	defer hanging.Close()
	location, err := normalize.URL(hanging.URL)
	if err != nil {
		t.Fatalf("normalize.URL error: %v", err)
	}
	seedSource(t, db, "source-hanging", storage.SourceTypeURL, location, false, true, "")
	before := readSource(t, db, "source-hanging")
	svc := NewSourceService(db, remote.NewFetcher())

	_, outcome, err := svc.ProbeURLSourceOnOpen(context.Background(), "source-hanging")
	if err != nil {
		t.Fatalf("ProbeURLSourceOnOpen error: %v", err)
	}
	if outcome != ProbeOutcomeInconclusive {
		t.Fatalf("expected ProbeOutcomeInconclusive, got %q", outcome)
	}
	after := readSource(t, db, "source-hanging")
	if after.Available != before.Available {
		t.Fatalf("expected availability untouched, %v -> %v", before.Available, after.Available)
	}
	if after.UpdatedAt != before.UpdatedAt {
		t.Fatalf("expected updated_at untouched (%d), got %d", before.UpdatedAt, after.UpdatedAt)
	}
}

// 服务端明确拒绝要落库为失效，并把结论带回调用方。
func TestProbeURLSourceOnOpenPersistsRejection(t *testing.T) {
	db := openAvailabilityDB(t)
	dead := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer dead.Close()
	location, err := normalize.URL(dead.URL)
	if err != nil {
		t.Fatalf("normalize.URL error: %v", err)
	}
	seedSource(t, db, "source-dead", storage.SourceTypeURL, location, true, true, "")
	svc := NewSourceService(db, remote.NewFetcher())

	src, outcome, err := svc.ProbeURLSourceOnOpen(context.Background(), "source-dead")
	if err != nil {
		t.Fatalf("ProbeURLSourceOnOpen error: %v", err)
	}
	if outcome != ProbeOutcomeUnavailable {
		t.Fatalf("expected ProbeOutcomeUnavailable, got %q", outcome)
	}
	if src.Available {
		t.Fatal("expected returned source to be unavailable")
	}
	if stored := readSource(t, db, "source-dead"); stored.Available {
		t.Fatal("expected availability persisted as false")
	}
}

// 打开抽屉不该顺手抹掉已知标题：探测未取回元数据时保留既有 metadata_json。
func TestProbeURLSourceOnOpenKeepsMetadataWhenFetchFails(t *testing.T) {
	db := openAvailabilityDB(t)
	broken := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer broken.Close()
	location, err := normalize.URL(broken.URL)
	if err != nil {
		t.Fatalf("normalize.URL error: %v", err)
	}
	metadata := `{"title":"Known Title"}`
	seedSource(t, db, "source-broken", storage.SourceTypeURL, location, true, true, metadata)
	svc := NewSourceService(db, remote.NewFetcher())

	if _, _, err := svc.ProbeURLSourceOnOpen(context.Background(), "source-broken"); err != nil {
		t.Fatalf("ProbeURLSourceOnOpen error: %v", err)
	}
	if stored := readSource(t, db, "source-broken"); stored.MetadataJSON != metadata {
		t.Fatalf("expected metadata preserved, got %q", stored.MetadataJSON)
	}
}

func TestProbeURLSourceOnOpenRejectsFileSource(t *testing.T) {
	db := openAvailabilityDB(t)
	present := filepath.Join(t.TempDir(), "here.mp4")
	writeFixture(t, present)
	seedSource(t, db, "source-file", storage.SourceTypeFile, present, true, true, "")
	svc := NewSourceService(db, remote.NewFetcher())

	if _, _, err := svc.ProbeURLSourceOnOpen(context.Background(), "source-file"); !errors.Is(err, ErrOnlyURLSourceRefreshable) {
		t.Fatalf("expected ErrOnlyURLSourceRefreshable, got %v", err)
	}
}

// 入口集合变化后必须请求监听重建，否则新纳入的文件要等下一次定期对账才被监听。
func TestSourceMutationsResyncIndex(t *testing.T) {
	db := openAvailabilityDB(t)
	fetcher := remote.NewFetcher()
	sourceSvc := NewSourceService(db, fetcher)
	resourceSvc := NewResourceService(db, fetcher)
	sync := &recordingIndexSync{}
	sourceSvc.SetIndexSync(sync)
	resourceSvc.SetIndexSync(sync)
	ctx := context.Background()
	directory := t.TempDir()
	primary := filepath.Join(directory, "primary.mp4")
	spare := filepath.Join(directory, "spare.mp4")
	writeFixture(t, primary)
	writeFixture(t, spare)
	seedResource(t, db, "resource-anchor")

	fileSrc, err := sourceSvc.AddFileSource(ctx, "resource-anchor", primary)
	if err != nil {
		t.Fatalf("AddFileSource error: %v", err)
	}
	urlSrc, err := sourceSvc.AddURLSource(ctx, "resource-anchor", "https://example.com/a")
	if err != nil {
		t.Fatalf("AddURLSource error: %v", err)
	}
	if _, err := sourceSvc.ReplaceFileSource(ctx, fileSrc.ID, spare); err != nil {
		t.Fatalf("ReplaceFileSource error: %v", err)
	}
	if _, err := sourceSvc.ReplaceURLSource(ctx, urlSrc.ID, "https://example.com/b"); err != nil {
		t.Fatalf("ReplaceURLSource error: %v", err)
	}
	view, err := resourceSvc.AddFileResource(ctx, primary)
	if err != nil {
		t.Fatalf("AddFileResource error: %v", err)
	}
	if err := sourceSvc.RemoveSource(ctx, fileSrc.ID); err != nil {
		t.Fatalf("RemoveSource error: %v", err)
	}
	if err := resourceSvc.DeleteResource(ctx, view.Resource.ID); err != nil {
		t.Fatalf("DeleteResource error: %v", err)
	}

	if got := sync.count(); got != 7 {
		t.Fatalf("expected 7 index resyncs, got %d", got)
	}
}

// 索引重建失败不能回滚已提交的事务：文件已经入库，缺的只是监听索引。
func TestIndexSyncFailureDoesNotFailMutation(t *testing.T) {
	db := openAvailabilityDB(t)
	present := filepath.Join(t.TempDir(), "existing.mp4")
	writeFixture(t, present)
	seedResource(t, db, "resource-anchor")
	sync := &recordingIndexSync{err: errors.New("watch unavailable")}
	svc := NewSourceService(db, remote.NewFetcher())
	svc.SetIndexSync(sync)

	src, err := svc.AddFileSource(context.Background(), "resource-anchor", present)
	if err != nil {
		t.Fatalf("expected AddFileSource to succeed despite index sync failure, got %v", err)
	}
	if !src.Available {
		t.Fatalf("expected source persisted as available, got %+v", src)
	}
}

// 「确实不可服务」与「此刻读不到」必须可区分：权限错误不等于文件消失。
func TestFileDefinitelyUnavailableTriage(t *testing.T) {
	directory := t.TempDir()
	dirInfo, err := os.Stat(directory)
	if err != nil {
		t.Fatalf("stat directory: %v", err)
	}
	present := filepath.Join(directory, "here.txt")
	writeFixture(t, present)
	fileInfo, err := os.Stat(present)
	if err != nil {
		t.Fatalf("stat file: %v", err)
	}

	for _, test := range []struct {
		name string
		err  error
		info os.FileInfo
		want bool
	}{
		{name: "absent", err: &fs.PathError{Op: "stat", Path: present, Err: fs.ErrNotExist}, want: true},
		{name: "directory", info: dirInfo, want: true},
		{name: "permission", err: &fs.PathError{Op: "stat", Path: present, Err: fs.ErrPermission}, want: false},
		{name: "io error", err: &fs.PathError{Op: "stat", Path: present, Err: syscall.EIO}, want: false},
		{name: "regular file", info: fileInfo, want: false},
	} {
		t.Run(test.name, func(t *testing.T) {
			if got := FileDefinitelyUnavailable(test.err, test.info); got != test.want {
				t.Fatalf("expected %v, got %v", test.want, got)
			}
		})
	}
}

type recordingIndexSync struct {
	calls int
	err   error
}

func (s *recordingIndexSync) SyncSources(context.Context) error {
	s.calls++
	return s.err
}

func (s *recordingIndexSync) count() int { return s.calls }

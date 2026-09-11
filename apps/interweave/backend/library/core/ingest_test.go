package core

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/internal/normalize"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

// ADR-0014 的 10 秒预算只存在于 ingestBudget：全部 URL 纳入与刷新路径都经 probe 共享它。
func TestIngestBudgetIsSingleClock(t *testing.T) {
	if ingestBudget != 10*time.Second {
		t.Fatalf("expected ADR-0014 ingest budget of 10s, got %v", ingestBudget)
	}
}

// 文件探测只做轻量 stat：结果只决定 available，默认标题取文件名（ADR-0014/0023）。
func TestProbeFileAvailability(t *testing.T) {
	ing := &ingestion{}
	ctx := context.Background()

	dir := t.TempDir()
	missing := filepath.Join(dir, "absent.txt")
	outcome := ing.probe(ctx, missing, storage.SourceTypeFile)
	if outcome.available {
		t.Errorf("expected absent file to be unavailable, got %+v", outcome)
	}
	if outcome.defaultTitle != "absent.txt" {
		t.Errorf("expected file name as default title, got %q", outcome.defaultTitle)
	}

	present := filepath.Join(dir, "present.txt")
	if err := os.WriteFile(present, []byte("x"), 0o644); err != nil {
		t.Fatalf("failed to write fixture: %v", err)
	}
	outcome = ing.probe(ctx, present, storage.SourceTypeFile)
	if !outcome.available {
		t.Errorf("expected present file to be available, got %+v", outcome)
	}
	if outcome.defaultTitle != "present.txt" {
		t.Errorf("expected file name as default title, got %q", outcome.defaultTitle)
	}
}

// URL 探测失败不视为错误：仍产出 available=false、hostname 回退标题与空元数据。
func TestProbeURLFailureFallsBackToHostname(t *testing.T) {
	ing := &ingestion{fetcher: remote.NewFetcher()}

	bad := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer bad.Close()

	location, err := normalize.URL(bad.URL)
	if err != nil {
		t.Fatalf("normalize.URL error: %v", err)
	}
	outcome := ing.probe(context.Background(), location, storage.SourceTypeURL)
	if outcome.available {
		t.Errorf("expected 500 response to be unavailable, got %+v", outcome)
	}
	parsed, _ := url.Parse(location)
	if outcome.defaultTitle != parsed.Hostname() {
		t.Errorf("expected hostname fallback title %q, got %q", parsed.Hostname(), outcome.defaultTitle)
	}
	if outcome.metadataJSON != "" {
		t.Errorf("expected no metadata on failed fetch, got %q", outcome.metadataJSON)
	}
}

// probe 必须真正应用 ingestBudget：挂起的服务器应在预算内返回 available=false。
// 若删除 probe 的 context.WithTimeout，本测试会退化为等满 fetcher 客户端超时而失败。
func TestProbeURLRespectsIngestBudget(t *testing.T) {
	origBudget := ingestBudget
	ingestBudget = 100 * time.Millisecond
	t.Cleanup(func() { ingestBudget = origBudget })

	ing := &ingestion{fetcher: remote.NewFetcher()}

	hanging := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
	start := time.Now()
	outcome := ing.probe(context.Background(), location, storage.SourceTypeURL)
	elapsed := time.Since(start)
	if outcome.available {
		t.Errorf("expected hanging server to be unavailable, got %+v", outcome)
	}
	if elapsed > 5*time.Second {
		t.Fatalf("probe took %v; ingest budget was not applied to the fetch", elapsed)
	}
}

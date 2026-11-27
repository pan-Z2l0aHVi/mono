package updater

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
)

func TestParseChecksumForFile(t *testing.T) {
	digestA := strings.Repeat("a", 64)
	digestB := strings.Repeat("b", 64)
	content := fmt.Sprintf("%s  ./interweave-0.4.0-macos-arm64.dmg\r\n%s *interweave-0.4.0-windows-x64.exe\r\n", digestA, digestB)

	got, err := ParseChecksumForFile(content, "interweave-0.4.0-macos-arm64.dmg")
	if err != nil || got != digestA {
		t.Fatalf("got (%q, %v), want (%q, nil)", got, err, digestA)
	}
	got, err = ParseChecksumForFile(content, "interweave-0.4.0-windows-x64.exe")
	if err != nil || got != digestB {
		t.Fatalf("got (%q, %v), want (%q, nil)", got, err, digestB)
	}
	if _, err := ParseChecksumForFile(content, "missing.dmg"); err == nil {
		t.Fatal("expected error for missing file")
	}
	dup := fmt.Sprintf("%s  interweave-0.4.0-macos-arm64.dmg\n%s  ./interweave-0.4.0-macos-arm64.dmg\n", digestA, digestB)
	if _, err := ParseChecksumForFile(dup, "interweave-0.4.0-macos-arm64.dmg"); err == nil {
		t.Fatal("expected error for duplicate entries")
	}
	if _, err := ParseChecksumForFile("not-a-valid-line", "interweave-0.4.0-macos-arm64.dmg"); err == nil {
		t.Fatal("expected error for malformed line")
	}
}

func TestIsAllowedURLProduction(t *testing.T) {
	c := NewReleaseClient(ReleaseClientOptions{GOOS: "darwin", GOARCH: "arm64"})
	allowed := []string{
		"https://api.github.com/repos/pan-Z2l0aHVi/mono/releases",
		"https://github.com/pan-Z2l0aHVi/mono/releases/download/interweave-v0.4.0/interweave-0.4.0-macos-arm64.dmg",
		"https://objects.githubusercontent.com/github-production-release-asset/123",
	}
	for _, raw := range allowed {
		u, _ := url.Parse(raw)
		if !c.isAllowedURL(u) {
			t.Fatalf("expected %s to be allowed", raw)
		}
	}

	blocked := []string{
		"http://github.com/foo",
		"https://evilgithubusercontent.com/payload.exe",
		"https://example.com/interweave.dmg",
		"https://github.com.evil.com/foo",
	}
	for _, raw := range blocked {
		u, _ := url.Parse(raw)
		if c.isAllowedURL(u) {
			t.Fatalf("expected %s to be blocked", raw)
		}
	}
}

func TestFetchLatestStablePaginationAndETagCache(t *testing.T) {
	var page1Hits atomic.Int32
	var srv *httptest.Server
	srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Query().Get("page") {
		case "", "1":
			page1Hits.Add(1)
			if r.Header.Get("If-None-Match") == `"etag-v1"` {
				w.WriteHeader(http.StatusNotModified)
				return
			}
			w.Header().Set("ETag", `"etag-v1"`)
			w.Header().Set("Link", fmt.Sprintf(`<%s/repos/pan-Z2l0aHVi/mono/releases?per_page=100&page=2>; rel="next"`, srv.URL))
			// 第 1 页全是 npm release 与 prerelease 噪音
			_ = json.NewEncoder(w).Encode([]githubReleaseDTO{
				{TagName: "@greypan/web-ui@0.9.0"},
				{TagName: "interweave-v0.5.0-beta.1", Prerelease: true},
				{TagName: "interweave-v0.6.0", Draft: true},
			})
		case "2":
			_ = json.NewEncoder(w).Encode([]githubReleaseDTO{
				{
					TagName: "interweave-v0.4.0",
					HTMLURL: srv.URL + "/releases/tag/interweave-v0.4.0",
					Body:    "## 更新\n- 支持检查更新",
					Assets: []githubAssetDTO{
						{Name: "interweave-0.4.0-macos-arm64.dmg", BrowserDownloadURL: srv.URL + "/dmg", Size: 1024},
						{Name: "checksums.txt", BrowserDownloadURL: srv.URL + "/checksums", Size: 128},
					},
				},
				{
					TagName: "interweave-v0.3.1",
					HTMLURL: srv.URL + "/releases/tag/interweave-v0.3.1",
				},
			})
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer srv.Close()

	cacheDir := t.TempDir()
	client := NewReleaseClient(ReleaseClientOptions{
		APIBaseURL:      srv.URL,
		GOOS:            "darwin",
		GOARCH:          "arm64",
		CacheDir:        cacheDir,
		AllowCustomHost: true,
	})

	info, err := client.FetchLatestStable(context.Background())
	if err != nil {
		t.Fatalf("FetchLatestStable failed: %v", err)
	}
	if info.Version.String() != "0.4.0" {
		t.Fatalf("expected version 0.4.0, got %s", info.Version)
	}

	// 新建实例模拟跨重启，验证持久化 ETag + 快照命中 304 后仍能返回完整 ReleaseInfo。
	client2 := NewReleaseClient(ReleaseClientOptions{
		APIBaseURL:      srv.URL,
		GOOS:            "darwin",
		GOARCH:          "arm64",
		CacheDir:        cacheDir,
		AllowCustomHost: true,
	})
	info2, err := client2.FetchLatestStable(context.Background())
	if err != nil {
		t.Fatalf("second FetchLatestStable (304) failed: %v", err)
	}
	if info2.Version.String() != "0.4.0" || info2.AssetName != "interweave-0.4.0-macos-arm64.dmg" {
		t.Fatalf("unexpected cached release info: %+v", info2)
	}
	if page1Hits.Load() != 2 {
		t.Fatalf("expected 2 requests to page 1, got %d", page1Hits.Load())
	}
}

func TestFetchLatestStableNoMatchAndRateLimit(t *testing.T) {
	noMatchSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode([]githubReleaseDTO{{TagName: "@greypan/js-kit@1.0.0"}})
	}))
	defer noMatchSrv.Close()

	client := NewReleaseClient(ReleaseClientOptions{
		APIBaseURL:      noMatchSrv.URL,
		GOOS:            "windows",
		GOARCH:          "amd64",
		AllowCustomHost: true,
	})
	if _, err := client.FetchLatestStable(context.Background()); !errors.Is(err, ErrNoReleaseFound) {
		t.Fatalf("expected ErrNoReleaseFound, got %v", err)
	}

	rateLimitSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer rateLimitSrv.Close()

	client2 := NewReleaseClient(ReleaseClientOptions{
		APIBaseURL:      rateLimitSrv.URL,
		GOOS:            "windows",
		GOARCH:          "amd64",
		AllowCustomHost: true,
	})
	if _, err := client2.FetchLatestStable(context.Background()); !errors.Is(err, ErrRateLimited) {
		t.Fatalf("expected ErrRateLimited, got %v", err)
	}
}

func TestDownloadAndVerifySuccessAndMismatch(t *testing.T) {
	payload := []byte("interweave-binary-payload-v0.4.0")
	sum := sha256.Sum256(payload)
	sumHex := hex.EncodeToString(sum[:])

	var badChecksum atomic.Bool
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/checksums.txt":
			digest := sumHex
			if badChecksum.Load() {
				digest = strings.Repeat("0", 64)
			}
			_, _ = fmt.Fprintf(w, "%s  interweave-0.4.0-windows-x64.exe\n", digest)
		case "/asset.exe":
			_, _ = w.Write(payload)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer srv.Close()

	client := NewReleaseClient(ReleaseClientOptions{
		GOOS:            "windows",
		GOARCH:          "amd64",
		AllowCustomHost: true,
		DiskSpace:       func(string) (uint64, error) { return 1 << 30, nil },
	})
	info := &ReleaseInfo{
		Version:      SemVer{0, 4, 0},
		TagName:      "interweave-v0.4.0",
		AssetName:    "interweave-0.4.0-windows-x64.exe",
		AssetURL:     srv.URL + "/asset.exe",
		AssetSize:    int64(len(payload)),
		ChecksumsURL: srv.URL + "/checksums.txt",
	}

	sessionDir := filepath.Join(t.TempDir(), "session-1")
	var progressCalled bool
	gotPath, gotHash, err := client.DownloadAndVerify(context.Background(), info, sessionDir, func(p DownloadProgress) {
		if p.Downloaded > 0 {
			progressCalled = true
		}
	})
	if err != nil {
		t.Fatalf("DownloadAndVerify failed: %v", err)
	}
	if !progressCalled || gotHash != sumHex {
		t.Fatalf("progressCalled=%v gotHash=%q want %q", progressCalled, gotHash, sumHex)
	}
	if _, err := os.Stat(gotPath); err != nil {
		t.Fatalf("downloaded file missing: %v", err)
	}

	// 校验不匹配时必须报错且清理落盘文件。
	badChecksum.Store(true)
	sessionDir2 := filepath.Join(t.TempDir(), "session-2")
	if _, _, err := client.DownloadAndVerify(context.Background(), info, sessionDir2, nil); err == nil {
		t.Fatal("expected sha256 mismatch error")
	}
	if _, err := os.Stat(filepath.Join(sessionDir2, info.AssetName)); !os.IsNotExist(err) {
		t.Fatalf("expected corrupted file to be removed, stat err=%v", err)
	}
}

func TestCleanAndTruncateReleaseNotes(t *testing.T) {
	raw := "## 新特性\n- 支持 [检查更新](https://example.com) 与 `SHA-256` **校验**\n- 第二条\n- 第三条\n- 第四条\n- 第五条\n- 第六条\n- 第七条"
	clean := CleanReleaseNotes(raw)
	if strings.Contains(clean, "##") || strings.Contains(clean, "**") || strings.Contains(clean, "https://") {
		t.Fatalf("expected markdown stripped, got:\n%s", clean)
	}
	trunc, isTrunc := TruncateReleaseNotes(clean, 6, 300)
	if !isTrunc || !strings.HasSuffix(trunc, "…") {
		t.Fatalf("expected truncated text ending with ellipsis, got (%q, %v)", trunc, isTrunc)
	}
}

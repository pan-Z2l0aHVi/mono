package media

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/jpeg"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

type localTestSourceStore map[string]storage.SourceModel

func (s localTestSourceStore) Get(_ context.Context, _ storage.Queryer, id string) (storage.SourceModel, error) {
	model, ok := s[id]
	if !ok {
		return storage.SourceModel{}, os.ErrNotExist
	}
	return model, nil
}

func encodeTestJPEG(t *testing.T, w, h int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.SetRGBA(x, y, color.RGBA{R: 120, G: 180, B: 220, A: 255})
		}
	}
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 82}); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestLocalServerTokenAndCORS(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		_, _ = w.Write([]byte("ok:" + r.URL.Path))
	})

	srv, err := NewLocalServer(LocalServerOptions{
		Handler:      inner,
		IsProduction: true,
	})
	if err != nil {
		t.Fatalf("NewLocalServer failed: %v", err)
	}
	defer srv.Close()

	client := &http.Client{Timeout: 3 * time.Second}

	// 1. Valid token + allowed production Origin
	req, _ := http.NewRequest(http.MethodGet, srv.URLBuilder().SourceMediaURL("src-1"), nil)
	req.Header.Set("Origin", "http://wails.localhost")
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("valid GET failed: %v", err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	if string(body) != "ok:/resource-media/src-1" {
		t.Fatalf("unexpected body: %q", string(body))
	}
	if got := resp.Header.Get("Access-Control-Allow-Origin"); got != "http://wails.localhost" {
		t.Fatalf("unexpected Access-Control-Allow-Origin: %q", got)
	}
	if got := resp.Header.Get("Vary"); got != "Origin" {
		t.Fatalf("expected Vary: Origin, got %q", got)
	}

	// 2. Invalid token -> 404 (still with Vary: Origin)
	badTokenURL := strings.Replace(srv.URLBuilder().SourceMediaURL("src-1"), srv.sessionToken, strings.Repeat("0", len(srv.sessionToken)), 1)
	resp, err = client.Get(badTokenURL)
	if err != nil {
		t.Fatalf("invalid token GET failed: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 for invalid token, got %d", resp.StatusCode)
	}
	if got := resp.Header.Get("Vary"); got != "Origin" {
		t.Fatalf("expected Vary: Origin on 404, got %q", got)
	}

	// 3. Disallowed origins in production (including port bypass and prefix bypass) -> 403
	for _, badOrigin := range []string{
		"http://wails.localhost:8080",
		"http://localhost:5173",
		"http://localhost:80.attacker.com",
		"https://evil.example",
		"null",
	} {
		req, _ := http.NewRequest(http.MethodGet, srv.URLBuilder().SourceMediaURL("src-1"), nil)
		req.Header.Set("Origin", badOrigin)
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("origin %q request failed: %v", badOrigin, err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusForbidden {
			t.Fatalf("expected 403 for origin %q, got %d", badOrigin, resp.StatusCode)
		}
		if got := resp.Header.Get("Vary"); got != "Origin" {
			t.Fatalf("expected Vary: Origin on 403, got %q", got)
		}
	}

	// 4. OPTIONS preflight with PNA header
	req, _ = http.NewRequest(http.MethodOptions, srv.URLBuilder().SourceThumbnailURL("src-1"), nil)
	req.Header.Set("Origin", "http://wails.localhost")
	req.Header.Set("Access-Control-Request-Private-Network", "true")
	resp, err = client.Do(req)
	if err != nil {
		t.Fatalf("OPTIONS failed: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204 on OPTIONS, got %d", resp.StatusCode)
	}
	if got := resp.Header.Get("Access-Control-Allow-Private-Network"); got != "true" {
		t.Fatalf("expected PNA header true, got %q", got)
	}
	if got := resp.Header.Get("Access-Control-Max-Age"); got != "600" {
		t.Fatalf("expected Max-Age 600, got %q", got)
	}
	if !strings.Contains(resp.Header.Get("Access-Control-Allow-Headers"), "If-Range") {
		t.Fatalf("expected If-Range in Access-Control-Allow-Headers, got %q", resp.Header.Get("Access-Control-Allow-Headers"))
	}

	// 5. RedactURL strips sessionToken
	redacted := srv.RedactURL(srv.URLBuilder().SourceMediaURL("src-1"))
	if strings.Contains(redacted, srv.sessionToken) || !strings.Contains(redacted, "/s/[redacted]/") {
		t.Fatalf("expected redacted URL, got %q", redacted)
	}
}

func TestLocalServerDevOrigins(t *testing.T) {
	srv, err := NewLocalServer(LocalServerOptions{
		Handler:      http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) }),
		IsProduction: false,
	})
	if err != nil {
		t.Fatalf("NewLocalServer failed: %v", err)
	}
	defer srv.Close()

	client := &http.Client{Timeout: 3 * time.Second}
	for _, allowed := range []string{"http://localhost:5173", "http://127.0.0.1:4173", "http://wails.localhost"} {
		req, _ := http.NewRequest(http.MethodGet, srv.URLBuilder().SourceMediaURL("src-1"), nil)
		req.Header.Set("Origin", allowed)
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("dev origin %q failed: %v", allowed, err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 for dev origin %q, got %d", allowed, resp.StatusCode)
		}
	}

	// Prefix spoofing still blocked in dev mode
	req, _ := http.NewRequest(http.MethodGet, srv.URLBuilder().SourceMediaURL("src-1"), nil)
	req.Header.Set("Origin", "http://localhost:80.attacker.com")
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("spoofed origin request failed: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 for spoofed dev origin, got %d", resp.StatusCode)
	}
}

func TestLocalServerRangeAndThumbnail304(t *testing.T) {
	dir := t.TempDir()
	videoPath := filepath.Join(dir, "sample.mp4")
	payload := bytes.Repeat([]byte("0123456789abcdef"), 1024) // 16 KiB
	if err := os.WriteFile(videoPath, payload, 0o600); err != nil {
		t.Fatal(err)
	}
	thumbDir := filepath.Join(dir, "thumbs")
	thumbs, err := NewThumbnailStore(thumbDir)
	if err != nil {
		t.Fatal(err)
	}
	sources := localTestSourceStore{
		"vid-1": {ID: "vid-1", Type: storage.SourceTypeFile, Location: videoPath, Available: true},
	}
	handler := NewHandler(sources, nil, NewPendingPreviewRegistry(), thumbs, nil)
	defer handler.Close()

	srv, err := NewLocalServer(LocalServerOptions{
		Handler:      handler,
		IsProduction: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	defer srv.Close()

	client := &http.Client{Timeout: 3 * time.Second}

	// Range 206 Partial Content
	req, _ := http.NewRequest(http.MethodGet, srv.URLBuilder().SourceMediaURL("vid-1"), nil)
	req.Header.Set("Range", "bytes=0-15")
	resp, err := client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	chunk, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if resp.StatusCode != http.StatusPartialContent {
		t.Fatalf("expected 206, got %d", resp.StatusCode)
	}
	if string(chunk) != "0123456789abcdef" {
		t.Fatalf("unexpected range chunk: %q", string(chunk))
	}

	// Thumbnail POST + GET + 304 Not Modified via ETag
	jpegBytes := encodeTestJPEG(t, 16, 16)
	postReq, _ := http.NewRequest(http.MethodPost, srv.URLBuilder().SourceThumbnailURL("vid-1"), bytes.NewReader(jpegBytes))
	postReq.Header.Set("Content-Type", "image/jpeg")
	postResp, err := client.Do(postReq)
	if err != nil {
		t.Fatal(err)
	}
	postResp.Body.Close()
	if postResp.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204 on thumbnail POST, got %d", postResp.StatusCode)
	}

	getResp, err := client.Get(srv.URLBuilder().SourceThumbnailURL("vid-1"))
	if err != nil {
		t.Fatal(err)
	}
	_, _ = io.ReadAll(getResp.Body)
	getResp.Body.Close()
	etag := getResp.Header.Get("ETag")
	if getResp.StatusCode != http.StatusOK || etag == "" {
		t.Fatalf("expected 200 with ETag, got %d etag=%q", getResp.StatusCode, etag)
	}

	condReq, _ := http.NewRequest(http.MethodGet, srv.URLBuilder().SourceThumbnailURL("vid-1"), nil)
	condReq.Header.Set("If-None-Match", etag)
	condResp, err := client.Do(condReq)
	if err != nil {
		t.Fatal(err)
	}
	condResp.Body.Close()
	if condResp.StatusCode != http.StatusNotModified {
		t.Fatalf("expected 304 Not Modified, got %d", condResp.StatusCode)
	}
}

func TestLocalServerCloseDrainsStreamingHandlerWithoutHang(t *testing.T) {
	entered := make(chan struct{})
	exited := make(chan struct{})
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		close(entered)
		defer close(exited)
		<-r.Context().Done()
	})

	srv, err := NewLocalServer(LocalServerOptions{
		Handler:      inner,
		IsProduction: true,
	})
	if err != nil {
		t.Fatal(err)
	}

	reqCtx, cancelReq := context.WithCancel(context.Background())
	defer cancelReq()
	go func() {
		req, _ := http.NewRequestWithContext(reqCtx, http.MethodGet, srv.URLBuilder().SourceMediaURL("stream-1"), nil)
		resp, err := (&http.Client{}).Do(req)
		if err == nil {
			resp.Body.Close()
		}
	}()

	<-entered
	start := time.Now()
	srv.Close()
	elapsed := time.Since(start)
	if elapsed > 2*time.Second {
		t.Fatalf("Close took too long: %s", elapsed)
	}
	select {
	case <-exited:
	case <-time.After(time.Second):
		t.Fatal("streaming handler did not exit on server Close")
	}
}

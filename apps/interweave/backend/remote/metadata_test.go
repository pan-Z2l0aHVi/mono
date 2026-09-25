package remote_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

func TestFetcher_FetchURL_SuccessHTML(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Example Page Title</title>
				<meta property="og:site_name" content="ExampleSite">
				<meta name="description" content="A great test description">
				<link rel="icon" href="/favicon.ico">
			</head>
			<body><h1>Hello</h1></body>
			</html>
		`))
	}))
	defer ts.Close()

	fetcher := remote.NewFetcher()
	meta, reachability, err := fetcher.FetchURL(context.Background(), ts.URL)
	if err != nil {
		t.Fatalf("FetchURL error = %v", err)
	}
	if reachability != remote.ReachabilityAvailable {
		t.Fatalf("expected ReachabilityAvailable, got %v", reachability)
	}
	if meta.Title != "Example Page Title" {
		t.Errorf("expected Title = 'Example Page Title', got %q", meta.Title)
	}
	if meta.SiteName != "ExampleSite" {
		t.Errorf("expected SiteName = 'ExampleSite', got %q", meta.SiteName)
	}
	if meta.Description != "A great test description" {
		t.Errorf("expected Description = 'A great test description', got %q", meta.Description)
	}
	if meta.FaviconURL != ts.URL+"/favicon.ico" {
		t.Errorf("expected FaviconURL = %q, got %q", ts.URL+"/favicon.ico", meta.FaviconURL)
	}
}

func TestFetcher_FetchURL_NonHTML(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"hello": "world"}`))
	}))
	defer ts.Close()

	fetcher := remote.NewFetcher()
	meta, reachability, err := fetcher.FetchURL(context.Background(), ts.URL)
	if err != nil {
		t.Fatalf("FetchURL error = %v", err)
	}
	if reachability != remote.ReachabilityAvailable {
		t.Fatalf("expected available = true for JSON response")
	}
	if meta.Title != "" {
		t.Errorf("expected empty title for JSON, got %q", meta.Title)
	}
}

func TestFetcher_FetchURL_TimeoutOrError(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()

	fetcher := remote.NewFetcher()
	_, reachability, err := fetcher.FetchURL(ctx, ts.URL)
	if reachability != remote.ReachabilityUnknown {
		t.Errorf("expected ReachabilityUnknown on timeout/cancellation, got %v", reachability)
	}
	if err == nil {
		t.Errorf("expected error on timeout")
	}
}

// 服务端明确拒绝与本次无法判定必须可区分：前者可以落库为失效，
// 后者不能，否则断网会把整片 URL 资源误标为失效。
func TestFetcher_FetchURL_ServerRejectionIsUnavailable(t *testing.T) {
	for _, status := range []int{http.StatusNotFound, http.StatusInternalServerError} {
		t.Run(http.StatusText(status), func(t *testing.T) {
			ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(status)
			}))
			defer ts.Close()

			_, reachability, err := remote.NewFetcher().FetchURL(context.Background(), ts.URL)
			if err != nil {
				t.Fatalf("FetchURL error = %v", err)
			}
			if reachability != remote.ReachabilityUnavailable {
				t.Fatalf("expected ReachabilityUnavailable for %d, got %v", status, reachability)
			}
		})
	}
}

func TestFetcher_FetchURL_ClosedServerIsUnknown(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	target := ts.URL
	ts.Close()

	_, reachability, err := remote.NewFetcher().FetchURL(context.Background(), target)
	if err == nil {
		t.Errorf("expected transport error after server close")
	}
	if reachability != remote.ReachabilityUnknown {
		t.Fatalf("expected ReachabilityUnknown after server close, got %v", reachability)
	}
}

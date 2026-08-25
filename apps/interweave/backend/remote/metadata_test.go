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
	meta, available, err := fetcher.FetchURL(context.Background(), ts.URL)
	if err != nil {
		t.Fatalf("FetchURL error = %v", err)
	}
	if !available {
		t.Fatalf("expected available = true, got false")
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
	meta, available, err := fetcher.FetchURL(context.Background(), ts.URL)
	if err != nil {
		t.Fatalf("FetchURL error = %v", err)
	}
	if !available {
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
	_, available, err := fetcher.FetchURL(ctx, ts.URL)
	if available {
		t.Errorf("expected available = false on timeout/cancellation")
	}
	if err == nil {
		t.Errorf("expected error on timeout")
	}
}

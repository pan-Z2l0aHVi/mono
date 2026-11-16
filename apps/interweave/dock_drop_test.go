package main

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

type spyDockDropSink struct {
	files     [][]string
	urls      [][]string
	presented int
}

func (s *spyDockDropSink) EmitFiles(paths []string) {
	s.files = append(s.files, paths)
}

func (s *spyDockDropSink) EmitURLs(urls []string) {
	s.urls = append(s.urls, urls)
}

func (s *spyDockDropSink) PresentWindow() {
	s.presented++
}

func TestDockDropDispatcherBuffersUntilReadyAndSplitsShortcuts(t *testing.T) {
	dir := t.TempDir()
	webloc := filepath.Join(dir, "example.webloc")
	if err := os.WriteFile(webloc, []byte(`<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
	<key>URL</key>
	<string>https://example.com/article</string>
</dict>
</plist>`), 0o644); err != nil {
		t.Fatal(err)
	}
	urlShortcut := filepath.Join(dir, "site.url")
	if err := os.WriteFile(urlShortcut, []byte("[InternetShortcut]\r\nURL=https://example.org/docs\r\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	sink := &spyDockDropSink{}
	dispatcher := newDockDropDispatcher(sink)

	dispatcher.HandleOpenedFiles([]string{"/tmp/photo.png", webloc, "/tmp/photo.png", " "})
	dispatcher.HandleLaunchedURL("https://example.org/docs")
	dispatcher.HandleOpenedFiles([]string{urlShortcut})
	dispatcher.HandleLaunchedURL("javascript:alert(1)")

	if len(sink.files) != 0 || len(sink.urls) != 0 || sink.presented != 0 {
		t.Fatalf("expected events to buffer until ready, got files=%v urls=%v presented=%d", sink.files, sink.urls, sink.presented)
	}

	dispatcher.MarkReady()

	wantFiles := [][]string{{"/tmp/photo.png"}}
	wantURLs := [][]string{{"https://example.com/article", "https://example.org/docs"}}
	if !reflect.DeepEqual(sink.files, wantFiles) {
		t.Fatalf("expected files %v, got %v", wantFiles, sink.files)
	}
	if !reflect.DeepEqual(sink.urls, wantURLs) {
		t.Fatalf("expected urls %v, got %v", wantURLs, sink.urls)
	}
	if sink.presented != 1 {
		t.Fatalf("expected window presented once on flush, got %d", sink.presented)
	}

	dispatcher.HandleOpenedFiles([]string{"/tmp/video.mp4"})
	if len(sink.files) != 2 || sink.presented != 2 {
		t.Fatalf("expected immediate dispatch after ready, got files=%v presented=%d", sink.files, sink.presented)
	}
}

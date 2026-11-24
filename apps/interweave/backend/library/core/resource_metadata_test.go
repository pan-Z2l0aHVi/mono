package core

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

func TestResourceViewMetadataUsesPreferredSource(t *testing.T) {
	dir := t.TempDir()
	filePath := filepath.Join(dir, "asset.JSON")
	if err := os.WriteFile(filePath, []byte("12345"), 0o644); err != nil {
		t.Fatalf("failed to write fixture: %v", err)
	}

	kind, size := resourceViewMetadata([]Source{
		{
			Type:        storage.SourceTypeFile,
			Location:    "/not-used.txt",
			Available:   false,
			IsPreferred: false,
		},
		{
			Type:        storage.SourceTypeFile,
			Location:    filePath,
			Available:   true,
			IsPreferred: true,
		},
	})
	if kind != storage.ResourceKindJSON {
		t.Fatalf("expected preferred file kind %q, got %q", storage.ResourceKindJSON, kind)
	}
	if size == nil || *size != 5 {
		t.Fatalf("expected preferred file size 5, got %v", size)
	}

	kind, size = resourceViewMetadata([]Source{
		{
			Type:        storage.SourceTypeURL,
			Location:    "https://example.com/asset.json",
			IsPreferred: true,
		},
		{
			Type:        storage.SourceTypeFile,
			Location:    filePath,
			IsPreferred: false,
		},
	})
	// URL 来源也按展示词表分类：直链 .json 归 JSON（直链图片同理归 image），无 size；
	// 只有页面链接才保持 web。
	if kind != storage.ResourceKindJSON || size != nil {
		t.Fatalf("expected URL source to be json without size, got kind=%q size=%v", kind, size)
	}
}

func TestResourceViewMetadataUsesFileFallbackAndZeroSize(t *testing.T) {
	dir := t.TempDir()
	filePath := filepath.Join(dir, "archive.unknown")
	if err := os.WriteFile(filePath, nil, 0o644); err != nil {
		t.Fatalf("failed to write fixture: %v", err)
	}

	kind, size := resourceViewMetadata([]Source{{
		Type:        storage.SourceTypeFile,
		Location:    filePath,
		Available:   true,
		IsPreferred: true,
	}})
	if kind != storage.ResourceKindFile {
		t.Fatalf("expected unknown extension kind %q, got %q", storage.ResourceKindFile, kind)
	}
	if size == nil || *size != 0 {
		t.Fatalf("expected a present zero-byte size pointer, got %v", size)
	}

	kind, size = resourceViewMetadata([]Source{{
		Type:        storage.SourceTypeFile,
		Location:    filepath.Join(dir, "missing.json"),
		IsPreferred: true,
	}})
	if kind != storage.ResourceKindJSON || size != nil {
		t.Fatalf("expected missing JSON file to keep kind without size, got kind=%q size=%v", kind, size)
	}

	kind, size = resourceViewMetadata([]Source{{
		Type:        storage.SourceTypeFile,
		Location:    filePath,
		Available:   false,
		IsPreferred: true,
	}})
	if kind != storage.ResourceKindFile || size != nil {
		t.Fatalf("expected unavailable file to keep kind without size, got kind=%q size=%v", kind, size)
	}
}

func TestResourceKindClosedSet(t *testing.T) {
	want := []struct {
		kind storage.ResourceKind
		text string
	}{
		{kind: storage.ResourceKindImage, text: "image"},
		{kind: storage.ResourceKindVideo, text: "video"},
		{kind: storage.ResourceKindAudio, text: "audio"},
		{kind: storage.ResourceKindDocument, text: "document"},
		{kind: storage.ResourceKindWeb, text: "web"},
		{kind: storage.ResourceKindJSON, text: "json"},
		{kind: storage.ResourceKindFile, text: "file"},
	}

	seen := make(map[storage.ResourceKind]struct{}, len(want))
	for _, expected := range want {
		if got := string(expected.kind); got != expected.text {
			t.Errorf("expected ResourceKind constant %q, got %q", expected.text, got)
		}
		if _, exists := seen[expected.kind]; exists {
			t.Errorf("duplicate ResourceKind value %q", expected.kind)
		}
		seen[expected.kind] = struct{}{}
	}

	if len(seen) != 7 {
		t.Fatalf("expected closed ResourceKind set of 7 values, got %d", len(seen))
	}
}

func TestResourceKindForFileRepresentatives(t *testing.T) {
	tests := map[string]storage.ResourceKind{
		"photo.JPG":   storage.ResourceKindImage,
		"clip.MP4":    storage.ResourceKindVideo,
		"track.MP3":   storage.ResourceKindAudio,
		"paper.pdf":   storage.ResourceKindDocument,
		"data.json":   storage.ResourceKindJSON,
		"archive.bin": storage.ResourceKindFile,
	}
	for location, want := range tests {
		if got := resourceKindForFile(location); got != want {
			t.Errorf("resourceKindForFile(%q) = %q, want %q", location, got, want)
		}
	}
}

func TestResourceKindForURLDirectImage(t *testing.T) {
	t.Run("扩展名优先", func(t *testing.T) {
		source := &Source{Type: storage.SourceTypeURL, Location: "https://w.wallhaven.cc/full/gw/wallhaven-gwvvw7.png?x=1"}
		if kind := resourceKindForURL(source); kind != storage.ResourceKindImage {
			t.Fatalf("expected image, got %s", kind)
		}
	})

	t.Run("Content-Type 兜底", func(t *testing.T) {
		source := &Source{
			Type:         storage.SourceTypeURL,
			Location:     "https://example.com/blob/1234",
			MetadataJSON: `{"content_type":"image/png"}`,
		}
		if kind := resourceKindForURL(source); kind != storage.ResourceKindImage {
			t.Fatalf("expected image, got %s", kind)
		}
	})

	t.Run("页面链接保持 web", func(t *testing.T) {
		source := &Source{
			Type:         storage.SourceTypeURL,
			Location:     "https://example.com/gallery",
			MetadataJSON: `{"content_type":"text/html"}`,
		}
		if kind := resourceKindForURL(source); kind != storage.ResourceKindWeb {
			t.Fatalf("expected web, got %s", kind)
		}
	})

	t.Run("元数据缺失保持 web", func(t *testing.T) {
		source := &Source{Type: storage.SourceTypeURL, Location: "https://example.com/blob/1234"}
		if kind := resourceKindForURL(source); kind != storage.ResourceKindWeb {
			t.Fatalf("expected web, got %s", kind)
		}
	})

	t.Run("展示层 kind 跟随首选来源", func(t *testing.T) {
		kind, _ := resourceViewMetadata([]Source{
			{Type: storage.SourceTypeFile, Location: "/tmp/note.md"},
			{Type: storage.SourceTypeURL, Location: "https://example.com/pic.png", IsPreferred: true},
		})
		if kind != storage.ResourceKindImage {
			t.Fatalf("expected image from preferred URL, got %s", kind)
		}
	})
}

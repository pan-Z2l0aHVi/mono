package service

// cspell:ignore xfconf

import (
	"context"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWallpaperCommandGroupsFor(t *testing.T) {
	t.Run("GNOME 写浅色与深色两键", func(t *testing.T) {
		groups := wallpaperCommandGroupsFor("GNOME", "file:///tmp/w.png")
		if len(groups) != 2 {
			t.Fatalf("expected 2 commands, got %v", groups)
		}
		if groups[0][2] != "org.gnome.desktop.background" || groups[0][3] != "picture-uri" {
			t.Fatalf("unexpected first command: %v", groups[0])
		}
		if groups[1][3] != "picture-uri-dark" {
			t.Fatalf("unexpected dark command: %v", groups[1])
		}
	})

	t.Run("KDE 脚本写原始 URI 不重复前缀", func(t *testing.T) {
		groups := wallpaperCommandGroupsFor("KDE", "file:///tmp/w.png")
		script := groups[0][len(groups[0])-1]
		if strings.Count(script, "file://") != 1 {
			t.Fatalf("script should reference the URI exactly once: %s", script)
		}
		if !strings.Contains(script, "for (var i = 0;") {
			t.Fatalf("script loop variable must not shadow: %s", script)
		}
	})

	t.Run("未知桌面无命令", func(t *testing.T) {
		if groups := wallpaperCommandGroupsFor("LXQT", "file:///tmp/w.png"); groups != nil {
			t.Fatalf("expected nil, got %v", groups)
		}
	})
}

func TestXfceWallpaperProps(t *testing.T) {
	output := "" +
		"/backdrop/screen0/monitor0/workspace0/color-style: 0\n" +
		"/backdrop/screen0/monitorDP-1/workspace0/last-image:  /home/u/old.png\n" +
		"/backdrop/screen0/monitor0/workspace0/image-path: /home/u/a.jpg\n" +
		"/single-workspace-mode: false\n"
	props := xfceWallpaperProps(output)
	if len(props) != 2 {
		t.Fatalf("expected 2 props, got %v", props)
	}
	if props[0] != "/backdrop/screen0/monitorDP-1/workspace0/last-image" || props[1] != "/backdrop/screen0/monitor0/workspace0/image-path" {
		t.Fatalf("unexpected props: %v", props)
	}
	if command := xfceSetCommandFor(props[1], "/tmp/w.png"); strings.Join(command, " ") != "xfconf-query -c xfce4-desktop -p /backdrop/screen0/monitor0/workspace0/image-path -s /tmp/w.png" {
		t.Fatalf("unexpected set command: %v", command)
	}
}

func TestWallpaperCacheName(t *testing.T) {
	name := wallpaperCacheName("https://example.com/pic/Photo.PNG?v=2")
	if !strings.HasSuffix(name, ".png") {
		t.Fatalf("extension should be normalized to lowercase suffix, got %q", name)
	}
	if strings.Contains(name, "/") || strings.Contains(name, "?") {
		t.Fatalf("name must be a flat filename: %q", name)
	}
	other := wallpaperCacheName("https://example.com/pic/other.png")
	if other == name {
		t.Fatalf("different locations must map to different cache names")
	}
	if weird := wallpaperCacheName("https://example.com/pic/exit<br>.png"); !strings.HasSuffix(weird, ".png") {
		t.Fatalf("hostile extension must fall back to .png, got %q", weird)
	}
}

func TestSetWallpaperLocalGuards(t *testing.T) {
	service := NewOSService()
	if err := service.SetWallpaper(context.Background(), "  ", true); err == nil {
		t.Fatalf("expected error for empty location")
	}
	if err := service.SetWallpaper(context.Background(), "/definitely/missing/file.png", false); err == nil || !strings.Contains(err.Error(), "unreadable") {
		t.Fatalf("expected unreadable error, got %v", err)
	}
}

func TestDownloadWallpaperRequiresFetcher(t *testing.T) {
	service := NewOSService()
	if _, err := service.downloadWallpaper(context.Background(), "https://example.com/a.png"); err == nil {
		t.Fatalf("expected error without stream fetcher")
	}
	withDir := NewOSService(WithWallpaperCacheDir(t.TempDir()))
	if _, err := withDir.downloadWallpaper(context.Background(), "https://example.com/a.png"); err == nil || !strings.Contains(err.Error(), "downloader") {
		t.Fatalf("expected downloader error, got %v", err)
	}
}

func TestDownloadWallpaperCachesAndReuses(t *testing.T) {
	dir := t.TempDir()
	calls := 0
	fetcher := StreamFetcher(func(ctx context.Context, location string) (io.ReadCloser, error) {
		calls++
		return io.NopCloser(strings.NewReader("fake image bytes")), nil
	})
	service := NewOSService(WithStreamFetcher(fetcher), WithWallpaperCacheDir(dir))
	first, err := service.downloadWallpaper(context.Background(), "https://example.com/a.png")
	if err != nil {
		t.Fatalf("download failed: %v", err)
	}
	second, err := service.downloadWallpaper(context.Background(), "https://example.com/a.png")
	if err != nil {
		t.Fatalf("second download failed: %v", err)
	}
	if first != second || calls != 1 {
		t.Fatalf("expected cache hit (calls=%d, %q vs %q)", calls, first, second)
	}
	if _, err := os.Stat(filepath.Join(dir, wallpaperCacheName("https://example.com/a.png"))); err != nil {
		t.Fatalf("cached file missing: %v", err)
	}
}

func TestFileURIFromPath(t *testing.T) {
	if got := fileURIFromPath("/home/u/w.png"); got != "file:///home/u/w.png" {
		t.Fatalf("unexpected URI %q", got)
	}
	if got := fileURIFromPath("file:///already/a.png"); got != "file:///already/a.png" {
		t.Fatalf("URI should pass through: %q", got)
	}
	_, err := url.Parse(fileURIFromPath("/home/u/带空格 w.png"))
	if err != nil {
		t.Fatalf("URI must parse: %v", err)
	}
}

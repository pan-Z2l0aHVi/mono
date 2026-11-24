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

func TestWallpaperPlanFor(t *testing.T) {
	t.Run("GNOME：picture-uri 必需，dark 尽力而为", func(t *testing.T) {
		plan := wallpaperPlanFor("GNOME", "file:///tmp/w.png")
		if len(plan) != 2 {
			t.Fatalf("expected 2 steps, got %v", plan)
		}
		if plan[0].kind != wallpaperStepRequired || plan[0].commands[0][3] != "picture-uri" {
			t.Fatalf("unexpected first step: %+v", plan[0])
		}
		if plan[1].kind != wallpaperStepOptional || plan[1].commands[0][3] != "picture-uri-dark" {
			t.Fatalf("unexpected optional step: %+v", plan[1])
		}
	})

	t.Run("KDE 是备选步，脚本只引用一次 URI", func(t *testing.T) {
		plan := wallpaperPlanFor("KDE", "file:///tmp/w.png")
		if plan[0].kind != wallpaperStepAlternative || len(plan[0].commands) != 2 {
			t.Fatalf("expected one alternative step with two commands: %+v", plan[0])
		}
		script := plan[0].commands[0][len(plan[0].commands[0])-1]
		if strings.Count(script, "file://") != 1 {
			t.Fatalf("script should reference the URI exactly once: %s", script)
		}
		if !strings.Contains(script, "for (var i = 0;") {
			t.Fatalf("script loop variable must not shadow: %s", script)
		}
	})

	t.Run("别名归一：ubuntu 视作 GNOME，X-Cinnamon 归 CINNAMON", func(t *testing.T) {
		if plan := wallpaperPlanFor("ubuntu", "file:///tmp/w.png"); len(plan) == 0 || plan[0].commands[0][2] != "org.gnome.desktop.background" {
			t.Fatalf("ubuntu should map to GNOME plan, got %+v", plan)
		}
		if plan := wallpaperPlanFor("X-Cinnamon", "file:///tmp/w.png"); len(plan) == 0 || plan[0].commands[0][2] != "org.cinnamon.desktop.background" {
			t.Fatalf("X-Cinnamon should map to CINNAMON plan, got %+v", plan)
		}
	})

	t.Run("未知桌面无计划（调用方不得假成功）", func(t *testing.T) {
		if plan := wallpaperPlanFor("LXQT", "file:///tmp/w.png"); plan != nil {
			t.Fatalf("expected nil, got %v", plan)
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

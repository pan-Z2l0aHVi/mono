package service

// cspell:ignore xfconf busctl qdbus gsettings

import (
	"context"
	"errors"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type fakeCommandRunner struct {
	runFn    func(ctx context.Context, name string, args ...string) error
	outputFn func(ctx context.Context, name string, args ...string) ([]byte, error)
	ran      [][]string
}

func (f *fakeCommandRunner) Run(ctx context.Context, name string, args ...string) error {
	f.ran = append(f.ran, append([]string{name}, args...))
	if f.runFn != nil {
		return f.runFn(ctx, name, args...)
	}
	return nil
}

func (f *fakeCommandRunner) Output(ctx context.Context, name string, args ...string) ([]byte, error) {
	if f.outputFn != nil {
		return f.outputFn(ctx, name, args...)
	}
	return nil, errors.New("not configured")
}

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

	t.Run("KDE 是备选步，脚本只引用一次 URI 并安全转义单引号与特殊字符", func(t *testing.T) {
		uri := "file:///home/user/O'Brien \"quote\" \\pic.png"
		plan := wallpaperPlanFor("KDE", uri)
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
		if !strings.Contains(script, `d.writeConfig('Image', "file:///home/user/O'Brien \"quote\" \\pic.png")`) {
			t.Fatalf("expected double-quoted JSON string literal in KDE script: %s", script)
		}
		if strings.Contains(script, "d.writeConfig('Image', '") {
			t.Fatalf("must not wrap image URI in single quotes: %s", script)
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

func TestLinuxWallpaperApplier(t *testing.T) {
	t.Run("GNOME required 成功且 optional 失败仍视为成功", func(t *testing.T) {
		runner := &fakeCommandRunner{
			runFn: func(_ context.Context, name string, args ...string) error {
				if name == "gsettings" && len(args) >= 4 && args[3] == "picture-uri-dark" {
					return errors.New("no dark schema")
				}
				return nil
			},
		}
		applier := newLinuxWallpaperApplier(func(string) string { return "ubuntu:GNOME" }, runner)
		if err := applier.Apply(context.Background(), "/tmp/w.png"); err != nil {
			t.Fatalf("expected GNOME apply success, got %v", err)
		}
		if len(runner.ran) != 2 {
			t.Fatalf("expected 2 gsettings calls, got %v", runner.ran)
		}
	})

	t.Run("KDE busctl 失败时回落 qdbus", func(t *testing.T) {
		runner := &fakeCommandRunner{
			runFn: func(_ context.Context, name string, _ ...string) error {
				if name == "busctl" {
					return errors.New("busctl missing")
				}
				return nil
			},
		}
		applier := newLinuxWallpaperApplier(func(string) string { return "KDE" }, runner)
		if err := applier.Apply(context.Background(), "/tmp/O'Brien.png"); err != nil {
			t.Fatalf("expected KDE fallback to qdbus to succeed, got %v", err)
		}
		if len(runner.ran) != 2 || runner.ran[0][0] != "busctl" || runner.ran[1][0] != "qdbus" {
			t.Fatalf("unexpected KDE command sequence: %v", runner.ran)
		}
	})

	t.Run("XFCE 枚举多屏属性并逐条写入", func(t *testing.T) {
		runner := &fakeCommandRunner{
			outputFn: func(context.Context, string, ...string) ([]byte, error) {
				return []byte("" +
					"/backdrop/screen0/monitor0/workspace0/image-path: /old/a.png\n" +
					"/backdrop/screen0/monitorDP-1/workspace0/last-image: /old/b.png\n"), nil
			},
		}
		applier := newLinuxWallpaperApplier(func(string) string { return "XFCE" }, runner)
		if err := applier.Apply(context.Background(), "/tmp/new.png"); err != nil {
			t.Fatalf("expected XFCE apply success, got %v", err)
		}
		if len(runner.ran) != 2 {
			t.Fatalf("expected 2 xfconf-query writes, got %v", runner.ran)
		}
	})

	t.Run("无受支持桌面时返回错误", func(t *testing.T) {
		runner := &fakeCommandRunner{}
		applier := newLinuxWallpaperApplier(func(string) string { return "LXQT" }, runner)
		if err := applier.Apply(context.Background(), "/tmp/w.png"); err == nil {
			t.Fatalf("expected error for unsupported desktop")
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

func TestSetWallpaperGuardsAndCaching(t *testing.T) {
	t.Run("空路径与缺失文件校验", func(t *testing.T) {
		service := NewOSService(withWallpaperApplier(func(context.Context, string) error {
			t.Fatalf("applier must not be called on guard failure")
			return nil
		}))
		if err := service.SetWallpaper(context.Background(), "  ", true); err == nil {
			t.Fatalf("expected error for empty location")
		}
		if err := service.SetWallpaper(context.Background(), "/definitely/missing/file.png", false); err == nil || !strings.Contains(err.Error(), "unreadable") {
			t.Fatalf("expected unreadable error, got %v", err)
		}
	})

	t.Run("远程壁纸缺少下载器时报错", func(t *testing.T) {
		service := NewOSService(
			WithWallpaperCacheDir(t.TempDir()),
			withWallpaperApplier(func(context.Context, string) error {
				t.Fatalf("applier must not be called without fetcher")
				return nil
			}),
		)
		if err := service.SetWallpaper(context.Background(), "https://example.com/a.png", true); err == nil || !strings.Contains(err.Error(), "downloader") {
			t.Fatalf("expected downloader error, got %v", err)
		}
	})

	t.Run("远程壁纸经公开 SetWallpaper 下载、缓存复用并透传给 applier", func(t *testing.T) {
		dir := t.TempDir()
		fetchCalls := 0
		var applied []string
		fetcher := StreamFetcher(func(context.Context, string) (io.ReadCloser, error) {
			fetchCalls++
			return io.NopCloser(strings.NewReader("fake image bytes")), nil
		})
		service := NewOSService(
			WithStreamFetcher(fetcher),
			WithWallpaperCacheDir(dir),
			withWallpaperApplier(func(_ context.Context, path string) error {
				applied = append(applied, path)
				return nil
			}),
		)
		if err := service.SetWallpaper(context.Background(), "https://example.com/a.png", true); err != nil {
			t.Fatalf("first SetWallpaper failed: %v", err)
		}
		if err := service.SetWallpaper(context.Background(), "https://example.com/a.png", true); err != nil {
			t.Fatalf("second SetWallpaper failed: %v", err)
		}
		if fetchCalls != 1 || len(applied) != 2 || applied[0] != applied[1] {
			t.Fatalf("expected 1 fetch and 2 identical applies, got fetch=%d applied=%v", fetchCalls, applied)
		}
		if _, err := os.Stat(filepath.Join(dir, wallpaperCacheName("https://example.com/a.png"))); err != nil {
			t.Fatalf("cached file missing: %v", err)
		}
	})
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

func TestKdeWallpaperScriptPreservesHTMLCharsAndEscapesJSLineSeparators(t *testing.T) {
	uri := "file:///tmp/a<b>&c\u2028d\u2029e'\"\\f\ng"
	script := kdeWallpaperScript(uri)
	if strings.Contains(script, `\u003c`) || strings.Contains(script, `\u003e`) || strings.Contains(script, `\u0026`) {
		t.Fatalf("must not HTML-escape <, >, &: %s", script)
	}
	if !strings.Contains(script, `"file:///tmp/a<b>&c\u2028d\u2029e'\"\\f\ng"`) {
		t.Fatalf("unexpected JS string encoding: %s", script)
	}
}

func TestLinuxWallpaperApplierCancelsAlternativeAndFailsPartialXfce(t *testing.T) {
	t.Run("KDE 备选命令在上下文取消后不再启动后续命令", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		runner := &fakeCommandRunner{
			runFn: func(_ context.Context, _ string, _ ...string) error {
				cancel()
				return context.Canceled
			},
		}
		applier := newLinuxWallpaperApplier(func(string) string { return "KDE" }, runner)
		if err := applier.Apply(ctx, "/tmp/a.png"); err == nil {
			t.Fatalf("expected error on canceled KDE apply")
		}
		if len(runner.ran) != 1 || runner.ran[0][0] != "busctl" {
			t.Fatalf("expected only busctl to be invoked before cancel, got %v", runner.ran)
		}
	})

	t.Run("XFCE 多显示器部分写入失败时返回错误", func(t *testing.T) {
		runner := &fakeCommandRunner{
			outputFn: func(_ context.Context, _ string, _ ...string) ([]byte, error) {
				return []byte("/backdrop/screen0/monitor0/image-path /old1\n/backdrop/screen0/monitor1/image-path /old2\n"), nil
			},
			runFn: func(_ context.Context, _ string, args ...string) error {
				for _, arg := range args {
					if strings.Contains(arg, "monitor1") {
						return errors.New("write monitor1 failed")
					}
				}
				return nil
			},
		}
		applier := newLinuxWallpaperApplier(func(string) string { return "XFCE" }, runner)
		if err := applier.Apply(context.Background(), "/tmp/a.png"); err == nil {
			t.Fatalf("expected error when one XFCE monitor fails to update")
		}
	})
}

// cspell:ignore maximised unfullscreen unmaximised

package shell

import (
	"context"
	"os"
	"path/filepath"
	"reflect"
	"sync"
	"testing"

	menucontract "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu"
)

type fakeDesktopHost struct {
	mu           sync.Mutex
	width        int
	height       int
	fullscreen   bool
	maximised    bool
	unfullscreen int
	unmaximised  int
	presented    int
	hidden       int
	reloaded     int
	devTools     int
	toggledMax   int
	emittedCmds  []menucontract.Command
	files        [][]string
	urls         [][]string
	openedURLs   []string
	installed    []MenuState
	onInstall    func(state MenuState)
}

func (f *fakeDesktopHost) Size() (int, int) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.width, f.height
}

func (f *fakeDesktopHost) SetSize(width, height int) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.width = width
	f.height = height
}

func (f *fakeDesktopHost) IsFullscreen() bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.fullscreen
}

func (f *fakeDesktopHost) UnFullscreen() {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.fullscreen = false
	f.unfullscreen++
}

func (f *fakeDesktopHost) IsMaximised() bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.maximised
}

func (f *fakeDesktopHost) UnMaximise() {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.maximised = false
	f.unmaximised++
}

func (f *fakeDesktopHost) PresentWindow() {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.presented++
}

func (f *fakeDesktopHost) HideWindow() {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.hidden++
}

func (f *fakeDesktopHost) ReloadWindow() {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.reloaded++
}

func (f *fakeDesktopHost) OpenDevTools() {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.devTools++
}

func (f *fakeDesktopHost) ToggleMaximise() {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.toggledMax++
}

func (f *fakeDesktopHost) EmitMenuCommand(command menucontract.Command) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.emittedCmds = append(f.emittedCmds, command)
}

func (f *fakeDesktopHost) EmitFiles(paths []string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.files = append(f.files, paths)
}

func (f *fakeDesktopHost) EmitURLs(urls []string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.urls = append(f.urls, urls)
}

func (f *fakeDesktopHost) OpenExternal(_ context.Context, targetURL string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.openedURLs = append(f.openedURLs, targetURL)
	return nil
}

func (f *fakeDesktopHost) InstallMenu(state MenuState, _ func(menucontract.Command)) {
	f.mu.Lock()
	cb := f.onInstall
	f.installed = append(f.installed, state)
	f.mu.Unlock()
	if cb != nil {
		cb(state)
	}
}

func (f *fakeDesktopHost) installedSnapshots() []MenuState {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]MenuState(nil), f.installed...)
}

type fakeStateSource struct {
	mu               sync.Mutex
	developerOptions bool
	minimizeToTray   bool
	disabled         []menucontract.Command
	zoomInCalls      int
	zoomOutCalls     int
	zoomResetCalls   int
}

func (s *fakeStateSource) DeveloperOptionsEnabled() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.developerOptions
}

func (s *fakeStateSource) MinimizeToTrayOnCloseEnabled() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.minimizeToTray
}

func (s *fakeStateSource) DisabledCommands() []menucontract.Command {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]menucontract.Command(nil), s.disabled...)
}

func (s *fakeStateSource) ZoomIn(context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.zoomInCalls++
	return nil
}

func (s *fakeStateSource) ZoomOut(context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.zoomOutCalls++
	return nil
}

func (s *fakeStateSource) ZoomReset(context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.zoomResetCalls++
	return nil
}

func TestSyncMenuSkipsUnrelatedSettingsChangesAndMapOrderJitter(t *testing.T) {
	host := &fakeDesktopHost{width: 1280, height: 800}
	state := &fakeStateSource{
		developerOptions: false,
		minimizeToTray:   false,
		disabled:         []menucontract.Command{menucontract.CommandNavigateForward, menucontract.CommandNavigateBack},
	}
	sh := NewDesktopShell(host, state, Config{
		MinSize:      WindowSize{Width: 400, Height: 600},
		FallbackSize: WindowSize{Width: 1280, Height: 800},
		ReleasesURL:  "https://example.com/releases",
	})

	if !sh.SyncMenu() {
		t.Fatal("expected initial SyncMenu to install menu")
	}
	snaps := host.installedSnapshots()
	if len(snaps) != 1 {
		t.Fatalf("expected 1 menu install, got %d", len(snaps))
	}
	wantDisabled := []menucontract.Command{menucontract.CommandNavigateBack, menucontract.CommandNavigateForward}
	if !reflect.DeepEqual(snaps[0].DisabledCommands, wantDisabled) {
		t.Fatalf("expected sorted DisabledCommands %v, got %v", wantDisabled, snaps[0].DisabledCommands)
	}

	// 1. 仅改变非菜单设置（minimizeToTray）不得重建菜单。
	state.mu.Lock()
	state.minimizeToTray = true
	state.mu.Unlock()
	if sh.SyncMenu() {
		t.Fatal("expected SyncMenu to skip rebuild when only non-menu settings changed")
	}

	// 2. 相同禁用集合以不同顺序或含重复项返回时，规范化后不得触发重建。
	state.mu.Lock()
	state.disabled = []menucontract.Command{
		menucontract.CommandNavigateBack,
		menucontract.CommandNavigateForward,
		menucontract.CommandNavigateBack,
	}
	state.mu.Unlock()
	if sh.SyncMenu() {
		t.Fatal("expected SyncMenu to skip rebuild on reordered/duplicate disabled commands")
	}

	// 3. DeveloperOptions 变化必须触发重建。
	state.mu.Lock()
	state.developerOptions = true
	state.mu.Unlock()
	if !sh.SyncMenu() {
		t.Fatal("expected SyncMenu to rebuild when DeveloperOptions changes")
	}
	if got := len(host.installedSnapshots()); got != 2 {
		t.Fatalf("expected 2 total menu installs, got %d", got)
	}
}

// 并发 S1 -> S2 状态变更时，独立串行安装锁回读最新快照并串行物化，
// 最终安装在宿主上的菜单必须等于最新状态 S2，绝不发生 S2 -> S1 乱序回退。
func TestSyncMenuConcurrentUpdatesNeverOverwriteNewerStateWithStale(t *testing.T) {
	firstEntered := make(chan struct{})
	releaseFirst := make(chan struct{})
	var enteredOnce sync.Once

	host := &fakeDesktopHost{
		onInstall: func(state MenuState) {
			if !state.DeveloperOptions {
				enteredOnce.Do(func() {
					close(firstEntered)
					<-releaseFirst
				})
			}
		},
	}
	state := &fakeStateSource{developerOptions: false}
	sh := NewDesktopShell(host, state, Config{})

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		sh.SyncMenu()
	}()

	<-firstEntered

	// 在 S1 安装阻塞期间，状态推进为 S2 并并发发起多个 SyncMenu。
	state.mu.Lock()
	state.developerOptions = true
	state.disabled = []menucontract.Command{menucontract.CommandNavigateBack}
	state.mu.Unlock()

	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			sh.SyncMenu()
		}()
	}

	close(releaseFirst)
	wg.Wait()

	snaps := host.installedSnapshots()
	if len(snaps) < 2 {
		t.Fatalf("expected at least 2 installs (S1 then S2), got %d", len(snaps))
	}
	last := snaps[len(snaps)-1]
	wantFinal := NormalizeMenuState(true, []menucontract.Command{menucontract.CommandNavigateBack})
	if !last.Equal(wantFinal) {
		t.Fatalf("expected final installed menu state %+v, got %+v", wantFinal, last)
	}
}

func TestDesktopShellWindowClosingMinimizeToTray(t *testing.T) {
	host := &fakeDesktopHost{}
	state := &fakeStateSource{minimizeToTray: true}
	sh := NewDesktopShell(host, state, Config{})

	cancelled := false
	if !sh.HandleWindowClosing(func() { cancelled = true }) {
		t.Fatal("expected HandleWindowClosing to intercept when minimizeToTray is enabled")
	}
	if !cancelled || host.hidden != 1 {
		t.Fatalf("expected cancel=true and hidden=1, got cancel=%v hidden=%d", cancelled, host.hidden)
	}

	state.minimizeToTray = false
	cancelled = false
	if sh.HandleWindowClosing(func() { cancelled = true }) {
		t.Fatal("expected HandleWindowClosing to allow exit when minimizeToTray is disabled")
	}
	if cancelled || host.hidden != 1 {
		t.Fatalf("expected no cancel/hide when disabled, got cancel=%v hidden=%d", cancelled, host.hidden)
	}
}

func TestDesktopShellMenuCommandDispatch(t *testing.T) {
	host := &fakeDesktopHost{width: 1280, height: 800}
	state := &fakeStateSource{}
	sh := NewDesktopShell(host, state, Config{
		MinSize:      WindowSize{Width: 400, Height: 600},
		FallbackSize: WindowSize{Width: 1280, Height: 800},
		ReleasesURL:  "https://example.com/releases",
	})

	sh.HandleMenuCommand(menucontract.CommandReloadWindow)
	sh.HandleMenuCommand(menucontract.CommandOpenDevTools)
	sh.HandleMenuCommand(menucontract.CommandMaximiseWindow)
	sh.HandleMenuCommand(menucontract.CommandToggleWindowMode)
	sh.HandleMenuCommand(menucontract.CommandZoomIn)
	sh.HandleMenuCommand(menucontract.CommandZoomOut)
	sh.HandleMenuCommand(menucontract.CommandZoomReset)
	sh.HandleMenuCommand(menucontract.CommandCheckForUpdates)
	sh.HandleMenuCommand(menucontract.CommandNavigateBack)

	if host.reloaded != 1 || host.devTools != 1 || host.toggledMax != 1 {
		t.Fatalf("unexpected window action counts: reload=%d devtools=%d max=%d", host.reloaded, host.devTools, host.toggledMax)
	}
	if host.width != 400 || host.height != 600 {
		t.Fatalf("expected ToggleWindowMode to shrink to 400x600, got %dx%d", host.width, host.height)
	}
	if state.zoomInCalls != 1 || state.zoomOutCalls != 1 || state.zoomResetCalls != 1 {
		t.Fatalf("unexpected zoom calls: in=%d out=%d reset=%d", state.zoomInCalls, state.zoomOutCalls, state.zoomResetCalls)
	}
	if !reflect.DeepEqual(host.openedURLs, []string{"https://example.com/releases"}) {
		t.Fatalf("expected releases URL opened, got %v", host.openedURLs)
	}
	if !reflect.DeepEqual(host.emittedCmds, []menucontract.Command{menucontract.CommandNavigateBack}) {
		t.Fatalf("expected frontend command forwarded, got %v", host.emittedCmds)
	}
}

func TestWindowModeTogglerBehavior(t *testing.T) {
	t.Run("round trip", func(t *testing.T) {
		win := &fakeDesktopHost{width: 1280, height: 800}
		toggler := NewWindowModeToggler(WindowSize{400, 600}, WindowSize{1280, 800})
		toggler.Toggle(win)
		if win.width != 400 || win.height != 600 {
			t.Fatalf("expected 400x600, got %dx%d", win.width, win.height)
		}
		toggler.Toggle(win)
		if win.width != 1280 || win.height != 800 {
			t.Fatalf("expected 1280x800, got %dx%d", win.width, win.height)
		}
	})

	t.Run("already at min size uses fallback", func(t *testing.T) {
		win := &fakeDesktopHost{width: 400, height: 600}
		toggler := NewWindowModeToggler(WindowSize{400, 600}, WindowSize{1280, 800})
		toggler.Toggle(win)
		if win.width != 1280 || win.height != 800 {
			t.Fatalf("expected 1280x800, got %dx%d", win.width, win.height)
		}
		toggler.Toggle(win)
		if win.width != 400 || win.height != 600 {
			t.Fatalf("expected 400x600, got %dx%d", win.width, win.height)
		}
	})

	t.Run("manual resize re-enters min mode", func(t *testing.T) {
		win := &fakeDesktopHost{width: 1280, height: 800}
		toggler := NewWindowModeToggler(WindowSize{400, 600}, WindowSize{1280, 800})
		toggler.Toggle(win)
		win.width, win.height = 960, 720
		toggler.Toggle(win)
		if win.width != 400 || win.height != 600 {
			t.Fatalf("expected 400x600, got %dx%d", win.width, win.height)
		}
		toggler.Toggle(win)
		if win.width != 960 || win.height != 720 {
			t.Fatalf("expected 960x720, got %dx%d", win.width, win.height)
		}
	})

	t.Run("exits fullscreen and maximised", func(t *testing.T) {
		win := &fakeDesktopHost{width: 1440, height: 900, fullscreen: true, maximised: true}
		toggler := NewWindowModeToggler(WindowSize{400, 600}, WindowSize{1280, 800})
		toggler.Toggle(win)
		if win.unfullscreen != 1 || win.unmaximised != 1 || win.width != 400 || win.height != 600 {
			t.Fatalf("unexpected state: unfull=%d unmax=%d size=%dx%d", win.unfullscreen, win.unmaximised, win.width, win.height)
		}
		toggler.Toggle(win)
		if win.width != 1440 || win.height != 900 {
			t.Fatalf("expected 1440x900, got %dx%d", win.width, win.height)
		}
	})

	t.Run("handles nil window", func(t *testing.T) {
		NewWindowModeToggler(WindowSize{400, 600}, WindowSize{1280, 800}).Toggle(nil)
	})
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

	host := &fakeDesktopHost{}
	sh := NewDesktopShell(host, &fakeStateSource{}, Config{})

	sh.HandleOpenedFiles([]string{"/tmp/photo.png", webloc, "/tmp/photo.png", " "})
	sh.HandleLaunchedURL("https://example.org/docs")
	sh.HandleOpenedFiles([]string{urlShortcut})
	sh.HandleLaunchedURL("javascript:alert(1)")

	if len(host.files) != 0 || len(host.urls) != 0 || host.presented != 0 {
		t.Fatalf("expected events to buffer until ready, got files=%v urls=%v presented=%d", host.files, host.urls, host.presented)
	}

	sh.MarkRuntimeReady()

	wantFiles := [][]string{{"/tmp/photo.png"}}
	wantURLs := [][]string{{"https://example.com/article", "https://example.org/docs"}}
	if !reflect.DeepEqual(host.files, wantFiles) {
		t.Fatalf("expected files %v, got %v", wantFiles, host.files)
	}
	if !reflect.DeepEqual(host.urls, wantURLs) {
		t.Fatalf("expected urls %v, got %v", wantURLs, host.urls)
	}
	if host.presented != 1 {
		t.Fatalf("expected window presented once on flush, got %d", host.presented)
	}

	sh.HandleOpenedFiles([]string{"/tmp/video.mp4"})
	if len(host.files) != 2 || host.presented != 2 {
		t.Fatalf("expected immediate dispatch after ready, got files=%v presented=%d", host.files, host.presented)
	}
}

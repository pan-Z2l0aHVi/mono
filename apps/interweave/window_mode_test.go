// cspell:ignore maximised unfullscreen unmaximised

package main

import "testing"

type fakeWindowController struct {
	width        int
	height       int
	fullscreen   bool
	maximised    bool
	unfullscreen int
	unmaximised  int
	sizeCalls    []windowSize
}

func (f *fakeWindowController) Size() (int, int) {
	return f.width, f.height
}

func (f *fakeWindowController) SetSize(width, height int) {
	f.width = width
	f.height = height
	f.sizeCalls = append(f.sizeCalls, windowSize{width: width, height: height})
}

func (f *fakeWindowController) IsFullscreen() bool {
	return f.fullscreen
}

func (f *fakeWindowController) UnFullscreen() {
	f.fullscreen = false
	f.unfullscreen++
}

func (f *fakeWindowController) IsMaximised() bool {
	return f.maximised
}

func (f *fakeWindowController) UnMaximise() {
	f.maximised = false
	f.unmaximised++
}

func TestWindowModeTogglerRoundTrip(t *testing.T) {
	win := &fakeWindowController{width: 1280, height: 800}
	toggler := newWindowModeToggler(windowSize{400, 600}, windowSize{1280, 800})

	toggler.Toggle(win)
	if win.width != 400 || win.height != 600 {
		t.Fatalf("expected min size 400x600, got %dx%d", win.width, win.height)
	}

	toggler.Toggle(win)
	if win.width != 1280 || win.height != 800 {
		t.Fatalf("expected restored size 1280x800, got %dx%d", win.width, win.height)
	}
}

func TestWindowModeTogglerAlreadyAtMinSizeUsesFallback(t *testing.T) {
	win := &fakeWindowController{width: 400, height: 600}
	toggler := newWindowModeToggler(windowSize{400, 600}, windowSize{1280, 800})

	toggler.Toggle(win)
	if win.width != 1280 || win.height != 800 {
		t.Fatalf("expected fallback size 1280x800 when already at min size, got %dx%d", win.width, win.height)
	}

	// 下一次点击应当从恢复后的尺寸再次进入最小模式。
	toggler.Toggle(win)
	if win.width != 400 || win.height != 600 {
		t.Fatalf("expected min size 400x600 on subsequent toggle, got %dx%d", win.width, win.height)
	}
}

func TestWindowModeTogglerManualResizeInMinModeReEntersMinMode(t *testing.T) {
	win := &fakeWindowController{width: 1280, height: 800}
	toggler := newWindowModeToggler(windowSize{400, 600}, windowSize{1280, 800})

	toggler.Toggle(win)
	if win.width != 400 || win.height != 600 {
		t.Fatalf("expected min size 400x600, got %dx%d", win.width, win.height)
	}

	// 用户手动拖拽放大窗口后，再次点击应以新尺寸为记忆重新切到最小模式。
	win.width = 960
	win.height = 720
	toggler.Toggle(win)
	if win.width != 400 || win.height != 600 {
		t.Fatalf("expected re-entering min size 400x600, got %dx%d", win.width, win.height)
	}

	toggler.Toggle(win)
	if win.width != 960 || win.height != 720 {
		t.Fatalf("expected restored size 960x720, got %dx%d", win.width, win.height)
	}
}

func TestWindowModeTogglerExitsFullscreenAndMaximised(t *testing.T) {
	win := &fakeWindowController{width: 1440, height: 900, fullscreen: true, maximised: true}
	toggler := newWindowModeToggler(windowSize{400, 600}, windowSize{1280, 800})

	toggler.Toggle(win)
	if win.unfullscreen != 1 || win.unmaximised != 1 {
		t.Fatalf("expected fullscreen and maximised to be exited, got unfullscreen=%d unmaximised=%d", win.unfullscreen, win.unmaximised)
	}
	if win.width != 400 || win.height != 600 {
		t.Fatalf("expected min size 400x600, got %dx%d", win.width, win.height)
	}

	toggler.Toggle(win)
	if win.width != 1440 || win.height != 900 {
		t.Fatalf("expected restored size 1440x900, got %dx%d", win.width, win.height)
	}
}

func TestWindowModeTogglerHandlesNilWindow(t *testing.T) {
	toggler := newWindowModeToggler(windowSize{400, 600}, windowSize{1280, 800})
	toggler.Toggle(nil)
}

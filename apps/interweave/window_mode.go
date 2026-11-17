// cspell:ignore maximised unfullscreen unmaximised

package main

import (
	"sync"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type windowSize struct {
	width  int
	height int
}

func (s windowSize) valid() bool {
	return s.width > 0 && s.height > 0
}

type windowSizeController interface {
	Size() (int, int)
	SetSize(width, height int)
	IsFullscreen() bool
	UnFullscreen()
	IsMaximised() bool
	UnMaximise()
}

type webviewWindowAdapter struct {
	window *application.WebviewWindow
}

func (a webviewWindowAdapter) Size() (int, int)   { return a.window.Size() }
func (a webviewWindowAdapter) SetSize(w, h int)   { a.window.SetSize(w, h) }
func (a webviewWindowAdapter) IsFullscreen() bool { return a.window.IsFullscreen() }
func (a webviewWindowAdapter) UnFullscreen()      { a.window.UnFullscreen() }
func (a webviewWindowAdapter) IsMaximised() bool  { return a.window.IsMaximised() }
func (a webviewWindowAdapter) UnMaximise()        { a.window.UnMaximise() }

// windowModeToggler 管理「切换窗口模式」的尺寸记忆与往返切换：
// 首次点击记录当前尺寸并缩至最小窗口尺寸；再次点击恢复先前尺寸。
type windowModeToggler struct {
	mu           sync.Mutex
	minSize      windowSize
	fallbackSize windowSize
	previous     *windowSize
}

func newWindowModeToggler(minSize, fallbackSize windowSize) *windowModeToggler {
	return &windowModeToggler{
		minSize:      minSize,
		fallbackSize: fallbackSize,
	}
}

func (t *windowModeToggler) Toggle(win windowSizeController) {
	if win == nil || !t.minSize.valid() {
		return
	}

	t.mu.Lock()
	defer t.mu.Unlock()

	w, h := win.Size()
	fullscreen := win.IsFullscreen()
	maximised := win.IsMaximised()
	atMinSize := !fullscreen && !maximised && w <= t.minSize.width && h <= t.minSize.height

	// 已处于最小模式且有记忆尺寸：恢复到进入最小模式前的尺寸。
	if t.previous != nil && atMinSize {
		target := *t.previous
		t.previous = nil
		win.SetSize(target.width, target.height)
		return
	}

	// 本来就处于最小尺寸且没有记忆尺寸：切回默认尺寸，避免再次点击卡在最小尺寸。
	if t.previous == nil && atMinSize {
		if t.fallbackSize.valid() {
			win.SetSize(t.fallbackSize.width, t.fallbackSize.height)
		}
		return
	}

	// 进入最小模式：记录当前尺寸；若用户在最小模式下手动拉大过窗口，也以当前尺寸刷新记忆。
	if w > 0 && h > 0 {
		t.previous = &windowSize{width: w, height: h}
	}
	if fullscreen {
		win.UnFullscreen()
	}
	if maximised {
		win.UnMaximise()
	}
	win.SetSize(t.minSize.width, t.minSize.height)
}

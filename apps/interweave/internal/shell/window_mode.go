// cspell:ignore maximised unfullscreen unmaximised

package shell

import "sync"

// WindowSize 表示窗口宽高。
type WindowSize struct {
	Width  int
	Height int
}

func (s WindowSize) valid() bool {
	return s.Width > 0 && s.Height > 0
}

// WindowSizeController 是窗口尺寸模式切换依赖的最小窗口接缝。
type WindowSizeController interface {
	Size() (int, int)
	SetSize(width, height int)
	IsFullscreen() bool
	UnFullscreen()
	IsMaximised() bool
	UnMaximise()
}

// WindowModeToggler 管理「切换窗口模式」的尺寸记忆与往返切换：
// 首次点击记录当前尺寸并缩至最小窗口尺寸；再次点击恢复先前尺寸。
type WindowModeToggler struct {
	mu           sync.Mutex
	minSize      WindowSize
	fallbackSize WindowSize
	previous     *WindowSize
}

// NewWindowModeToggler 创建窗口尺寸模式切换器。
func NewWindowModeToggler(minSize, fallbackSize WindowSize) *WindowModeToggler {
	return &WindowModeToggler{
		minSize:      minSize,
		fallbackSize: fallbackSize,
	}
}

// Toggle 在最小尺寸与先前尺寸之间往返切换。
func (t *WindowModeToggler) Toggle(win WindowSizeController) {
	if win == nil || !t.minSize.valid() {
		return
	}

	t.mu.Lock()
	defer t.mu.Unlock()

	w, h := win.Size()
	fullscreen := win.IsFullscreen()
	maximised := win.IsMaximised()
	atMinSize := !fullscreen && !maximised && w <= t.minSize.Width && h <= t.minSize.Height

	// 已处于最小模式且有记忆尺寸：恢复到进入最小模式前的尺寸。
	if t.previous != nil && atMinSize {
		target := *t.previous
		t.previous = nil
		win.SetSize(target.Width, target.Height)
		return
	}

	// 本来就处于最小尺寸且没有记忆尺寸：切回默认尺寸，避免再次点击卡在最小尺寸。
	if t.previous == nil && atMinSize {
		if t.fallbackSize.valid() {
			win.SetSize(t.fallbackSize.Width, t.fallbackSize.Height)
		}
		return
	}

	// 进入最小模式：记录当前尺寸；若用户在最小模式下手动拉大过窗口，也以当前尺寸刷新记忆。
	if w > 0 && h > 0 {
		t.previous = &WindowSize{Width: w, Height: h}
	}
	if fullscreen {
		win.UnFullscreen()
	}
	if maximised {
		win.UnMaximise()
	}
	win.SetSize(t.minSize.Width, t.minSize.Height)
}

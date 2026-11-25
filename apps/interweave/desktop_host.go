// cspell:ignore maximised unfullscreen unmaximised

package main

import (
	"context"
	"runtime"
	"sync/atomic"

	"github.com/wailsapp/wails/v3/pkg/application"

	libraryService "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service"
	menucontract "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu"
	nativeMenu "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/native/menu"
	nativeService "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/native/service"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/settings"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/internal/shell"
)

// wailsDesktopHost 是 internal/shell.DesktopHost 在 Wails 宿主的极简适配器：
// 只做窗口动作、事件发射与原生菜单物化转发，不包含状态与业务编排。
// 窗口经 mainWindowController 间接取得：轻量模式下 WebView 被销毁，所有窗口动作都要无操作。
type wailsDesktopHost struct {
	app       *application.App
	windows   *mainWindowController
	osService *nativeService.OSService
	// presence 只在 macOS 上切换 Dock 可见性：隐藏窗口进托盘时隐藏 Dock，
	// 从托盘/Dock 恢复窗口时再显示，避免只剩菜单栏托盘后无处点击 Dock。
	presence *platformDockPresence
	// hiddenToTray 标记窗口是「关闭时最小化到托盘」藏起来的，不是用户主动最小化。
	// 关闭该设置时只有这类窗口需要主动恢复，否则没有窗口、托盘和 Dock 三个入口。
	hiddenToTray atomic.Bool
}

var _ shell.DesktopHost = (*wailsDesktopHost)(nil)

func (h *wailsDesktopHost) currentWindow() *application.WebviewWindow {
	if h.windows == nil {
		return nil
	}
	return h.windows.Window()
}

func (h *wailsDesktopHost) Size() (int, int) {
	if window := h.currentWindow(); window != nil {
		return window.Size()
	}
	return 0, 0
}

func (h *wailsDesktopHost) SetSize(w, ht int) {
	if window := h.currentWindow(); window != nil {
		window.SetSize(w, ht)
	}
}

func (h *wailsDesktopHost) IsFullscreen() bool {
	if window := h.currentWindow(); window != nil {
		return window.IsFullscreen()
	}
	return false
}

func (h *wailsDesktopHost) UnFullscreen() {
	if window := h.currentWindow(); window != nil {
		window.UnFullscreen()
	}
}

func (h *wailsDesktopHost) IsMaximised() bool {
	if window := h.currentWindow(); window != nil {
		return window.IsMaximised()
	}
	return false
}

func (h *wailsDesktopHost) UnMaximise() {
	if window := h.currentWindow(); window != nil {
		window.UnMaximise()
	}
}

func (h *wailsDesktopHost) PresentWindow() {
	h.windows.Present()
	h.presence.show()
	h.hiddenToTray.Store(false)
}

// hiddenByTray 仅供设置变更时判断是否需要把藏进托盘的窗口拉回来。
func (h *wailsDesktopHost) hiddenByTray() bool { return h.hiddenToTray.Load() }

func (h *wailsDesktopHost) HideWindow() {
	if window := h.currentWindow(); window != nil {
		window.Hide()
		h.hiddenToTray.Store(true)
		h.presence.hide()
	}
}

func (h *wailsDesktopHost) QuitApp() { go h.app.Quit() }

func (h *wailsDesktopHost) ReloadWindow() {
	if window := h.currentWindow(); window != nil {
		window.Reload()
	}
}

func (h *wailsDesktopHost) OpenDevTools() {
	if window := h.currentWindow(); window != nil {
		window.OpenDevTools()
	}
}

func (h *wailsDesktopHost) ToggleMaximise() {
	if window := h.currentWindow(); window != nil {
		window.ToggleMaximise()
	}
}

func (h *wailsDesktopHost) EmitMenuCommand(command menucontract.Command) {
	if window := h.currentWindow(); window != nil {
		window.EmitEvent(menucontract.CommandEventName, menucontract.MenuCommand{
			Command: command,
			Payload: map[string]string{},
		})
	}
}

func (h *wailsDesktopHost) EmitFiles(paths []string) {
	if window := h.currentWindow(); window != nil {
		window.EmitEvent(libraryService.FileDropEventName, paths)
	}
}

func (h *wailsDesktopHost) EmitURLs(urls []string) {
	if window := h.currentWindow(); window != nil {
		window.EmitEvent(libraryService.URLDropEventName, urls)
	}
}

func (h *wailsDesktopHost) OpenExternal(ctx context.Context, targetURL string) error {
	return h.osService.OpenExternal(ctx, targetURL)
}

// InstallMenu 整体重建菜单并同步到当前平台呈现面：
// - Windows 使用 Frameless 一体化顶栏，不挂 Win32 菜单条，改向前端推送最新菜单快照；
// - macOS / Linux 挂原生应用菜单（macOS 上 window.SetMenu 是 no-op，app.Menu.Set 才是生效点）。
func (h *wailsDesktopHost) InstallMenu(state shell.MenuState, sink func(menucontract.Command)) {
	nativeState := nativeMenu.State{
		DeveloperOptions: state.DeveloperOptions,
		Disabled:         state.IsDisabled,
	}
	window := h.currentWindow()
	if runtime.GOOS == "windows" {
		if window != nil {
			window.EmitEvent(menucontract.TreeChangedEventName, nativeMenu.Snapshot(nativeState, runtime.GOOS))
		}
		return
	}
	tree := nativeMenu.Build(nativeState, sink)
	h.app.Menu.Set(tree.Menu)
	if window != nil {
		window.SetMenu(tree.Menu)
	}
}

// wailsShellState 把 settings.Service 与 menu.Service 适配成纯 Go 的 shell.StateSource。
type wailsShellState struct {
	settings *settings.Service
	menu     *menucontract.Service
}

var _ shell.StateSource = (*wailsShellState)(nil)

func (s *wailsShellState) DeveloperOptionsEnabled() bool {
	return s.settings.DeveloperOptionsEnabled()
}

func (s *wailsShellState) MinimizeToTrayOnCloseEnabled() bool {
	return s.settings.MinimizeToTrayOnCloseEnabled()
}

func (s *wailsShellState) DisabledCommands() []menucontract.Command {
	return s.menu.DisabledCommands()
}

func (s *wailsShellState) ZoomIn(ctx context.Context) error {
	_, err := s.settings.ZoomIn(ctx)
	return err
}

func (s *wailsShellState) ZoomOut(ctx context.Context) error {
	_, err := s.settings.ZoomOut(ctx)
	return err
}

func (s *wailsShellState) ZoomReset(ctx context.Context) error {
	_, err := s.settings.ZoomReset(ctx)
	return err
}

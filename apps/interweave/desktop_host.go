// cspell:ignore maximised unfullscreen unmaximised

package main

import (
	"context"

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
type wailsDesktopHost struct {
	app       *application.App
	window    *application.WebviewWindow
	osService *nativeService.OSService
}

var _ shell.DesktopHost = (*wailsDesktopHost)(nil)

func (h *wailsDesktopHost) Size() (int, int)   { return h.window.Size() }
func (h *wailsDesktopHost) SetSize(w, ht int)  { h.window.SetSize(w, ht) }
func (h *wailsDesktopHost) IsFullscreen() bool { return h.window.IsFullscreen() }
func (h *wailsDesktopHost) UnFullscreen()      { h.window.UnFullscreen() }
func (h *wailsDesktopHost) IsMaximised() bool  { return h.window.IsMaximised() }
func (h *wailsDesktopHost) UnMaximise()        { h.window.UnMaximise() }

func (h *wailsDesktopHost) PresentWindow()  { presentMainWindow(h.window) }
func (h *wailsDesktopHost) HideWindow()     { h.window.Hide() }
func (h *wailsDesktopHost) QuitApp()        { go h.app.Quit() }
func (h *wailsDesktopHost) ReloadWindow()   { h.window.Reload() }
func (h *wailsDesktopHost) OpenDevTools()   { h.window.OpenDevTools() }
func (h *wailsDesktopHost) ToggleMaximise() { h.window.ToggleMaximise() }

func (h *wailsDesktopHost) EmitMenuCommand(command menucontract.Command) {
	h.window.EmitEvent(menucontract.CommandEventName, menucontract.MenuCommand{
		Command: command,
		Payload: map[string]string{},
	})
}

func (h *wailsDesktopHost) EmitFiles(paths []string) {
	h.window.EmitEvent(libraryService.FileDropEventName, paths)
}

func (h *wailsDesktopHost) EmitURLs(urls []string) {
	h.window.EmitEvent(libraryService.URLDropEventName, urls)
}

func (h *wailsDesktopHost) OpenExternal(ctx context.Context, targetURL string) error {
	return h.osService.OpenExternal(ctx, targetURL)
}

// InstallMenu 整体重建原生菜单并重新挂上窗口。Windows 上 Menu.Update 不重绘已存在的
// 菜单栏，只有 window.SetMenu 会 SetMenu + DrawMenuBar，所以两条都要做；
// macOS 上 window.SetMenu 是 no-op，app.Menu.Set 才是生效点。
func (h *wailsDesktopHost) InstallMenu(state shell.MenuState, sink func(menucontract.Command)) {
	tree := nativeMenu.Build(nativeMenu.State{
		DeveloperOptions: state.DeveloperOptions,
		Disabled:         state.IsDisabled,
	}, sink)
	h.app.Menu.Set(tree.Menu)
	h.window.SetMenu(tree.Menu)
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

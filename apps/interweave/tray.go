package main

import (
	_ "embed"
	"sync"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// 图标按平台语义分别嵌入：
//   - macOS 用 template 图（黑+透明），由系统按浅/深色菜单栏自动反色；Wails 只能收一份字节，
//     因此把 22/44/66 三档源图按 72/144/216 DPI 合成多表示 TIFF，让 NSImage 按屏幕倍率选图。
//   - Windows 按任务栏底色切换：深色图案配浅色任务栏，浅色图案配深色任务栏；
//     Linux 用 PNG（Wails 的 Linux 托盘只解码 PNG）。
//
// Wails 的 SetIcon 对应系统浅色模式，SetDarkModeIcon 对应系统深色模式。
//
//go:embed build/tray/macos/trayTemplate.tiff
var trayTemplateIcon []byte

// Wails v3.1.0 的 Linux 托盘只走 PNG 解码（systemtray_linux.go: iconToPX → pngToImage），
// ICO 在那里会解码失败并导致图标缺失，因此 Linux 复用现有 PNG 应用图标。
//
//go:embed build/appicon.png
var trayIconForLinux []byte

//go:embed build/tray/windows/tray-dark.ico
var trayIconForLightTaskbar []byte

//go:embed build/tray/windows/tray-light.ico
var trayIconForDarkTaskbar []byte

const (
	trayMenuShowLabel = "主界面"
	trayMenuLightMode = "轻量模式"
	trayMenuQuitLabel = "退出 Interweave"
)

// presentMainWindow 将主窗口从最小化或隐藏状态恢复并置前聚焦。
// macOS 的 Show 只做 makeKeyAndOrderFront，最小化的窗口要先显式恢复。
func presentMainWindow(window *application.WebviewWindow) {
	if window == nil {
		return
	}
	window.UnMinimise()
	window.Show()
	window.Focus()
}

// windowsTrayIcon 按 Windows 任务栏底色返回对应图标：浅色任务栏用深色图案，深色任务栏用浅色图案。
func windowsTrayIcon(darkTaskbar bool) []byte {
	if darkTaskbar {
		return trayIconForDarkTaskbar
	}
	return trayIconForLightTaskbar
}

// trayIconsFor 按平台返回 Wails 托盘需要的图标字节，便于纯单测校验映射语义。
func trayIconsFor(goos string) (icon, darkIcon, template []byte) {
	if goos == "darwin" {
		return nil, nil, trayTemplateIcon
	}
	if goos == "linux" {
		return trayIconForLinux, nil, nil
	}
	// Windows 按任务栏底色切换 ICO；dark 变体只对 Windows 有意义。
	return trayIconForLightTaskbar, trayIconForDarkTaskbar, nil
}

func applyTrayIcons(tray *application.SystemTray, goos string) {
	icon, darkIcon, template := trayIconsFor(goos)
	if len(template) > 0 {
		tray.SetTemplateIcon(template)
		return
	}
	if len(icon) > 0 {
		tray.SetIcon(icon)
	}
	if len(darkIcon) > 0 {
		tray.SetDarkModeIcon(darkIcon)
	}
}

// buildTrayMenu 构建系统托盘菜单：主界面、轻量模式勾选与退出；
// 返回轻量模式项，供状态变化时原地同步勾选态（保留同一个菜单项，避免右键菜单闪烁）。
func buildTrayMenu(lightMode bool, onShow func(), onToggleLight func(), onQuit func()) (*application.Menu, *application.MenuItem) {
	trayMenu := application.NewMenu()
	trayMenu.Add(trayMenuShowLabel).OnClick(func(*application.Context) {
		if onShow != nil {
			onShow()
		}
	})
	trayMenu.AddSeparator()
	toggleItem := trayMenu.AddCheckbox(trayMenuLightMode, lightMode).OnClick(func(*application.Context) {
		if onToggleLight != nil {
			onToggleLight()
		}
	})
	trayMenu.AddSeparator()
	trayMenu.Add(trayMenuQuitLabel).OnClick(func(*application.Context) {
		if onQuit != nil {
			onQuit()
		}
	})
	return trayMenu, toggleItem
}

// trayHandle 抽象系统托盘的销毁能力，便于在单测中验证开关切换时的创建与移除时序。
type trayHandle interface {
	Destroy()
}

// managedSystemTray 在托盘销毁时一并注销轻量模式监听，避免设置反复开关后旧菜单回调叠加。
type managedSystemTray struct {
	tray    *application.SystemTray
	dispose func()
}

func (t *managedSystemTray) Destroy() {
	if t.dispose != nil {
		dispose := t.dispose
		t.dispose = nil
		dispose()
	}
	t.tray.Destroy()
}

// systemTrayController 保证系统托盘的展示状态与「关闭时最小化到托盘」设置严格同步：
// 每次 Sync 在锁内读取当前已提交的开关真值（避免并发保存时旧快照覆盖新状态）：
// 开启且尚未创建时按需创建，关闭且已存在时立即移除，重复同步保持幂等。
type systemTrayController struct {
	mu      sync.Mutex
	enabled func() bool
	create  func() trayHandle
	destroy func(trayHandle)
	current trayHandle
}

func newSystemTrayController(enabled func() bool, create func() trayHandle, destroy func(trayHandle)) *systemTrayController {
	return &systemTrayController{
		enabled: enabled,
		create:  create,
		destroy: destroy,
	}
}

func (c *systemTrayController) Sync() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.enabled != nil && c.enabled() {
		if c.current != nil || c.create == nil {
			return
		}
		c.current = c.create()
		return
	}

	if c.current == nil {
		return
	}
	handle := c.current
	c.current = nil
	if c.destroy != nil {
		c.destroy(handle)
	} else {
		handle.Destroy()
	}
}

// setupSystemTray 创建并配置系统托盘图标、菜单与点击交互。
// present 由宿主提供，确保从托盘恢复窗口时也同步 Dock 可见性；quit 负责排空 Dock 后退出。
func setupSystemTray(app *application.App, windows *mainWindowController, present func(), quit func()) trayHandle {
	if present == nil {
		present = windows.Present
	}
	if quit == nil {
		quit = app.Quit
	}
	tray := app.SystemTray.New()
	disposeTheme := applyPlatformTrayIcons(app, tray)
	tray.SetTooltip("Interweave")

	var (
		menu       *application.Menu
		toggleItem *application.MenuItem
	)
	syncLightModeChecked := func() {
		application.InvokeSync(func() {
			if toggleItem != nil {
				toggleItem.SetChecked(windows.IsLightMode())
			}
			if menu != nil {
				menu.Update()
			}
		})
	}
	menu, toggleItem = buildTrayMenu(
		windows.IsLightMode(),
		present,
		func() {
			// Checkbox 会在回调前自动翻转，最终状态仍以 controller 为准。
			windows.ToggleLightMode()
			syncLightModeChecked()
		},
		quit,
	)
	disposeState := windows.addStateListener(func(bool) { syncLightModeChecked() })
	tray.SetMenu(menu)
	tray.OnClick(present)
	// 不显式注册 OnRightClick(tray.OpenMenu)：Wails v3.1.0 在 rightClickHandler == nil 时，
	// macOS 会通过 systrayPreClick 在 mouse-down 前直接挂载 NSMenu 进入原生菜单追踪，
	// 避免 OpenMenu 异步合成点击与 rightMouseUp 竞态导致菜单频繁自动关闭；
	// Windows 侧在 rightClickHandler == nil 时同样自动注册右键打开菜单的默认回调。
	return &managedSystemTray{
		tray: tray,
		dispose: func() {
			if disposeState != nil {
				disposeState()
			}
			if disposeTheme != nil {
				disposeTheme()
			}
		},
	}
}

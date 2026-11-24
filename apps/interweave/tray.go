package main

import (
	_ "embed"
	"sync"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed build/appicon.png
var trayIcon []byte

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

// handleWindowClose 决定窗口关闭请求是隐藏到系统托盘还是按默认路径退出。
// 开启最小化到托盘时取消关闭事件并隐藏窗口，返回 true；否则放行关闭并触发 quit，返回 false。
// macOS 上为避免 window.Hide()（orderOut:）误触发 ApplicationShouldTerminateAfterLastWindowClosed，
// 该选项必须保持关闭，因此未开启最小化到托盘时的退出由这里显式驱动。
func handleWindowClose(minimizeToTray bool, cancel func(), hide func(), quit func()) bool {
	if !minimizeToTray {
		if quit != nil {
			quit()
		}
		return false
	}
	if cancel != nil {
		cancel()
	}
	if hide != nil {
		hide()
	}
	return true
}

// buildTrayMenu 构建系统托盘菜单，提供显示主窗口与退出应用入口。
func buildTrayMenu(onShow func(), onQuit func()) *application.Menu {
	trayMenu := application.NewMenu()
	trayMenu.Add("显示 Interweave").OnClick(func(*application.Context) {
		if onShow != nil {
			onShow()
		}
	})
	trayMenu.AddSeparator()
	trayMenu.Add("退出 Interweave").OnClick(func(*application.Context) {
		if onQuit != nil {
			onQuit()
		}
	})
	return trayMenu
}

// trayHandle 抽象系统托盘的销毁能力，便于在单测中验证开关切换时的创建与移除时序。
type trayHandle interface {
	Destroy()
}

// systemTrayController 保证系统托盘的展示状态与「关闭时最小化到托盘」设置严格同步：
// 开启且尚未创建时按需创建，关闭且已存在时立即移除，重复同步保持幂等。
type systemTrayController struct {
	mu      sync.Mutex
	create  func() trayHandle
	destroy func(trayHandle)
	current trayHandle
}

func newSystemTrayController(create func() trayHandle, destroy func(trayHandle)) *systemTrayController {
	return &systemTrayController{
		create:  create,
		destroy: destroy,
	}
}

func (c *systemTrayController) Sync(enabled bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if enabled {
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
func setupSystemTray(app *application.App, window *application.WebviewWindow) *application.SystemTray {
	tray := app.SystemTray.New()
	tray.SetIcon(trayIcon)
	tray.SetTooltip("Interweave")
	tray.SetMenu(buildTrayMenu(
		func() { presentMainWindow(window) },
		func() { app.Quit() },
	))
	tray.OnClick(func() {
		presentMainWindow(window)
	})
	tray.OnRightClick(tray.OpenMenu)
	return tray
}

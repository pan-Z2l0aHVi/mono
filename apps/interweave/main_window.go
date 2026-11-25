package main

import (
	"sync"
	"sync/atomic"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

// mainWindowController 持有「当前主窗口」这一个可变槽位，并拥有轻量模式的状态机：
// 进入轻量模式销毁 WebView 窗口（只保留后端服务与托盘），「主界面」或退出轻量模式时
// 重新创建窗口。Wails v3 的窗口销毁走 WindowClosing 事件链，这里用一次性标志让
// 轻量模式的关闭绕过 shell 的「最小化到托盘 / 退出」分支，交由 Wails 默认钩子释放 WebView。
type mainWindowController struct {
	app     *application.App
	options application.WebviewWindowOptions

	mu      sync.RWMutex
	current *application.WebviewWindow

	onCreated     func(*application.WebviewWindow)
	onClosing     func(*application.WindowEvent)
	onStateChange func(bool)

	stateMu        sync.Mutex
	stateListeners map[uint64]func(bool)
	nextListenerID uint64

	lightMode        atomic.Bool
	destroyRequested atomic.Bool
}

func newMainWindowController(app *application.App, options application.WebviewWindowOptions) *mainWindowController {
	return &mainWindowController{app: app, options: options}
}

func (c *mainWindowController) Window() *application.WebviewWindow {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.current
}

// Create 在 Wails 主线程上新建主窗口，并接好每条窗口独有的事件与关闭钩子。
// 轻量模式切换与托盘「主界面」都会经这里重建窗口。
func (c *mainWindowController) Create() *application.WebviewWindow {
	window := c.app.Window.NewWithOptions(c.options)

	// 上一次销毁请求若因窗口已不可销毁而未消费，不能污染新窗口的下一次关闭。
	c.destroyRequested.Store(false)
	c.setLightMode(false)

	c.mu.Lock()
	c.current = window
	c.mu.Unlock()

	window.RegisterHook(events.Common.WindowClosing, func(event *application.WindowEvent) {
		if c.destroyRequested.CompareAndSwap(true, false) {
			return
		}
		if c.onClosing != nil {
			c.onClosing(event)
		}
	})
	if c.onCreated != nil {
		c.onCreated(window)
	}
	return window
}

func (c *mainWindowController) setLightMode(light bool) {
	if c.lightMode.Swap(light) == light {
		return
	}
	c.notifyStateChange(light)
}

// addStateListener 注册轻量模式状态监听并返回注销函数。托盘会随设置创建/销毁，
// 监听器必须一并注销，否则反复开关托盘会把旧菜单的状态刷新回调层层叠加。
func (c *mainWindowController) addStateListener(listener func(bool)) func() {
	if listener == nil {
		return func() {}
	}
	c.stateMu.Lock()
	defer c.stateMu.Unlock()
	if c.stateListeners == nil {
		c.stateListeners = make(map[uint64]func(bool))
	}
	c.nextListenerID++
	id := c.nextListenerID
	c.stateListeners[id] = listener
	return func() {
		c.stateMu.Lock()
		defer c.stateMu.Unlock()
		delete(c.stateListeners, id)
	}
}

func (c *mainWindowController) notifyStateChange(light bool) {
	if c.onStateChange != nil {
		c.onStateChange(light)
	}
	c.stateMu.Lock()
	listeners := make([]func(bool), 0, len(c.stateListeners))
	for _, listener := range c.stateListeners {
		listeners = append(listeners, listener)
	}
	c.stateMu.Unlock()
	for _, listener := range listeners {
		listener(light)
	}
}

func (c *mainWindowController) IsLightMode() bool {
	return c.lightMode.Load()
}

// Present 保证有窗口可见并置前；轻量模式下先重建 WebView。
func (c *mainWindowController) Present() {
	window := c.Window()
	if window == nil || c.IsLightMode() {
		window = c.Create()
	}
	presentMainWindow(window)
}

// EnterLightMode 销毁 WebView，保留应用、后端服务与托盘。重复进入保持幂等。
func (c *mainWindowController) EnterLightMode() bool {
	window := c.Window()
	if window == nil || c.IsLightMode() {
		return false
	}

	c.destroyRequested.Store(true)
	c.setLightMode(true)
	c.mu.Lock()
	c.current = nil
	c.mu.Unlock()
	window.Close()
	return true
}

// LeaveLightMode 重建 WebView 并置前。非轻量模式下等价于 Present。
func (c *mainWindowController) LeaveLightMode() bool {
	if !c.IsLightMode() {
		c.Present()
		return false
	}
	c.Present()
	return true
}

// ToggleLightMode 返回切换后是否处于轻量模式。
func (c *mainWindowController) ToggleLightMode() bool {
	if c.IsLightMode() {
		c.LeaveLightMode()
		return false
	}
	c.EnterLightMode()
	return true
}

// emitToCurrentWindow 把应用级事件发往当前 WebView；轻量模式下没有窗口时静默丢弃。
func emitToCurrentWindow(windows *mainWindowController, name string, data ...any) {
	if window := windows.Window(); window != nil {
		window.EmitEvent(name, data...)
	}
}

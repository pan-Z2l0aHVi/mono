package main

import (
	"sync"
	"sync/atomic"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

// mainWindowController 持有「当前主窗口」这一个可变槽位，并拥有轻量模式的状态机：
// 进入轻量模式销毁 WebView 窗口（只保留后端服务与托盘），「主界面」或退出轻量模式时
// 重新创建窗口。Wails v3 的窗口销毁走 WindowClosing 事件链，这里用每窗口独有的一次性
// 意图让轻量模式的关闭绕过 shell 的「最小化到托盘 / 退出」分支，交由 Wails 默认钩子释放 WebView。
//
// 托盘菜单回调、Dock reopen 与文件/URL 拖放各自跑在不同 goroutine；所有状态转换统一派到
// Wails main queue 串行执行（从 main queue 调用时 InvokeSync 内联，不会自锁）。不能用 Go
// mutex 串行化：菜单回调持锁后调用 window.Close()/InvokeSync 会等 main，而 main 上的托盘
// 左键又要同一把锁，形成互等。串行化放在 main queue 上则没有这层反向依赖。
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

	lightMode atomic.Bool
	// closeIntent 始终指向当前窗口独有的销毁意图。轻量模式的 Close 是异步事件，
	// 若用全局标志，快速退出轻量模式时新窗口会重置它，旧窗口的关闭就会误走
	// shell 的「最小化到托盘」分支并隐藏新窗口。按窗口持有可彻底隔离。
	closeIntent atomic.Pointer[windowCloseIntent]
}

// windowCloseIntent 标记某个窗口的关闭是轻量模式主动销毁 WebView，而非用户关闭。
type windowCloseIntent struct {
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

// Create 新建主窗口并接好每条窗口独有的事件与关闭钩子。只在启动阶段（app.Run 之前）
// 直接调用；运行期重建统一走 presentOnMain，以保证状态转换都在 main queue 上串行。
func (c *mainWindowController) Create() *application.WebviewWindow {
	return c.createOnMain()
}

func (c *mainWindowController) createOnMain() *application.WebviewWindow {
	window := c.app.Window.NewWithOptions(c.options)
	intent := &windowCloseIntent{}
	c.closeIntent.Store(intent)

	c.setLightMode(false)

	c.mu.Lock()
	c.current = window
	c.mu.Unlock()

	window.RegisterHook(events.Common.WindowClosing, c.closeHook(intent))
	if c.onCreated != nil {
		c.onCreated(window)
	}
	return window
}

// closeHook 决定一次 WindowClosing 是轻量模式主动销毁还是用户关闭：
// 主动销毁时消费本窗口的意图且不取消事件，Wails 默认监听器随即 close 原生窗口并释放
// WebView；用户关闭则交给 shell 决定隐藏到托盘还是退出。
func (c *mainWindowController) closeHook(intent *windowCloseIntent) func(*application.WindowEvent) {
	return func(event *application.WindowEvent) {
		if intent.destroyRequested.CompareAndSwap(true, false) {
			return
		}
		if c.onClosing != nil {
			c.onClosing(event)
		}
	}
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
	application.InvokeSync(c.presentOnMain)
}

func (c *mainWindowController) presentOnMain() {
	window := c.Window()
	if window == nil || c.IsLightMode() {
		window = c.createOnMain()
	}
	presentMainWindow(window)
}

// EnterLightMode 销毁 WebView，保留应用、后端服务与托盘。重复进入保持幂等。
func (c *mainWindowController) EnterLightMode() bool {
	var entered bool
	application.InvokeSync(func() { entered = c.enterLightModeOnMain() })
	return entered
}

func (c *mainWindowController) enterLightModeOnMain() bool {
	window := c.Window()
	if window == nil || c.IsLightMode() {
		return false
	}

	if intent := c.closeIntent.Load(); intent != nil {
		intent.destroyRequested.Store(true)
	}
	c.setLightMode(true)
	c.mu.Lock()
	c.current = nil
	c.mu.Unlock()
	window.Close()
	return true
}

// LeaveLightMode 重建 WebView 并置前。非轻量模式下等价于 Present。
func (c *mainWindowController) LeaveLightMode() bool {
	var left bool
	application.InvokeSync(func() { left = c.leaveLightModeOnMain() })
	return left
}

func (c *mainWindowController) leaveLightModeOnMain() bool {
	wasLight := c.IsLightMode()
	c.presentOnMain()
	return wasLight
}

// ToggleLightMode 返回切换后是否处于轻量模式。
func (c *mainWindowController) ToggleLightMode() bool {
	var inLight bool
	application.InvokeSync(func() {
		if c.IsLightMode() {
			c.leaveLightModeOnMain()
			return
		}
		c.enterLightModeOnMain()
		inLight = true
	})
	return inLight
}

// emitToCurrentWindow 把应用级事件发往当前 WebView；轻量模式下没有窗口时静默丢弃。
func emitToCurrentWindow(windows *mainWindowController, name string, data ...any) {
	if window := windows.Window(); window != nil {
		window.EmitEvent(name, data...)
	}
}

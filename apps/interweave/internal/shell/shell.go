// cspell:ignore maximised unfullscreen unmaximised

package shell

import (
	"context"
	"log"
	"slices"
	"sync"

	menucontract "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu"
)

// MenuState 是原生菜单物化的不可变值快照。
// DisabledCommands 始终按字典序去重排序，消除 map 迭代无序导致的误判抖动。
type MenuState struct {
	DisabledCommands []menucontract.Command
}

// NormalizeMenuState 构造规范化后的不可变 MenuState 快照。
func NormalizeMenuState(disabled []menucontract.Command) MenuState {
	if len(disabled) == 0 {
		return MenuState{}
	}
	sorted := make([]menucontract.Command, len(disabled))
	copy(sorted, disabled)
	slices.Sort(sorted)
	sorted = slices.Compact(sorted)
	return MenuState{
		DisabledCommands: sorted,
	}
}

// Equal 判断两份规范化后的菜单快照是否完全等价。
func (s MenuState) Equal(other MenuState) bool {
	return slices.Equal(s.DisabledCommands, other.DisabledCommands)
}

// IsDisabled 判断指定命令是否在快照的禁用集合中。
func (s MenuState) IsDisabled(command menucontract.Command) bool {
	_, found := slices.BinarySearch(s.DisabledCommands, command)
	return found
}

// DesktopHost 是桌面壳依赖宿主窗口与原生菜单物化的最小接缝。
// 生产环境由 package main 的 wailsDesktopHost 实现，测试由 fakeDesktopHost 实现，
// 使 internal/shell 零导入 Wails/native 包即可在任意平台运行 -race 测试。
type DesktopHost interface {
	WindowSizeController
	DockDropSink

	HideWindow()
	QuitApp()
	ReloadWindow()
	ToggleMaximise()
	EmitMenuCommand(command menucontract.Command)
	OpenExternal(ctx context.Context, targetURL string) error
	InstallMenu(state MenuState, sink func(menucontract.Command))
}

// StateSource 是桌面壳读取设置与菜单可用性快照的纯 Go 窄接缝，
// 避免 internal/shell 间接依赖 Wails CGO 包。
type StateSource interface {
	MinimizeToTrayOnCloseEnabled() bool
	DisabledCommands() []menucontract.Command
	ZoomIn(ctx context.Context) error
	ZoomOut(ctx context.Context) error
	ZoomReset(ctx context.Context) error
}

// Config 描述桌面壳的窗口尺寸边界与外部发布页地址。
type Config struct {
	MinSize      WindowSize
	FallbackSize WindowSize
	ReleasesURL  string
}

// DesktopShell 收敛 Interweave 桌面壳编排逻辑：
// 窗口关闭最小化到托盘、窗口模式往返切换、冷启动 Dock/URL 拖放缓冲、
// 菜单命令分发以及串行去重的原生菜单同步安装。
type DesktopShell struct {
	host        DesktopHost
	state       StateSource
	releasesURL string
	windowMode  *WindowModeToggler
	dockDrop    *DockDropDispatcher

	// menuInstallMu 串行化原生菜单快照回读、比对与物化，防止并发变更时出现
	// S2 → S1 乱序覆盖。该锁位于外层，只单向调用 state 的只读快照方法，不与
	// settings/menu 内部锁交叉（遵守 ADR-0024 §3）。
	menuInstallMu sync.Mutex
	menuInstalled bool
	lastMenuState MenuState
}

// NewDesktopShell 创建桌面壳控制器。
func NewDesktopShell(host DesktopHost, state StateSource, cfg Config) *DesktopShell {
	return &DesktopShell{
		host:        host,
		state:       state,
		releasesURL: cfg.ReleasesURL,
		windowMode:  NewWindowModeToggler(cfg.MinSize, cfg.FallbackSize),
		dockDrop:    NewDockDropDispatcher(host),
	}
}

// SyncMenu 在独立串行安装锁内回读最新菜单快照并与上次安装快照比对；
// 仅在首次安装或菜单相关状态真实变化时触发宿主物化，返回本次是否执行了物化。
func (s *DesktopShell) SyncMenu() bool {
	s.menuInstallMu.Lock()
	defer s.menuInstallMu.Unlock()

	next := NormalizeMenuState(s.state.DisabledCommands())
	if s.menuInstalled && s.lastMenuState.Equal(next) {
		return false
	}
	s.host.InstallMenu(next, s.HandleMenuCommand)
	s.lastMenuState = next
	s.menuInstalled = true
	return true
}

// HandleMenuCommand 分发原生菜单触发的命令：窗口/OS/缩放命令在 Go 侧执行，
// 其余命令通过宿主事件转发给前端。
func (s *DesktopShell) HandleMenuCommand(command menucontract.Command) {
	switch command {
	case menucontract.CommandReloadWindow:
		s.host.ReloadWindow()
	case menucontract.CommandMaximiseWindow:
		s.host.ToggleMaximise()
	case menucontract.CommandToggleWindowMode:
		s.windowMode.Toggle(s.host)
	case menucontract.CommandZoomIn:
		s.applyZoom(s.state.ZoomIn)
	case menucontract.CommandZoomOut:
		s.applyZoom(s.state.ZoomOut)
	case menucontract.CommandZoomReset:
		s.applyZoom(s.state.ZoomReset)
	case menucontract.CommandCheckForUpdates:
		if err := s.host.OpenExternal(context.Background(), s.releasesURL); err != nil {
			log.Printf("interweave: failed to open the releases page: %v", err)
		}
	default:
		s.host.EmitMenuCommand(command)
	}
}

func (s *DesktopShell) applyZoom(change func(context.Context) error) {
	if err := change(context.Background()); err != nil {
		log.Printf("interweave: failed to change the interface zoom: %v", err)
	}
}

// HandleWindowClosing 决定窗口关闭请求是隐藏到系统托盘还是显式退出。
// 开启最小化到托盘时取消关闭事件并隐藏窗口，返回 true；否则放行关闭并触发宿主退出，返回 false。
// macOS 上为避免 window.Hide() 误触发 ApplicationShouldTerminateAfterLastWindowClosed，
// 该选项保持关闭，因此未开启最小化到托盘时的退出由这里显式驱动。
func (s *DesktopShell) HandleWindowClosing(cancel func()) bool {
	if !s.state.MinimizeToTrayOnCloseEnabled() {
		s.host.QuitApp()
		return false
	}
	if cancel != nil {
		cancel()
	}
	s.host.HideWindow()
	return true
}

// PresentWindow 将主窗口恢复并置前聚焦。
func (s *DesktopShell) PresentWindow() {
	s.host.PresentWindow()
}

// MarkRuntimeReady 标记前端运行时就绪并冲刷冷启动期间缓冲的 Dock/URL 拖放事件。
func (s *DesktopShell) MarkRuntimeReady() {
	s.dockDrop.MarkReady()
}

// MarkWindowUnready 在轻量模式销毁 WebView 后退回缓冲态，等新窗口就绪再派发拖放事件。
func (s *DesktopShell) MarkWindowUnready() {
	s.dockDrop.ResetReady()
}

// ReinstallMenu 在新窗口创建后强制重装一次菜单：SyncMenu 的状态比对会认为菜单没变而跳过，
// 但原生菜单条与 Windows 顶栏快照都挂在具体窗口上。
func (s *DesktopShell) ReinstallMenu() {
	s.menuInstallMu.Lock()
	s.menuInstalled = false
	s.menuInstallMu.Unlock()
	s.SyncMenu()
}

// HandleOpenedFiles 处理经 Dock/系统打开传入的文件路径列表。
func (s *DesktopShell) HandleOpenedFiles(paths []string) {
	s.dockDrop.HandleOpenedFiles(paths)
}

// HandleLaunchedURL 处理经系统协议传入的启动 URL。
func (s *DesktopShell) HandleLaunchedURL(raw string) {
	s.dockDrop.HandleLaunchedURL(raw)
}

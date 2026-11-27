// Package menu 拥有顶部菜单的跨端契约：事件名与命令枚举。菜单树的构建与平台分支
// 在 backend/native/menu；本包还持有菜单可用性 Service——禁用集合是菜单的呈现状态，
// 不落盘、跨会话无关，所以不放进 backend/settings。
package menu

// CommandEventName 是菜单命令的推送事件。菜单点击不按项拆事件：载荷统一为 MenuCommand，
// 前端按 command 分发，新增菜单项只需要两端各加一个枚举值。
const CommandEventName = "menu:command"

// TreeChangedEventName 是自定义顶栏菜单树（Windows 一体化顶栏）的更新推送事件。
const TreeChangedEventName = "menu:tree-changed"

// Role 是自定义顶栏菜单中系统角色条目的跨端动作标识。
const (
	RoleAbout       = "about"
	RoleQuit        = "quit"
	RoleMinimise    = "minimise"
	RoleCloseWindow = "close-window"
	RoleUndo        = "undo"
	RoleRedo        = "redo"
	RoleCut         = "cut"
	RoleCopy        = "copy"
	RolePaste       = "paste"
	RoleDelete      = "delete"
	RoleSelectAll   = "select-all"
)

// MenuItem 是推送给自定义顶栏（Windows）的可序列化菜单节点。
// 形状、文案、快捷键与禁用态全部由 Go 侧生成，前端只负责呈现与回调触发。
type MenuItem struct {
	Label       string     `json:"label"`
	Separator   bool       `json:"separator,omitempty"`
	Disabled    bool       `json:"disabled,omitempty"`
	Accelerator string     `json:"accelerator,omitempty"`
	Command     Command    `json:"command,omitempty"`
	Role        string     `json:"role,omitempty"`
	Children    []MenuItem `json:"children,omitempty"`
}

// Command 是菜单命令的字符串枚举。前端据此分发，Go 侧据此构建菜单项。
type Command string

const (
	CommandAddResource         Command = "add-resource"
	CommandImportFromClipboard Command = "import-from-clipboard"
	CommandImportFromLink      Command = "import-from-link"
	CommandToggleSidebar       Command = "toggle-sidebar"
	CommandToggleFilterBar     Command = "toggle-filter-bar"
	CommandFocusSearch         Command = "focus-search"
	CommandNavigateBack        Command = "navigate-back"
	CommandNavigateForward     Command = "navigate-forward"
	CommandOpenSettings        Command = "open-settings"
	CommandCheckForUpdates     Command = "check-for-updates"
	CommandOpenDocumentation   Command = "open-documentation"
	CommandReloadWindow        Command = "reload-window"
	CommandCopyAsPlainText     Command = "copy-as-plain-text"
	CommandPasteAsPlainText    Command = "paste-as-plain-text"
	// CommandMaximiseWindow 只在 Windows 的「窗口 › 最大化」出现：Wails 的 Zoom role
	// 在 Win32 侧是空实现（windowsWebviewWindow.zoom 直接 Noop），窗口最大化要走
	// Maximise。与 reload-window 一样由 Go 直接执行，不经前端。
	CommandMaximiseWindow Command = "maximise-window"

	// CommandToggleWindowMode 在两端「窗口」菜单首位出现，用于切换最小窗口尺寸与恢复原尺寸。
	// 直接操作 Wails 窗口尺寸，由 Go 侧执行，不经前端。
	CommandToggleWindowMode Command = "toggle-window-mode"

	// 页内缩放三项也由 Go 直接执行：它们改的是 backend/settings 里的缩放档位，前端拿到
	// 快照后把档位落到窗口上。Wails 的 ZoomIn / ZoomOut / ResetZoom role 在 macOS 没有
	// 对应 selector（`roleToSelector` 里没有它们），Win32 侧也不消费 role，用 role 建出来的
	// 条目两端点了都不动。
	CommandZoomIn    Command = "zoom-in"
	CommandZoomOut   Command = "zoom-out"
	CommandZoomReset Command = "zoom-reset"
)

// MenuCommand 是菜单命令事件的载荷。
//
// Payload 用 map[string]string 而不是 any：当前所有命令都没有参数，将来需要传参时
// 字符串表足以覆盖「打开哪个面板」这类上下文，同时保持前端侧一次性解析即可用。
type MenuCommand struct {
	Command Command           `json:"command"`
	Payload map[string]string `json:"payload"`
}

// IsCommand 判断一个字符串是否是已知命令。前端收到事件后先用它过滤，
// 畸形载荷必须静默忽略而不是抛出去——推送不可信。
func IsCommand(value string) bool {
	switch Command(value) {
	case CommandAddResource,
		CommandImportFromClipboard,
		CommandImportFromLink,
		CommandToggleSidebar,
		CommandToggleFilterBar,
		CommandFocusSearch,
		CommandNavigateBack,
		CommandNavigateForward,
		CommandOpenSettings,
		CommandCheckForUpdates,
		CommandOpenDocumentation,
		CommandReloadWindow,
		CommandCopyAsPlainText,
		CommandPasteAsPlainText,
		CommandMaximiseWindow,
		CommandToggleWindowMode,
		CommandZoomIn,
		CommandZoomOut,
		CommandZoomReset:
		return true
	}
	return false
}

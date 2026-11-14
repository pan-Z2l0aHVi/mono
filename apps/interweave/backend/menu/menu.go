// Package menu 拥有顶部菜单的跨端契约：事件名与命令枚举。菜单树的构建与平台分支
// 在 backend/native/menu；本包只放前端与 Go 都要认同一份的词汇，不注册 Wails Service。
package menu

// CommandEventName 是菜单命令的推送事件。菜单点击不按项拆事件：载荷统一为 MenuCommand，
// 前端按 command 分发，新增菜单项只需要两端各加一个枚举值。
const CommandEventName = "menu:command"

// Command 是菜单命令的字符串枚举。前端据此分发，Go 侧据此构建菜单项。
type Command string

const (
	CommandAddResource         Command = "add-resource"
	CommandPasteFiles          Command = "paste-files"
	CommandRefreshAvailability Command = "refresh-availability"
	CommandToggleSidebar       Command = "toggle-sidebar"
	CommandOpenSettings        Command = "open-settings"
	CommandReloadWindow        Command = "reload-window"
	CommandOpenDevTools        Command = "open-devtools"
	CommandOpenDocumentation   Command = "open-documentation"
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
		CommandPasteFiles,
		CommandRefreshAvailability,
		CommandToggleSidebar,
		CommandOpenSettings,
		CommandReloadWindow,
		CommandOpenDevTools,
		CommandOpenDocumentation:
		return true
	}
	return false
}

package menu

import (
	"runtime"

	"github.com/wailsapp/wails/v3/pkg/application"

	menucontract "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu"
)

// Node 是菜单树的一项，与 Wails 解耦：它描述「长什么样」，物化成 *application.Menu 是
// Build 的事。分成两层是因为 Wails 的部分 role 在构造期就要读全局 app，
// 而菜单的形状（顶层顺序、文案、快捷键、命令归属）应该能脱离应用实例被直接断言。
type Node struct {
	// Label 是菜单项文案；子菜单节点也用它当菜单位标题。
	Label string
	// Role 非 NoRole 时该条目挂系统 role（macOS 走 responder chain 的 selector）。
	// 文案与快捷键仍由本节点给出：Wails 自带的是英文 label 与它自己的键位，
	// 而本应用要求菜单文案全中文、键位由应用决定。
	Role application.Role
	// Separator 为真时该节点是分隔线，其余字段无意义。
	Separator bool
	// Accelerator 是快捷键；空表示不挂。Role 条目也给，避免沿用 Wails 的英文键位表。
	Accelerator string
	// Command 是点击时要报告的命令；空表示该条目没有业务回调（系统 role 或纯展示）。
	Command menucontract.Command
	// Placeholder 为真时该条目只展示、不可点击：命令尚未实现的能力用它占位，
	// 而不是让它假装可用。
	Placeholder bool
	// Children 非空时该节点是子菜单。
	Children []Node
}

func separator() Node { return Node{Separator: true} }

// roleNode 建一个挂系统 role、但文案与快捷键由应用给定的条目。
func roleNode(role application.Role, label string, accelerator string) Node {
	return Node{Role: role, Label: label, Accelerator: accelerator}
}

func commandNode(label string, accelerator string, command menucontract.Command) Node {
	return Node{Label: label, Accelerator: accelerator, Command: command}
}

// placeholderNode 建一个置灰占位条目：能力存在但不属于本轮实现范围。
func placeholderNode(label string) Node {
	return Node{Label: label, Placeholder: true}
}

// roleMenu 建一个挂系统 role 的子菜单容器：macOS 用它把该子菜单注册成
// NSApp 的服务菜单或窗口菜单，系统才知道往哪里塞内容。
func roleMenu(role application.Role, label string, children ...Node) Node {
	return Node{Role: role, Label: label, Children: children}
}

func submenu(label string, children ...Node) Node {
	return Node{Label: label, Children: children}
}

// Describe 按平台给出完整菜单树。它不碰 Wails 的全局状态，是菜单形状的唯一来源：
// Build 只是把它物化，测试直接断言它的结构。
//
// 开发者菜单不在默认树里：它由 TreeNodes 按设置追加成独立顶层菜单。
func Describe(goos string) []Node {
	mac := isMacOS(goos)

	nodes := make([]Node, 0, 7)
	nodes = append(nodes, appMenu(mac))
	nodes = append(nodes, fileMenu(), editMenu(), viewMenu())
	nodes = append(nodes, windowMenu(mac))
	nodes = append(nodes, helpMenu())
	return nodes
}

func isMacOS(goos string) bool {
	if goos == "" {
		return runtime.GOOS == "darwin"
	}
	return goos == "darwin"
}

// appMenu 是首个顶层菜单，两端同名。
//
// macOS 上它是真正的 App 菜单：系统把「关于 / 服务 / 隐藏 / 全显示 / 退出」放在这里，
// 设了自定义 NSMenu 就必须显式建，且 Wails 自带的文案是英文，这里逐项换成中文。
// Windows 没有 App 菜单这个菜单位，但「关于 / 设置 / 退出」仍需要一个归处；
// 两个隐藏项在 Win32 菜单栏没有任何消费方（popupmenu_windows.go 里 role 零引用），
// 挂上去只是一个点了没反应的条目，所以只在 macOS 出现。
func appMenu(mac bool) Node {
	if !mac {
		return submenu("Interweave",
			roleNode(application.About, "关于 Interweave", ""),
			separator(),
			commandNode("设置…", "CmdOrCtrl+,", menucontract.CommandOpenSettings),
			separator(),
			roleNode(application.Quit, "退出 Interweave", "CmdOrCtrl+Q"),
		)
	}
	return submenu("Interweave",
		roleNode(application.About, "关于 Interweave", ""),
		commandNode("检查更新", "", menucontract.CommandCheckForUpdates),
		separator(),
		// 服务是 macOS 的菜单位容器而不是条目：系统按 role 往里面塞内容。
		roleMenu(application.ServicesMenu, "服务"),
		separator(),
		commandNode("设置…", "CmdOrCtrl+,", menucontract.CommandOpenSettings),
		separator(),
		roleNode(application.Hide, "隐藏 Interweave", "CmdOrCtrl+H"),
		roleNode(application.HideOthers, "隐藏其他", "CmdOrCtrl+OptionOrAlt+H"),
		roleNode(application.UnHide, "全部显示", ""),
		separator(),
		roleNode(application.Quit, "退出 Interweave", "CmdOrCtrl+Q"),
	)
}

func fileMenu() Node {
	// 「导入来自…」是子菜单容器：它本身就是带右箭头的那一行，不另设可点击的父动作。
	return submenu("文件",
		commandNode("导入资源", "", menucontract.CommandAddResource),
		submenu("导入来自…",
			commandNode("剪切板", "CmdOrCtrl+Shift+V", menucontract.CommandImportFromClipboard),
			commandNode("链接", "", menucontract.CommandImportFromLink),
		),
		placeholderNode("导出…"),
	)
}

// editMenu 保留系统编辑 role：macOS 上它们走 responder chain 的 cut:/copy:/paste: 等 selector，
// 是系统级编辑语义；Windows 上 Wails 把它们实现成对当前窗口的编辑命令。
// 文案与键位仍由本应用给定：Wails 的默认 label 是英文。
//
// 末尾的「自动填充 / 听写 / 表情与符号」由 macOS 输入法框架自行注入，不写进本树；
// 「复制为纯文本 / 粘贴为纯文本」是本应用的命令，挂在系统项旁边。
func editMenu() Node {
	return submenu("编辑",
		roleNode(application.Undo, "撤销", "CmdOrCtrl+Z"),
		roleNode(application.Redo, "重做", "CmdOrCtrl+Shift+Z"),
		separator(),
		roleNode(application.Cut, "剪切", "CmdOrCtrl+X"),
		roleNode(application.Copy, "复制", "CmdOrCtrl+C"),
		commandNode("复制为纯文本", "", menucontract.CommandCopyAsPlainText),
		roleNode(application.Paste, "粘贴", "CmdOrCtrl+V"),
		commandNode("粘贴为纯文本", "", menucontract.CommandPasteAsPlainText),
		separator(),
		roleNode(application.Delete, "删除", "backspace"),
		roleNode(application.SelectAll, "全选", "CmdOrCtrl+A"),
		// 不放「查找」：Wails 的 Find role 只设 performTextFinderAction:，不设
		// NSFindPanelAction 的 tag，WKWebView 因此不弹查找栏——挂上去只是一个点了没反应的条目。
	)
}

func viewMenu() Node {
	return submenu("显示",
		// 刷新不挂快捷键：CmdOrCtrl+R 留给开发菜单的「重新载入」，二者语义不同。
		commandNode("刷新", "", menucontract.CommandRefreshLibrary),
		separator(),
		// 缩放三项由 Go 直接执行：Wails 的 ZoomIn / ZoomOut / ResetZoom role 在 macOS
		// 没有 selector、Win32 也不消费 role，用 role 建出来的条目点了没反应。
		commandNode("放大", "CmdOrCtrl+plus", menucontract.CommandZoomIn),
		commandNode("缩小", "CmdOrCtrl+-", menucontract.CommandZoomOut),
		commandNode("默认缩放", "CmdOrCtrl+0", menucontract.CommandZoomReset),
		separator(),
		// 侧边栏开关是单向命令：菜单不发 check 状态回去，避免与 layout 的实际开合形成两份真相。
		commandNode("切换侧边栏", "CmdOrCtrl+B", menucontract.CommandToggleSidebar),
		commandNode("切换筛选栏", "", menucontract.CommandToggleFilterBar),
		// 「搜索」不挂快捷键：CmdOrCtrl+F 仍留给网页原生的页内查找。
		commandNode("搜索", "", menucontract.CommandFocusSearch),
		separator(),
		commandNode("后退", "", menucontract.CommandNavigateBack),
		commandNode("前进", "", menucontract.CommandNavigateForward),
	)
}

// developerMenu 是开发者选项打开时追加的独立顶层菜单。
//
// 两项都必须显式挂回调：Wails 的 Reload/OpenDevTools role 在 production tag 下会被
// 编译成空实现，而本应用要求它们由设置开关控制，而不是由构建 tag 控制。
func developerMenu() Node {
	return submenu("开发",
		commandNode("重新载入", "CmdOrCtrl+R", menucontract.CommandReloadWindow),
		commandNode("开发者控制台", "", menucontract.CommandOpenDevTools),
	)
}

// windowMenu 两端都有，但内容不同。
//
// macOS 上它同时是「窗口」菜单 role 的容器：系统据此往菜单里追加「填充 / 居中 /
// 移动与调整大小」等标准项——那几项不在本树里，也不该由测试断言。
// Windows 没有系统注入，最小化 / 最大化 / 关闭都得自己写。
func windowMenu(mac bool) Node {
	if !mac {
		return submenu("窗口",
			roleNode(application.Minimise, "最小化", "CmdOrCtrl+M"),
			commandNode("最大化", "", menucontract.CommandMaximiseWindow),
			roleNode(application.CloseWindow, "关闭窗口", "CmdOrCtrl+W"),
		)
	}
	return roleMenu(application.WindowMenu, "窗口",
		roleNode(application.Minimise, "最小化", "CmdOrCtrl+M"),
		roleNode(application.Zoom, "缩放", ""),
		separator(),
		roleNode(application.ToggleFullscreen, "全屏", "Ctrl+Cmd+F"),
		roleNode(application.Front, "前置全部窗口", ""),
	)
}

// 两者都只有文档入口，平台差异不在帮助菜单。
//
// 标题必须是「帮助」：AppKit 按标题把顶层菜单认成帮助菜单并加一个只查 macOS 帮助的搜索框，
// 那是系统行为，没有公开 API 可关（改标题会同时改掉菜单栏上显示的名字）。
func helpMenu() Node {
	return submenu("帮助",
		commandNode("Interweave 文档", "", menucontract.CommandOpenDocumentation),
	)
}

// CommandSink 接收一次菜单点击。实现方负责把它转成命令事件发给前端；
// 菜单树本身不关心事件用什么通道送出去。
type CommandSink func(menucontract.Command)

// State 是菜单的呈现状态，由构建时决定：开发者选项控制「开发」菜单在不在，
// 禁用集合控制哪些命令条目置灰。
type State struct {
	DeveloperOptions bool
	Disabled         func(menucontract.Command) bool
}

// Tree 是物化结果：Wails 菜单本体加上各业务条目的点击入口。
//
// 点击入口一并暴露，是因为 Wails 的 MenuItem 回调不可从包外触发，而「哪个 label 对应
// 哪个命令」必须能被主程序与测试直接核对。
type Tree struct {
	Menu *application.Menu
	// handlers 以 label 为键。业务条目的 label 唯一性由 Describe 的表保证，测试对此断言。
	handlers map[string]func()
	// disabled 记录被置灰的条目，供测试与主程序核对。
	disabled map[string]bool
	// isDisabled 是构建时的禁用判据。
	isDisabled func(menucontract.Command) bool
}

// Invoke 触发某个业务条目的点击回调，返回该 label 是否存在。它不检查条目的启用/隐藏状态：
// 那是平台菜单的职责，这里只验证接线。
func (t Tree) Invoke(label string) bool {
	handler, ok := t.handlers[label]
	if !ok {
		return false
	}
	handler()
	return true
}

// Disabled 报告某个 label 是否被置灰。
func (t Tree) Disabled(label string) bool {
	return t.disabled[label]
}

// Build 组装可交给 app.Menu.Set 的菜单。Windows 还需要额外 window.SetMenu，
// 因为 Menu.Update 不重绘已存在的菜单栏。
//
// Build 需要在 application.New 之后调用：Wails 的若干 role 在构造期读全局 app。
func Build(state State, sink CommandSink) Tree {
	tree := Tree{
		Menu:       application.NewMenu(),
		handlers:   make(map[string]func()),
		disabled:   make(map[string]bool),
		isDisabled: state.Disabled,
	}
	tree.materialize(TreeNodes(state), sink)
	return tree
}

// TreeNodes 是 Build 实际物化的节点序列：默认树加上可选的开发者菜单。
// 它是 Build 的唯一输入，测试因此可以断言「实际构建的形状」而不必启动 Wails 应用。
func TreeNodes(state State) []Node {
	nodes := Describe("")
	if !state.DeveloperOptions {
		return nodes
	}
	// 「开发」是独立顶层菜单，追加在末尾，不影响其他菜单的形状。
	cloned := make([]Node, len(nodes), len(nodes)+1)
	copy(cloned, nodes)
	return append(cloned, developerMenu())
}

func (t Tree) materialize(nodes []Node, sink CommandSink) {
	for _, node := range nodes {
		t.add(t.Menu, node, sink)
	}
}

// add 把一个 Node 落到 Wails 菜单上。递归只发生在子菜单上：AddSubmenu 返回的就是子菜单本身。
func (t Tree) add(menu *application.Menu, node Node, sink CommandSink) {
	switch {
	case node.Separator:
		menu.AddSeparator()
	case len(node.Children) > 0:
		t.materializeInto(roleSubmenu(menu, node), node.Children, sink)
	case node.Role != application.NoRole:
		// 系统 role 的文案与键位由本节点覆盖，不沿用 Wails 的英文默认。
		item := menu.Add(node.Label).SetRole(node.Role)
		if node.Accelerator != "" {
			item.SetAccelerator(node.Accelerator)
		}
	case node.Placeholder:
		menu.Add(node.Label).SetEnabled(false)
		t.disabled[node.Label] = true
	default:
		item := menu.Add(node.Label)
		if node.Accelerator != "" {
			item.SetAccelerator(node.Accelerator)
		}
		dispatch := func() {
			if sink != nil {
				sink(node.Command)
			}
		}
		t.handlers[node.Label] = dispatch
		item.OnClick(func(*application.Context) { dispatch() })
		if t.isDisabled != nil && t.isDisabled(node.Command) {
			item.SetEnabled(false)
			t.disabled[node.Label] = true
		}
	}
}

// roleSubmenu 建子菜单并在需要时标上容器 role。
//
// AddSubmenu 只返回子 Menu，拿不到那个 MenuItem，所以容器 role（服务、窗口）只能
// 通过父菜单回查：AddSubmenu 刚把条目追加到末尾，按 label 找回来即可。
func roleSubmenu(menu *application.Menu, node Node) *application.Menu {
	submenu := menu.AddSubmenu(node.Label)
	if node.Role == application.NoRole {
		return submenu
	}
	if item := menu.FindByLabel(node.Label); item != nil {
		item.SetRole(node.Role)
	}
	return submenu
}

func (t Tree) materializeInto(menu *application.Menu, nodes []Node, sink CommandSink) {
	for _, node := range nodes {
		t.add(menu, node, sink)
	}
}

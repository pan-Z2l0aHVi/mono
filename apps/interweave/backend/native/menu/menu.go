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
func Describe(goos string) []Node {
	mac := isMacOS(goos)

	nodes := make([]Node, 0, 6)
	if mac {
		nodes = append(nodes, appMenu())
	}
	nodes = append(nodes, fileMenu(mac), editMenu(mac), viewMenu())
	if mac {
		nodes = append(nodes, windowMenu())
	}
	nodes = append(nodes, helpMenu(mac))
	return nodes
}

func isMacOS(goos string) bool {
	if goos == "" {
		return runtime.GOOS == "darwin"
	}
	return goos == "darwin"
}

// appMenu 只在 macOS 出现：系统把「关于 / 服务 / 隐藏 / 退出」放在这里，
// 其他平台没有这个菜单位。Wails 不会替你补这些，设了自定义 NSMenu 就必须显式建，
// 且它自带的文案是英文，这里逐项换成中文。
func appMenu() Node {
	return submenu("Interweave",
		roleNode(application.About, "关于 Interweave", ""),
		separator(),
		// 服务与窗口两个菜单位在 macOS 上是「容器」而不是条目：系统按 role 往里面塞内容。
		roleMenu(application.ServicesMenu, "服务"),
		separator(),
		roleNode(application.Hide, "隐藏 Interweave", "CmdOrCtrl+H"),
		roleNode(application.HideOthers, "隐藏其他", "CmdOrCtrl+OptionOrAlt+H"),
		roleNode(application.UnHide, "全部显示", ""),
		separator(),
		roleNode(application.Quit, "退出 Interweave", "CmdOrCtrl+Q"),
	)
}

func fileMenu(mac bool) Node {
	children := []Node{
		commandNode("添加资源…", "CmdOrCtrl+O", menucontract.CommandAddResource),
		separator(),
	}
	if mac {
		children = append(children, roleNode(application.CloseWindow, "关闭窗口", "CmdOrCtrl+W"))
	} else {
		children = append(children, roleNode(application.Quit, "退出 Interweave", "CmdOrCtrl+Q"))
	}
	return submenu("文件", children...)
}

// editMenu 保留系统编辑 role：macOS 上它们走 responder chain 的 cut:/copy:/paste: 等 selector，
// 是系统级编辑语义；Windows 上 Wails 把它们实现成对当前窗口的编辑命令。
// 文案与键位仍由本应用给定：Wails 的默认 label 是英文。
// 「粘贴文件」是本应用自己的动作，挂在系统编辑项之后。
func editMenu(mac bool) Node {
	children := []Node{
		roleNode(application.Undo, "撤销", "CmdOrCtrl+Z"),
		roleNode(application.Redo, "重做", "CmdOrCtrl+Shift+Z"),
		separator(),
		roleNode(application.Cut, "剪切", "CmdOrCtrl+X"),
		roleNode(application.Copy, "复制", "CmdOrCtrl+C"),
		roleNode(application.Paste, "粘贴", "CmdOrCtrl+V"),
	}
	if mac {
		children = append(children, roleNode(application.PasteAndMatchStyle, "粘贴并匹配样式", "CmdOrCtrl+OptionOrAlt+Shift+V"))
	}
	children = append(children,
		roleNode(application.Delete, "删除", "backspace"),
		roleNode(application.SelectAll, "全选", "CmdOrCtrl+A"),
		separator(),
		commandNode("粘贴文件", "CmdOrCtrl+Shift+V", menucontract.CommandPasteFiles),
	)
	return submenu("编辑", children...)
}

func viewMenu() Node {
	return submenu("查看",
		commandNode("刷新可用性", "CmdOrCtrl+R", menucontract.CommandRefreshAvailability),
		separator(),
		// 侧边栏开关是单向命令：菜单不发 check 状态回去，避免与 layout 的实际开合形成两份真相。
		commandNode("切换侧边栏", "CmdOrCtrl+B", menucontract.CommandToggleSidebar),
		separator(),
		roleNode(application.ResetZoom, "实际大小", "CmdOrCtrl+0"),
		roleNode(application.ZoomIn, "放大", "CmdOrCtrl+plus"),
		roleNode(application.ZoomOut, "缩小", "CmdOrCtrl+-"),
		separator(),
		roleNode(application.ToggleFullscreen, "切换全屏", "Ctrl+Cmd+F"),
		separator(),
		// 「设置…」两端同位置：macOS 的系统惯例是塞进 App 菜单，但那里由系统 role 整段生成，
		// 拆开重建的收益不及两端一致。
		commandNode("设置…", "CmdOrCtrl+,", menucontract.CommandOpenSettings),
	)
}

// developerMenu 是「查看」末尾的开发者选项分组，只在设置开启时追加。
// 两项都必须显式挂回调：Wails 的 Reload/OpenDevTools role 在 production tag 下会被
// 编译成空实现，而本应用要求它们由设置开关控制，而不是由构建 tag 控制。
func developerMenu() []Node {
	return []Node{
		separator(),
		commandNode("重新载入", "CmdOrCtrl+Alt+R", menucontract.CommandReloadWindow),
		commandNode("开发者工具", "CmdOrCtrl+Alt+I", menucontract.CommandOpenDevTools),
	}
}

// windowMenu 只在 macOS 出现：Windows 没有系统窗口菜单这一个菜单位。
// 它同时是「窗口」菜单 role 的容器：系统据此把窗口列表挂进来。
func windowMenu() Node {
	return roleMenu(application.WindowMenu, "窗口",
		roleNode(application.Minimise, "最小化", "CmdOrCtrl+M"),
		roleNode(application.Zoom, "缩放", ""),
		separator(),
		roleNode(application.Front, "前置全部窗口", ""),
	)
}

func helpMenu(mac bool) Node {
	children := []Node{
		commandNode("Interweave 文档", "", menucontract.CommandOpenDocumentation),
	}
	if !mac {
		// 没有 App 菜单的平台把「关于」放这里；About role 走原生关于面板，
		// 它显示 Name / Description / Icon，版本号由 main.go 拼进 Description。
		children = append(children, separator(), roleNode(application.About, "关于 Interweave", ""))
	}
	return submenu("帮助", children...)
}

// CommandSink 接收一次菜单点击。实现方负责把它转成命令事件发给前端；
// 菜单树本身不关心事件用什么通道送出去。
type CommandSink func(menucontract.Command)

// Tree 是物化结果：Wails 菜单本体加上各业务条目的点击入口。
//
// 点击入口一并暴露，是因为 Wails 的 MenuItem 回调不可从包外触发，而「哪个 label 对应
// 哪个命令」必须能被主程序与测试直接核对。
type Tree struct {
	Menu *application.Menu
	// handlers 以 label 为键。业务条目的 label 唯一性由 Describe 的表保证，测试对此断言。
	handlers map[string]func()
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

// Build 组装可交给 app.Menu.Set 的菜单。Windows 还需要额外 window.SetMenu，
// 因为 Menu.Update 不重绘已存在的菜单栏。
//
// Build 需要在 application.New 之后调用：Wails 的若干 role 在构造期读全局 app。
func Build(developerOptions bool, sink CommandSink) Tree {
	tree := Tree{Menu: application.NewMenu(), handlers: make(map[string]func())}
	tree.materialize(TreeNodes(developerOptions), sink)
	return tree
}

// TreeNodes 是 Build 实际物化的节点序列：默认树加上可选的开发者分组。
// 它是 Build 的唯一输入，测试因此可以断言「实际构建的形状」而不必启动 Wails 应用。
func TreeNodes(developerOptions bool) []Node {
	nodes := Describe("")
	if !developerOptions {
		return nodes
	}
	cloned := make([]Node, len(nodes))
	copy(cloned, nodes)
	for i := range cloned {
		if cloned[i].Label == "查看" {
			// 开发者分组插在「查看」末尾，而不是另起一个顶层菜单。
			children := make([]Node, len(cloned[i].Children), len(cloned[i].Children)+3)
			copy(children, cloned[i].Children)
			cloned[i].Children = append(children, developerMenu()...)
			break
		}
	}
	return cloned
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

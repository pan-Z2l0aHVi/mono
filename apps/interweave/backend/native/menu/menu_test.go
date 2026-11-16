package menu

import (
	"testing"

	"github.com/wailsapp/wails/v3/pkg/application"

	menucontract "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu"
)

// topLabels 取顶层节点的 label 序列，用来钉住两端各自的顶层结构。
func topLabels(nodes []Node) []string {
	labels := make([]string, 0, len(nodes))
	for _, node := range nodes {
		labels = append(labels, node.Label)
	}
	return labels
}

// labelsOf 展开某个子菜单节点的 label 序列，跳过分隔线：「有一条分隔线」不是结构契约，
// 「这些文案按这个顺序出现」才是。
func labelsOf(nodes []Node, top string) []string {
	for _, node := range nodes {
		if node.Label != top {
			continue
		}
		labels := make([]string, 0, len(node.Children))
		for _, child := range node.Children {
			if child.Separator {
				continue
			}
			labels = append(labels, child.Label)
		}
		return labels
	}
	return nil
}

func assertOrder(t *testing.T, got []string, want []string) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("expected %v, got %v", want, got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected %v, got %v", want, got)
		}
	}
}

func contains(labels []string, want string) bool {
	for _, label := range labels {
		if label == want {
			return true
		}
	}
	return false
}

// 两端的第一层结构一致：首个是 Interweave 菜单，其余按功能排列。
// 开发者菜单不在这里——它由设置控制，是 TreeNodes 的事。
func TestDescribeTopLevelMenus(t *testing.T) {
	assertOrder(t, topLabels(Describe("darwin")), []string{"Interweave", "文件", "编辑", "显示", "窗口", "帮助"})
	assertOrder(t, topLabels(Describe("windows")), []string{"Interweave", "文件", "编辑", "显示", "窗口", "帮助"})
}

func TestDescribeInterweaveMenu(t *testing.T) {
	// macOS 的 App 菜单带两个隐藏项与服务菜单位；Windows 没有可消费 role 的条目，不带它们。
	assertOrder(t, labelsOf(Describe("darwin"), "Interweave"), []string{
		"关于 Interweave", "检查更新", "服务", "设置…", "隐藏 Interweave", "隐藏其他", "全部显示", "退出 Interweave",
	})
	assertOrder(t, labelsOf(Describe("windows"), "Interweave"), []string{
		"关于 Interweave", "设置…", "退出 Interweave",
	})
}

func TestDescribeFileMenu(t *testing.T) {
	assertOrder(t, labelsOf(Describe("darwin"), "文件"), []string{"导入资源", "导入来自…", "导出…"})

	importFrom, ok := findNode(Describe("darwin"), "导入来自…")
	if !ok {
		t.Fatal("expected the import submenu")
	}
	assertOrder(t, []string{importFrom.Children[0].Label, importFrom.Children[1].Label}, []string{"剪切板", "链接"})
	if importFrom.Command != "" {
		t.Fatal("the import submenu is a container, it must not carry a click command")
	}
}

func TestDescribeEditMenu(t *testing.T) {
	assertOrder(t, labelsOf(Describe("darwin"), "编辑"), []string{
		"撤销", "重做", "剪切", "复制", "复制为纯文本", "粘贴", "粘贴为纯文本", "删除", "全选",
	})
}

func TestDescribeViewMenu(t *testing.T) {
	assertOrder(t, labelsOf(Describe("darwin"), "显示"), []string{
		"刷新", "放大", "缩小", "默认缩放", "切换侧边栏", "切换筛选栏", "搜索", "后退", "前进",
	})
}

func TestDescribeWindowMenu(t *testing.T) {
	// macOS 的窗口菜单只写应用自己的两项；填充 / 居中 / 移动与调整大小由 AppKit 注入。
	assertOrder(t, labelsOf(Describe("darwin"), "窗口"), []string{"最小化", "缩放", "全屏", "前置全部窗口"})
	assertOrder(t, labelsOf(Describe("windows"), "窗口"), []string{"最小化", "最大化", "关闭窗口"})
}

func TestDescribeHelpMenu(t *testing.T) {
	// 「关于」两端都在首个菜单里，帮助菜单只剩文档入口一条。
	assertOrder(t, labelsOf(Describe("darwin"), "帮助"), []string{"Interweave 文档"})
	assertOrder(t, labelsOf(Describe("windows"), "帮助"), []string{"Interweave 文档"})
}

// 「检查更新」在 App 菜单；隐藏项只在 macOS。
func TestDescribePlatformSpecificItems(t *testing.T) {
	mac := Describe("darwin")
	win := Describe("windows")

	if !contains(labelsOf(mac, "Interweave"), "检查更新") {
		t.Fatal("expected Check for Updates in the macOS app menu")
	}
	for _, hidden := range []string{"隐藏 Interweave", "隐藏其他", "全部显示"} {
		if contains(labelsOf(win, "Interweave"), hidden) {
			t.Fatalf("expected %q to be absent on Windows", hidden)
		}
	}
	// macOS 的填充 / 居中 / 移动与调整大小由系统注入，不进本树。
	for _, injected := range []string{"填充", "居中", "移动与调整大小"} {
		if anyLabel(mac, injected) {
			t.Fatalf("expected %q to be injected by AppKit, not described here", injected)
		}
	}
}

func anyLabel(nodes []Node, want string) bool {
	for _, node := range nodes {
		if node.Label == want {
			return true
		}
		if anyLabel(node.Children, want) {
			return true
		}
	}
	return false
}

func findNode(nodes []Node, label string) (Node, bool) {
	for _, node := range nodes {
		if node.Label == label {
			return node, true
		}
		if child, ok := findNode(node.Children, label); ok {
			return child, true
		}
	}
	return Node{}, false
}

func TestDescribeAccelerators(t *testing.T) {
	cases := map[string]string{
		"设置…":           "CmdOrCtrl+,",
		"导入来自…":         "",
		"剪切板":           "CmdOrCtrl+Shift+V",
		"链接":            "",
		"刷新":            "",
		"切换侧边栏":         "CmdOrCtrl+B",
		"切换筛选栏":         "",
		"搜索":            "",
		"后退":            "",
		"前进":            "",
		"复制为纯文本":        "",
		"粘贴为纯文本":        "",
		"Interweave 文档": "",
	}
	nodes := Describe("darwin")
	for label, want := range cases {
		node, ok := findNode(nodes, label)
		if !ok {
			t.Fatalf("expected %q in the tree", label)
		}
		if node.Accelerator != want {
			t.Fatalf("%q: expected accelerator %q, got %q", label, want, node.Accelerator)
		}
	}
}

// 刷新不与开发菜单的「重新载入」共享键位：两者语义不同。
func TestDescribeKeepsReloadAcceleratorOffTheViewMenu(t *testing.T) {
	if node, ok := findNode(Describe("darwin"), "刷新"); ok && node.Accelerator != "" {
		t.Fatalf("expected Refresh to carry no accelerator, got %q", node.Accelerator)
	}
	if node, ok := findNode(TreeNodes(State{DeveloperOptions: true}), "重新载入"); !ok || node.Accelerator != "CmdOrCtrl+R" {
		t.Fatalf("expected Reload to own CmdOrCtrl+R, got %q (found=%v)", node.Accelerator, ok)
	}
}

// 显示菜单与开发菜单不能挂 Wails 的 Reload role 或 OpenDevTools role：
// 前者会和「重新载入」抢 chord，后者在 production tag 下编译成空实现。
func TestDescribeLeavesBuildTagRolesOut(t *testing.T) {
	for _, goos := range []string{"darwin", "windows"} {
		for _, node := range describeAll(Describe(goos), TreeNodes(State{DeveloperOptions: true})) {
			if node.Role == application.Reload || node.Role == application.ForceReload || node.Role == application.OpenDevTools {
				t.Fatalf("%s: unexpected %d role on %q", goos, node.Role, node.Label)
			}
		}
	}
}

func describeAll(trees ...[]Node) []Node {
	var all []Node
	for _, tree := range trees {
		all = append(all, tree...)
	}
	return all
}

// 开发者菜单是独立顶层菜单，只在开发者选项打开时出现。
func TestDeveloperMenuShape(t *testing.T) {
	closed := TreeNodes(State{})
	if anyLabel(closed, "开发") {
		t.Fatal("expected the developer menu to be absent while the option is off")
	}

	open := TreeNodes(State{DeveloperOptions: true})
	if got := topLabels(open); got[len(got)-1] != "开发" {
		t.Fatalf("expected the developer menu last, got %v", got)
	}
	// 其他菜单的形状不受影响：开发者菜单追加在末尾，不往别的菜单里插。
	assertOrder(t, topLabels(open)[:len(topLabels(closed))], topLabels(closed))
	assertOrder(t, labelsOf(open, "开发"), []string{"重新载入", "开发者控制台"})

	want := map[string]menucontract.Command{
		"重新载入":   menucontract.CommandReloadWindow,
		"开发者控制台": menucontract.CommandOpenDevTools,
	}
	for _, node := range open[len(open)-1].Children {
		if want[node.Label] != node.Command {
			t.Fatalf("%q reports %q, expected %q", node.Label, node.Command, want[node.Label])
		}
	}
}

// 业务条目的 label 在整棵树里必须唯一：Build 的 handlers 以 label 为键，
// 重复会让点击落到错的命令上。判据按平台分开：两端各有自己的树，label 跨平台重复是正常的。
func TestBusinessLabelsAreUnique(t *testing.T) {
	for _, goos := range []string{"darwin", "windows"} {
		seen := make(map[string]bool)
		var walk func(nodes []Node)
		walk = func(nodes []Node) {
			for _, node := range nodes {
				if node.Label != "" && !node.Separator && node.Role == application.NoRole {
					if seen[node.Label] {
						t.Fatalf("%s: duplicate label %q", goos, node.Label)
					}
					seen[node.Label] = true
				}
				walk(node.Children)
			}
		}
		walk(TreeNodes(State{DeveloperOptions: true}))
	}
}

// accelerator 也必须唯一：Windows 的分发靠 chord 查表，重复会让其中一个条目永不触发。
func TestAcceleratorsAreUnique(t *testing.T) {
	for _, goos := range []string{"darwin", "windows"} {
		seen := make(map[string]string)
		var walk func(nodes []Node)
		walk = func(nodes []Node) {
			for _, node := range nodes {
				if node.Accelerator != "" {
					if previous, ok := seen[node.Accelerator]; ok {
						t.Fatalf("%s: %q and %q share the accelerator %q", goos, previous, node.Label, node.Accelerator)
					}
					seen[node.Accelerator] = node.Label
				}
				walk(node.Children)
			}
		}
		walk(Describe(goos))
		walk(developerMenu().Children)
	}
}

// 命令集合必须与 backend/menu 的契约一一对应：Describe 里出现的每个命令都要被
// contract 认作已知命令，否则前端会静默丢掉这次点击。
func TestEveryCommandIsKnownToTheContract(t *testing.T) {
	seen := make(map[menucontract.Command]bool)
	var walk func(nodes []Node)
	walk = func(nodes []Node) {
		for _, node := range nodes {
			if node.Command != "" {
				if !menucontract.IsCommand(string(node.Command)) {
					t.Fatalf("command %q is not part of the contract", node.Command)
				}
				seen[node.Command] = true
			}
			walk(node.Children)
		}
	}
	for _, goos := range []string{"darwin", "windows"} {
		walk(Describe(goos))
	}
	walk(TreeNodes(State{DeveloperOptions: true}))

	for _, want := range []menucontract.Command{
		menucontract.CommandAddResource,
		menucontract.CommandImportFromClipboard,
		menucontract.CommandImportFromLink,
		menucontract.CommandRefreshLibrary,
		menucontract.CommandToggleSidebar,
		menucontract.CommandToggleFilterBar,
		menucontract.CommandFocusSearch,
		menucontract.CommandNavigateBack,
		menucontract.CommandNavigateForward,
		menucontract.CommandOpenSettings,
		menucontract.CommandCheckForUpdates,
		menucontract.CommandOpenDocumentation,
		menucontract.CommandReloadWindow,
		menucontract.CommandOpenDevTools,
		menucontract.CommandCopyAsPlainText,
		menucontract.CommandPasteAsPlainText,
		menucontract.CommandMaximiseWindow,
		menucontract.CommandZoomIn,
		menucontract.CommandZoomOut,
		menucontract.CommandZoomReset,
	} {
		if !seen[want] {
			t.Fatalf("command %q never appears in the menu tree", want)
		}
	}
}

// 「导出…」是占位：它出现、被标成占位、且没有命令——不会伪装成可用能力。
func TestExportIsAPlaceholder(t *testing.T) {
	node, ok := findNode(Describe("darwin"), "导出…")
	if !ok {
		t.Fatal("expected the export placeholder")
	}
	if !node.Placeholder || node.Command != "" {
		t.Fatalf("expected a placeholder without a command, got %+v", node)
	}
}

// 「导入来自…」是容器：它本身没有命令，两个子项各自报告自己的命令。
func TestImportSubmenuReportsItsChildren(t *testing.T) {
	node, ok := findNode(Describe("windows"), "导入来自…")
	if !ok || node.Command != "" {
		t.Fatalf("expected a command-less container, got %+v (found=%v)", node, ok)
	}
	if len(node.Children) != 2 {
		t.Fatalf("expected two import entries, got %d", len(node.Children))
	}
}

// 禁用集合落到 Build 的结果上：对应条目被置灰，菜单项仍然存在（禁用 ≠ 隐藏），
// 未上报的条目保持可用。这里不启动 Wails 应用：Build 只用菜单 API，不碰全局 app。
func TestBuildDisablesReportedCommands(t *testing.T) {
	disabled := map[menucontract.Command]bool{
		menucontract.CommandFocusSearch:     true,
		menucontract.CommandNavigateForward: true,
	}
	tree := Build(State{Disabled: func(command menucontract.Command) bool { return disabled[command] }}, nil)

	if !tree.Disabled("搜索") || !tree.Disabled("前进") {
		t.Fatalf("expected the reported commands to be greyed out, got %v", tree.disabled)
	}
	if tree.Disabled("刷新") || tree.Disabled("切换侧边栏") {
		t.Fatalf("expected unreported commands to stay enabled, got %v", tree.disabled)
	}
	// 置灰不等于隐藏：条目还在树里，点击入口也还接着（平台菜单负责拦截点击）。
	if item := tree.Menu.FindByLabel("搜索"); item == nil {
		t.Fatal("expected the disabled item to remain in the menu")
	}
	if !tree.Invoke("搜索") {
		t.Fatal("expected the disabled item to keep its click wiring")
	}
}

// 占位条目永远置灰，且点击不产生命令。
func TestBuildGreysOutPlaceholders(t *testing.T) {
	var reported []menucontract.Command
	tree := Build(State{}, func(command menucontract.Command) { reported = append(reported, command) })

	if !tree.Disabled("导出…") {
		t.Fatal("expected the export placeholder to be greyed out")
	}
	if tree.Invoke("导出…") {
		t.Fatal("expected the placeholder to carry no click handler")
	}
	if len(reported) != 0 {
		t.Fatalf("expected no command from the placeholder, got %v", reported)
	}
}

// 业务点击只报告自己的命令，一次一条。
func TestBuildReportsTheClickedCommand(t *testing.T) {
	var reported []menucontract.Command
	tree := Build(State{}, func(command menucontract.Command) { reported = append(reported, command) })

	if !tree.Invoke("后退") {
		t.Fatal("expected the Back item to be wired")
	}
	if len(reported) != 1 || reported[0] != menucontract.CommandNavigateBack {
		t.Fatalf("expected a single navigate-back command, got %v", reported)
	}
}

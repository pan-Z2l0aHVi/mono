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

// macOS 有 App 菜单与窗口菜单，且「关于」走 App 菜单而不是帮助。
func TestDescribeMacOSMenuTree(t *testing.T) {
	nodes := Describe("darwin")

	assertOrder(t, topLabels(nodes), []string{"Interweave", "文件", "编辑", "查看", "窗口", "帮助"})

	if labels := labelsOf(nodes, "帮助"); contains(labels, "关于 Interweave") {
		t.Fatal("macOS keeps About in the app menu, not in Help")
	}
}

// Windows 没有 App 菜单与窗口菜单；「关于」落在帮助里。
func TestDescribeWindowsMenuTree(t *testing.T) {
	nodes := Describe("windows")

	assertOrder(t, topLabels(nodes), []string{"文件", "编辑", "查看", "帮助"})

	if labels := labelsOf(nodes, "帮助"); !contains(labels, "关于 Interweave") {
		t.Fatalf("expected About in Help on Windows, got %v", labels)
	}
}

// 两端共用的三个顶层菜单必须逐项一致，除非平台差异是刻意的（文件末尾的关闭/退出、
// 编辑里的系统项）。这里钉住「添加资源 / 粘贴文件 / 刷新可用性 / 设置…」四项在两端都在。
func TestDescribeSharedBusinessItemsAppearOnBothPlatforms(t *testing.T) {
	for _, goos := range []string{"darwin", "windows"} {
		nodes := Describe(goos)
		for _, want := range []string{"添加资源…", "粘贴文件", "刷新可用性", "切换侧边栏", "设置…", "Interweave 文档"} {
			if !anyLabel(nodes, want) {
				t.Fatalf("%s: expected %q somewhere in the tree", goos, want)
			}
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
		"添加资源…":         "CmdOrCtrl+O",
		"粘贴文件":          "CmdOrCtrl+Shift+V",
		"刷新可用性":         "CmdOrCtrl+R",
		"切换侧边栏":         "CmdOrCtrl+B",
		"设置…":           "CmdOrCtrl+,",
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

// 查看菜单不能挂 Wails 的 Reload role：它会和「刷新可用性」抢 Cmd+R，
// 而后者才是本应用的语义。
func TestDescribeLeavesReloadRoleOut(t *testing.T) {
	for _, goos := range []string{"darwin", "windows"} {
		for _, node := range Describe(goos) {
			for _, child := range node.Children {
				if child.Role == application.Reload || child.Role == application.ForceReload {
					t.Fatalf("%s: unexpected %q role in %q", goos, child.Label, node.Label)
				}
			}
		}
	}
}

// 开发者分组不是 Describe 的一部分：它由 Build 按设置追加，Describe 保持「默认菜单」不变。
func TestDescribeExcludesDeveloperItems(t *testing.T) {
	for _, goos := range []string{"darwin", "windows"} {
		if anyLabel(Describe(goos), "开发者工具") {
			t.Fatalf("%s: developer items must not be part of the default tree", goos)
		}
	}
}

func TestDeveloperMenuShape(t *testing.T) {
	nodes := developerMenu()
	if len(nodes) != 3 {
		t.Fatalf("expected separator + two items, got %d nodes", len(nodes))
	}
	if !nodes[0].Separator {
		t.Fatal("expected the developer group to start with a separator")
	}
	want := map[string]menucontract.Command{
		"重新载入":  menucontract.CommandReloadWindow,
		"开发者工具": menucontract.CommandOpenDevTools,
	}
	for _, node := range nodes[1:] {
		if want[node.Label] != node.Command {
			t.Fatalf("%q reports %q, expected %q", node.Label, node.Command, want[node.Label])
		}
		if node.Accelerator == "" {
			t.Fatalf("%q must carry an accelerator", node.Label)
		}
	}
}

// 业务条目的 label 在整棵树里必须唯一：Build 的 handlers 以 label 为键，
// 重复会让点击落到错的命令上。
func TestBusinessLabelsAreUnique(t *testing.T) {
	seen := make(map[string]bool)
	var walk func(nodes []Node)
	walk = func(nodes []Node) {
		for _, node := range nodes {
			if node.Label != "" && !node.Separator && node.Role == application.NoRole {
				if seen[node.Label] {
					t.Fatalf("duplicate label %q", node.Label)
				}
				seen[node.Label] = true
			}
			walk(node.Children)
		}
	}
	walk(Describe("darwin"))
	walk(developerMenu())
}

// accelerator 也必须唯一：Windows 的分发靠 chord 查表，重复会让其中一个条目永不触发。
func TestAcceleratorsAreUnique(t *testing.T) {
	seen := make(map[string]string)
	var walk func(nodes []Node)
	walk = func(nodes []Node) {
		for _, node := range nodes {
			if node.Accelerator != "" {
				if previous, ok := seen[node.Accelerator]; ok {
					t.Fatalf("%q and %q share the accelerator %q", previous, node.Label, node.Accelerator)
				}
				seen[node.Accelerator] = node.Label
			}
			walk(node.Children)
		}
	}
	walk(Describe("darwin"))
	walk(developerMenu())
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
	walk(Describe("darwin"))
	walk(developerMenu())

	for _, want := range []menucontract.Command{
		menucontract.CommandAddResource,
		menucontract.CommandPasteFiles,
		menucontract.CommandRefreshAvailability,
		menucontract.CommandToggleSidebar,
		menucontract.CommandOpenSettings,
		menucontract.CommandReloadWindow,
		menucontract.CommandOpenDevTools,
		menucontract.CommandOpenDocumentation,
	} {
		if !seen[want] {
			t.Fatalf("command %q never appears in the menu tree", want)
		}
	}
}

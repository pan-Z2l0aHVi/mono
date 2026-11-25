// cspell:ignore busctl qdbus gsettings xfconf
package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
)

/*
 * Linux 壁纸命令构造与执行编排，平台无关：`wallpaper_linux.go` 是唯一生产调用方，
 * 单测在全平台都能跑（命令执行通过 commandRunner seam 注入）。
 *
 * 计划分三档语义：
 *   - required：全部必须成功（GNOME 的 picture-uri）；
 *   - alternatives：按序尝试，任一成功即可（KDE 的 busctl / qdbus 二选一）；
 *   - optional：尽力而为，成败不影响结论（GNOME 42+ 才有的 picture-uri-dark）。
 * 空计划视为「不支持该桌面」，由调用方跳过去试下一个桌面分量，绝不假成功。
 */

const (
	wallpaperStepRequired = iota
	wallpaperStepAlternative
	wallpaperStepOptional
)

// wallpaperStep 是计划里的一步：commands 互为备选（required/optional 一步通常只有一条）。
type wallpaperStep struct {
	kind     int
	commands [][]string
}

type commandRunner interface {
	Run(ctx context.Context, name string, args ...string) error
	Output(ctx context.Context, name string, args ...string) ([]byte, error)
}

type linuxWallpaperApplier struct {
	getenv func(string) string
	runner commandRunner
}

func newLinuxWallpaperApplier(getenv func(string) string, runner commandRunner) *linuxWallpaperApplier {
	return &linuxWallpaperApplier{getenv: getenv, runner: runner}
}

func (a *linuxWallpaperApplier) Apply(ctx context.Context, path string) error {
	var xdg string
	if a.getenv != nil {
		xdg = a.getenv("XDG_CURRENT_DESKTOP")
	}
	desktops := desktopsOf(xdg)
	imageURI := fileURIFromPath(path)
	for _, desktop := range desktops {
		if normalizeDesktop(desktop) == "XFCE" {
			if err := a.setXfceWallpaper(ctx, path); err == nil {
				return nil
			}
			continue
		}
		if a.runWallpaperPlan(ctx, wallpaperPlanFor(desktop, imageURI)) {
			return nil
		}
	}
	return fmt.Errorf("wallpaper: setting failed for desktop %q", strings.Join(desktops, ","))
}

// runWallpaperPlan 执行一份计划：required 全部成功且 alternatives 有成功项（无 alternatives 视为满足）
// 才算成功；optional 尽力而为。空计划返回 false。
func (a *linuxWallpaperApplier) runWallpaperPlan(ctx context.Context, plan []wallpaperStep) bool {
	if len(plan) == 0 || a.runner == nil {
		return false
	}
	for _, step := range plan {
		switch step.kind {
		case wallpaperStepRequired:
			for _, command := range step.commands {
				if err := a.runner.Run(ctx, command[0], command[1:]...); err != nil {
					return false
				}
			}
		case wallpaperStepAlternative:
			alternativeOk := false
			for _, command := range step.commands {
				if err := a.runner.Run(ctx, command[0], command[1:]...); err == nil {
					alternativeOk = true
					break
				}
			}
			if !alternativeOk {
				return false
			}
		case wallpaperStepOptional:
			for _, command := range step.commands {
				_ = a.runner.Run(ctx, command[0], command[1:]...)
			}
		}
	}
	return true
}

// setXfceWallpaper 枚举全部 image-path 属性并逐条尝试写本地路径；只要有一条成功即成功，
// 全部失败才报错（XFCE 每个显示器/工作区各有一条属性，只写第一条会留下其余屏幕未换）。
func (a *linuxWallpaperApplier) setXfceWallpaper(ctx context.Context, path string) error {
	if a.runner == nil {
		return fmt.Errorf("wallpaper: command runner is not configured")
	}
	list, err := a.runner.Output(ctx, "xfconf-query", "-c", "xfce4-desktop", "-l", "-v")
	if err != nil {
		return fmt.Errorf("wallpaper: xfconf-query list failed: %w", err)
	}
	props := xfceWallpaperProps(string(list))
	if len(props) == 0 {
		return fmt.Errorf("wallpaper: no xfce image-path property found")
	}
	anyOk := false
	for _, prop := range props {
		command := xfceSetCommandFor(prop, path)
		if err := a.runner.Run(ctx, command[0], command[1:]...); err == nil {
			anyOk = true
		}
	}
	if !anyOk {
		return fmt.Errorf("wallpaper: xfconf-query write failed")
	}
	return nil
}

// wallpaperPlanFor 返回单个桌面的执行计划；不支持或无步骤返回 nil。
// imageURI 是 file:// 形式的壁纸地址（gsettings 与 KDE 都收 URI）。
func wallpaperPlanFor(desktop string, imageURI string) []wallpaperStep {
	switch normalizeDesktop(desktop) {
	case "GNOME", "UNITY":
		return []wallpaperStep{
			{wallpaperStepRequired, [][]string{{"gsettings", "set", "org.gnome.desktop.background", "picture-uri", imageURI}}},
			{wallpaperStepOptional, [][]string{{"gsettings", "set", "org.gnome.desktop.background", "picture-uri-dark", imageURI}}},
		}
	case "CINNAMON":
		return []wallpaperStep{
			{wallpaperStepRequired, [][]string{{"gsettings", "set", "org.cinnamon.desktop.background", "picture-uri", imageURI}}},
		}
	case "MATE":
		return []wallpaperStep{
			{wallpaperStepRequired, [][]string{{"gsettings", "set", "org.mate.background", "picture-uri", imageURI}}},
		}
	case "KDE":
		script := kdeWallpaperScript(imageURI)
		return []wallpaperStep{
			{wallpaperStepAlternative, [][]string{
				{"busctl", "--user", "call", "org.kde.plasmashell", "/PlasmaShell", "org.kde.PlasmaShell", "evaluateScript", "s", script},
				{"qdbus", "org.kde.plasmashell", "/PlasmaShell", "evaluateScript", script},
			}},
		}
	default:
		return nil
	}
}

// kdeWallpaperScript 是 PlasmaShell evaluateScript 的脚本体：逐桌面写 Image 配置。
// 使用 json.Marshal 生成标准双引号 JS 字符串字面量，防止单引号、反斜杠或 U+2028/U+2029 破坏脚本或注入。
func kdeWallpaperScript(imageURI string) string {
	encoded, _ := json.Marshal(imageURI)
	return "var allDesktops = desktops();for (var i = 0; i < allDesktops.length; i++) {var d = allDesktops[i];d.wallpaperPlugin = 'org.kde.image';d.currentConfigGroup = ['Wallpaper','org.kde.image','General'];d.writeConfig('Image', " + string(encoded) + ")}"
}

// xfceSetCommandFor 构造一条 image-path 属性的写入命令；style 不动，保留用户现有缩放设置。
func xfceSetCommandFor(prop string, path string) []string {
	return []string{"xfconf-query", "-c", "xfce4-desktop", "-p", prop, "-s", path}
}

// xfceWallpaperProps 解析 `xfconf-query -c xfce4-desktop -l -v` 输出中的壁纸属性名。
// 行形态：`<prop>: <value>` 或 `<prop>  <value>`（分隔是冒号或连续空白）。
func xfceWallpaperProps(listOutput string) []string {
	var props []string
	for _, line := range strings.Split(listOutput, "\n") {
		line = strings.TrimSpace(line)
		separator := strings.Index(line, ":")
		if separator < 0 {
			separator = strings.IndexAny(line, " \t")
		}
		if separator < 0 {
			continue
		}
		prop := strings.TrimSpace(line[:separator])
		if strings.Contains(prop, "/image-path") || strings.Contains(prop, "last-image") {
			props = append(props, prop)
		}
	}
	return props
}

// fileURIFromPath 把绝对路径转成 file:// URI；已经是 URI 时原样返回。
func fileURIFromPath(path string) string {
	if strings.Contains(path, "://") {
		return path
	}
	return (&url.URL{Scheme: "file", Path: path}).String()
}

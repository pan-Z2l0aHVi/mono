package service

// cspell:ignore gsettings
// cspell:ignore qdbus busctl plasmashell evaluateScript xfconf

import (
	"net/url"
	"strings"
)

/*
 * Linux 壁纸命令构造，纯函数、平台无关：`wallpaper_linux.go` 是唯一生产调用方，
 * 单测在 darwin 上也能跑（命令形状与执行分离）。
 */

// wallpaperCommandGroupsFor 返回单个桌面（GNOME/UNITY/CINNAMON/MATE/KDE 之一）的候选命令组：
// 组内任一命令成功即算成功。XFCE 不在此表——它要先枚举属性再写路径，由 runtime 专管。
// imageURI 是 file:// 形式的壁纸地址（gsettings 与 KDE 都收 URI）。
func wallpaperCommandGroupsFor(desktop string, imageURI string) [][]string {
	switch desktop {
	case "GNOME", "UNITY":
		return [][]string{
			{"gsettings", "set", "org.gnome.desktop.background", "picture-uri", imageURI},
			{"gsettings", "set", "org.gnome.desktop.background", "picture-uri-dark", imageURI},
		}
	case "CINNAMON":
		return [][]string{
			{"gsettings", "set", "org.cinnamon.desktop.background", "picture-uri", imageURI},
		}
	case "MATE":
		return [][]string{
			{"gsettings", "set", "org.mate.background", "picture-uri", imageURI},
		}
	case "KDE":
		script := kdeWallpaperScript(imageURI)
		return [][]string{
			{"busctl", "--user", "call", "org.kde.plasmashell", "/PlasmaShell", "org.kde.PlasmaShell", "evaluateScript", "s", script},
			{"qdbus", "org.kde.plasmashell", "/PlasmaShell", "evaluateScript", script},
		}
	default:
		return nil
	}
}

// kdeWallpaperScript 是 PlasmaShell evaluateScript 的脚本体：逐桌面写 Image 配置。
func kdeWallpaperScript(imageURI string) string {
	return "var allDesktops = desktops();for (var i = 0; i < allDesktops.length; i++) {var d = allDesktops[i];d.wallpaperPlugin = 'org.kde.image';d.currentConfigGroup = ['Wallpaper','org.kde.image','General'];d.writeConfig('Image', '" + imageURI + "')}"
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

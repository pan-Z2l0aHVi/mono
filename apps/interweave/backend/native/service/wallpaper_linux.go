//go:build linux

// cspell:ignore xfconf

package service

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

/*
 * Linux 壁纸按桌面环境分派（XDG_CURRENT_DESKTOP 冒号分隔、大小写不敏感，取首个命中的桌面）：
 *   - GNOME/Unity、Cinnamon、MATE、KDE 的命令形状由 wallpaper_shared.go 纯函数给出；
 *   - XFCE：先 `xfconf-query -c xfce4-desktop -l -v` 枚举全部 image-path 属性再逐条写（写本地路径）。
 *
 * 命令构造是纯函数，单测在 darwin 上钉住形状；执行在 runtime。
 */
func setWallpaperFromFile(path string) error {
	desktops := desktopsOf(os.Getenv("XDG_CURRENT_DESKTOP"))
	imageURI := fileURIFromPath(path)
	for _, desktop := range desktops {
		if desktop == "XFCE" {
			if err := setXfceWallpaper(path); err == nil {
				return nil
			}
			continue
		}
		succeeded := true
		for _, command := range wallpaperCommandGroupsFor(desktop, imageURI) {
			if err := exec.Command(command[0], command[1:]...).Run(); err != nil {
				succeeded = false
				break
			}
		}
		if succeeded {
			return nil
		}
	}
	return fmt.Errorf("wallpaper: setting failed for desktop %q", strings.Join(desktops, ","))
}

// setXfceWallpaper 枚举全部 image-path 属性并逐条写本地路径；全部失败才报错。
func setXfceWallpaper(path string) error {
	list, err := exec.Command("xfconf-query", "-c", "xfce4-desktop", "-l", "-v").Output()
	if err != nil {
		return fmt.Errorf("wallpaper: xfconf-query list failed: %w", err)
	}
	props := xfceWallpaperProps(string(list))
	if len(props) == 0 {
		return fmt.Errorf("wallpaper: no xfce image-path property found")
	}
	for _, prop := range props {
		command := xfceSetCommandFor(prop, path)
		if err := exec.Command(command[0], command[1:]...).Run(); err == nil {
			return nil
		}
	}
	return fmt.Errorf("wallpaper: xfconf-query write failed")
}

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
 * Linux 壁纸按桌面环境分派：XDG_CURRENT_DESKTOP 冒号分隔、归一别名（X-Cinnamon、ubuntu 等）后，
 * 取第一个受支持的分量。命令形状与失败语义由 wallpaper_shared.go 的计划承载：
 *   - required 全部成功、alternatives 任一成功、optional 尽力而为；
 *   - 无受支持分量（含空计划）继续尝试下一个分量，全部不中才报错，绝不假成功。
 * 命令构造是纯函数，单测在 darwin 上钉住形状；执行在 runtime。
 */
func setWallpaperFromFile(path string) error {
	desktops := desktopsOf(os.Getenv("XDG_CURRENT_DESKTOP"))
	imageURI := fileURIFromPath(path)
	for _, desktop := range desktops {
		if normalizeDesktop(desktop) == "XFCE" {
			if err := setXfceWallpaper(path); err == nil {
				return nil
			}
			continue
		}
		if runWallpaperPlan(wallpaperPlanFor(desktop, imageURI)) {
			return nil
		}
	}
	return fmt.Errorf("wallpaper: setting failed for desktop %q", strings.Join(desktops, ","))
}

// runWallpaperPlan 执行一份计划：required 全部成功且 alternatives 有成功项（无 alternatives 视为满足）
// 才算成功；optional 尽力而为。空计划返回 false。
func runWallpaperPlan(plan []wallpaperStep) bool {
	if len(plan) == 0 {
		return false
	}
	for _, step := range plan {
		switch step.kind {
		case wallpaperStepRequired:
			for _, command := range step.commands {
				if err := exec.Command(command[0], command[1:]...).Run(); err != nil {
					return false
				}
			}
		case wallpaperStepAlternative:
			alternativeOk := false
			for _, command := range step.commands {
				if err := exec.Command(command[0], command[1:]...).Run(); err == nil {
					alternativeOk = true
					break
				}
			}
			if !alternativeOk {
				return false
			}
		case wallpaperStepOptional:
			for _, command := range step.commands {
				_ = exec.Command(command[0], command[1:]...).Run()
			}
		}
	}
	return true
}

// setXfceWallpaper 枚举全部 image-path 属性并逐条尝试写本地路径；只要有一条成功即成功，
// 全部失败才报错（XFCE 每个显示器/工作区各有一条属性，只写第一条会留下其余屏幕未换）。
func setXfceWallpaper(path string) error {
	list, err := exec.Command("xfconf-query", "-c", "xfce4-desktop", "-l", "-v").Output()
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
		if err := exec.Command(command[0], command[1:]...).Run(); err == nil {
			anyOk = true
		}
	}
	if !anyOk {
		return fmt.Errorf("wallpaper: xfconf-query write failed")
	}
	return nil
}

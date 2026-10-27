package service

import (
	"os"
	"path/filepath"
	"strings"
)

// desktopEntryDirs 按 XDG 规范给出 .desktop 的查找目录：用户目录优先，
// 其次是 XDG_DATA_DIRS 的每一项，两者都没配置时回落到系统默认值。
func desktopEntryDirs(dataHome, dataDirs string) []string {
	dirs := make([]string, 0, 4)

	if dataHome != "" {
		dirs = append(dirs, filepath.Join(dataHome, "applications"))
	} else if home, err := os.UserHomeDir(); err == nil && home != "" {
		dirs = append(dirs, filepath.Join(home, ".local", "share", "applications"))
	}

	if dataDirs == "" {
		dataDirs = "/usr/local/share:/usr/share"
	}
	for _, dir := range strings.Split(dataDirs, ":") {
		if dir == "" {
			continue
		}
		dirs = append(dirs, filepath.Join(dir, "applications"))
	}
	return dirs
}

// desktopEntryName 读取 desktopID 对应 .desktop 文件里的展示名；找不到时返回空串，
// 由调用方回落到 desktop id 本身。
func desktopEntryName(desktopID string, dirs []string) string {
	desktopID = strings.TrimSpace(desktopID)
	if desktopID == "" {
		return ""
	}
	if !strings.HasSuffix(desktopID, ".desktop") {
		desktopID += ".desktop"
	}

	for _, dir := range dirs {
		content, err := os.ReadFile(filepath.Join(dir, desktopID))
		if err != nil {
			continue
		}
		if name := parseDesktopEntryName(string(content)); name != "" {
			return name
		}
	}
	return ""
}

// parseDesktopEntryName 只取 [Desktop Entry] 段里未本地化的 Name，
// Name[zh_CN] 之类的键不是同一个键，不能拿来顶替。
func parseDesktopEntryName(content string) string {
	inDesktopEntry := false
	for _, rawLine := range strings.Split(content, "\n") {
		line := strings.TrimSpace(rawLine)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if strings.HasPrefix(line, "[") {
			inDesktopEntry = line == "[Desktop Entry]"
			continue
		}
		if !inDesktopEntry {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok || strings.TrimSpace(key) != "Name" {
			continue
		}
		if name := strings.TrimSpace(value); name != "" {
			return name
		}
	}
	return ""
}

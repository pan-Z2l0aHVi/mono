package service

import "strings"

// desktopsOf 拆 XDG_CURRENT_DESKTOP（冒号分隔、大小写不敏感），KDE 的 kde:gnome 形态取全部分量。
func desktopsOf(xdgCurrentDesktop string) []string {
	var desktops []string
	for _, name := range strings.Split(xdgCurrentDesktop, ":") {
		name = strings.ToUpper(strings.TrimSpace(name))
		if name != "" {
			desktops = append(desktops, name)
		}
	}
	return desktops
}

// normalizeDesktop 归一桌面分量：X-Cinnamon → CINNAMON，ubuntu 视作 GNOME（其默认桌面）。
func normalizeDesktop(name string) string {
	name = strings.ToUpper(strings.TrimSpace(name))
	name = strings.TrimPrefix(name, "X-")
	if name == "UBUNTU" {
		return "GNOME"
	}
	return name
}

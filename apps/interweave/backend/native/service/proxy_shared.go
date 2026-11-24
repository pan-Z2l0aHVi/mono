package service

// cspell:ignore gsettings

import "strings"

/*
 * WinINET 静态代理配置的解析，纯函数、平台无关：`proxy_windows.go` 是唯一生产调用方，
 * 单测在 darwin 上也能跑（解析逻辑与注册表读取分离）。
 */

// WindowsProxyConfig 是 ProxyServer / ProxyOverride 解析后的静态代理配置。
type WindowsProxyConfig struct {
	HTTPProxy  string
	HTTPSProxy string
	// NoProxy 是去掉 `<local>` 与 `*.` 前缀归一后的绕过清单，分号连接，
	// 直接交给 golang.org/x/net/http/httpproxy.Config.NoProxy。
	NoProxy string
	// BypassLocal 是 `<local>` 标记：无点主机名（内网裸主机名）直连。
	// httpproxy 的 NoProxy 没有这条语义，由调用方在主机名上显式判断。
	BypassLocal bool
}

// parseWindowsProxyServer 拆 WinINET 的两个值：
//   - ProxyServer 是 "host:port"（全协议）或 "http=h1:1;https=h2:2;socks=h3:3"（按协议）；
//     socks 条目 http.Transport 用不上，忽略。
//   - ProxyOverride 是分号分隔的绕过清单；`<local>` 是无点主机名直连标记，
//     `*.example.com` 归一成 httpproxy 认的后缀形式 `.example.com`，IP 与 CIDR 原样保留。
func parseWindowsProxyServer(server string, override string) WindowsProxyConfig {
	config := WindowsProxyConfig{}
	for _, entry := range strings.Split(strings.TrimSpace(server), ";") {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		scheme, value, isPerProtocol := strings.Cut(entry, "=")
		if !isPerProtocol {
			// 单一形态：全协议同一入口。
			config.HTTPProxy = "http://" + entry
			config.HTTPSProxy = "http://" + entry
			continue
		}
		if value == "" {
			continue
		}
		switch strings.ToLower(scheme) {
		case "http":
			config.HTTPProxy = "http://" + value
		case "https":
			config.HTTPSProxy = "http://" + value
		}
	}
	var bypass []string
	for _, entry := range strings.Split(override, ";") {
		entry = strings.TrimSpace(entry)
		switch {
		case entry == "":
			continue
		case entry == "<local>":
			config.BypassLocal = true
		case strings.HasPrefix(entry, "*."):
			bypass = append(bypass, strings.TrimPrefix(entry, "*"))
		default:
			bypass = append(bypass, entry)
		}
	}
	config.NoProxy = strings.Join(bypass, ";")
	return config
}

// gsettings 值的形态是 "'127.0.0.1'"（字符串带引号）或 "7890"（uint32 无引号），统一剥引号取值。
func parseGSettingsValue(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "@" {
		// gsettings 对未设置键输出 @<default>， "@空" 之外的 type 化默认值交由上层当作空处理。
		return ""
	}
	value = strings.TrimPrefix(value, "'")
	value = strings.TrimSuffix(value, "'")
	return strings.TrimSpace(value)
}

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

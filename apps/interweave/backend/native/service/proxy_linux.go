//go:build linux

// cspell:ignore gsettings

package service

import (
	"fmt"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"strconv"
	"sync"
	"time"
)

/*
 * Linux 静态代理只读 GNOME 系桌面的 gsettings（org.gnome.system.proxy，GNOME/Unity/Cinnamon/MATE
 * 桌面通用）：mode 为 manual 时取 http/https 的 host/port。XFCE、KDE 与未知桌面返回 (nil, nil)
 * 回落环境变量。gsettings 的读取按 5 秒记忆——fork 进程太贵，不能每个请求都读；这是读缓存，
 * 不是等待或重试上限，设置变更最迟 5 秒生效。
 */
const gsettingsCacheTTL = 5 * time.Second

var (
	gsettingsMu      sync.Mutex
	gsettingsAt      time.Time
	gsettingsConfig  = map[string]gsettingsEndpoint{}
	gsettingsPresent = true
)

type gsettingsEndpoint struct {
	host string
	port string
}

// gsettingsDesktops 是会走 gsettings 的桌面集合（归一后的名字）；其余桌面直接回落环境变量。
var gsettingsDesktops = map[string]bool{"GNOME": true, "UNITY": true, "CINNAMON": true, "MATE": true}

func systemProxyFor(req *http.Request) (*url.URL, error) {
	if req.URL == nil {
		return nil, fmt.Errorf("proxy: request has no URL")
	}
	// 任一分量命中 GNOME 系桌面（含别名归一）就走 gsettings：ubuntu:GNOME、X-Cinnamon 都算。
	supported := false
	for _, desktop := range desktopsOf(os.Getenv("XDG_CURRENT_DESKTOP")) {
		if gsettingsDesktops[normalizeDesktop(desktop)] {
			supported = true
			break
		}
	}
	if !supported {
		return nil, nil
	}
	endpoint, err := gsettingsEndpointFor(req.URL.Scheme)
	if err != nil {
		return nil, err
	}
	if endpoint == (gsettingsEndpoint{}) {
		return nil, nil
	}
	return &url.URL{Scheme: "http", Host: endpoint.host + ":" + endpoint.port}, nil
}

// desktopOfCurrentSession 已并入 systemProxyFor 的分量匹配（normalizeDesktop 处理别名），不再单独暴露。

func gsettingsEndpointFor(scheme string) (gsettingsEndpoint, error) {
	gsettingsMu.Lock()
	defer gsettingsMu.Unlock()
	if time.Since(gsettingsAt) < gsettingsCacheTTL {
		return gsettingsConfig[scheme], nil
	}
	mode := parseGSettingsValue(gsettingsGet("org.gnome.system.proxy", "mode"))
	if mode != "manual" {
		gsettingsConfig = map[string]gsettingsEndpoint{}
		gsettingsAt = time.Now()
		return gsettingsEndpoint{}, nil
	}
	next := map[string]gsettingsEndpoint{}
	for _, name := range []string{"http", "https"} {
		host := parseGSettingsValue(gsettingsGet("org.gnome.system.proxy."+name, "host"))
		port := parseGSettingsValue(gsettingsGet("org.gnome.system.proxy."+name, "port"))
		if host == "" || port == "" {
			continue
		}
		if _, err := strconv.Atoi(port); err != nil {
			continue
		}
		next[name] = gsettingsEndpoint{host: host, port: port}
	}
	gsettingsConfig = next
	gsettingsAt = time.Now()
	return gsettingsConfig[scheme], nil
}

func gsettingsGet(schema string, key string) string {
	out, err := exec.Command("gsettings", "get", schema, key).Output()
	if err != nil {
		// gsettings 缺席或键不存在：记一次缺席，缓存期内不再 fork。
		gsettingsPresent = false
		return ""
	}
	gsettingsPresent = true
	return string(out)
}

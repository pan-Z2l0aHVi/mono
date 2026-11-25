//go:build windows

// cspell:ignore HKCU

package service

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"golang.org/x/net/http/httpproxy"
	"golang.org/x/sys/windows/registry"
)

// systemProxyFor 读 WinINET 静态代理（HKCU\...\Internet Settings）。AutoConfigURL（PAC）不计算：
// 静态代理缺失但只配置了 PAC 时返回 (nil, nil)，由上层回落环境变量。
func systemProxyFor(req *http.Request) (*url.URL, error) {
	if req.URL == nil {
		return nil, fmt.Errorf("proxy: request has no URL")
	}
	key, err := registry.OpenKey(registry.CURRENT_USER, `Software\Microsoft\Windows\CurrentVersion\Internet Settings`, registry.QUERY_VALUE)
	if err != nil {
		return nil, fmt.Errorf("proxy: open Internet Settings: %w", err)
	}
	defer key.Close()

	enabled, _, err := key.GetIntegerValue("ProxyEnable")
	if err != nil {
		return nil, fmt.Errorf("proxy: read ProxyEnable: %w", err)
	}
	if enabled == 0 {
		return nil, nil
	}
	server, _, err := key.GetStringValue("ProxyServer")
	if err != nil {
		return nil, fmt.Errorf("proxy: read ProxyServer: %w", err)
	}
	override, _, _ := key.GetStringValue("ProxyOverride")

	config := parseWindowsProxyServer(server, override)
	// `<local>`：无点主机名（内网裸主机名）直连。httpproxy 没有这条语义，在主机名上显式判断。
	if config.BypassLocal && !strings.Contains(req.URL.Hostname(), ".") {
		return nil, nil
	}
	if req.URL.Scheme == "https" {
		if config.HTTPSProxy == "" {
			return nil, nil
		}
	} else if config.HTTPProxy == "" {
		return nil, nil
	}
	proxyConfig := httpproxy.Config{
		HTTPProxy:  config.HTTPProxy,
		HTTPSProxy: config.HTTPSProxy,
		NoProxy:    config.NoProxy,
	}
	return proxyConfig.ProxyFunc()(req.URL)
}

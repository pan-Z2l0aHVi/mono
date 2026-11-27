//go:build windows

// cspell:ignore HKCU

package service

import (
	"fmt"
	"net/http"
	"net/url"

	"golang.org/x/sys/windows/registry"
)

func defaultPlatformProxyLookup() systemProxyLookup {
	return func(req *http.Request) (*url.URL, error) {
		return resolveWindowsProxy(req, readWindowsRegistryProxy)
	}
}

// readWindowsRegistryProxy 读 WinINET 静态代理（HKCU\...\Internet Settings）。AutoConfigURL（PAC）不计算。
func readWindowsRegistryProxy() (windowsProxyRaw, error) {
	key, err := registry.OpenKey(registry.CURRENT_USER, `Software\Microsoft\Windows\CurrentVersion\Internet Settings`, registry.QUERY_VALUE)
	if err != nil {
		return windowsProxyRaw{}, fmt.Errorf("proxy: open Internet Settings: %w", err)
	}
	defer key.Close()

	enabled, _, err := key.GetIntegerValue("ProxyEnable")
	if err != nil {
		return windowsProxyRaw{}, fmt.Errorf("proxy: read ProxyEnable: %w", err)
	}
	if enabled == 0 {
		return windowsProxyRaw{}, nil
	}
	server, _, err := key.GetStringValue("ProxyServer")
	if err != nil {
		return windowsProxyRaw{}, fmt.Errorf("proxy: read ProxyServer: %w", err)
	}
	override, _, _ := key.GetStringValue("ProxyOverride")
	return windowsProxyRaw{Enabled: enabled, Server: server, Override: override}, nil
}

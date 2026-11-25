package service

// cspell:ignore gsettings

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/http/httpproxy"
)

const (
	gsettingsCacheTTL    = 5 * time.Second
	gsettingsReadTimeout = 2 * time.Second
)

type gsettingsReader func(ctx context.Context, schema, key string) (string, error)

type gsettingsEndpoint struct {
	host string
	port string
}

// gsettingsDesktops 是会走 gsettings 的桌面集合（归一后的名字）；其余桌面直接回落环境变量。
var gsettingsDesktops = map[string]bool{"GNOME": true, "UNITY": true, "CINNAMON": true, "MATE": true}

/*
 * linuxGSettingsProxy 封装 GNOME 系桌面的 gsettings 静态代理读取与 5 秒读缓存。
 *
 * 并发与容错不变量：
 *   - 入口先检查 req.Context().Err()，已取消请求不触发刷新；
 *   - 单次刷新共享同一份 timeout 预算（默认 2s），5 次读取总持锁时间严格封顶；
 *   - 遇 exec.ErrNotFound 永久标记 absent，进程期不再重复 fork；
 *   - 瞬时错误或超时不覆盖既有缓存，防止单次 D-Bus 抖动毒化全进程代理 5 秒。
 */
type linuxGSettingsProxy struct {
	getenv  func(string) string
	read    gsettingsReader
	now     func() time.Time
	ttl     time.Duration
	timeout time.Duration

	mu      sync.Mutex
	at      time.Time
	absent  bool
	entries map[string]gsettingsEndpoint
}

func newLinuxGSettingsProxy(
	getenv func(string) string,
	read gsettingsReader,
	now func() time.Time,
	ttl time.Duration,
) *linuxGSettingsProxy {
	if now == nil {
		now = time.Now
	}
	return &linuxGSettingsProxy{
		getenv:  getenv,
		read:    read,
		now:     now,
		ttl:     ttl,
		timeout: gsettingsReadTimeout,
		entries: map[string]gsettingsEndpoint{},
	}
}

func (p *linuxGSettingsProxy) Resolve(req *http.Request) (*url.URL, error) {
	if req == nil || req.URL == nil {
		return nil, fmt.Errorf("proxy: request has no URL")
	}
	if err := req.Context().Err(); err != nil {
		return nil, err
	}
	supported := false
	if p.getenv != nil {
		for _, desktop := range desktopsOf(p.getenv("XDG_CURRENT_DESKTOP")) {
			if gsettingsDesktops[normalizeDesktop(desktop)] {
				supported = true
				break
			}
		}
	}
	if !supported {
		return nil, nil
	}
	endpoint, err := p.endpointFor(req.URL.Scheme)
	if err != nil {
		return nil, err
	}
	if endpoint == (gsettingsEndpoint{}) {
		return nil, nil
	}
	return &url.URL{Scheme: "http", Host: endpoint.host + ":" + endpoint.port}, nil
}

func (p *linuxGSettingsProxy) endpointFor(scheme string) (gsettingsEndpoint, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.absent {
		return gsettingsEndpoint{}, nil
	}
	if !p.at.IsZero() && p.now().Sub(p.at) < p.ttl {
		return p.entries[scheme], nil
	}
	if p.read == nil {
		return gsettingsEndpoint{}, nil
	}

	refreshCtx, cancel := context.WithTimeout(context.Background(), p.timeout)
	defer cancel()

	rawMode, err := p.read(refreshCtx, "org.gnome.system.proxy", "mode")
	if err != nil {
		if errors.Is(err, exec.ErrNotFound) {
			p.absent = true
			return gsettingsEndpoint{}, nil
		}
		return gsettingsEndpoint{}, err
	}
	if parseGSettingsValue(rawMode) != "manual" {
		p.entries = map[string]gsettingsEndpoint{}
		p.at = p.now()
		return gsettingsEndpoint{}, nil
	}

	next := map[string]gsettingsEndpoint{}
	for _, name := range []string{"http", "https"} {
		rawHost, hostErr := p.read(refreshCtx, "org.gnome.system.proxy."+name, "host")
		if hostErr != nil {
			if errors.Is(hostErr, exec.ErrNotFound) {
				p.absent = true
				return gsettingsEndpoint{}, nil
			}
			if refreshCtx.Err() != nil {
				return gsettingsEndpoint{}, hostErr
			}
			continue
		}
		rawPort, portErr := p.read(refreshCtx, "org.gnome.system.proxy."+name, "port")
		if portErr != nil {
			if errors.Is(portErr, exec.ErrNotFound) {
				p.absent = true
				return gsettingsEndpoint{}, nil
			}
			if refreshCtx.Err() != nil {
				return gsettingsEndpoint{}, portErr
			}
			continue
		}
		host := parseGSettingsValue(rawHost)
		port := parseGSettingsValue(rawPort)
		if host == "" || port == "" {
			continue
		}
		if _, err := strconv.Atoi(port); err != nil {
			continue
		}
		next[name] = gsettingsEndpoint{host: host, port: port}
	}
	p.entries = next
	p.at = p.now()
	return p.entries[scheme], nil
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

/*
 * WinINET 静态代理配置的解析与求值，纯函数、平台无关：`proxy_windows.go` 是唯一生产调用方，
 * 单测在全平台都能跑（解析逻辑与注册表读取分离）。
 */

type windowsProxyRaw struct {
	Enabled  uint64
	Server   string
	Override string
}

type windowsProxyReader func() (windowsProxyRaw, error)

// windowsProxyConfig 是 ProxyServer / ProxyOverride 解析后的静态代理配置。
type windowsProxyConfig struct {
	HTTPProxy  string
	HTTPSProxy string
	// NoProxy 是去掉 `<local>` 与 `*.` 前缀归一后的绕过清单，逗号连接，
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
//     `*.example.com` 归一成 httpproxy 认的后缀形式 `.example.com`，IP 与 CIDR 原样保留，
//     以逗号拼接交给 httpproxy.Config.NoProxy。
func parseWindowsProxyServer(server string, override string) windowsProxyConfig {
	config := windowsProxyConfig{}
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
	config.NoProxy = strings.Join(bypass, ",")
	return config
}

func resolveWindowsProxy(req *http.Request, read windowsProxyReader) (*url.URL, error) {
	if req == nil || req.URL == nil {
		return nil, fmt.Errorf("proxy: request has no URL")
	}
	raw, err := read()
	if err != nil {
		return nil, err
	}
	if raw.Enabled == 0 {
		return nil, nil
	}
	config := parseWindowsProxyServer(raw.Server, raw.Override)
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

type darwinProxyQuery func(rawURL string) (result string, ok bool)

func resolveDarwinProxy(req *http.Request, query darwinProxyQuery) (*url.URL, error) {
	if req == nil || req.URL == nil {
		return nil, fmt.Errorf("proxy: request has no URL")
	}
	raw, ok := query(req.URL.String())
	if !ok || raw == "" {
		return nil, nil
	}
	scheme, host, found := strings.Cut(raw, "|")
	if !found || host == "" {
		return nil, fmt.Errorf("proxy: malformed system proxy result %q", raw)
	}
	return &url.URL{Scheme: scheme, Host: host}, nil
}

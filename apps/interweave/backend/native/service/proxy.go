package service

// cspell:ignore gsettings

import (
	"net/http"
	"net/url"
)

type systemProxyLookup func(req *http.Request) (*url.URL, error)
type envProxyLookup func(req *http.Request) (*url.URL, error)

type proxyResolver struct {
	system systemProxyLookup
	env    envProxyLookup
}

func newProxyResolver(system systemProxyLookup, env envProxyLookup) *proxyResolver {
	return &proxyResolver{system: system, env: env}
}

func (r *proxyResolver) Resolve(req *http.Request) (*url.URL, error) {
	if r.system != nil {
		if u, err := r.system(req); err == nil && u != nil {
			return u, nil
		}
	}
	if r.env == nil {
		return nil, nil
	}
	return r.env(req)
}

var defaultProxyResolver = newProxyResolver(defaultPlatformProxyLookup(), http.ProxyFromEnvironment)

/*
 * SystemProxy 把平台的系统代理设置解析成 http.Transport.Proxy 的形状，供装配处
 * （main.go）注入 remote.Fetcher。读取 OS 设置的能力属于 native（见 interweave AGENTS.md），
 * remote 只接收注入；本函数不发起网络请求，也不改变任何系统状态。
 *
 * 平台实现：
 *   - darwin：cgo CFNetworkCopyProxiesForURL，按请求 URL 解析，绕过列表在这一步就生效；
 *   - windows：注册表 Internet Settings 的静态代理（per-protocol 值经 parseWindowsProxyServer 拆分）；
 *   - linux：gsettings（GNOME 系桌面）读 manual 模式的 http/https；
 *   - 其他：无系统读取。
 *
 * 系统没有给出代理、或读取失败（无 gsettings、注册表不可读等）时回落 ProxyFromEnvironment：
 * 代理解析失败不该让业务请求失败。PAC 自动配置脚本不计算（产品取舍），对应场景回落环境变量。
 */
func SystemProxy(req *http.Request) (*url.URL, error) {
	return defaultProxyResolver.Resolve(req)
}

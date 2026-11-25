//go:build !darwin && !windows && !linux

package service

import "net/http"

// systemProxyFor：其余平台没有系统代理读取实现，一律 (nil, nil)，
// 由 SystemProxy 回落 ProxyFromEnvironment。
func systemProxyFor(req *http.Request) (*url.URL, error) {
	return nil, nil
}

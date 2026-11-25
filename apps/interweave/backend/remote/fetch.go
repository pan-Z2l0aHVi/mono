package remote

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// ProxyFunc 按 http.Transport.Proxy 的形状从系统设置解析代理；返回 (nil, nil) 表示直连。
// 类型别名让装配处与平台实现共享同一个签名。
type ProxyFunc = func(*http.Request) (*url.URL, error)

// FetcherOption 在装配期定制 Fetcher。
type FetcherOption func(*Fetcher)

// WithProxy 注入系统代理解析。读取 OS 设置的能力在 backend/native（见 native.SystemProxy），
// remote 只接收注入：出站 HTTP 的边界在 remote，OS 边界在 native，装配在 main.go。
func WithProxy(proxy ProxyFunc) FetcherOption {
	return func(f *Fetcher) {
		f.proxy = proxy
		// Transport 的 Proxy 每个请求都会被调用，系统设置变化因此按请求生效；
		// 单例 Transport 保住连接池，不为每次请求重建。
		f.client.Transport = &http.Transport{Proxy: f.proxy}
	}
}

// NewFetcher 建立Fetcher：默认 10 秒总时限（纳入预算的产品规则），可经 FetcherOption 定制。
func NewFetcher(options ...FetcherOption) *Fetcher {
	f := &Fetcher{client: &http.Client{Timeout: 10 * time.Second}}
	for _, option := range options {
		option(f)
	}
	return f
}

// GetStream 发起一次 GET 并把未读的响应体交回调用方，由调用方负责关闭；非 2xx/3xx 视为失败。
// 壁纸下载这类「要正文、不要解析」的读取走这里，与 FetchURL 的元数据读取分开：
// GetStream 不做任何内容解析，也不把正文驻留内存。
func (f *Fetcher) GetStream(ctx context.Context, targetURL string) (io.ReadCloser, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", userAgent)
	resp, err := f.client.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 400 {
		resp.Body.Close()
		return nil, fmt.Errorf("fetch %s: HTTP %d", targetURL, resp.StatusCode)
	}
	return resp.Body, nil
}

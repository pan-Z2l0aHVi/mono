package remote

import (
	"context"
	"io"
	"mime"
	"net/http"
	"net/url"
	"strings"

	"golang.org/x/net/html"
)

// 常规浏览器请求头：避免站点因自定义 UA 后缀或缺失 Accept 头直接 403 拒绝探测。
const (
	userAgent      = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
	acceptHeader   = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
	acceptLanguage = "zh-CN,zh;q=0.9,en;q=0.8"
)

// 只保存 URL 的基础展示上下文，不保存远程正文。
type URLMetadata struct {
	Title       string `json:"title"`
	SiteName    string `json:"site_name"`
	Description string `json:"description"`
	FaviconURL  string `json:"favicon_url"`
	// 响应的 Content-Type（去参数后的 media type，如 "image/png"）。展示层用它把直链图片
	// 归类为 image；非 HTML 内容也有值，这是直链资源唯一的类型证据。
	ContentType string `json:"content_type,omitempty"`
}

// Reachability 区分「服务端明确拒绝」与「本次无法判定」：
// 断网、DNS 失败或超时都不是链接失效的证据，三者塌缩成同一个 false 会误伤整个 URL 资源库。
type Reachability int

const (
	// 本次请求无法判定（网络不可达、超时、DNS 或解析失败）。
	ReachabilityUnknown Reachability = iota
	// 服务端以 2xx/3xx 明确接受。
	ReachabilityAvailable
	// 服务端以 4xx/5xx 明确拒绝。
	ReachabilityUnavailable
)

// 将远程读取限制为用户触发的一次短时操作。构造在 fetch.go：默认 10 秒总时限，
// 可经 WithProxy 注入系统代理解析。
type Fetcher struct {
	client *http.Client
	proxy  ProxyFunc
}

// 以一次请求判断入口可达性；展示信息缺失不应否定可达性。
// 错误与 Reachability 分开表达：调用方需要区分「明确不可用」与「本次无法判定」。
func (f *Fetcher) FetchURL(ctx context.Context, targetURL string) (*URLMetadata, Reachability, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return nil, ReachabilityUnknown, err
	}

	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", acceptHeader)
	req.Header.Set("Accept-Language", acceptLanguage)

	resp, err := f.client.Do(req)
	if err != nil {
		return nil, ReachabilityUnknown, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 400 {
		// 401/403/405/418/429 多为登录门控、反爬或方法限制，说明目标站点本身可达，
		// 不应将正常链接直接标为「失效」；404/410/5xx 等仍判为明确不可用。
		switch resp.StatusCode {
		case http.StatusUnauthorized, http.StatusForbidden, http.StatusMethodNotAllowed, http.StatusTeapot, http.StatusTooManyRequests:
			meta := &URLMetadata{ContentType: mediaTypeOf(resp.Header.Get("Content-Type"))}
			return meta, ReachabilityAvailable, nil
		default:
			return nil, ReachabilityUnavailable, nil
		}
	}

	meta := &URLMetadata{}
	contentType := resp.Header.Get("Content-Type")
	meta.ContentType = mediaTypeOf(contentType)

	// 非 HTML 内容仍可作为可用入口保留。
	if !strings.Contains(strings.ToLower(contentType), "text/html") {
		return meta, ReachabilityAvailable, nil
	}

	// 限制元数据读取成本，避免将纳入流程变为内容抓取。
	bodyReader := io.LimitReader(resp.Body, 1024*1024)
	parseHTMLMetadata(bodyReader, targetURL, meta)

	return meta, ReachabilityAvailable, nil
}

// mediaTypeOf 取 Content-Type 的 media type 部分并小写："Image/PNG; charset=binary" → "image/png"。
// 展示层用它判断直链图片；解析失败或为空都返回空串。
func mediaTypeOf(contentType string) string {
	mediaType, _, err := mime.ParseMediaType(contentType)
	if err != nil {
		return strings.ToLower(strings.TrimSpace(strings.SplitN(contentType, ";", 2)[0]))
	}
	return strings.ToLower(mediaType)
}

func parseHTMLMetadata(r io.Reader, baseURLStr string, meta *URLMetadata) {
	parsedBase, _ := url.Parse(baseURLStr)
	z := html.NewTokenizer(r)

	inTitle := false

	for {
		tt := z.Next()
		switch tt {
		case html.ErrorToken:
			return
		case html.StartTagToken, html.SelfClosingTagToken:
			t := z.Token()
			tagName := strings.ToLower(t.Data)

			if tagName == "title" {
				inTitle = true
			} else if tagName == "meta" {
				var property, name, content string
				for _, attr := range t.Attr {
					key := strings.ToLower(attr.Key)
					if key == "property" {
						property = strings.ToLower(attr.Val)
					} else if key == "name" {
						name = strings.ToLower(attr.Val)
					} else if key == "content" {
						content = attr.Val
					}
				}

				if (property == "og:title" || property == "twitter:title") && meta.Title == "" {
					meta.Title = strings.TrimSpace(content)
				}
				if (property == "og:site_name" || name == "application-name") && meta.SiteName == "" {
					meta.SiteName = strings.TrimSpace(content)
				}
				if (property == "og:description" || name == "description" || property == "twitter:description") && meta.Description == "" {
					meta.Description = strings.TrimSpace(content)
				}
			} else if tagName == "link" {
				var rel, href string
				for _, attr := range t.Attr {
					key := strings.ToLower(attr.Key)
					if key == "rel" {
						rel = strings.ToLower(attr.Val)
					} else if key == "href" {
						href = attr.Val
					}
				}
				if (strings.Contains(rel, "icon") || rel == "shortcut icon") && meta.FaviconURL == "" && href != "" {
					if parsedBase != nil {
						resolved, err := parsedBase.Parse(href)
						if err == nil {
							meta.FaviconURL = resolved.String()
						}
					} else {
						meta.FaviconURL = href
					}
				}
			}
		case html.TextToken:
			if inTitle && meta.Title == "" {
				meta.Title = strings.TrimSpace(string(z.Text()))
			}
		case html.EndTagToken:
			t := z.Token()
			if strings.ToLower(t.Data) == "title" {
				inTitle = false
			}
		}
	}
}

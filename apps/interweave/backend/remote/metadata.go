package remote

import (
	"context"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"golang.org/x/net/html"
)

// 只保存 URL 的基础展示上下文，不保存远程正文。
type URLMetadata struct {
	Title       string `json:"title"`
	SiteName    string `json:"site_name"`
	Description string `json:"description"`
	FaviconURL  string `json:"favicon_url"`
}

// 将远程读取限制为用户触发的一次短时操作。
type Fetcher struct {
	client *http.Client
}

// 为远程读取设置明确上限，避免阻塞纳入流程。
func NewFetcher() *Fetcher {
	return &Fetcher{
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// 以一次请求判断入口可达性；展示信息缺失不应否定可达性。
func (f *Fetcher) FetchURL(ctx context.Context, targetURL string) (*URLMetadata, bool, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return nil, false, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Interweave/1.0")

	resp, err := f.client.Do(req)
	if err != nil {
		return nil, false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 400 {
		return nil, false, nil
	}

	meta := &URLMetadata{}
	contentType := resp.Header.Get("Content-Type")

	// 非 HTML 内容仍可作为可用入口保留。
	if !strings.Contains(strings.ToLower(contentType), "text/html") {
		return meta, true, nil
	}

	// 限制元数据读取成本，避免将纳入流程变为内容抓取。
	bodyReader := io.LimitReader(resp.Body, 1024*1024)
	parseHTMLMetadata(bodyReader, targetURL, meta)

	return meta, true, nil
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

package media

import (
	"net/url"
	"strings"
	"testing"
)

func TestMediaURLsUseHandlerRoutes(t *testing.T) {
	sourceID := "source-uuid"
	cases := []struct {
		name   string
		url    string
		prefix string
		rest   string
	}{
		{"source media", SourceMediaURL(sourceID), PathPrefix, sourceID},
		{"source thumbnail", SourceThumbnailURL(sourceID), ThumbnailPathPrefix, sourceID},
		{"pending preview", PendingMediaURL("token-uuid"), PendingPathPrefix, "token-uuid"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if !strings.HasPrefix(tc.url, tc.prefix) {
				t.Fatalf("expected %q to start with route prefix %q", tc.url, tc.prefix)
			}
			parsed, err := url.Parse(tc.url)
			if err != nil {
				t.Fatalf("expected a parseable path, got %v", err)
			}
			if parsed.Path != tc.prefix+tc.rest {
				t.Fatalf("expected path %q, got %q", tc.prefix+tc.rest, parsed.Path)
			}
		})
	}
}

// 身份里出现路径分隔符时只能被编码，不能变成额外的路由段——否则调用方传入的
// 任意字符串会把请求导向别的 Source。
func TestMediaURLsEscapePathSeparators(t *testing.T) {
	got := SourceMediaURL("source/child")
	if strings.Contains(got, "source/child") {
		t.Fatalf("expected slash to be escaped, got %q", got)
	}
	if !strings.Contains(got, "source%2Fchild") {
		t.Fatalf("expected escaped identity in %q", got)
	}
}

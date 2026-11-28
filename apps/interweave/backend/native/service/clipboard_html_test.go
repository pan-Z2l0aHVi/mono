package service

import (
	"fmt"
	"testing"
)

func TestParseClipboardHTMLFragment(t *testing.T) {
	fragment := `<a href="/docs/a">A</a>`
	body := "<html><body><!--StartFragment-->" + fragment + "<!--EndFragment--></body></html>"
	// 偏移量按字节计且从 CF_HTML 内容起点算起；%010d 定宽，占位与最终头部等长。
	headerFormat := "Version:0.9\r\nStartHTML:%010d\r\nEndHTML:%010d\r\n" +
		"StartFragment:%010d\r\nEndFragment:%010d\r\nSourceURL:https://example.com/base/\r\n\r\n"
	bodyStart := len(fmt.Sprintf(headerFormat, 0, 0, 0, 0))
	start := bodyStart + len("<html><body><!--StartFragment-->")
	end := start + len(fragment)
	raw := fmt.Sprintf(headerFormat, 0, bodyStart+len(body), start, end) + body

	html, sourceURL := parseClipboardHTML(raw)
	if html != fragment {
		t.Errorf("expected fragment %q, got %q", fragment, html)
	}
	if sourceURL != "https://example.com/base/" {
		t.Errorf("expected source url, got %q", sourceURL)
	}
}

func TestParseClipboardHTMLWithoutHeader(t *testing.T) {
	raw := "<a href=\"https://a.com\">a</a>\x00"
	html, sourceURL := parseClipboardHTML(raw)
	if html != "<a href=\"https://a.com\">a</a>" {
		t.Errorf("expected raw html fallback, got %q", html)
	}
	if sourceURL != "" {
		t.Errorf("expected empty source url, got %q", sourceURL)
	}
}

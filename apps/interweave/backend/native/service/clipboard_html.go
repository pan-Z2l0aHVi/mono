package service

import (
	"context"
	"strconv"
	"strings"
)

// ClipboardContentDTO 是一次粘贴读取的完整内容：纯文本、可选的 HTML 片段与复制来源地址。
// HTML 仅作为多链接提取的增强：没有富文本时前端照常全文扫描 Text。
type ClipboardContentDTO struct {
	Text    string `json:"text"`
	HTML    string `json:"html,omitempty"`
	BaseURL string `json:"base_url,omitempty"`
}

// ReadClipboardContent 一次读取文本与 HTML；HTML 读取失败不阻断文本粘贴。
// 纯文本仍走既有平台实现，HTML 是额外能力，因此在 Linux 等未实现平台只是缺省为空。
func (s *OSService) ReadClipboardContent(ctx context.Context) (*ClipboardContentDTO, error) {
	text, err := readClipboardText(ctx)
	if err != nil {
		return nil, err
	}
	html, baseURL, htmlErr := readClipboardHTML(ctx)
	if htmlErr != nil {
		html, baseURL = "", ""
	}
	return &ClipboardContentDTO{Text: text, HTML: html, BaseURL: baseURL}, nil
}

// parseClipboardHTML 解析 Windows CF_HTML 格式：头部给出 Fragment 字节区间与 SourceURL，
// 取出片段正文并把 SourceURL 作为相对链接的 base。
// 头缺失或区间非法时退回原文（去掉 NUL 与 null 尾部），不丢内容。
func parseClipboardHTML(raw string) (html string, sourceURL string) {
	raw = strings.TrimRight(raw, "\x00")
	headerEnd := strings.Index(raw, "\r\n\r\n")
	separator := "\r\n"
	if headerEnd < 0 {
		headerEnd = strings.Index(raw, "\n\n")
		separator = "\n"
	}
	if headerEnd < 0 {
		return raw, ""
	}

	header := raw[:headerEnd]
	start, end := -1, -1
	for _, line := range strings.Split(header, separator) {
		key, value, found := strings.Cut(line, ":")
		if !found {
			continue
		}
		value = strings.TrimSpace(value)
		switch strings.TrimSpace(key) {
		case "SourceURL":
			sourceURL = value
		case "StartFragment":
			start, _ = strconv.Atoi(value)
		case "EndFragment":
			end, _ = strconv.Atoi(value)
		}
	}
	if start >= 0 && end > start && end <= len(raw) {
		return strings.TrimRight(raw[start:end], "\x00"), sourceURL
	}
	return raw[headerEnd+len(separator)*2:], sourceURL
}

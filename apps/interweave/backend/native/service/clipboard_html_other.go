//go:build !darwin && !windows

package service

import "context"

// HTML 剪贴板只在 macOS 与 Windows 上实现。其余平台返回空内容而不是错误：
// HTML 是多链接提取的增强，缺失时前端仍可全文扫描纯文本。
func readClipboardHTML(context.Context) (string, string, error) {
	return "", "", nil
}

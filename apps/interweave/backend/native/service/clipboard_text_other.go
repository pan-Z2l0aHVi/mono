//go:build !darwin && !windows

package service

import "context"

// 文本剪贴板只在 macOS 与 Windows 上实现。其余平台显式报不支持，不静默返回空串——
// 静默成功会让「粘贴为纯文本」看起来工作但什么也没贴。
func readClipboardText(context.Context) (string, error) {
	return "", unsupportedClipboardTextError()
}

func writeClipboardText(context.Context, string) error {
	return unsupportedClipboardTextError()
}

//go:build windows

package service

import (
	"context"
	"fmt"
	"runtime"
	"syscall"
	"unsafe"
)

// CF_HTML 是注册型剪贴板格式，取到的内容是带头部的 UTF-8 文本。
var procRegisterClipboardFormat = user32Clipboard.NewProc("RegisterClipboardFormatW")

func readClipboardHTML(ctx context.Context) (string, string, error) {
	if err := ctx.Err(); err != nil {
		return "", "", err
	}
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	if err := openWindowsClipboard(ctx); err != nil {
		return "", "", fmt.Errorf("open Windows clipboard: %w", err)
	}
	defer procCloseClipboard.Call()

	name, err := syscall.UTF16PtrFromString("HTML Format")
	if err != nil {
		return "", "", fmt.Errorf("encode Windows clipboard format: %w", err)
	}
	format, _, _ := procRegisterClipboardFormat.Call(uintptr(unsafe.Pointer(name)))
	if format == 0 {
		return "", "", nil
	}
	handle, _, _ := procGetClipboardData.Call(format)
	if handle == 0 {
		// 剪贴板里没有 HTML 是正常状态。
		return "", "", nil
	}
	pointer, _, _ := procGlobalLock.Call(handle)
	if pointer == 0 {
		return "", "", fmt.Errorf("lock Windows clipboard html")
	}
	defer procGlobalUnlock.Call(handle)

	size, _, _ := procGlobalSize.Call(handle)
	if size == 0 {
		return "", "", nil
	}
	// CF_HTML 的偏移量按字节计，必须按原始字节切片再转字符串，不能按 UTF-16 解码。
	raw := string(unsafe.Slice((*byte)(unsafe.Pointer(pointer)), int(size)))
	html, baseURL := parseClipboardHTML(raw)
	return html, baseURL, nil
}

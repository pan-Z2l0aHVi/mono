//go:build windows

package service

import (
	"context"
	"fmt"
	"runtime"
	"syscall"
	"unsafe"
)

const (
	clipboardUnicodeText = 13 // CF_UNICODETEXT
	globalMemMoveable    = 0x0002
)

var (
	kernel32Clipboard    = syscall.NewLazyDLL("kernel32.dll")
	procEmptyClipboard   = user32Clipboard.NewProc("EmptyClipboard")
	procSetClipboardData = user32Clipboard.NewProc("SetClipboardData")
	procGlobalAlloc      = kernel32Clipboard.NewProc("GlobalAlloc")
	procGlobalLock       = kernel32Clipboard.NewProc("GlobalLock")
	procGlobalUnlock     = kernel32Clipboard.NewProc("GlobalUnlock")
	procGlobalFree       = kernel32Clipboard.NewProc("GlobalFree")
	procGlobalSize       = kernel32Clipboard.NewProc("GlobalSize")
)

func readClipboardText(ctx context.Context) (string, error) {
	if err := ctx.Err(); err != nil {
		return "", err
	}
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	if err := openWindowsClipboard(ctx); err != nil {
		return "", fmt.Errorf("open Windows clipboard: %w", err)
	}
	defer procCloseClipboard.Call()

	handle, _, _ := procGetClipboardData.Call(clipboardUnicodeText)
	if handle == 0 {
		// 剪贴板里没有文本是正常状态，不是错误。
		return "", nil
	}
	pointer, _, _ := procGlobalLock.Call(handle)
	if pointer == 0 {
		return "", fmt.Errorf("lock Windows clipboard text")
	}
	defer procGlobalUnlock.Call(handle)
	return utf16PointerToString(handle, pointer)
}

func writeClipboardText(ctx context.Context, text string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	encoded, err := syscall.UTF16FromString(text)
	if err != nil {
		return fmt.Errorf("encode Windows clipboard text: %w", err)
	}

	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	if err := openWindowsClipboard(ctx); err != nil {
		return fmt.Errorf("open Windows clipboard: %w", err)
	}
	defer procCloseClipboard.Call()

	if cleared, _, clearErr := procEmptyClipboard.Call(); cleared == 0 {
		return fmt.Errorf("empty Windows clipboard: %w", clearErr)
	}

	handle, _, allocErr := procGlobalAlloc.Call(globalMemMoveable, uintptr(len(encoded))*unsafe.Sizeof(encoded[0]))
	if handle == 0 {
		return fmt.Errorf("allocate Windows clipboard text: %w", allocErr)
	}
	pointer, _, _ := procGlobalLock.Call(handle)
	if pointer == 0 {
		procGlobalFree.Call(handle)
		return fmt.Errorf("lock Windows clipboard text")
	}
	copy(unsafe.Slice((*uint16)(unsafe.Pointer(pointer)), len(encoded)), encoded)
	procGlobalUnlock.Call(handle)

	// SetClipboardData 成功后内存所有权归系统，不能再 GlobalFree。
	if stored, _, storeErr := procSetClipboardData.Call(clipboardUnicodeText, handle); stored == 0 {
		procGlobalFree.Call(handle)
		return fmt.Errorf("store Windows clipboard text: %w", storeErr)
	}
	return nil
}

// utf16PointerToString 读一段以 NUL 结尾的 UTF-16 缓冲。剪贴板不告诉字符长度，但 HGLOBAL
// 的分配大小可得：按 GlobalSize 定扫描上界，既不截断超长文本，也不会在缺少 NUL 的异常
// 缓冲区上越过分配继续读。
func utf16PointerToString(handle uintptr, pointer uintptr) (string, error) {
	size, _, sizeErr := procGlobalSize.Call(handle)
	if size == 0 {
		return "", fmt.Errorf("measure Windows clipboard text: %w", sizeErr)
	}
	units := size / unsafe.Sizeof(uint16(0))
	buffer := make([]uint16, 0, units)
	for index := uintptr(0); index < units; index++ {
		unit := *(*uint16)(unsafe.Pointer(pointer + index*unsafe.Sizeof(uint16(0))))
		if unit == 0 {
			break
		}
		buffer = append(buffer, unit)
	}
	return string(decodeUTF16Buffer(buffer)), nil
}

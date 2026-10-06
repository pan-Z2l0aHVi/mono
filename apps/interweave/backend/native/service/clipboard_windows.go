//go:build windows

package service

import (
	"context"
	"fmt"
	"runtime"
	"syscall"
	"time"
	"unsafe"
)

const clipboardFileDrop = 15

var (
	user32Clipboard      = syscall.NewLazyDLL("user32.dll")
	procOpenClipboard    = user32Clipboard.NewProc("OpenClipboard")
	procCloseClipboard   = user32Clipboard.NewProc("CloseClipboard")
	procGetClipboardData = user32Clipboard.NewProc("GetClipboardData")
	shell32Clipboard     = syscall.NewLazyDLL("shell32.dll")
	procDragQueryFile    = shell32Clipboard.NewProc("DragQueryFileW")
)

func readClipboardFilePaths(ctx context.Context) ([]string, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	if err := openWindowsClipboard(ctx); err != nil {
		return nil, fmt.Errorf("open Windows clipboard: %w", err)
	}
	defer procCloseClipboard.Call()

	handle, _, _ := procGetClipboardData.Call(clipboardFileDrop)
	if handle == 0 {
		return []string{}, nil
	}
	count, _, _ := procDragQueryFile.Call(handle, ^uintptr(0), 0, 0)
	if count == 0 {
		return []string{}, nil
	}

	buffer := make([]uint16, 32768)
	paths := make([]string, 0, int(count))
	for index := uintptr(0); index < count; index++ {
		length, _, callErr := procDragQueryFile.Call(handle, index, uintptr(unsafe.Pointer(&buffer[0])), uintptr(len(buffer)))
		if length == 0 {
			return nil, fmt.Errorf("read Windows clipboard file %d: %w", index, callErr)
		}
		if length > uintptr(len(buffer)) {
			return nil, fmt.Errorf("read Windows clipboard file %d: invalid UTF-16 length %d", index, length)
		}
		paths = append(paths, decodeUTF16Buffer(buffer[:length]))
	}
	return paths, nil
}

func openWindowsClipboard(ctx context.Context) error {
	var lastErr error
	for attempt := 0; attempt < 4; attempt++ {
		result, _, err := procOpenClipboard.Call(0)
		if result != 0 {
			return nil
		}
		lastErr = err
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(10 * time.Millisecond):
		}
	}
	return lastErr
}

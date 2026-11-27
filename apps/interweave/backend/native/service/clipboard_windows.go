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

type dropFilesHeader struct {
	pFiles uint32
	ptX    int32
	ptY    int32
	fNC    uint32
	fWide  uint32
}

func writeClipboardFilePath(ctx context.Context, filePath string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	encoded, err := syscall.UTF16FromString(filePath)
	if err != nil {
		return fmt.Errorf("encode Windows clipboard file path: %w", err)
	}
	// CF_HDROP 路径列表以双 NUL 结尾（UTF16FromString 已带单个 NUL，再补一个）。
	encoded = append(encoded, 0)

	headerSize := unsafe.Sizeof(dropFilesHeader{})
	dataBytes := uintptr(len(encoded)) * unsafe.Sizeof(encoded[0])
	totalSize := headerSize + dataBytes

	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	if err := openWindowsClipboard(ctx); err != nil {
		return fmt.Errorf("open Windows clipboard: %w", err)
	}
	defer procCloseClipboard.Call()

	if cleared, _, clearErr := procEmptyClipboard.Call(); cleared == 0 {
		return fmt.Errorf("empty Windows clipboard: %w", clearErr)
	}

	handle, _, allocErr := procGlobalAlloc.Call(globalMemMoveable, totalSize)
	if handle == 0 {
		return fmt.Errorf("allocate Windows clipboard file drop: %w", allocErr)
	}
	pointer, _, _ := procGlobalLock.Call(handle)
	if pointer == 0 {
		procGlobalFree.Call(handle)
		return fmt.Errorf("lock Windows clipboard file drop")
	}

	header := (*dropFilesHeader)(unsafe.Pointer(pointer))
	*header = dropFilesHeader{
		pFiles: uint32(headerSize),
		fWide:  1,
	}
	dest := unsafe.Slice((*uint16)(unsafe.Pointer(pointer+headerSize)), len(encoded))
	copy(dest, encoded)
	procGlobalUnlock.Call(handle)

	if stored, _, storeErr := procSetClipboardData.Call(clipboardFileDrop, handle); stored == 0 {
		procGlobalFree.Call(handle)
		return fmt.Errorf("store Windows clipboard file drop: %w", storeErr)
	}
	return nil
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

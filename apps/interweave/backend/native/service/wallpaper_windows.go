//go:build windows

// cspell:ignore SPIF spif WinINET

package service

import (
	"context"
	"fmt"
	"syscall"
	"unsafe"
)

const (
	// SPI_SETDESKWALLPAPER 与广播标志：系统负责把 jpg/png 转码持久化（Win8+）。
	spiSetDeskWallpaper = 0x0014
	spifUpdateINIFile   = 0x01
	spifSendChange      = 0x02
)

var (
	user32                = syscall.NewLazyDLL("user32.dll")
	systemParametersInfoW = user32.NewProc("SystemParametersInfoW")
)

// setWallpaperFromFile 经 SystemParametersInfoW 设置桌面壁纸（所有屏幕统一）。
func setWallpaperFromFile(ctx context.Context, path string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if path == "" {
		return fmt.Errorf("wallpaper: path is empty")
	}
	utf16Path, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return fmt.Errorf("wallpaper: invalid path: %w", err)
	}
	result, _, callErr := systemParametersInfoW.Call(
		uintptr(spiSetDeskWallpaper),
		0,
		uintptr(unsafe.Pointer(utf16Path)),
		uintptr(spifUpdateINIFile|spifSendChange),
	)
	// SystemParametersInfoW 成功返回非零；callErr 只反映调用是否发生，不反映成败。
	if result == 0 {
		return fmt.Errorf("wallpaper: SystemParametersInfoW failed: %v", callErr)
	}
	return nil
}

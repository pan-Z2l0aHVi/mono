//go:build !darwin && !windows && !linux

package service

import (
	"context"
	"fmt"
)

// setWallpaperFromFile：其余平台不支持设置壁纸，返回可读错误（前端菜单照常展示失败原因）。
func setWallpaperFromFile(_ context.Context, _ string) error {
	return fmt.Errorf("wallpaper: not supported on this platform")
}

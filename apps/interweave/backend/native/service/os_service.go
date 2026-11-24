package service

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

// 将操作系统能力限制在明确、可审查的桌面入口。壁纸下载与缓存目录由 main.go 装配（见 wallpaper.go）。
type OSService struct {
	streamFetcher     StreamFetcher
	wallpaperCacheDir string
}

// 保持原生能力与 Wails 注册边界集中。
func NewOSService(options ...OSServiceOption) *OSService {
	service := &OSService{wallpaperCacheDir: defaultWallpaperCacheDir()}
	for _, option := range options {
		option(service)
	}
	return service
}

// defaultWallpaperCacheDir 给装配处一个兜底；正常路径 main.go 会显式注入应用数据目录下的缓存目录。
func defaultWallpaperCacheDir() string {
	if userCache, err := os.UserCacheDir(); err == nil && userCache != "" {
		return filepath.Join(userCache, "interweave", "wallpapers")
	}
	return ""
}

// 始终交还给系统默认应用，Interweave 不接管外部内容。
func (s *OSService) OpenExternal(ctx context.Context, target string) error {
	if target == "" {
		return fmt.Errorf("target path or URL cannot be empty")
	}

	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.CommandContext(ctx, "open", target)
	case "windows":
		cmd = exec.CommandContext(ctx, "rundll32", "url.dll,FileProtocolHandler", target)
	case "linux":
		cmd = exec.CommandContext(ctx, "xdg-open", target)
	default:
		return fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}

	return cmd.Run()
}

// 只定位外部文件，不修改文件系统内容。
func (s *OSService) ShowInFileManager(ctx context.Context, filePath string) error {
	if filePath == "" {
		return fmt.Errorf("file path cannot be empty")
	}

	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.CommandContext(ctx, "open", "-R", filePath)
	case "windows":
		cmd = exec.CommandContext(ctx, "explorer", "/select,", filePath)
	case "linux":
		cmd = exec.CommandContext(ctx, "xdg-open", filepath.Dir(filePath))
	default:
		return fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}

	return cmd.Run()
}

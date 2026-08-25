package service

import (
	"context"
	"fmt"
	"os/exec"
	"runtime"
)

// 将操作系统能力限制在明确、可审查的桌面入口。
type OSService struct{}

// 保持原生能力与 Wails 注册边界集中。
func NewOSService() *OSService {
	return &OSService{}
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
		cmd = exec.CommandContext(ctx, "xdg-open", filePath)
	default:
		return fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}

	return cmd.Run()
}

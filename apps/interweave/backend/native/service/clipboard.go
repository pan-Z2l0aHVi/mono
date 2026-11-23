package service

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"unicode/utf16"
)

// GetClipboardFilePaths 返回剪贴板中当前存在的文件与文件夹绝对路径，不读取内容。
// 目录原样交给调用方的导入链递归展开（隐藏项与符号链接在那里统一过滤）。
func (s *OSService) GetClipboardFilePaths(ctx context.Context) ([]string, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	paths, err := readClipboardFilePaths(ctx)
	if err != nil {
		return nil, err
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	return normalizeClipboardFilePaths(paths), nil
}

func normalizeClipboardFilePaths(paths []string) []string {
	result := make([]string, 0, len(paths))
	seen := make(map[string]struct{}, len(paths))
	for _, path := range paths {
		cleanPath := strings.TrimSpace(path)
		if cleanPath == "" {
			continue
		}
		// 普通文件与目录都保留：Finder 里复制文件夹是常见入口，展开收敛在导入链。
		info, err := os.Stat(cleanPath)
		if err != nil || !(info.Mode().IsRegular() || info.IsDir()) {
			continue
		}
		absolutePath, err := filepath.Abs(cleanPath)
		if err != nil {
			continue
		}
		absolutePath = filepath.Clean(absolutePath)
		key := absolutePath
		if runtime.GOOS == "windows" {
			key = strings.ToLower(key)
		}
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, absolutePath)
	}
	return result
}

func parseClipboardURIList(value string) []string {
	paths := make([]string, 0)
	for _, line := range strings.Split(value, "\n") {
		line = strings.TrimSpace(strings.TrimSuffix(line, "\r"))
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parsed, err := url.Parse(line)
		if err != nil || !strings.EqualFold(parsed.Scheme, "file") {
			continue
		}
		path, err := url.PathUnescape(parsed.Path)
		if err != nil {
			continue
		}
		if runtime.GOOS == "windows" {
			path = strings.TrimPrefix(filepath.FromSlash(path), string(filepath.Separator))
		}
		if path != "" {
			paths = append(paths, path)
		}
	}
	return paths
}

func decodeUTF16Buffer(value []uint16) string {
	end := len(value)
	for index, codeUnit := range value {
		if codeUnit == 0 {
			end = index
			break
		}
	}
	return string(utf16.Decode(value[:end]))
}

func unsupportedClipboardError() error {
	return fmt.Errorf("clipboard file access is unsupported on %s", runtime.GOOS)
}

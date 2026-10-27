package service

import (
	"context"
	"fmt"
	"net/url"
	"strings"
)

// DefaultOpenWith 返回操作系统为 target 选定的默认应用显示名。
//
// http/https 链接取默认浏览器，其余按本地文件路径取默认打开方式。只读取系统关联，
// 不枚举可选应用，也不启动任何进程；真正打开仍走 OpenExternal。
func (s *OSService) DefaultOpenWith(ctx context.Context, target string) (string, error) {
	if strings.TrimSpace(target) == "" {
		return "", fmt.Errorf("target path or URL cannot be empty")
	}
	if err := ctx.Err(); err != nil {
		return "", err
	}

	name, err := defaultOpenWithName(ctx, target, isHTTPURL(target))
	if err != nil {
		return "", err
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return "", fmt.Errorf("no default application found for %q", target)
	}
	return name, nil
}

func isHTTPURL(target string) bool {
	parsed, err := url.Parse(target)
	if err != nil || parsed.Host == "" {
		return false
	}
	switch strings.ToLower(parsed.Scheme) {
	case "http", "https":
		return true
	default:
		return false
	}
}

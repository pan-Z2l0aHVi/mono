package normalize

import (
	"errors"
	"net/url"
	"path/filepath"
	"regexp"
	"strings"

	"golang.org/x/text/unicode/norm"
)

var whitespaceRegex = regexp.MustCompile(`\s+`)

// 将同一语义标签收敛为稳定身份，同时保留用户可见的大小写与符号。
func TagName(input string) (string, error) {
	// 先统一 Unicode 表示，避免视觉相同的标签分裂。
	normalized := norm.NFC.String(input)

	// 忽略输入边界的无意义空白。
	trimmed := strings.TrimSpace(normalized)
	if trimmed == "" {
		return "", errors.New("tag name cannot be empty")
	}

	// 避免内部空白差异制造重复标签。
	collapsed := whitespaceRegex.ReplaceAllString(trimmed, " ")

	return collapsed, nil
}

// 仅消除等价写法，不改变用户提供入口的语义。
func URL(input string) (string, error) {
	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return "", errors.New("URL cannot be empty")
	}

	parsed, err := url.Parse(trimmed)
	if err != nil {
		return "", err
	}

	scheme := strings.ToLower(parsed.Scheme)
	if scheme != "http" && scheme != "https" {
		return "", errors.New("URL scheme must be http or https")
	}
	parsed.Scheme = scheme

	host := strings.ToLower(parsed.Hostname())
	if host == "" {
		return "", errors.New("URL must contain a valid host")
	}
	port := parsed.Port()
	if port != "" {
		if (scheme == "http" && port == "80") || (scheme == "https" && port == "443") {
			parsed.Host = host
		} else {
			parsed.Host = host + ":" + port
		}
	} else {
		parsed.Host = host
	}

	if parsed.Path == "" {
		parsed.Path = "/"
	}

	return parsed.String(), nil
}

// 以稳定的绝对路径引用本地内容。
func FilePath(input string) (string, error) {
	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return "", errors.New("file path cannot be empty")
	}

	absPath, err := filepath.Abs(trimmed)
	if err != nil {
		return "", err
	}

	return filepath.Clean(absPath), nil
}

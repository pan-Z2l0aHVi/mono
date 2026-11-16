package main

import (
	_ "embed"
	"strings"
)

// configYAML 是构建配置：`scripts/sync-version.mjs` 以 package.json 为唯一版本源，
// 把版本写进这里的 `info.version`，再由同一份配置进各平台产物。
// 以 embed 读取而不是构建期 ldflags：版本值因此在 dev 与 release 都是同一个来源，
// 也不需要在 darwin/windows 两个 Taskfile 里各写一份解析。
//
//go:embed build/config.yml
var configYAML string

// fallbackVersion 是配置缺失版本时的兜底。它只在配置被破坏时出现，
// 不应该出现在正常构建产物里。
const fallbackVersion = "0.0.0"

// appVersion 从构建配置的 info 段读出 version。
//
// 不能全文搜 `version:`：文件开头的 `version: '3'` 是配置格式版本。所以先定位顶格的
// `info:` 段，再取段内第一处 `version:`。
func appVersion(config string) string {
	inInfo := false
	for _, line := range strings.Split(config, "\n") {
		line = strings.TrimRight(line, "\r")
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}
		indent := len(line) - len(strings.TrimLeft(line, " \t"))
		if indent == 0 {
			inInfo = trimmed == "info:"
			continue
		}
		if !inInfo || !strings.HasPrefix(trimmed, "version:") {
			continue
		}
		value := strings.TrimSpace(strings.TrimPrefix(trimmed, "version:"))
		// 行尾注释要先去：`version: '0.1.5' # The application version` 的注释里也含空格，
		// 先剥引号会把收尾引号留在值里。
		if comment := strings.Index(value, " #"); comment >= 0 {
			value = strings.TrimSpace(value[:comment])
		}
		value = strings.Trim(value, `'"`)
		if value != "" {
			return value
		}
	}
	return fallbackVersion
}

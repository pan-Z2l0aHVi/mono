package updater

import (
	"regexp"
	"strings"
	"unicode/utf8"
)

var (
	mdLinkPattern   = regexp.MustCompile(`\[([^\]]+)\]\(([^)]+)\)`)
	mdHeadingPrefix = regexp.MustCompile(`^#{1,6}\s+`)
	mdInlineCode    = regexp.MustCompile("`([^`]+)`")
	mdBoldItalic    = regexp.MustCompile(`(\*\*|__|\*|_)`)
)

// CleanReleaseNotes 将 GitHub Release 的 Markdown 正文转换为适合原生弹窗展示的简洁纯文本。
func CleanReleaseNotes(raw string) string {
	normalized := strings.ReplaceAll(raw, "\r\n", "\n")
	lines := strings.Split(normalized, "\n")
	out := make([]string, 0, len(lines))
	inCodeBlock := false
	blankPending := false

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "```") {
			inCodeBlock = !inCodeBlock
			continue
		}
		if trimmed == "" {
			if len(out) > 0 {
				blankPending = true
			}
			continue
		}
		if blankPending {
			out = append(out, "")
			blankPending = false
		}
		if !inCodeBlock {
			trimmed = mdHeadingPrefix.ReplaceAllString(trimmed, "")
			trimmed = mdLinkPattern.ReplaceAllString(trimmed, "$1")
			trimmed = mdInlineCode.ReplaceAllString(trimmed, "$1")
			trimmed = mdBoldItalic.ReplaceAllString(trimmed, "")
			if strings.HasPrefix(trimmed, "- ") || strings.HasPrefix(trimmed, "* ") {
				trimmed = "• " + strings.TrimSpace(trimmed[2:])
			}
		}
		out = append(out, trimmed)
	}
	return strings.TrimSpace(strings.Join(out, "\n"))
}

// TruncateReleaseNotes 为 Windows TaskDialogIndirect 等无滚动区弹窗截断更新日志，
// 限制最多 maxLines 行且最多 maxRunes 个字符，超出时在末尾附加省略号。
func TruncateReleaseNotes(clean string, maxLines int, maxRunes int) (text string, truncated bool) {
	if clean == "" {
		return "", false
	}
	lines := strings.Split(clean, "\n")
	if maxLines > 0 && len(lines) > maxLines {
		lines = lines[:maxLines]
		truncated = true
	}
	joined := strings.Join(lines, "\n")
	if maxRunes > 0 && utf8.RuneCountInString(joined) > maxRunes {
		runes := []rune(joined)
		joined = strings.TrimSpace(string(runes[:maxRunes]))
		truncated = true
	}
	if truncated {
		joined = strings.TrimRight(joined, "\n ") + "…"
	}
	return joined, truncated
}

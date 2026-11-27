package updater

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// SemVer 表示三段式正式语义化版本号（不含预发布后缀）。
type SemVer struct {
	Major int
	Minor int
	Patch int
}

var (
	stableSemVerPattern = regexp.MustCompile(`^v?(\d+)\.(\d+)\.(\d+)$`)
	releaseTagPattern   = regexp.MustCompile(`^interweave-v(\d+)\.(\d+)\.(\d+)$`)
)

// ParseStableSemVer 解析正式稳定版版本号（如 "0.3.0" 或 "v0.3.0"）。
// 带预发布后缀（如 -alpha/-beta/-rc）或构建元数据的版本会被拒绝。
func ParseStableSemVer(raw string) (SemVer, error) {
	trimmed := strings.TrimSpace(raw)
	matches := stableSemVerPattern.FindStringSubmatch(trimmed)
	if matches == nil {
		return SemVer{}, fmt.Errorf("invalid stable semver: %q", raw)
	}
	return parseMatchedSemVer(matches[1], matches[2], matches[3], raw)
}

// ParseInterweaveReleaseTag 解析 monorepo 中的 Interweave 正式版 Release tag（严格匹配 interweave-vX.Y.Z）。
func ParseInterweaveReleaseTag(tag string) (SemVer, bool) {
	matches := releaseTagPattern.FindStringSubmatch(strings.TrimSpace(tag))
	if matches == nil {
		return SemVer{}, false
	}
	v, err := parseMatchedSemVer(matches[1], matches[2], matches[3], tag)
	if err != nil {
		return SemVer{}, false
	}
	return v, true
}

func parseMatchedSemVer(majorStr, minorStr, patchStr, raw string) (SemVer, error) {
	major, err := strconv.Atoi(majorStr)
	if err != nil {
		return SemVer{}, fmt.Errorf("invalid major version in %q: %w", raw, err)
	}
	minor, err := strconv.Atoi(minorStr)
	if err != nil {
		return SemVer{}, fmt.Errorf("invalid minor version in %q: %w", raw, err)
	}
	patch, err := strconv.Atoi(patchStr)
	if err != nil {
		return SemVer{}, fmt.Errorf("invalid patch version in %q: %w", raw, err)
	}
	return SemVer{Major: major, Minor: minor, Patch: patch}, nil
}

// Compare 比较两个版本号：v < other 返回 -1，相等返回 0，v > other 返回 1。
func (v SemVer) Compare(other SemVer) int {
	if v.Major != other.Major {
		if v.Major < other.Major {
			return -1
		}
		return 1
	}
	if v.Minor != other.Minor {
		if v.Minor < other.Minor {
			return -1
		}
		return 1
	}
	if v.Patch != other.Patch {
		if v.Patch < other.Patch {
			return -1
		}
		return 1
	}
	return 0
}

// String 返回不带 v 前缀的标准三段版本号字符串。
func (v SemVer) String() string {
	return fmt.Sprintf("%d.%d.%d", v.Major, v.Minor, v.Patch)
}

package main

import "testing"

const sampleConfig = `version: '3'

info:
  companyName: 'greypan'
  productName: 'Interweave'
  version: '0.1.5' # The application version

dev_mode:
  root_path: .
`

// 文件开头的 `version: '3'` 是配置格式版本，不是应用版本：解析必须先定位 info 段。
func TestAppVersionReadsInfoSection(t *testing.T) {
	if got := appVersion(sampleConfig); got != "0.1.5" {
		t.Fatalf("expected 0.1.5, got %q", got)
	}
}

func TestParseAppVersionAcceptsZeroVersion(t *testing.T) {
	got, ok := parseAppVersion("version: '3'\n\ninfo:\n  version: '0.0.0'\n")
	if !ok || got != "0.0.0" {
		t.Fatalf("expected (0.0.0, true), got (%q, %v)", got, ok)
	}
}

func TestAppVersionFallsBackWhenInfoMissing(t *testing.T) {
	if got := appVersion("version: '3'\n"); got != fallbackVersion {
		t.Fatalf("expected the fallback, got %q", got)
	}
}

func TestAppVersionFallsBackOnEmptyInput(t *testing.T) {
	if got := appVersion(""); got != fallbackVersion {
		t.Fatalf("expected the fallback, got %q", got)
	}
}

// 嵌入的正是仓库里那份配置：同步脚本改版本后，这里读到的必须非空且解析成功。
func TestEmbeddedConfigCarriesAVersion(t *testing.T) {
	if got, ok := parseAppVersion(configYAML); !ok || got == "" {
		t.Fatalf("embedded build/config.yml has no info.version (got %q, ok=%v)", got, ok)
	}
}

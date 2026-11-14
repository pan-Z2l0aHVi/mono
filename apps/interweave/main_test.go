package main

import (
	"path/filepath"
	"testing"
)

func TestAppDescriptionCarriesVersion(t *testing.T) {
	if got := appDescription("1.2.3"); got != "Interweave 1.2.3 桌面应用" {
		t.Fatalf("native about panel has no version field of its own, so the description must carry it; got %q", got)
	}
}

// 数据目录固定在 PathDataHome 下的 interweave 子目录：库文件、缩略图与设置同处一处。
func TestDataDirUsesDataHome(t *testing.T) {
	dir, err := dataDir()
	if err != nil {
		t.Fatalf("dataDir: %v", err)
	}
	if base := filepath.Base(dir); base != "interweave" {
		t.Fatalf("expected the last path segment to be interweave, got %q from %q", base, dir)
	}
}

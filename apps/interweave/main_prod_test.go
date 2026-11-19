//go:build production

package main

import (
	"path/filepath"
	"testing"
)

func TestDataDirUsesProductionDataHome(t *testing.T) {
	dir := dataDirPath()
	if base := filepath.Base(dir); base != "interweave" {
		t.Fatalf("expected the last path segment to be interweave, got %q from %q", base, dir)
	}
}

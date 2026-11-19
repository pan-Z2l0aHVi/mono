//go:build !production

package main

import (
	"path/filepath"
	"testing"
)

func TestDataDirUsesDevelopmentDataHome(t *testing.T) {
	dir := dataDirPath()
	if base := filepath.Base(dir); base != "interweave-dev" {
		t.Fatalf("expected the last path segment to be interweave-dev, got %q from %q", base, dir)
	}
}

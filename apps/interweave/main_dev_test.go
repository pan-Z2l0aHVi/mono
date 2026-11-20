//go:build !production

package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDataDirUsesDevelopmentDataHome(t *testing.T) {
	dir, err := dataDirAt(t.TempDir())
	if err != nil {
		t.Fatalf("dataDirAt: %v", err)
	}
	if base := filepath.Base(dir); base != "interweave-dev" {
		t.Fatalf("expected the last path segment to be interweave-dev, got %q from %q", base, dir)
	}
	if info, err := os.Stat(dir); err != nil || !info.IsDir() {
		t.Fatalf("expected the data directory to be created, stat: %v, info dir: %v", err, info != nil && info.IsDir())
	}
}

//go:build !linux && !darwin && !windows

package core

import "os"

func fileIdentity(_ string, _ os.FileInfo) (string, int64) { return "", 0 }

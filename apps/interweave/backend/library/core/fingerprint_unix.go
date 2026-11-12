//go:build linux || darwin

package core

import (
	"fmt"
	"os"
	"syscall"
)

func fileIdentity(_ string, info os.FileInfo) (string, int64) {
	s, ok := info.Sys().(*syscall.Stat_t)
	if !ok || s.Ino == 0 {
		return "", 0
	}
	return fmt.Sprintf("%d:%d", s.Dev, s.Ino), statChanged(s)
}

//go:build linux

package core

// cspell:ignore Ctim Nsec

import "syscall"

func statChanged(s *syscall.Stat_t) int64 { return s.Ctim.Sec*1e9 + s.Ctim.Nsec }

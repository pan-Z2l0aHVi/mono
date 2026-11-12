//go:build darwin

package core

// cspell:ignore Ctimespec Nsec

import "syscall"

func statChanged(s *syscall.Stat_t) int64 { return s.Ctimespec.Sec*1e9 + s.Ctimespec.Nsec }

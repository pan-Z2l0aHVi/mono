//go:build !darwin && !windows && !linux

package service

import (
	"context"
	"fmt"
	"runtime"
)

func defaultOpenWithName(_ context.Context, _ string, _ bool) (string, error) {
	return "", fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
}

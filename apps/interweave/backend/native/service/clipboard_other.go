//go:build !darwin && !linux && !windows

package service

import "context"

func readClipboardFilePaths(context.Context) ([]string, error) {
	return nil, unsupportedClipboardError()
}

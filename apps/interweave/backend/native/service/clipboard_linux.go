//go:build linux

package service

import (
	"context"
	"fmt"
	"os/exec"
	"time"
)

func readClipboardFilePaths(ctx context.Context) ([]string, error) {
	readCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	waylandOutput, waylandErr := exec.CommandContext(readCtx, "wl-paste", "--no-newline", "--type", "text/uri-list").Output()
	if waylandErr == nil {
		return parseClipboardURIList(string(waylandOutput)), nil
	}
	if readCtx.Err() != nil {
		return nil, readCtx.Err()
	}
	_, waylandPathErr := exec.LookPath("wl-paste")
	_, xclipPathErr := exec.LookPath("xclip")

	xclipOutput, xclipErr := exec.CommandContext(readCtx, "xclip", "-selection", "clipboard", "-t", "text/uri-list", "-o").Output()
	if xclipErr == nil {
		return parseClipboardURIList(string(xclipOutput)), nil
	}
	if readCtx.Err() != nil {
		return nil, readCtx.Err()
	}
	if waylandPathErr == nil || xclipPathErr == nil {
		return []string{}, nil
	}
	return nil, fmt.Errorf("read Linux clipboard file paths: wl-paste: %v; xclip: %w", waylandErr, xclipErr)
}

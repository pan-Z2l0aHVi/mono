//go:build linux

package service

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
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

func writeClipboardFilePath(ctx context.Context, filePath string) error {
	writeCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	payload := formatClipboardFileURI(filePath)
	waylandCmd := exec.CommandContext(writeCtx, "wl-copy", "--type", "text/uri-list")
	waylandCmd.Stdin = strings.NewReader(payload)
	waylandErr := waylandCmd.Run()
	if waylandErr == nil {
		return nil
	}
	if writeCtx.Err() != nil {
		return writeCtx.Err()
	}

	xclipCmd := exec.CommandContext(writeCtx, "xclip", "-selection", "clipboard", "-t", "text/uri-list", "-i")
	xclipCmd.Stdin = strings.NewReader(payload)
	xclipErr := xclipCmd.Run()
	if xclipErr == nil {
		return nil
	}
	if writeCtx.Err() != nil {
		return writeCtx.Err()
	}
	return fmt.Errorf("write Linux clipboard file path: wl-copy: %v; xclip: %w", waylandErr, xclipErr)
}

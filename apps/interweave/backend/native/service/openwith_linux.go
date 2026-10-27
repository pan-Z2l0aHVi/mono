//go:build linux

package service

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func defaultOpenWithName(ctx context.Context, target string, isURL bool) (string, error) {
	desktopID, err := defaultDesktopID(ctx, target, isURL)
	if err != nil {
		return "", err
	}

	dirs := desktopEntryDirs(os.Getenv("XDG_DATA_HOME"), os.Getenv("XDG_DATA_DIRS"))
	if name := desktopEntryName(desktopID, dirs); name != "" {
		return name, nil
	}
	return strings.TrimSuffix(desktopID, ".desktop"), nil
}

func defaultDesktopID(ctx context.Context, target string, isURL bool) (string, error) {
	if isURL {
		if out, err := exec.CommandContext(ctx, "xdg-settings", "get", "default-web-browser").Output(); err == nil {
			if desktopID := strings.TrimSpace(string(out)); desktopID != "" {
				return desktopID, nil
			}
		}
	}

	mimeType := "text/html"
	if !isURL {
		out, err := exec.CommandContext(ctx, "xdg-mime", "query", "filetype", target).Output()
		if err != nil {
			return "", fmt.Errorf("query MIME type for %q: %w", target, err)
		}
		mimeType = strings.TrimSpace(string(out))
		if mimeType == "" {
			return "", fmt.Errorf("query MIME type for %q: empty result", target)
		}
	}

	out, err := exec.CommandContext(ctx, "xdg-mime", "query", "default", mimeType).Output()
	if err != nil {
		return "", fmt.Errorf("query default application for %s: %w", mimeType, err)
	}
	desktopID := strings.TrimSpace(string(out))
	if desktopID == "" {
		return "", fmt.Errorf("no default application for %s", mimeType)
	}
	return desktopID, nil
}

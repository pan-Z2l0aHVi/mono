//go:build linux

// cspell:ignore gsettings

package service

import (
	"context"
	"os"
	"os/exec"
	"time"
)

func defaultPlatformProxyLookup() systemProxyLookup {
	return newLinuxGSettingsProxy(os.Getenv, execGSettingsGet, time.Now, gsettingsCacheTTL).Resolve
}

func execGSettingsGet(ctx context.Context, schema, key string) (string, error) {
	out, err := exec.CommandContext(ctx, "gsettings", "get", schema, key).Output()
	if err != nil {
		return "", err
	}
	return string(out), nil
}

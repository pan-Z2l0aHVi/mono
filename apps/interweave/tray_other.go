//go:build !windows

package main

import (
	"runtime"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func applyPlatformTrayIcons(_ *application.App, tray *application.SystemTray) func() {
	applyTrayIcons(tray, runtime.GOOS)
	return nil
}

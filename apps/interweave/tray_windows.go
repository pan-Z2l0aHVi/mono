//go:build windows

package main

import (
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
	"golang.org/x/sys/windows/registry"
)

// isWindowsTaskbarDark 读取 Windows 任务栏主题（SystemUsesLightTheme == 0 表示深色任务栏）。
// 读取失败时回退为浅色任务栏（false），优先保证深色图标在浅色任务栏可见。
func isWindowsTaskbarDark() bool {
	key, err := registry.OpenKey(
		registry.CURRENT_USER,
		`SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize`,
		registry.QUERY_VALUE,
	)
	if err != nil {
		return false
	}
	defer key.Close()

	val, _, err := key.GetIntegerValue("SystemUsesLightTheme")
	if err != nil {
		return false
	}
	return val == 0
}

// applyPlatformTrayIcons 在 Windows 上绕开 Wails v3.1.0 systemtray_windows.go 中
// SetIcon + SetDarkModeIcon 运行期对称覆写的缺陷：仅按当前任务栏主题调用 SetIcon，
// 并监听 SystemThemeChanged 动态切换图标。
func applyPlatformTrayIcons(app *application.App, tray *application.SystemTray) func() {
	update := func() {
		tray.SetIcon(windowsTrayIcon(isWindowsTaskbarDark()))
	}
	update()
	if app == nil {
		return nil
	}
	return app.Event.OnApplicationEvent(events.Windows.SystemThemeChanged, func(*application.ApplicationEvent) {
		update()
	})
}

// Package updater 提供 Interweave 的应用内检查更新与一键更新内核。
//
// 本包保持纯 Go 核心逻辑（状态机、GitHub Releases 分页与 ETag 缓存、SHA-256 严格校验、
// Release Notes 文本规范化与 CLI 子命令分流）零 CGO/Win32 依赖，确保在 Linux CI 可完整运行
// -race 单元测试；macOS AppKit NSPanel / hdiutil 提权替换与 Windows TaskDialogIndirect /
// UAC 自举替换收敛在各自的 *_darwin.go 与 *_windows.go 平台薄层中。
package updater

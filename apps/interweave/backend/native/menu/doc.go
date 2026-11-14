// Package menu 构建 Interweave 的顶部菜单树：macOS 是全局系统菜单，Windows 是窗口顶部的
// Win32 菜单栏。两端共用一棵树，平台差异集中在 role、窗口菜单与是否注入 App 菜单。
//
// 本包不注册 Wails Service：菜单由 Go 完全拥有，前端只通过 backend/menu 的命令事件接收点击
// 结果；菜单可用性上报由 backend/menu 的 Service 承担。
package menu

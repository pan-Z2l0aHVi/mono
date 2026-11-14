// Package menu 构建 Interweave 的顶部菜单树：macOS 是全局系统菜单，Windows 是窗口顶部的
// Win32 菜单栏。两端共用一棵树，平台差异集中在 role 与显隐位置。
//
// 本包不注册 Wails Service：菜单由 Go 完全拥有，前端没有可调用入口，只通过
// backend/menu 的命令事件接收点击结果。
package menu

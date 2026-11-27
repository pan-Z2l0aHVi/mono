//go:build production

package main

// appDataDirName 与 Wails production tag 的发布语义同源，正式版数据目录保持不变。
const appDataDirName = "interweave"

// isProductionBuild 供应用内更新器区分开发态与正式发布构建。
const isProductionBuild = true

//go:build !production

package main

// appDataDirName 与 Wails production tag 的发布语义同源，开发版数据目录与正式版隔离。
const appDataDirName = "interweave-dev"

// isProductionBuild 供应用内更新器区分开发态与正式发布构建。
const isProductionBuild = false

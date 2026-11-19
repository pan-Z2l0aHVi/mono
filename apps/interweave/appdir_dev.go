//go:build !production

package main

// appDataDirName 与 Wails production tag 的发布语义同源，开发版数据目录与正式版隔离。
const appDataDirName = "interweave-dev"

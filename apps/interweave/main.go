package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// Wails 使用 Go 的 embed 将前端产物嵌入二进制。
// 任何 frontend/dist 下的文件都会被嵌入。

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// This empty shell intentionally registers no services. When product work
	// begins, only services from backend/library and backend/native may be
	// registered here; see ADR-0019.
	app := application.New(application.Options{
		Name:        "Interweave",
		Description: "Interweave desktop application",
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:  "Interweave",
		Width:  1280,
		Height: 800,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(6, 7, 15),
		URL:              "/",
	})

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}

package main

import (
	"embed"
	"log"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v3/pkg/application"

	libraryService "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	nativeService "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/native/service"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

// 将前端产物随桌面应用交付，避免运行时依赖外部开发服务器。

//go:embed all:frontend/dist
var assets embed.FS

func getDatabasePath() string {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	appDir := filepath.Join(configDir, "interweave")
	_ = os.MkdirAll(appDir, 0755)
	return filepath.Join(appDir, "library.db")
}

func main() {
	dbPath := getDatabasePath()
	db, err := storage.Open(dbPath)
	if err != nil {
		log.Fatalf("failed to open database at %s: %v", dbPath, err)
	}
	defer db.Close()

	fetcher := remote.NewFetcher()
	resourceService := libraryService.NewResourceService(db, fetcher)
	sourceService := libraryService.NewSourceService(db, fetcher)
	tagService := libraryService.NewTagService(db)
	mapService := libraryService.NewMapService(db, resourceService)
	osService := nativeService.NewOSService()

	// 仅暴露产品与受控原生能力，避免基础设施绕过后端边界。
	app := application.New(application.Options{
		Name:        "Interweave",
		Description: "Interweave desktop application",
		Services: []application.Service{
			application.NewService(resourceService),
			application.NewService(sourceService),
			application.NewService(tagService),
			application.NewService(mapService),
			application.NewService(osService),
		},
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

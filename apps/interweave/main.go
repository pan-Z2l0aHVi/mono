package main

import (
	"embed"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"

	coreLibrary "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
	libraryMedia "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/media"
	libraryService "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	nativeService "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/native/service"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

// 将前端产物随桌面应用交付，避免运行时依赖外部开发服务器。

//go:embed all:frontend/dist
var assets embed.FS

func getDatabasePath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	appDir := filepath.Join(configDir, "interweave")
	if err := os.MkdirAll(appDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create data directory %s: %w", appDir, err)
	}
	return filepath.Join(appDir, "library.db"), nil
}

func addPasteFilesMenuItem(menu *application.Menu, onPaste func()) bool {
	editMenu := menu.FindByRole(application.EditMenu)
	if editMenu == nil {
		return false
	}
	editMenu.GetSubmenu().AddSeparator()
	editMenu.GetSubmenu().
		Add("Paste Files").
		SetAccelerator("CmdOrCtrl+Shift+v").
		OnClick(func(*application.Context) {
			onPaste()
		})
	return true
}

func main() {
	dbPath, err := getDatabasePath()
	if err != nil {
		log.Fatalf("failed to prepare database location: %v", err)
	}
	db, err := storage.Open(dbPath)
	if err != nil {
		log.Fatalf("failed to open database at %s: %v", dbPath, err)
	}
	defer db.Close()

	fetcher := remote.NewFetcher()

	coreResourceService := coreLibrary.NewResourceService(db, fetcher)
	coreSourceService := coreLibrary.NewSourceService(db, fetcher)
	coreTagService := coreLibrary.NewTagService(db)
	coreMapService := coreLibrary.NewMapService(db)

	resourceService := libraryService.NewResourceService(coreResourceService)
	sourceService := libraryService.NewSourceService(coreSourceService)
	tagService := libraryService.NewTagService(coreTagService)
	mapService := libraryService.NewMapService(coreMapService)
	osService := nativeService.NewOSService()
	mediaHandler := libraryMedia.NewHandler(storage.SourceStore{}, db.SqlDB())

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
			Handler:    application.AssetFileServerFS(assets),
			Middleware: mediaHandler.Middleware,
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	window := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:              "Interweave",
		Width:              1280,
		Height:             800,
		EnableFileDrop:     true,
		UseApplicationMenu: true,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(6, 7, 15),
		URL:              "/",
	})
	window.OnWindowEvent(events.Common.WindowFilesDropped, func(event *application.WindowEvent) {
		window.EmitEvent("library:files-dropped", event.Context().DroppedFiles())
	})
	menu := application.DefaultApplicationMenu()
	if addPasteFilesMenuItem(menu, func() {
		window.EmitEvent("library:paste-files-requested")
	}) {
		app.Menu.Set(menu)
	}

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}

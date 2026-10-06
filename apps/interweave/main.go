package main

import (
	"context"
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
	libraryWatch "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/watch"
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

	pendingPreviews := libraryMedia.NewPendingPreviewRegistry()
	resourceService := libraryService.NewResourceService(coreResourceService, pendingPreviews)
	sourceService := libraryService.NewSourceService(coreSourceService)
	tagService := libraryService.NewTagService(coreTagService)
	mapService := libraryService.NewMapService(coreMapService)
	osService := nativeService.NewOSService()

	// 事件出口要等 window 就绪才能确定。注入 watcher 的是读取该变量的闭包而不是当时的值，
	// 且赋值发生在 watcher 启动与 app.Run 之前：watcher 的 goroutine 由 Start 在赋值后创建，
	// 媒体回写 worker 读到的第一条消息必然来自 app.Run 之后建立的请求 goroutine。
	var emitSourceAvailability libraryWatch.Emitter
	watcher, watchErr := libraryWatch.NewWatcher(coreSourceService, func(change coreLibrary.AvailabilityChange) {
		emitSourceAvailability(change)
	})
	if watchErr != nil {
		log.Printf("interweave: file watch unavailable, availability relies on manual refresh: %v", watchErr)
	}

	// 媒体 404 兜底复用 watcher 的写入口与发射出口。监听不可用时传 nil，
	// 保持「不启用兜底」而不是把 nil *Watcher 装进非空接口。
	var mediaReporter libraryMedia.AvailabilityReporter
	if watcher != nil {
		mediaReporter = watcher
	}
	mediaHandler := libraryMedia.NewHandler(storage.SourceStore{}, db.SqlDB(), pendingPreviews, mediaReporter)
	defer mediaHandler.Close()

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

	// watcher 不注册为 Wails Service（ADR-0008 §2 的暴露面 allowlist）：它是产品能力之外的
	// 基础设施编排，只由 main.go 装配、由 OnShutdown 收尾。
	emitSourceAvailability = func(change coreLibrary.AvailabilityChange) {
		window.EmitEvent(libraryService.SourceAvailabilityEventName, libraryService.NewSourceAvailabilityEventDTO(change))
	}
	if watcher != nil {
		coreSourceService.SetIndexSync(watcher)
		coreResourceService.SetIndexSync(watcher)
		if err := watcher.Start(context.Background()); err != nil {
			log.Printf("interweave: failed to start file watch: %v", err)
		}
		// 双保险：OnShutdown 覆盖正常退出，defer 覆盖 app.Run 返回错误的路径。
		app.OnShutdown(watcher.Stop)
		defer watcher.Stop()
	}

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}

package main

import (
	"context"
	"embed"
	"log"

	"github.com/adrg/xdg"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// Wails 使用 Go 的 embed 将前端产物嵌入二进制。
// 任何 frontend/dist 下的文件都会被嵌入。

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	ctx := context.Background()

	db, err := backend.OpenStore()
	if err != nil {
		log.Fatalf("初始化数据库: %v", err)
	}
	defer func() { _ = db.Close() }()

	// 事件推送：服务通过 application.Get() 惰性获取 app 实例（测试时为空则忽略）。
	emit := func(name string, data any) {
		if app := application.Get(); app != nil {
			app.Event.Emit(name, data)
		}
	}

	itemSvc := backend.NewItemService(db, emit)
	tagSvc := backend.NewTagService(db, emit)
	repairSvc := backend.NewRepairService(db, emit)
	indexSvc := backend.NewIndexService(db, itemSvc, repairSvc, emit)
	watchSvc := backend.NewWatchService(db, itemSvc, repairSvc, emit)
	mcpMgr := backend.NewMcpManager(db, itemSvc, tagSvc, repairSvc, indexSvc)
	settingsSvc := backend.NewSettingsService(db, mcpMgr)

	if libPath, err := xdg.DataFile("interweave"); err == nil && libPath != "" {
		_ = settingsSvc.SetLibraryPath(ctx, libPath)
	}
	if err := mcpMgr.Start(ctx); err != nil {
		log.Fatalf("启动本地服务: %v", err)
	}
	defer mcpMgr.Stop()

	app := application.New(application.Options{
		Name:        "Interweave",
		Description: "Interweave 素材中心化管理",
		Services: []application.Service{
			application.NewService(itemSvc),
			application.NewService(tagSvc),
			application.NewService(repairSvc),
			application.NewService(indexSvc),
			application.NewService(watchSvc),
			application.NewService(settingsSvc),
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

	// 后台监听 + 启动全量扫描（可在设置中关闭）
	if err := watchSvc.Start(ctx); err != nil {
		log.Printf("启动文件监听失败: %v", err)
	}
	defer watchSvc.Stop()

	if v, _ := backend.GetSetting(db, "rescan_on_start"); v != "0" {
		if _, err := indexSvc.Rescan(ctx); err != nil {
			log.Printf("启动扫描失败: %v", err)
		}
	}

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}

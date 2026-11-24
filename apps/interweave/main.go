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
	menucontract "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu"
	nativeService "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/native/service"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/settings"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/internal/shell"
)

// 将前端产物随桌面应用交付，避免运行时依赖外部开发服务器。

//go:embed all:frontend/dist
var assets embed.FS

// documentationURL 是 Help 菜单打开的文档地址。
const documentationURL = "https://github.com/pan-Z2l0aHVi/mono/tree/main/apps/interweave"

// releasesURL 是 App 菜单「检查更新」打开的发布页。不做 Wails updater 接入：
// 这一项只负责把用户带到能看到版本与变更的地方。
const releasesURL = "https://github.com/pan-Z2l0aHVi/mono/releases"

const (
	defaultWindowWidth  = 1280
	defaultWindowHeight = 800
	minWindowWidth      = 400
	minWindowHeight     = 600
)

func mainWindowOptions() application.WebviewWindowOptions {
	return application.WebviewWindowOptions{
		Title:              "Interweave",
		Width:              defaultWindowWidth,
		Height:             defaultWindowHeight,
		MinWidth:           minWindowWidth,
		MinHeight:          minWindowHeight,
		EnableFileDrop:     true,
		UseApplicationMenu: true,
		Mac: application.MacWindow{
			Backdrop: application.MacBackdropTranslucent,
			TitleBar: application.MacTitleBarHiddenInset,
			// macOS 默认关闭系统级「键盘导航」时，WKWebView 会把未显式声明 tabindex="0" 的
			// button 与链接排除在 Tab 序之外（例如侧栏导航按钮与 web-ui-button）。
			// 开启 TabFocusesLinks（对应 WKPreferences.tabFocusesLinks）让原生控件可直接经 Tab 聚焦。
			WebviewPreferences: application.MacWebviewPreferences{
				TabFocusesLinks: application.Enabled,
			},
		},
		BackgroundColour: application.NewRGB(6, 7, 15),
		URL:              "/",
	}
}

// appDescription 是原生关于面板里 Description 一栏。原生面板只显示 Name / Description / Icon，
// 版本号没有自己的字段，只能拼进 Description。
func appDescription(version string) string {
	return fmt.Sprintf("Interweave %s 桌面应用", version)
}

// dataDir 返回应用数据目录，并在需要时创建。
//
// 路径统一走 Wails 的 PathDataHome，并由 production tag 决定 interweave 子目录：
// 它和 library.db、缩略图同处一个目录，
// 不再是 os.UserConfigDir 的旧位置。Windows 上两者不同（PathDataHome 落
// %LOCALAPPDATA%，UserConfigDir 落 %APPDATA%），因此旧库不会被读到——这被视为新库。
func dataDir() (string, error) {
	return dataDirAt(application.Path(application.PathDataHome))
}

// dataDirAt 用给定 dataHome 组装数据目录并创建；测试以 t.TempDir() 注入基路径，
// 走与 dataDir() 完全相同的组装与创建逻辑。
func dataDirAt(dataHome string) (string, error) {
	dir := filepath.Join(dataHome, appDataDirName)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("create data directory %s: %w", dir, err)
	}
	return dir, nil
}

// webviewUserDataDir 让 WebView2 存储与应用数据同居。Windows 默认按可执行文件名
// 选择目录，而 production 与 development 的产物同名，因此必须显式按 build tag 分开。
func webviewUserDataDir(dir string) string {
	return filepath.Join(dir, "webview")
}

// windowsOptions 把传给 application.New 的 Windows 配置锚定到数据目录，
// 供测试断言 WebView2 用户数据确实来自当前 build tag 对应的目录。
func windowsOptions(dir string) application.WindowsOptions {
	return application.WindowsOptions{
		WebviewUserDataPath: webviewUserDataDir(dir),
	}
}

func main() {
	version := appVersion(configYAML)

	dir, err := dataDir()
	if err != nil {
		log.Fatalf("failed to prepare application data location: %v", err)
	}
	dbPath := filepath.Join(dir, "library.db")

	// 设置要在建菜单之前读到：开发者选项决定菜单里出不出现那两项。
	settingsStore, err := settings.NewStore(filepath.Join(dir, "settings.json"))
	if err != nil {
		log.Fatalf("failed to prepare settings location: %v", err)
	}
	initialSettings, settingsWarnings := settingsStore.Load()
	for _, warning := range settingsWarnings {
		log.Printf("interweave: %s", warning)
	}
	settingsService := settings.NewService(settingsStore, initialSettings, settingsWarnings)
	// 菜单可用性上报不属于设置：它不落盘、不跨会话，只描述菜单当下的呈现状态。
	menuService := menucontract.NewService()

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
	sourceService := libraryService.NewSourceService(coreSourceService, coreResourceService)
	tagService := libraryService.NewTagService(coreTagService, coreResourceService)
	mapService := libraryService.NewMapService(coreMapService)
	osService := nativeService.NewOSService()

	// gate 恒存在：可用性写入口不依赖 fsnotify 是否可用，监听不可用时媒体 404 兜底照常
	// 落库，只降级目录监听方向。事件出口要等 window 就绪才能确定，gate 未接线时只落库
	// 不发事件；SetEmitter 必须在 watcher.Start 之前完成——watcher 的 goroutine 由 Start
	// 创建，媒体回写 worker 读到的第一条消息必然来自 app.Run 之后建立的请求 goroutine。
	gate := libraryWatch.NewAvailabilityGate(coreSourceService)
	watcher, watchErr := libraryWatch.NewWatcher(gate)
	if watchErr != nil {
		log.Printf("interweave: file watch unavailable, availability relies on manual refresh: %v", watchErr)
	}
	// 缩略图缓存与库文件同级；目录建不出来只降级缩略图能力（读取一律 404，
	// 前端回退原图），不影响媒体读取与库本身。
	var thumbs *libraryMedia.ThumbnailStore
	if store, err := libraryMedia.NewThumbnailStore(filepath.Join(dir, "thumbnails")); err != nil {
		log.Printf("interweave: thumbnail cache unavailable: %v", err)
	} else {
		thumbs = store
	}
	mediaHandler := libraryMedia.NewHandler(storage.SourceStore{}, db.SqlDB(), pendingPreviews, thumbs, gate)
	defer mediaHandler.Close()

	// 启动清理一次过期版本：文件被外部改写或 Source 被删除后，旧文件名不会再生效。
	// 失败只留垃圾不留错误，不阻塞启动；goroutine 由 StartPrune 纳入 ThumbnailStore
	// 自身的 wg 与关停上下文，mediaHandler.Close() 统一取消并排空。
	if thumbs != nil {
		thumbs.StartPrune(func(ctx context.Context) ([]storage.SourceModel, error) {
			return storage.SourceStore{}.ListFileSources(ctx, db.SqlDB())
		})
	}

	// 仅暴露产品与受控原生能力，避免基础设施绕过后端边界。
	app := application.New(application.Options{
		Name: "Interweave",
		// 原生关于面板没有版本字段，版本拼进 Description。
		Description: appDescription(version),
		Services: []application.Service{
			application.NewService(resourceService),
			application.NewService(sourceService),
			application.NewService(tagService),
			application.NewService(mapService),
			application.NewService(osService),
			application.NewService(settingsService),
			application.NewService(menuService),
		},
		Assets: application.AssetOptions{
			Handler:    application.AssetFileServerFS(assets),
			Middleware: mediaHandler.Middleware,
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
		Windows: windowsOptions(dir),
	})

	window := app.Window.NewWithOptions(mainWindowOptions())
	setupSystemTray(app, window)

	desktopShell := shell.NewDesktopShell(
		&wailsDesktopHost{app: app, window: window, osService: osService},
		&wailsShellState{settings: settingsService, menu: menuService},
		shell.Config{
			MinSize:      shell.WindowSize{Width: minWindowWidth, Height: minWindowHeight},
			FallbackSize: shell.WindowSize{Width: defaultWindowWidth, Height: defaultWindowHeight},
			ReleasesURL:  releasesURL,
		},
	)

	window.RegisterHook(events.Common.WindowClosing, func(event *application.WindowEvent) {
		desktopShell.HandleWindowClosing(event.Cancel)
	})
	app.Event.OnApplicationEvent(events.Mac.ApplicationShouldHandleReopen, func(_ *application.ApplicationEvent) {
		desktopShell.PresentWindow()
	})
	// pending 预览的 LRU 驱逐只发生在后端，前端无从感知；被淘汰的 token 必须显式推给
	// 窗口，否则预览 404 与「文件消失」在前端不可区分。
	pendingPreviews.SetEvictHandler(func(token string) {
		window.EmitEvent(libraryService.PreviewRevokedEventName, []string{token})
	})

	desktopShell.SyncMenu()
	// SyncMenu 在独立串行安装锁内回读最新规范化快照并比对：仅在菜单相关字段真实变化时
	// 才重建原生菜单，避免 zoom / minimizeToTray 等无关设置变更误触发重建与并发乱序落盘。
	settingsService.OnChange(func(settings.Settings) { desktopShell.SyncMenu() })
	menuService.SetChangeHandler(func() { desktopShell.SyncMenu() })
	settingsService.SetEmitter(func(snapshot settings.Snapshot) {
		window.EmitEvent(settings.SettingsChangedEventName, snapshot)
	})

	window.OnWindowEvent(events.Common.WindowFilesDropped, func(event *application.WindowEvent) {
		window.EmitEvent(libraryService.FileDropEventName, event.Context().DroppedFiles())
	})
	window.OnWindowEvent(events.Common.WindowRuntimeReady, func(_ *application.WindowEvent) {
		desktopShell.MarkRuntimeReady()
	})
	app.Event.OnApplicationEvent(events.Common.ApplicationOpenedWithFile, func(event *application.ApplicationEvent) {
		files := event.Context().OpenedFiles()
		if len(files) == 0 {
			if filename := event.Context().Filename(); filename != "" {
				files = []string{filename}
			}
		}
		desktopShell.HandleOpenedFiles(files)
	})
	app.Event.OnApplicationEvent(events.Common.ApplicationLaunchedWithUrl, func(event *application.ApplicationEvent) {
		desktopShell.HandleLaunchedURL(event.Context().URL())
	})

	// watcher 不注册为 Wails Service（ADR-0008 §2 的暴露面 allowlist）：它是产品能力之外的
	// 基础设施编排，只由 main.go 装配、由 OnShutdown 收尾。window 已就绪，接上事件出口，
	// 且必须在 watcher.Start 之前（见上方 gate 的时序说明）。
	gate.SetEmitter(func(change coreLibrary.AvailabilityChange) {
		window.EmitEvent(libraryService.SourceAvailabilityEventName, libraryService.NewSourceAvailabilityEventDTO(change))
	})
	// 指纹回填是启动期后台补账，不在构造函数里隐藏调度。
	db.ScheduleBackground("fingerprint:backfill", coreSourceService.BackfillFingerprints)
	if watcher != nil {
		// core 写路径的对账改走非阻塞请求：入口增删改不再同步执行 dirWatchCost 的
		// 目录扫描（前台写路径不被 os.ReadDir 阻塞），对账由 watcher 的对账协程合并执行。
		indexSync := libraryWatch.NewAsyncIndexSync(watcher)
		coreSourceService.SetIndexSync(indexSync)
		coreResourceService.SetIndexSync(indexSync)
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

package main

import (
	"context"
	"embed"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
	"github.com/wailsapp/wails/v3/pkg/services/dock"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library"
	coreLibrary "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
	libraryService "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service"
	menucontract "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu"
	nativeMenu "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/native/menu"
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
	return mainWindowOptionsFor(runtime.GOOS)
}

// mainWindowOptionsFor 按目标平台构造主窗口选项，便于在非 Windows 主机上直接单测 Windows 配置。
// Windows 端启用 Frameless + NonClientRegionSupport 并关闭原生菜单栏，由前端渲染一体化顶栏
// （左侧 top menu + 中间拖动区 + 右侧系统风格三键），同时保留 Win11 原生圆角、阴影与贴边分屏。
func mainWindowOptionsFor(goos string) application.WebviewWindowOptions {
	isWindows := goos == "windows"
	return application.WebviewWindowOptions{
		Title:              "Interweave",
		Width:              defaultWindowWidth,
		Height:             defaultWindowHeight,
		MinWidth:           minWindowWidth,
		MinHeight:          minWindowHeight,
		EnableFileDrop:     true,
		Frameless:          isWindows,
		UseApplicationMenu: !isWindows,
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
		Windows: application.WindowsWindow{
			NonClientRegionSupport: isWindows,
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

// macOptions 集中声明 macOS 应用级选项，供测试直接校验：
// ApplicationShouldTerminateAfterLastWindowClosed 必须为 false——设为 true 时，
// window.Hide() 触发的 orderOut: 会被 AppKit 视为最后一个窗口关闭而直接终止应用，
// 使「关闭时最小化到托盘」在 macOS 上失效。未开启托盘时的退出改由 WindowClosing 钩子显式驱动。
func macOptions() application.MacOptions {
	return application.MacOptions{
		ApplicationShouldTerminateAfterLastWindowClosed: false,
		// 启动时显式 Regular；隐藏到托盘后由 dock service 切到 Accessory，恢复时切回。
		ActivationPolicy: application.ActivationPolicyRegular,
	}
}

// windowsOptions 把传给 application.New 的 Windows 配置锚定到数据目录，
// 并禁止最后一个窗口销毁时自动退出——轻量模式只销毁 WebView，后端与托盘必须存活。
func windowsOptions(dir string) application.WindowsOptions {
	return application.WindowsOptions{
		DisableQuitOnLastWindowClosed: true,
		WebviewUserDataPath:           webviewUserDataDir(dir),
	}
}

// linuxOptions 同样禁止最后一个窗口销毁时自动退出，保证轻量模式只保留后端服务。
func linuxOptions() application.LinuxOptions {
	return application.LinuxOptions{DisableQuitOnLastWindowClosed: true}
}

type menuRoleActions struct {
	showAbout   func()
	quit        func()
	minimise    func()
	closeWindow func()
}

// dispatchMenuRole 将自定义顶栏上报的系统 role 映射到宿主应用/窗口动作，抽成纯路由便于单测。
func dispatchMenuRole(role string, actions menuRoleActions) bool {
	switch role {
	case menucontract.RoleAbout:
		if actions.showAbout != nil {
			actions.showAbout()
		}
		return true
	case menucontract.RoleQuit:
		if actions.quit != nil {
			actions.quit()
		}
		return true
	case menucontract.RoleMinimise:
		if actions.minimise != nil {
			actions.minimise()
		}
		return true
	case menucontract.RoleCloseWindow:
		if actions.closeWindow != nil {
			actions.closeWindow()
		}
		return true
	default:
		return false
	}
}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	version := appVersion(configYAML)

	dir, err := dataDir()
	if err != nil {
		return fmt.Errorf("failed to prepare application data location: %w", err)
	}

	// 设置要在建菜单之前读到：开发者选项决定菜单里出不出现那两项。
	settingsStore, err := settings.NewStore(filepath.Join(dir, "settings.json"))
	if err != nil {
		return fmt.Errorf("failed to prepare settings location: %w", err)
	}
	initialSettings, settingsWarnings := settingsStore.Load()
	for _, warning := range settingsWarnings {
		log.Printf("interweave: %s", warning)
	}
	settingsService := settings.NewService(settingsStore, initialSettings, settingsWarnings)
	// 菜单可用性上报不属于设置：它不落盘、不跨会话，只描述菜单当下的呈现状态。
	menuService := menucontract.NewService()

	// 出站 HTTP 只经 backend/remote；系统代理读取属于 native，装配处把两者接起来。
	fetcher := remote.NewFetcher(remote.WithProxy(nativeService.SystemProxy))
	rt, err := library.NewRuntime(library.RuntimeOptions{DataDir: dir, Fetcher: fetcher})
	if err != nil {
		return err
	}
	defer func() {
		if err := rt.Close(); err != nil {
			log.Printf("interweave: close library runtime failed: %v", err)
		}
	}()

	coreLib := rt.Core()
	resourceService := libraryService.NewResourceService(coreLib, rt.PendingPreviews())
	sourceService := libraryService.NewSourceService(coreLib)
	tagService := libraryService.NewTagService(coreLib)
	mapService := libraryService.NewMapService(coreLib)
	osService := nativeService.NewOSService(
		nativeService.WithStreamFetcher(fetcher.GetStream),
		nativeService.WithWallpaperCacheDir(filepath.Join(dir, "cache", "wallpapers")),
	)
	// macOS 上把 Dock 图标可见性与托盘状态绑定；其他平台这两个调用是 no-op。
	dockService := dock.New()
	dockPresence := newPlatformDockPresence(runtime.GOOS, dockService)

	// 仅暴露产品与受控原生能力，避免基础设施绕过后端边界。
	services := []application.Service{
		application.NewService(resourceService),
		application.NewService(sourceService),
		application.NewService(tagService),
		application.NewService(mapService),
		application.NewService(osService),
		application.NewService(settingsService),
		application.NewService(menuService),
	}
	// Dock service 只在 macOS 注册：Windows 的 ServiceStartup 会初始化 COM TaskbarList3，
	// 失败即中止应用，而图标显隐在 Windows/Linux 都是 no-op。
	if runtime.GOOS == "darwin" {
		services = append(services, application.NewService(dockService))
	}
	app := application.New(application.Options{
		Name: "Interweave",
		// 原生关于面板没有版本字段，版本拼进 Description。
		Description: appDescription(version),
		Services:    services,
		Assets: application.AssetOptions{
			Handler:    application.AssetFileServerFS(assets),
			Middleware: rt.MediaHandler().Middleware,
		},
		Mac:     macOptions(),
		Windows: windowsOptions(dir),
		Linux:   linuxOptions(),
	})

	windows := newMainWindowController(app, mainWindowOptions())
	host := &wailsDesktopHost{app: app, windows: windows, osService: osService, presence: dockPresence}
	desktopShell := shell.NewDesktopShell(
		host,
		&wailsShellState{settings: settingsService, menu: menuService},
		shell.Config{
			MinSize:      shell.WindowSize{Width: minWindowWidth, Height: minWindowHeight},
			FallbackSize: shell.WindowSize{Width: defaultWindowWidth, Height: defaultWindowHeight},
			ReleasesURL:  releasesURL,
		},
	)

	// 轻量模式销毁 WebView 时绕过「最小化到托盘 / 退出」；其余关闭照旧交给 shell。
	// 用户关闭事件由 Wails 在 goroutine 里派发，设置读取必须与设置变更的补偿逻辑同在 main
	// queue：否则「读到开启托盘 → 设置关掉并销毁托盘 → 再隐藏窗口」会留下无窗口无入口状态。
	windows.onClosing = func(event *application.WindowEvent) {
		application.InvokeSync(func() { desktopShell.HandleWindowClosing(event.Cancel) })
	}
	windows.addStateListener(func(light bool) {
		if light {
			// 轻量模式同样没有窗口：缓冲无窗口期间到达的 Dock/URL 事件，并隐藏 Dock 图标，
			// 只保留菜单栏托盘作为恢复入口。此时不算「藏进托盘」，关掉托盘不会靠这里恢复。
			host.hiddenToTray.Store(false)
			desktopShell.MarkWindowUnready()
			dockPresence.hide()
			return
		}
		dockPresence.show()
	})
	windows.onCreated = func(window *application.WebviewWindow) {
		// 轻量模式快速往返时旧窗口的 ready 事件仍可能异步到达；只有当前窗口才有资格
		// 把缓冲的 Dock/URL 拖放冲刷到前端，否则会在新 WebView 监听前把事件丢掉。
		desktopShell.MarkWindowUnready()
		window.OnWindowEvent(events.Common.WindowFilesDropped, func(event *application.WindowEvent) {
			window.EmitEvent(libraryService.FileDropEventName, event.Context().DroppedFiles())
		})
		window.OnWindowEvent(events.Common.WindowRuntimeReady, func(_ *application.WindowEvent) {
			if windows.Window() != window {
				return
			}
			desktopShell.MarkRuntimeReady()
		})
		// 原生菜单条与 Windows 顶栏快照都挂在具体窗口上，重建后必须重新安装。
		desktopShell.ReinstallMenu()
	}
	windows.Create()

	// Wails v3.1.0 中 SystemTray.New/SetIcon/SetTooltip/SetMenu 内部均已走 runOrDeferToAppRun
	// 或 InvokeSync 跨线程安全执行；唯独 SystemTray.Destroy() 直接调 impl.destroy() 未包装
	// InvokeSync，因此销毁路径显式经 application.InvokeSync 切回主线程。
	// 运行期由 OnChange 经 application.InvokeAsync 派发到主线程串行执行 Sync，
	// 避免后台线程持有 trayController.mu 等待主线程而主线程反向等待同一把锁的死锁。
	trayController := newSystemTrayController(
		settingsService.MinimizeToTrayOnCloseEnabled,
		func() trayHandle { return setupSystemTray(app, windows, desktopShell.PresentWindow) },
		func(handle trayHandle) { application.InvokeSync(handle.Destroy) },
	)
	trayController.Sync()

	app.Event.OnApplicationEvent(events.Mac.ApplicationShouldHandleReopen, func(_ *application.ApplicationEvent) {
		desktopShell.PresentWindow()
	})
	// pending 预览的 LRU 驱逐只发生在后端，前端无从感知；被淘汰的 token 必须显式推给
	// 窗口，否则预览 404 与「文件消失」在前端不可区分。
	rt.SetPreviewEvictHandler(func(token string) {
		emitToCurrentWindow(windows, libraryService.PreviewRevokedEventName, []string{token})
	})

	menuService.SetTreeProvider(func() []menucontract.MenuItem {
		return nativeMenu.Snapshot(nativeMenu.State{
			DeveloperOptions: settingsService.DeveloperOptionsEnabled(),
			Disabled:         menuService.IsDisabled,
		}, runtime.GOOS)
	})
	menuService.SetInvokeHandler(func(command menucontract.Command, role string) {
		if command != "" {
			desktopShell.HandleMenuCommand(command)
			return
		}
		dispatchMenuRole(role, menuRoleActions{
			showAbout: app.Menu.ShowAbout,
			quit:      app.Quit,
			minimise: func() {
				if window := windows.Window(); window != nil {
					window.Minimise()
				}
			},
			closeWindow: func() {
				if window := windows.Window(); window != nil {
					window.Close()
				}
			},
		})
	})

	desktopShell.SyncMenu()
	// SyncMenu 在独立串行安装锁内回读最新规范化快照并比对：仅在菜单相关字段真实变化时
	// 才重建原生菜单（或向 Windows 一体化顶栏推送新快照），避免无关设置变更误触发与并发乱序落盘。
	settingsService.OnChange(func(settings.Settings) {
		desktopShell.SyncMenu()
		application.InvokeAsync(func() {
			trayController.Sync()
			// 无窗口状态都靠托盘恢复；用户关掉托盘开关时不能再留一个无入口的空壳。
			if !settingsService.MinimizeToTrayOnCloseEnabled() {
				if windows.IsLightMode() {
					windows.LeaveLightMode()
				} else if host.hiddenByTray() {
					desktopShell.PresentWindow()
				}
			}
		})
	})
	menuService.SetChangeHandler(func() { desktopShell.SyncMenu() })
	settingsService.SetEmitter(func(snapshot settings.Snapshot) {
		emitToCurrentWindow(windows, settings.SettingsChangedEventName, snapshot)
	})

	app.Event.OnApplicationEvent(events.Common.ApplicationOpenedWithFile, func(event *application.ApplicationEvent) {
		files := event.Context().OpenedFiles()
		if len(files) == 0 {
			if filename := event.Context().Filename(); filename != "" {
				files = []string{filename}
			}
		}
		if len(files) > 0 && windows.IsLightMode() {
			// 轻量模式下先重建窗口，让 dock 事件有接收方；runtime 就绪后再冲刷缓冲。
			desktopShell.PresentWindow()
		}
		desktopShell.HandleOpenedFiles(files)
	})
	app.Event.OnApplicationEvent(events.Common.ApplicationLaunchedWithUrl, func(event *application.ApplicationEvent) {
		if windows.IsLightMode() {
			desktopShell.PresentWindow()
		}
		desktopShell.HandleLaunchedURL(event.Context().URL())
	})

	// 资源库后台管线不注册为 Wails Service（ADR-0008 §2 的暴露面 allowlist）：
	// 事件出口按当前窗口解析，轻量模式重建后无需重新装配；由 OnShutdown + defer rt.Close() 双兜底排空。
	rt.SetAvailabilityEmitter(func(change coreLibrary.AvailabilityChange) {
		emitToCurrentWindow(
			windows,
			libraryService.SourceAvailabilityEventName,
			libraryService.NewSourceAvailabilityEventDTO(change),
		)
	})
	rt.Start(context.Background())
	app.OnShutdown(func() {
		if err := rt.Close(); err != nil {
			log.Printf("interweave: close library runtime failed: %v", err)
		}
		dockPresence.shutdown()
	})

	return app.Run()
}

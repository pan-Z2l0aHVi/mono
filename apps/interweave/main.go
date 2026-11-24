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

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library"
	coreLibrary "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
	libraryService "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service"
	menucontract "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu"
	nativeMenu "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/native/menu"
	nativeService "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/native/service"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/settings"
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

// windowsOptions 把传给 application.New 的 Windows 配置锚定到数据目录，
// 供测试断言 WebView2 用户数据确实来自当前 build tag 对应的目录。
func windowsOptions(dir string) application.WindowsOptions {
	return application.WindowsOptions{
		WebviewUserDataPath: webviewUserDataDir(dir),
	}
}

type windowDockDropSink struct {
	window *application.WebviewWindow
}

func (s windowDockDropSink) EmitFiles(paths []string) {
	s.window.EmitEvent(libraryService.FileDropEventName, paths)
}

func (s windowDockDropSink) EmitURLs(urls []string) {
	s.window.EmitEvent(libraryService.URLDropEventName, urls)
}

func (s windowDockDropSink) PresentWindow() {
	presentMainWindow(s.window)
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

	rt, err := library.NewRuntime(library.RuntimeOptions{DataDir: dir})
	if err != nil {
		return err
	}
	defer func() {
		if err := rt.Close(); err != nil {
			log.Printf("interweave: close library runtime failed: %v", err)
		}
	}()

	resourceService := libraryService.NewResourceService(rt.ResourceService(), rt.PendingPreviews())
	sourceService := libraryService.NewSourceService(rt.SourceService(), rt.ResourceService())
	tagService := libraryService.NewTagService(rt.TagService(), rt.ResourceService())
	mapService := libraryService.NewMapService(rt.MapService())
	osService := nativeService.NewOSService()

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
			Middleware: rt.MediaHandler().Middleware,
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
		Windows: windowsOptions(dir),
	})

	window := app.Window.NewWithOptions(mainWindowOptions())
	setupSystemTray(app, window)
	window.RegisterHook(events.Common.WindowClosing, func(event *application.WindowEvent) {
		handleWindowClose(settingsService.MinimizeToTrayOnCloseEnabled(), event.Cancel, func() {
			window.Hide()
		})
	})
	app.Event.OnApplicationEvent(events.Mac.ApplicationShouldHandleReopen, func(_ *application.ApplicationEvent) {
		presentMainWindow(window)
	})
	// pending 预览的 LRU 驱逐只发生在后端，前端无从感知；被淘汰的 token 必须显式推给
	// 窗口，否则预览 404 与「文件消失」在前端不可区分。
	rt.SetPreviewEvictHandler(func(token string) {
		window.EmitEvent(libraryService.PreviewRevokedEventName, []string{token})
	})
	windowMode := newWindowModeToggler(
		windowSize{width: minWindowWidth, height: minWindowHeight},
		windowSize{width: defaultWindowWidth, height: defaultWindowHeight},
	)

	// emitCommand 是菜单与前端之间唯一的通道：菜单点击不直接操作窗口或页面，
	// 只报告一个命令，由前端按当前上下文执行。
	emitCommand := func(command menucontract.Command) {
		window.EmitEvent(menucontract.CommandEventName, menucontract.MenuCommand{
			Command: command,
			Payload: map[string]string{},
		})
	}

	// menuSink 处理那些必须在 Go 侧完成的命令：重新载入、开发者控制台、窗口最大化、
	// 切换窗口模式与「检查更新」是窗口 / OS 能力，绕过前端反而更稳；缩放三项改的是 Go 拥有的缩放档位，
	// 前端拿到快照后才会把档位落到窗口上；其余命令转发给前端，由前者按当前路由与历史栈执行。
	zoom := func(change func(context.Context) (settings.Snapshot, error)) {
		if _, err := change(context.Background()); err != nil {
			log.Printf("interweave: failed to change the interface zoom: %v", err)
		}
	}
	menuSink := func(command menucontract.Command) {
		switch command {
		case menucontract.CommandReloadWindow:
			window.Reload()
		case menucontract.CommandOpenDevTools:
			window.OpenDevTools()
		case menucontract.CommandMaximiseWindow:
			window.ToggleMaximise()
		case menucontract.CommandToggleWindowMode:
			windowMode.Toggle(webviewWindowAdapter{window: window})
		case menucontract.CommandZoomIn:
			zoom(settingsService.ZoomIn)
		case menucontract.CommandZoomOut:
			zoom(settingsService.ZoomOut)
		case menucontract.CommandZoomReset:
			zoom(settingsService.ZoomReset)
		case menucontract.CommandCheckForUpdates:
			if err := osService.OpenExternal(context.Background(), releasesURL); err != nil {
				log.Printf("interweave: failed to open the releases page: %v", err)
			}
		default:
			emitCommand(command)
		}
	}

	menuState := func() nativeMenu.State {
		return nativeMenu.State{
			DeveloperOptions: settingsService.DeveloperOptionsEnabled(),
			Disabled:         menuService.IsDisabled,
		}
	}
	menuService.SetTreeProvider(func() []menucontract.MenuItem {
		return nativeMenu.Snapshot(menuState(), runtime.GOOS)
	})
	menuService.SetInvokeHandler(func(command menucontract.Command, role string) {
		if command != "" {
			menuSink(command)
			return
		}
		dispatchMenuRole(role, menuRoleActions{
			showAbout:   app.Menu.ShowAbout,
			quit:        app.Quit,
			minimise:    func() { window.Minimise() },
			closeWindow: window.Close,
		})
	})

	// installMenu 整体重建菜单并同步到当前平台呈现面：
	// - macOS / Linux 挂原生应用菜单；
	// - Windows 使用 Frameless 一体化顶栏，不挂 Win32 菜单条，改向前端推送最新菜单快照。
	installMenu := func() {
		state := menuState()
		if runtime.GOOS == "windows" {
			window.EmitEvent(menucontract.TreeChangedEventName, nativeMenu.Snapshot(state, runtime.GOOS))
			return
		}
		tree := nativeMenu.Build(state, menuSink)
		app.Menu.Set(tree.Menu)
		window.SetMenu(tree.Menu)
	}
	installMenu()

	// 菜单里有随设置出现/消失的整组条目，也有随页面与历史栈变化的置灰项，两者都走
	// 同一个重建入口。设置监听在保存成功后同步触发；禁用集合由前端去重后上报，
	// 服务侧再兜一次底，重建本身是幂等的。
	settingsService.OnChange(func(settings.Settings) { installMenu() })
	menuService.SetChangeHandler(installMenu)
	settingsService.SetEmitter(func(snapshot settings.Snapshot) {
		window.EmitEvent(settings.SettingsChangedEventName, snapshot)
	})

	window.OnWindowEvent(events.Common.WindowFilesDropped, func(event *application.WindowEvent) {
		window.EmitEvent(libraryService.FileDropEventName, event.Context().DroppedFiles())
	})

	dockDrop := newDockDropDispatcher(windowDockDropSink{window: window})
	window.OnWindowEvent(events.Common.WindowRuntimeReady, func(_ *application.WindowEvent) {
		dockDrop.MarkReady()
	})
	app.Event.OnApplicationEvent(events.Common.ApplicationOpenedWithFile, func(event *application.ApplicationEvent) {
		files := event.Context().OpenedFiles()
		if len(files) == 0 {
			if filename := event.Context().Filename(); filename != "" {
				files = []string{filename}
			}
		}
		dockDrop.HandleOpenedFiles(files)
	})
	app.Event.OnApplicationEvent(events.Common.ApplicationLaunchedWithUrl, func(event *application.ApplicationEvent) {
		dockDrop.HandleLaunchedURL(event.Context().URL())
	})

	// 资源库后台管线不注册为 Wails Service（ADR-0008 §2 的暴露面 allowlist）：
	// window 已就绪，先接上事件出口再 Start，由 OnShutdown + defer rt.Close() 双兜底排空。
	rt.SetAvailabilityEmitter(func(change coreLibrary.AvailabilityChange) {
		window.EmitEvent(libraryService.SourceAvailabilityEventName, libraryService.NewSourceAvailabilityEventDTO(change))
	})
	rt.Start(context.Background())
	app.OnShutdown(func() {
		if err := rt.Close(); err != nil {
			log.Printf("interweave: close library runtime failed: %v", err)
		}
	})

	return app.Run()
}

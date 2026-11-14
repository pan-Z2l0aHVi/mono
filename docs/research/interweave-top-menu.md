<!-- corpus-status: reference -->

# Interweave 顶部菜单与设置所有权调研

> 状态：非权威参考（时点性研究）。结论以现行 ADR、源码与测试为准。
> 文中行号、实测数值与「当前实现」类描述均为写作时点（2026-11-14），不随实现同步；现行权威见 [ADR-0024](../adr/0024-interweave-native-menu-and-go-owned-settings.md)、源码与测试。
> 平台标注：`实测` 指在 macOS 本机跑过；`源码级` 指只核过 Wails 3.1.0 模块源码，未在目标平台运行。

## 结论

1. **Wails 3.1.0 原生支持两端的系统菜单**，不需要自绘：macOS 用 `app.Menu.Set` 设置全局 NSMenu，Windows 用 `WebviewWindowOptions.UseApplicationMenu` 附着 Win32 菜单栏。Interweave 现在已经在用这条路（[`main.go:153`](../../apps/interweave/main.go)、[`main.go:165-170`](../../apps/interweave/main.go)），所以 Windows 端需要的不是换机制，而是把菜单内容做完整。
2. **Windows 上没有 Win32 加速键表**。`SetAccelerator` 在 Windows 只改标签文本，真正的按键分发由 Wails 把 accelerator 注册成 Go key-binding map、从 WebView2 的 `AcceleratorKeyPressed` 回调里查表实现。功能可用，但不是系统级 accelerator。
3. **`Menu.Update()` 在 Windows 不重绘已存在的菜单栏**，只有 `WebviewWindow.SetMenu` 会 `SetMenu` + `DrawMenuBar`。任何「菜单项增删」都必须整体重建。
4. **Wails 3 没有官方应用设置 API**。最接近的是 `pkg/services/kvstore`，但它是无类型的 `map[string]any`，唯一的落盘路径是裸 `os.WriteFile`，且被注册后 `Set`/`Clear` 会直接对前端可见。
5. 结论落在 [ADR-0024](../adr/0024-interweave-native-menu-and-go-owned-settings.md)：菜单走原生、命令走单一事件、设置由 Go 拥有。

---

## 一、Wails 3.1.0 菜单能力

模块位置：`$(go env GOMODCACHE)/github.com/wailsapp/wails/v3@v3.1.0`（下称 `$WAILS`）。模块内不含文档站内容（`README.md:13-14` 指向 v3.wails.io），可读的一手材料是源码与 `examples/`。

### 1.1 API 面

| 用途     | 符号                                                                                                                                                                                                                                                        | 位置                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 应用菜单 | `app.Menu.Set(*Menu)` / `SetApplicationMenu` / `GetApplicationMenu` / `ShowAbout`                                                                                                                                                                           | `$WAILS/pkg/application/menu_manager.go:16-41`                                  |
| 构建     | `NewMenu` / `NewMenuFromItems` / `NewSubmenu` / `Add` / `AddSubmenu` / `AddRole` / `AddSeparator` / `AddSectionHeader` / `AddCheckbox` / `AddRadio` / `FindByLabel` / `FindByRole` / `RemoveMenuItem` / `Clear` / `Clone` / `Append` / `Prepend` / `Update` | `$WAILS/pkg/application/menu.go:49-289`                                         |
| 条目     | `OnClick` / `SetAccelerator` / `SetLabel` / `SetEnabled` / `SetChecked` / `SetHidden` / `SetTooltip` / `SetRole` / `GetSubmenu` / `IsCheckbox` / `IsRadio` / `IsSubmenu`                                                                                    | `$WAILS/pkg/application/menuitem.go:276-441`                                    |
| 窗口菜单 | `window.SetMenu(*Menu)` / `ShowMenuBar` / `HideMenuBar` / `ToggleMenuBar`                                                                                                                                                                                   | `$WAILS/pkg/application/webview_window.go:236-251,1922-1943`                    |
| 默认菜单 | `DefaultApplicationMenu()`（darwin 含 App 菜单，Windows/Linux 不含）                                                                                                                                                                                        | `$WAILS/pkg/application/menu_darwin_shared.go:13-22`、`menu_windows.go:215-223` |
| role     | `AppMenu` / `FileMenu` / `EditMenu` / `ViewMenu` / `WindowMenu` / `ServicesMenu` / `HelpMenu` 及 `Undo`…`Quit` 等                                                                                                                                           | `$WAILS/pkg/application/roles.go:8-66`                                          |

关键事实：

- **没有 `Menu.SetSubmenu`**。子菜单经 `Menu.AddSubmenu` / `NewSubmenu` 建立，读回用 `MenuItem.GetSubmenu`。
- `OnClick` 的签名是 `func(*application.Context)`；`Context` 提供 `ClickedMenuItem()`、`IsChecked()`（`$WAILS/pkg/application/context.go:20-45`）。
- **点击回调不在 UI 线程**：`handleClick` 用 `go func(){...}()` 派发（`$WAILS/pkg/application/menuitem.go:268-273`）。`window.EmitEvent` 与多数窗口方法内部自带 `InvokeSync` 编组，所以菜单回调里直接调它们不需要额外 `InvokeSync`。v3.1.0 没有 `app.Dispatch`；主线程 API 是包级 `InvokeSync` / `InvokeAsync`（`mainthread.go:23-91`）。
- `NewAppMenu()` 在非 darwin 返回 `nil`，`AddRole` 会静默跳过 nil（`roles.go:96-99`、`menu.go:149-155`）。

### 1.2 macOS：全局 NSMenu（实测）

`app.Menu.Set` → `SetApplicationMenu` → `[NSApp setMainMenu:]`（`application_darwin.go:142-157`、`293-303`；purego 路径 `application_darwin_purego.go:452-462`）。菜单是应用级、跨窗口共享，**不是**窗口内一条。

实测注意点：

- **Wails 不会在你自己给菜单时补 About/Quit/Hide**。`setApplicationMenu` 只在 `menu == nil` 时替换成默认菜单，且 NSMenu 设了 `setAutoenablesItems:NO`（`menu_darwin.go:39`）。自建菜单必须显式 `AddRole(AppMenu)`，否则 macOS 应用菜单是空的。
- `Menu.Update()` 在 macOS 会整体重建 NSMenu（`menu_darwin_shared.go:36-40`），逐项 setter 也会同步落到活的 NSMenuItem 上，所以 macOS 端动态改菜单是可靠的。
- `window.SetMenu` 在 macOS 是 no-op（`webview_window.go:229-239`）。

### 1.3 Windows：附在 HWND 上的 Win32 菜单栏（源码级）

- 菜单是 `CreateWindowEx` 传入的 `HMENU`（`webview_window_windows.go:559-600`）；替换走 `w32.SetMenu` + `w32.DrawMenuBar`（`webview_window_windows.go:133-200`）。
- 挂载条件在 `webview_window_windows.go:561-577`：

  1. `options.Frameless` 为真时整段跳过；
  2. `Windows.Menu != nil` 优先；
  3. 否则 `UseApplicationMenu && !menuRemoved`，用 `app.Menu` 设的应用菜单；
  4. 都没有则无菜单栏。

- `app.Menu.Set` 在 Windows 只保存菜单并调用 `menu.Update()`（`application_windows.go:143-151`），且启动流程里**只有 darwin 会应用菜单**（`application.go:786-789`）。Windows 端的实际生效点是窗口创建时的 `UseApplicationMenu`。
- **`Menu.Update()` 不重绘已存在的 Windows 菜单栏**：它实例化的是 `windowsMenu`（一个没有绑定窗口的构建器），重建出的 HMENU 与可见窗口无关，同时把每个条目的 `impl` 改指向这个孤立对象（`menu.go:88-105`、`menu_windows.go:36-105`）。`Win32Menu`（真正挂在窗口上的那份）不实现 `menuImpl`。因此重建菜单必须 `app.Menu.Set(menu)` **并且** `window.SetMenu(menu)`。
- 逐项 `SetHidden(true)` 在 Windows 是真删除行（`RemoveMenu` / `InsertMenuItem`），但不解绑已注册的 accelerator，直到整体重建才解绑（`menuitem_windows.go:36-59`、`popupmenu_windows.go:141-151`）。

### 1.4 accelerator 的真实行为

| 平台                 | 机制                                                                                                                                                                                                                                                           | 结论                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| macOS（实测 + 源码） | `NSMenuItem.keyEquivalent` + `keyEquivalentModifierMask`，AppKit 在 WebView 之前分发；标准编辑项用 responder chain 的 `cut:`/`copy:`/`paste:` 等 selector                                                                                                      | 原生行为，与系统一致                 |
| Windows（源码级）    | `SetAccelerator` 只把文本以 `\t` 拼到标签（`popupmenu_windows.go:198-205`）；真正的分发是 Wails 把 chord 注册进 Go map，由 WebView2 的 `AcceleratorKeyPressed` 回调查表（`webview_window_windows.go:2631,2964-3030`）；`TranslateAccelerator` 有绑定但零调用方 | 能用，但不是 Win32 accelerator table |

解析器在 `$WAILS/pkg/application/keys.go`：modifier 认 `CmdOrCtrl` / `Cmd` / `Command` / `Ctrl` / `OptionOrAlt` / `Alt` / `Option` / `Shift` / `Super`；按键认 `backspace`…`page down`、`f1`–`f35`、字面量 `plus`，或任意单可打印字符。`F11` 是合法的单键 accelerator。

已知缺陷（源码级，**未在 Windows 上实测**）：

- `chromium.go:924` 在 `PutHandled(result)` 之后无条件 `PutHandled(false)`，按键不会被标记为已消费，WebView 仍会收到同一次按键。对业务命令通常无害，对 `Ctrl+C` 这类系统编辑键则可能双重生效。
- 只有文本、没有 callback 的条目会显示快捷键但不响应。

### 1.5 平台差异一览

| 维度               | macOS                       | Windows                                                 |
| ------------------ | --------------------------- | ------------------------------------------------------- |
| 菜单位置           | 屏幕顶部，全局              | 窗口内，HWND 菜单栏                                     |
| App 菜单           | 有（关于/服务/隐藏/退出）   | 无                                                      |
| `WindowMenu` role  | 系统窗口列表容器            | 普通子菜单                                              |
| 自建菜单必须做的事 | 显式 `AddRole(AppMenu)`     | 无需                                                    |
| 动态重建           | `app.Menu.Set` 即可         | `app.Menu.Set` + `window.SetMenu`                       |
| frameless 窗口     | `Mac.TitleBar` 各字段被忽略 | 整段菜单逻辑跳过，不支持                                |
| Mica/Acrylic 背景  | —                           | 会让菜单栏不可见（`webview_window_windows.go:192-199`） |

---

## 二、Windows 两条路线对比

| 维度                | 原生 Win32 菜单栏（选定）                                               | 自绘 HTML 菜单栏                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 实现载体            | `backend/native/menu/` 构建 Wails `Menu`                                | `packages/web-ui` 新增 menubar 组件 + 应用壳接线                                                                                                  |
| 窗口形态            | 保持现状：Windows 默认带边框窗口                                        | 必须 `Frameless: true`，另配窗口控件                                                                                                              |
| 拖拽区              | 系统标题栏自带宽高与拖拽                                                | 需 `--wails-draggable: drag` 或 `Windows.NonClientRegionSupport`（现仓库零使用）                                                                  |
| 与 Win32 菜单栏共存 | 本身就是                                                                | Wails 在 frameless 下不创建菜单，且 `WM_NCCALCSIZE` 不为菜单栏预留高度（`webview_window_windows.go:2205-2268`）——组合无支持                       |
| 键盘与无障碍        | 系统菜单语义、键盘导航、屏幕阅读器全由 OS 提供                          | 要自建 roving tabindex、方向键、子菜单展开、`role="menubar"`；现 `web-ui` 有 `web-ui-dropdown` 的菜单键盘逻辑可复用，但 `role="menubar"` 无处可借 |
| 视觉一致性          | 与 Windows 系统应用一致                                                 | 可与 macOS 侧 web-ui 视觉统一，但与 Windows 原生应用不一致                                                                                        |
| 开发量（估算）      | 小：一棵树 + 平台分支 + 命令事件                                        | 大：新组件、窗口控件、拖拽、焦点管理、双端验证、web-ui 公共契约变更 + changeset                                                                   |
| 后续维护            | 跟随 Wails 升级                                                         | 自持一套菜单实现                                                                                                                                  |
| 推翻条件            | 若必须让菜单外观与 app 主题完全一致（如需自绘标题栏品牌感），则考虑自绘 | 若愿意承担 frameless + 自绘控件，可统一两端视觉                                                                                                   |

---

## 三、设置持久化生态

### 3.1 官方能力（v3.1.0）

- `application.Options` 27 个导出字段里**没有** settings / preferences / store / version（`application_options.go:13-135`）。`App` 只暴露 manager（`Window`、`Menu`、`Event`…），没有 `app.Settings`。
- 唯一相关的官方件是 `pkg/services/kvstore`（`kvstore.go:25`）：
  - `Config{Filename, AutoSave}`，JSON 文件存 `map[string]any`；
  - `Save()` 是裸 `os.WriteFile`（`kvstore.go:153`）——无临时文件、无 fsync、无目录创建、无文件锁；
  - 注册为 Service 时 `Get`/`Set`/`Delete`/`Clear`/`Save`/`Load` 全部成为前端可调用方法，只有 `Configure` 标了 `//wails:ignore`；
  - 官方文档正文没有它的专页，只在包树里出现一行。
- 路径 API 是官方的可用部分：`application.Path(application.PathDataHome)`、`PathConfigHome` 等（`path.go:127-134`），解析实现在 `internal/userpaths/`。注意 **Windows 上 `DataHome`/`ConfigHome` 都指向 `%LOCALAPPDATA%`**（`paths_windows.go:19-21`），而 macOS 上两者都是 `~/Library/Application Support`（`paths_darwin.go:11-14`）；`os.UserConfigDir()` 在 Windows 上是 `%APPDATA%`（roaming）。
- Wails 自己的原子写 `writeFileAtomic` 是**非导出**的（`pkg/application/autostart.go:29`）。

### 3.2 第三方库

| 库                 | 最新版 / 时间     | 原子写               | 文件锁 | 提供什么                                     |
| ------------------ | ----------------- | -------------------- | ------ | -------------------------------------------- |
| `spf13/viper`      | v1.21.0 / 2025-09 | 否（`O_TRUNC` 直写） | 否     | 分层配置合并、mapstructure                   |
| `knadh/koanf/v2`   | v2.4.1 / 2026-10  | 否                   | 否     | 同上，更轻                                   |
| `adrg/xdg`         | v0.5.3 / 2024-10  | —                    | —      | 路径解析（与 Wails `Path` 重复）             |
| `gofrs/flock`      | v0.13.2 / 2026-11 | —                    | 是     | 跨平台建议锁                                 |
| `natefinch/atomic` | v1.0.1 / 2021     | 是                   | 否     | 原子替换（已基本停更）                       |
| `goccy/go-json`    | v0.12.0 / 2026-11 | —                    | —      | 高性能 JSON（Wails 曾因 Windows panic 回退） |

结论：本仓的需求是「一份固定 schema、单进程、原子写」，这些库没有一个直接命中；viper/koanf 解决的是分层配置，而原子写仍要自己补。仓库还规定新增依赖需单独授权（[`docs/agents/dependencies.md`](../agents/dependencies.md)）。

### 3.3 选定方案：kvstore 当存储 + 包装服务负责原子落盘

- 整个 typed 设置结构体序列化为一份 JSON 字符串，放在 `kvstore` 的单个 key 下；一次变更 = 一次整体替换，schema 演进只改结构体。
- `AutoSave` 恒为 `false`；包装服务在变更后设置 `Configure(Filename = <settings.json>.tmp)` → `Save()` → 原子 rename 到正式文件。
- kvstore 本身**不注册**为 Service，`Set`/`Clear` 因此不暴露给前端。
- 启动时清理遗留的 `.tmp`；读取失败或 JSON 损坏时回默认值并记录原因。
- 原子写工具从 `apps/interweave/backend/library/media/thumbnails.go`（现有 `writeAtomically`）提取到 `backend/internal/`，两处共用。

> 风险记录：`Configure` 每次写都改配置对象，若将来出现并发写要由包装服务的 `sync.Mutex` 串行化；kvstore 每次 `Save` 会 `Marshal` 整个 map，设置量小可忽略。

---

## 四、实施方案

### 4.1 目标结构

```
apps/interweave/
  main.go                        装配：路径、settings store、菜单树、事件接线
  backend/
    internal/atomicfile/         temp+rename 原子写（由 thumbnails 提取）
    menu/                        契约：事件名、MenuCommand 枚举、{command,payload} DTO
    native/menu/                 菜单树构建、平台分支、accelerator 常量（不注册 Service）
    settings/                    Settings 结构体、默认值、校验、kvstore 包装、Service
  frontend/src/
    services/menu/               菜单命令事件 → 分发
    services/settings/           GetSettings / UpdateSettings 绑定封装
    stores/settings.ts           保留，改为 Go 快照中转
    index.html + assets/         静态启动层与 logo
```

### 4.2 菜单树

| 顶层             | 条目                                                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App（仅 macOS）  | 关于 Interweave、服务、隐藏 Interweave、隐藏其他、全部显示、退出 Interweave                                                                                |
| 文件             | 添加资源…（`CmdOrCtrl+O`）、关闭窗口（macOS）/ 退出（Windows）                                                                                             |
| 编辑             | 撤销、重做、剪切、复制、粘贴、粘贴文件（`CmdOrCtrl+Shift+V`）、全选                                                                                        |
| 查看             | 刷新可用性（`CmdOrCtrl+R`）、切换侧边栏（`CmdOrCtrl+B`）、缩放、全屏；开发者选项开启时追加 重新载入（`CmdOrCtrl+Alt+R`）与 开发者工具（`CmdOrCtrl+Alt+I`） |
| 窗口（仅 macOS） | 最小化、缩放、前置全部窗口                                                                                                                                 |
| 帮助             | Interweave 文档（经 native OS service 的 `OpenExternal` 打开外部链接）                                                                                     |

菜单命令枚举（单一事件、`payload` 当前恒为空）：`add-resource`、`paste-files`、`refresh-availability`、`toggle-sidebar`、`open-settings`。

非 macOS 上加「关于 Interweave」，走原生 `ShowAbout`；版本号拼进 `application.Options.Description`，值由构建期 ldflags 注入。

### 4.3 设置模型

```go
type Settings struct {
    Appearance        string `json:"appearance"`         // light | dark | system
    Accent            string `json:"accent"`             // 预设字面量
    ReducedMotion     bool   `json:"reducedMotion"`
    DeveloperOptions  bool   `json:"developerOptions"`
}
```

- Store key 单一（如 `"settings"`），值为整份 JSON。
- 白名单与默认值都在 Go：`appearance` 三值枚举、`accent` 预设表（含 label 与对比度所需信息一并由 snapshot 下发，前端只渲染）。
- Service 面：`GetSettings() Settings`、`UpdateSettings(patch)`；变更后推送 `settings-changed` 事件（带全量快照）。
- 读取失败/损坏：回默认、记日志、照常启动，并向界面暴露一次警告（开屏期间累积，退场后 toast 一次）。

### 4.4 启动时序

1. `main.go` 用 `application.Path(application.PathDataHome)` 拼出 `interweave/` 目录，创建目录并清理遗留 `.tmp`。
2. 打开 `library.db`、初始化 settings store（kvstore 加载 + 校验）。
3. 组装菜单树（此时已知开发者选项），`app.Menu.Set`。
4. 创建窗口（Windows 的 `UseApplicationMenu: true` 让菜单挂上）。
5. 前端 `index.html` 首帧渲染静态启动层 → JS 起来后拉 `GetSettings` → 应用到 `web-ui-theme` → 移除启动层。
6. 超时 3s 无条件移除启动层。
7. 设置变更 → Service 推送 → 前端 store 覆盖；若影响菜单可见项，则 `app.Menu.Set` + `window.SetMenu` 整体重建。

### 4.5 分期与验证

| 期  | 内容                                                                                                                                                       | 级别               | 验证                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 路径统一到 `PathDataHome`；`atomicfile` 提取；`backend/settings` 的存储层与 Service；ADR-0008 allowlist 更新已在文档侧完成                                 | T0                 | `go test -race ./apps/interweave/...`；新增 storage/store 单测（默认值、损坏文件回默认、并发更新）                                                                    |
| 2   | `backend/menu` 契约 + `backend/native/menu` 菜单树与平台分支；`main.go` 接线；替换 `addPasteFilesMenuItem` 与 `main_test.go` 两例                          | T0                 | `go test -race ./apps/interweave/...`；`main_test.go` 改为断言菜单树结构（顶层 label、业务项、accelerator），不再只测 Edit 菜单                                       |
| 3   | 前端 `services/settings` + `services/menu`；`stores/settings.ts` 改中转；`SettingsDialog` 新增开发者选项；静态启动层；`useLibraryRuntime` 改用菜单命令事件 | T0（事件契约变更） | `pnpm exec turbo build --filter=@greypan/interweave-frontend` 生成 bindings 并核对 diff；store 转发单测；命令分发纯函数单测；壳层集成测试（模拟事件 → 跳转/开对话框） |
| 4   | 文档：本文件 + ADR-0024；changeset（若涉及可发布包）                                                                                                       | T2                 | `pnpm run check-context`（链接面与 ADR 索引）；`pnpm run lint`                                                                                                        |

迁移期约束：

- 前端 `localStorage` 里的外观设置不迁移；升级后从默认值开始（`theme-appearance` / `theme-accent` / `theme-reduced-motion` 三个键可保留读出逻辑不再使用，或直接删除读取代码）。
- Windows 上旧 `%APPDATA%\interweave\library.db` 不读取、不搬移。
- 现有 `main_test.go` 的 `TestAddPasteFilesMenuItem` / `TestAddPasteFilesMenuItemRequiresEditMenu` 随菜单重构失效，需替换而非删除。

### 4.6 已知缺口

- 原生 `ShowAbout` 面板只显示 `Name` / `Description` / `Icon`（`menu_manager.go:39-43`），版本号只能塞进 `Description`，排版不可控。
- Windows accelerator 的「未标记已消费」缺陷（§1.4）意味着系统编辑键可能与菜单项双重触发；若实测有影响，需在完成期 2 后单独评估是否给编辑类条目保留 Wails 默认 role 而非自定义 callback。
- `Menu.Update()` 的 Windows 语义要求所有可见性变化都走整体重建，任何「只改一项」的优化都会被这条吃掉。

---

## 五、非目标

- 自绘 HTML 菜单栏、自绘标题栏与窗口控件。
- tray 菜单、dock 菜单、右键菜单（context menu）改造。
- 菜单随当前路由启用/禁用，或页面级菜单。
- 快捷键可配置、冲突检测与快捷键设置界面。
- 菜单项图标、check 状态与前端双向同步（侧边栏切换为单向命令）。
- MCP / Agent 写入设置；多窗口、多实例同步。
- 迁移旧的 `localStorage` 外观值与 Windows 旧库路径。

---

## 附录 A：手工验证清单

平台列 `macOS` 为本机可执行；`Windows` 项标注为源码级推断，需在 Windows 环境实测后勾掉。

### macOS

- [ ] 应用菜单含 关于 / 服务 / 隐藏 / 隐藏其他 / 全部显示 / 退出，且「关于」显示版本号
- [ ] 「添加资源…」在任意页面打开 AddDialog（非 library 页先切到 /library）
- [ ] 「粘贴文件」与工具栏行为一致；剪贴板无文件或链接时给出提示
- [ ] 「刷新可用性」触发与工具栏刷新相同的行为
- [ ] 「切换侧边栏」展开/收起侧栏；移动端宽度下不误触 drawer
- [ ] 「设置…」`Cmd+,` 打开设置对话框，面板回到「常规」
- [ ] 开发者选项打开后「重新载入」「开发者工具」出现并可用；关闭后消失
- [ ] 关闭开发者选项后 `Cmd+Alt+R` / `Cmd+Alt+I` 不再响应
- [ ] `Cmd+R` 只触发刷新可用性，不重载页面
- [ ] 「Interweave 文档」用系统浏览器打开外链
- [ ] 启动时先见 logo 启动层，随后进入已持久化的外观，无主题闪现
- [ ] 修改外观/强调色/减少动画后重启，设置保持
- [ ] 手动破坏 `settings.json` 后启动：回默认、有日志、有一次性提示

### Windows（待实测）

- [ ] 窗口顶部出现菜单栏，五个顶层菜单文案为中文
- [ ] 无 App 菜单；「关于 Interweave」位于「帮助」
- [ ] `Ctrl+O` / `Ctrl+Shift+V` / `Ctrl+R` / `Ctrl+B` / `Ctrl+,` 在 WebView 聚焦时都能触发
- [ ] `Ctrl+C` / `Ctrl+V` / `Ctrl+A` 只执行一次复制/粘贴/全选（验证 §1.4 的已知缺陷）
- [ ] 开发者选项开关后菜单栏即时重建，条目增减正确
- [ ] 设置写入后立即断电式重开，设置保持（验证 temp+rename 在 Windows 的语义）
- [ ] 首次启动路径为 `%LOCALAPPDATA%\interweave`，旧 `%APPDATA%\interweave` 被忽略
- [ ] 启动层与深色窗口背景之间无白闪

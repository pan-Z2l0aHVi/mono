# ADR-0024: Interweave 顶部菜单走原生，应用设置由 Go 拥有

- **Date**: 2026-11-14
- **Status**: 已接受
- **修订**: ADR-0008（Wails 暴露面 allowlist）
- **修订（2026-11-14 第二轮）**: 七菜单结构；`backend/menu` 注册窄 Service `ReportDisabledCommands` 接收禁用命令集合；`backend/native/menu` 不注册 Service。
- **修订（2026-11-15 第三轮）**: 缩放改为 Go 拥有的设置；窗口拖动区改为按元素声明；壳在 runtime 注入后渲染。可执行口径见 [apps/interweave/AGENTS.md](../../apps/interweave/AGENTS.md)。
- **修订（2026-11-20 第四轮）**: 正文「`interweave/` 子目录」仅指 production 构建；development 构建的数据目录是 `interweave-dev/`（由 Go `production` build tag 决定，`library.db`、缩略图与 `settings.json` 同构）。配套：macOS `interweave.dev.app` 的构建产物 `CFBundleIdentifier` 改写为 `com.greypan.interweave.dev`，Windows `WebviewUserDataPath` 显式指向数据目录下的 `webview/`，使 dev 与正式版的本地持久化完全隔离。
- **修订（2026-11-24 第五轮）**: Windows 端因 Win32 原生标题栏与原生 `HMENU` 无法合并同行，改为启用 `Frameless: true` + `Windows.NonClientRegionSupport: true` 并关闭 `UseApplicationMenu`，由前端 `WindowsTitleBar` 渲染一体化顶栏（左侧平铺菜单、移动端断点收进汉堡按钮、中间拖动区、右侧 Fluent 窗口三键）；macOS 与 Linux 保持原生菜单不变。菜单形状、快捷键与禁用态仍全部由 Go 侧 `backend/native/menu` 拥有，`backend/menu` 扩展 `GetMenu` / `InvokeMenuItem` 与 `menu:tree-changed` 事件供 Windows 顶栏消费。
- **修订（2026-11-28 第六轮）**: 明确区分「Go 拥有的应用设置（`settings.json`）」与「纯前端视图布局记忆」：Go 侧不消费的纯前端布局状态（侧边栏桌面折叠态、侧边栏宽度、资源库筛选排序面板展开态）由前端独立 Pinia store `useLayoutStore` 经 `@greypan/browser-kit/storage`（`localStorage`，命名空间 `interweave:layout`）同步持久化，保持 dev/prod 隔离与首帧零闪烁，避免前端布局常数耦合进 Go Service 与 bindings。
- **修订（2026-11-28 第七轮）**: Windows 在保留 Frameless 自绘顶栏的前提下启用 `Windows.WebView2CompositionHosting`，仅为最大化键声明 `--wails-non-client-region: maximize`，以获得 Win11 悬停最大化键的 Snap Layouts 面板；菜单渲染与拖动契约不变。composition hosting 仍是上游实验特性，`INTERWEAVE_DISABLE_WINDOWS_SNAP=1`（或 `true` / `yes`）可关闭这条非客户区路由；前端仍保留 `maximize` 标记，但该标记只被 composition 路由消费，关闭后不再产生命中效果。

## 背景

Interweave 此前只注册 Wails 默认菜单加一个「Paste Files」项，业务能力不在菜单里出现；应用设置由前端 Pinia store 存在 `localStorage`，Go 侧读不到，也无法参与菜单构建。

顶部菜单与设置所有权互相牵连：

- 菜单条目的启用状态、开发者工具入口等都要读设置，设置若仍在浏览器存储里，Go 就只能在点击时向前端要状态，多一条反向通道。
- macOS 的菜单在屏幕顶部、由 AppKit 渲染；Windows 的菜单是附着在 HWND 上的 Win32 菜单栏。两者都是操作系统绘制，不是 Web 内容。
- 仓库当时没有设置持久化载体；Wails 3 也没有官方的应用设置 API。

## 决策

### 1. 顶部菜单由 Go 拥有；macOS 走原生菜单，Windows 走 Frameless 一体化顶栏

macOS 用 `app.Menu.Set` 设置全局 NSMenu；Windows 为使顶部菜单与窗口标题栏一体化（Win32 无法将原生 `HMENU` 嵌进系统标题栏同行），启用 `Frameless: true` + `Windows.NonClientRegionSupport: true` 并关闭 `UseApplicationMenu`，由前端渲染一体化顶栏消费 Go 下发的菜单快照。菜单树仍由 Go 唯一构建、按平台分支；顶层顺序、文案、快捷键与命令归属以 `backend/native/menu` 的 `Describe(goos)` 为准。

文案全中文意味着**不直接沿用 Wails 的 role 生成器**（label 写死英文，键位也自成一套）：做法是「挂 role、用应用自己的 label 与 accelerator」，`undo:`、`cut:`、`terminate:` 等系统 selector 保留，只覆盖展示层。`Reload` / `ForceReload` / `OpenDevTools` role 不使用：`Reload` 的 `Cmd+R` 与「刷新可用性」抢 chord，`OpenDevTools` 在 `production` tag 下是空实现；这两项做成普通菜单项，点击由 Go 直接调窗口方法，是否出现由设置决定。

AppKit 的 `Find` role 只设 `performTextFinderAction:`、没有 find-panel action tag，点击弹不出查找栏；「查找」项不放进菜单，`CmdOrCtrl+F` 交还网页原生查找。

菜单与 Wails 解耦成两层：`Describe(goos)` 产出纯数据节点树，`Build` 负责物化，菜单形状能被单测直接断言，不需要启动应用实例。

### 2. 菜单命令通过单一事件下发，`backend/menu` 只注册可用性 Service

菜单点击不按项拆事件，而是发一个菜单命令事件，载荷为 `{command, payload}`，`command` 是字符串枚举。命令契约与事件名常量由 `backend/menu/` 拥有，菜单树构建与平台分支由 `backend/native/menu/` 实现，后者作为 Go 包由 `main.go` 装配，**不注册 Wails Service**。

`backend/menu` 注册的 Service 暴露 `ReportDisabledCommands(disabled []Command)`、`GetMenu()` 与 `InvokeMenuItem(command, role)`，另有两个 `//wails:ignore` 的读取方法给菜单构建器用。禁用集合是菜单的呈现状态：没有持久化、没有跨会话语义，不属于「设置由 Go 拥有」。菜单重建走 `main.go` 的 `installMenu()`，触发路径是启动、设置变更与禁用集合变更三条；macOS/Linux 走 `app.Menu.Set` + `window.SetMenu`，Windows 向前端推送 `menu:tree-changed` 快照事件。

### 3. 应用设置由 Go 拥有并持久化

外观（appearance）、强调色（accent）、减少动画（reducedMotion）、开发者选项（developerOptions）由 Go 持有、校验与持久化；界面缩放（zoom）沿用同一模式。前端 Pinia store 保留，但降级为 Go 快照的中转：组件只调 store 方法，store 内部调后端 service。

- 契约与 Service 置于 `backend/settings/`，与 `library/`、`native/` 并列注册。
- 载体为官方 `pkg/services/kvstore`：整个 typed 设置结构体序列化成一份 JSON 存单个 key；`AutoSave` 恒为 false，由包装服务在变更后写临时文件再 rename，避免 kvstore 原生 `os.WriteFile` 的截断风险。kvstore 本身不作为独立 Service 注册，`Set`/`Clear` 不暴露给前端。
- 文件路径统一用 `application.Path(application.PathDataHome)`，`library.db`、缩略图与 `settings.json` 同处其下的 `interweave/` 子目录；读写走 `backend/internal/` 的原子写工具。
- 读失败或文件损坏时回默认值并保留原因日志；写失败回滚内存状态并向调用方返回错误。已有 `localStorage` 中的外观设置不迁移，升级后从默认值开始。
- 变更监听器与事件出口在**锁外**调用：菜单重建要回读设置，持锁回调就是自死锁；状态在调用前已提交，回读到的必然是本次新值。
- 设置文件里的版本号来源是 `//go:embed` 读入的 `build/config.yml`，由 `scripts/sync-version.mjs` 以 `package.json` 为唯一版本源写出，dev 与 release 共用同一来源。

### 4. 启动由静态启动层遮住首帧

设置拉取完成前，窗口显示纯 HTML/CSS 的静态启动层（复用 `build/appicon.png` 派生的 logo），拉取完成或超时（3s）后移除，避免首帧以默认主题闪现。

### 5. 平台、flags 与 bindings 在 runtime 注入后读取

Go 侧在 `WebViewDidFinishNavigation` 之后才注入 `window._wails`，早于它的 setup 读到的是空值。首次渲染挡在注入之后，不采用「先渲染再补」：平台、flags 与 bindings 都是注入之后才可信的进程事实。缩放与拖动区的落地口径见 [apps/interweave/AGENTS.md](../../apps/interweave/AGENTS.md)。

### 6. Snap Layouts 只标最大化键，不改变菜单与拖动归属

Win11 的悬停分屏面板由 DWM 在收到 `WM_NCHITTEST → HTMAXBUTTON` 时触发。Wails v3.1.0 提供两条前提：`Windows.NonClientRegionSupport`（WebView2 的 `app-region` 命中）与 `Windows.WebView2CompositionHosting`（把前端标记的非客户区矩形路由成 `HTMINBUTTON` / `HTMAXBUTTON` / `HTCLOSE`）。仅开前者不会让自绘按钮获得 Snap Layouts，因此 Windows 必须同时开启 composition hosting。

- 前端只给最大化键声明 `--wails-non-client-region: maximize`；最小化与关闭没有 hover 面板，继续走普通 client 命中。
- 窗口拖动继续由 `--wails-draggable` 发起（Wails 在 mousedown 后 `PostMessage(WM_NCLBUTTONDOWN, HTCAPTION)`），拖动底**不**标 `caption`：再叠一层原生 caption 命中会让同一次按下同时进入原生移动循环与 JS 拖动。
- 非客户区按钮点击由 Wails 转回 WebView，`@click="toggleMaximise"` 仍是唯一 toggle 入口；双击最大化键等价于两次 toggle，与原生「双击标题栏」的终态一致。
- 上游 v3.1.0 的 composition hosting 仍标注为实验特性，且存在已知问题（原生文件拖放失效的上游 PR #6566 尚未合并）。Interweave 开着 `EnableFileDrop`，因此必须真机验证；真机确认回归时用 `INTERWEAVE_DISABLE_WINDOWS_SNAP` 关闭非客户区路由（前端标记保留但不再生效），而不是在生产里带着坏的文件拖放。

## 后果

- `backend/` 出现 `settings/` 一级模块，ADR-0008 §2 的 allowlist 由「`library/` 与 `native/`」扩为「`library/`、`native/` 与 `settings/`」；`backend/menu/` 只放契约与可用性 Service，其 allowlist 见 ADR-0008 §2。
- 路径按 `application.Path(application.PathDataHome)` 解析：macOS 位置不变，Windows 从 `%APPDATA%` 变为 `%LOCALAPPDATA%`；旧路径里的 `library.db` 不再被读取，视为新库。
- 设置读取成为启动序的一段：外观在启动层之下生效，主界面不会先以错误主题渲染。
- 菜单随设置的可见项变化需要整体重建（`app.Menu.Set` + `window.SetMenu`），不能只靠逐项 `Menu.Update()`：Windows 上后者不重绘已存在的菜单栏。
- 前端不再拥有任何设置真值；主题、强调色、减少动画与缩放都经 service 与事件驱动，`localStorage` 不再承担持久化。
- 菜单文案全中文，与工具栏一致；系统 role 的默认英文会被覆盖，后续新增菜单项需要同时维护中文 label。升级 Wails 时 role 的 selector 语义仍由上游提供，只核对没有被上游改名的 selector。
- 缩放依赖前端存活：前端未加载时点菜单只改设置，加载后的首次快照会补上。
- Windows 菜单只有 `Describe("windows")` 的结构断言：菜单栏渲染、accelerator 分发与 `window.SetMenu` 重建都没有实机证据。
- Snap Layouts 同样只有静态配置与结构断言（按钮声明、composition hosting 开关、回退开关）。hover 面板是否出现、点击是否双触发、原生文件拖放/透明/IME 是否回归，必须在 Windows 真机上按下节清单确认后才能移除「未验收」标记。

### Windows 真机验收清单（Snap Layouts）

- 最大化键 hover 出现 Win11 分屏面板，且面板不被自绘顶栏遮挡。
- 单击最大化/还原只切换一次；双击终态与原生标题栏一致。
- 顶栏拖动、双击最大化、四边/四角 resize 正常；多显示器与不同 DPI 迁移正常。
- 文件与文件夹拖入仍进入导入队列（重点回归 composition hosting 的上游 #6566）。
- 窗口圆角/阴影、透明/穿透行为无回归；输入法候选窗定位正常。
- 失败处置：设置 `INTERWEAVE_DISABLE_WINDOWS_SNAP=1` 重启，确认回到可用的 frameless 行为。

## 备选方案

- **Windows 原生标题栏 + Win32 菜单栏双层布局**：首版采用以规避自绘成本，但系统标题栏与菜单栏分居上下两层、视觉割裂；已在第五轮修订中改为 Frameless 一体化顶栏（复用 Go 菜单树，仅在 Interweave 前端渲染，不扩充 `packages/web-ui` 公共契约）。
- **官方 kvstore 直接注册**：省一层代码，但数据无类型、写入非原子，且 `Set`/`Clear` 会直接变成 JS 可调用方法，与「Go 拥有设置」冲突。放弃。
- **第三方配置库（viper / koanf）**：只提供分层配置合并，不提供原子写与并发保护，且仓库的依赖变更需要单独授权。放弃。

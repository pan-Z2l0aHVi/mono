# ADR-0024: Interweave 顶部菜单走原生，应用设置由 Go 拥有

- **Date**: 2026-11-14
- **Status**: 已接受
- **修订**: ADR-0008（Wails 暴露面 allowlist）

## 背景

Interweave 此前只注册了 Wails 的默认菜单（`DefaultApplicationMenu`）加一个「Paste Files」项，业务能力不在菜单里出现；应用设置（主题外观、强调色、减少动画）由前端的 Pinia store 存在 `localStorage`，Go 侧读不到，也无法参与菜单构建。

顶部菜单与设置所有权互相牵连：

- 菜单条目的启用状态、开发者工具入口等都要读设置，设置若仍在浏览器存储里，Go 就只能在点击时向前端要状态，多一条反向通道。
- macOS 的菜单在屏幕顶部、由 AppKit 渲染；Windows 的菜单是附着在 HWND 上的 Win32 菜单栏。两者都是操作系统绘制，不是 Web 内容。
- 仓库当前没有设置持久化载体；Wails 3 也没有官方的应用设置 API。

## 决策

### 1. 顶部菜单使用 Wails 的原生菜单，不在 web-ui 里自绘

macOS 用 `app.Menu.Set` 设置全局 NSMenu，Windows 用 `WebviewWindowOptions.UseApplicationMenu` 附着 Win32 菜单栏。不自绘 HTML 菜单栏，也不启用 frameless 窗口。

菜单树由 Go 构建，按平台分支：macOS 含 App 菜单（关于/服务/隐藏/退出），Windows 不含。界面文案全中文，关于面板的版本号拼进 `application.Options.Description`。

文案全中文意味着**不直接沿用 Wails 的 role 生成器**：它的 label 写死英文（`About Interweave`、`Undo`、`Actual Size`），键位也是它自己的一套。实现方式是「挂 role、用应用自己的 label 与 accelerator」——`menu.Add(label).SetRole(role)`，系统语义（`undo:`、`cut:`、`terminate:` 等 selector）仍然保留，只覆盖展示层。

同理，Wails 的 `Reload` / `ForceReload` / `OpenDevTools` role 不使用：`Reload` 的默认 `Cmd+R` 会与「刷新可用性」抢同一个 chord，而 `OpenDevTools` 在 `production` tag 下被编译成空实现。这两项做成普通菜单项，点击由 Go 直接调窗口方法，是否出现在菜单里由设置决定，而不是由构建 tag 决定。

菜单结构本身与 Wails 解耦成两层：`Describe(goos)` 产出纯数据的节点树（顶层顺序、文案、快捷键、命令归属），`Build` 负责物化。这样菜单形状能被单测直接断言，不需要启动应用实例——Wails 的部分 role 在构造期就读全局 app，无法在包级测试里构造。

### 2. 菜单命令通过单一事件下发，不注册菜单 Service

菜单点击不按项拆事件，而是发一个菜单命令事件，载荷为 `{command, payload}`，`command` 是字符串枚举，`payload` 是 `map[string]string`（当前所有命令无参）。命令契约与事件名常量由 `backend/menu/` 拥有，菜单树构建与平台分支由 `backend/native/menu/` 实现，后者作为 Go 包由 `main.go` 装配，**不注册 Wails Service**——菜单由 Go 完全拥有，前端没有可调用入口。

菜单重建只由「设置变更」这一条内部路径触发，前端不参与。

### 3. 应用设置由 Go 拥有并持久化

外观（appearance）、强调色（accent）、减少动画（reducedMotion）、开发者选项（developerOptions）四项设置全部由 Go 持有、校验与持久化。前端 Pinia store 保留，但降级为 Go 快照的中转：组件只调 store 方法，store 内部调后端 service。

- 契约与 Service 置于新增的 `backend/settings/`，与 `library/`、`native/` 并列注册。
- 载体为官方 `pkg/services/kvstore`：整个 typed 设置结构体序列化成一份 JSON，存在单个 key 下；`AutoSave` 恒为 false，由包装服务在变更后写入临时文件名再 rename 到正式文件，避免 kvstore 原生 `os.WriteFile` 的截断风险。kvstore 本身不作为独立 Service 注册，`Set`/`Clear` 不暴露给前端。
- 文件路径统一改用 `application.Path(application.PathDataHome)`，`library.db`、缩略图与 `settings.json` 同处该目录下的 `interweave/` 子目录。
- 读写配置统一走 `backend/internal/` 提供的原子写工具（由 `backend/library/media/thumbnails.go` 的现有实现提取）。
- 读失败或文件损坏时回默认值并保留原因日志；写失败回滚内存状态并向调用方返回错误。
- 已有 `localStorage` 中的外观设置不迁移，升级后从默认值开始。
- 变更监听器与事件出口在**锁外**调用。菜单重建要回读设置（开发者选项决定那两项在不在），持锁回调就是自死锁；状态在调用前已提交，回读到的必然是这一次的新值。
- 设置文件里的版本号来源不是 ldflags，而是 `//go:embed` 读入的 `build/config.yml`：`scripts/sync-version.mjs` 已经以 `package.json` 为唯一版本源写这份配置，dev 与 release 因此共用同一个来源，不必在两个平台的 Taskfile 里各维护一份 `-X` 参数。

### 4. 启动由静态启动层遮住首帧

设置拉取完成前，窗口显示纯 HTML/CSS 的静态启动层（复用 `build/appicon.png` 派生的 logo），拉取完成或超时（3s）后移除，避免首帧以默认主题闪现。

## 后果

- `backend/` 出现第五个一级模块 `settings/`，ADR-0008 §2 的 allowlist 由「`library/` 与 `native/`」扩为「`library/`、`native/` 与 `settings/`」。`backend/menu/` 只放契约，不注册 Service，也不在 allowlist 内。
- 路径按 `application.Path(application.PathDataHome)` 解析：macOS 位置不变（`~/Library/Application Support`），Windows 从 `%APPDATA%` 变为 `%LOCALAPPDATA%`；Windows 上旧路径里的 `library.db` 不再被读取，视为新库。
- 设置读取成为启动序的一段：外观在启动层之下生效，主界面不会先以错误主题渲染。
- 菜单随设置的可见项变化需要整体重建（`app.Menu.Set` + `window.SetMenu`），不能只靠逐项 `Menu.Update()`：Windows 上后者不重绘已存在的菜单栏。
- 前端不再拥有任何设置真值；主题、强调色与减少动画都经 service 与事件驱动，`localStorage` 不再承担持久化。
- 菜单文案全中文，与工具栏一致；系统 role 的默认英文会被覆盖，后续新增菜单项需要同时维护中文 label。
- 系统 role 的展示层（label、accelerator）由应用维护，语种与键位不再跟随 Wails；升级 Wails 时 role 的 selector 语义仍由上游提供，只核对没有被上游改名的 selector。

## 实施记录

落地结构、与本文的差异、实施中修掉的缺陷（设置监听器自死锁）与逐项验收结论见 [`docs/research/interweave-top-menu-plan.md`](../research/interweave-top-menu-plan.md)。Windows 端尚未做运行时验证，清单在该文的「未验证的缺口」与调研文档的附录 B。

## 备选方案

- **Windows 自绘菜单栏**：需要 frameless 窗口加 `NonClientRegionSupport` 与自绘窗口控件，且 Wails 的 frameless 路径不为 Win32 菜单栏预留高度，组合无支持；也要在 web-ui 里新增 menubar 组件、键盘焦点与拖拽区。放弃。
- **官方 kvstore 直接注册**：省一层代码，但数据无类型、写入非原子，且 `Set`/`Clear` 会直接变成 JS 可调用方法，与「Go 拥有设置」冲突。放弃。
- **第三方配置库（viper / koanf）**：提供的是分层配置合并，不提供原子写与并发保护，且仓库的依赖变更需要单独授权。放弃。

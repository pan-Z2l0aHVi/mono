# ADR-0024: Interweave 顶部菜单走原生，应用设置由 Go 拥有

- **Date**: 2026-11-14
- **Status**: 已接受
- **修订**: ADR-0008（Wails 暴露面 allowlist）
- **修订注记（2026-11-14，第二轮迭代）**: 菜单命令枚举按七菜单结构重排；`backend/menu` 注册一个窄 Service `ReportDisabledCommands`（原文 §2 写着它不注册 Service）；`backend/native/menu` 仍是纯构建包。详见下方「第二轮迭代修订」。

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

落地结构与验收结论的要点已回写本节；完整的实施记录是时点性材料，随 `docs/research/` 一起移出仓库，不作为权威引用。

实施中修掉的缺陷：`UpdateSettings` 原先在持锁状态下调用变更监听器，而菜单重建监听器要回读开发者选项，造成自死锁；现在监听器与事件出口改在锁外调用（状态已提交，回读必然是本次新值），并由 `TestChangeListenerCanReadSettingsBack` 覆盖。

Windows 端尚未做运行时验证：菜单形状由 `Describe("windows")` 的结构断言覆盖，但菜单栏渲染、accelerator 分发与 `window.SetMenu` 重建都没有实机证据。

## 第二轮迭代修订（2026-11-14）

第一轮落地的是最小菜单（App / 文件 / 编辑 / 查看 / 窗口 / 帮助，开发者分组挂在「查看」末尾）。第二轮把它收敛为完整的七菜单结构，并补上菜单与前端之间的可用性反馈回路。

### 1. 菜单结构

七个顶层菜单：Interweave、文件、编辑、显示、窗口、帮助，以及仅在开发者选项打开时出现的「开发」。

- 「Interweave」两端都存在，但 macOS 上带 AppKit 的服务菜单位与两个隐藏项，Windows 上只有关于 / 设置 / 退出——`popupmenu_windows.go` 根本没有消费 `Hide` / `HideOthers` role 的代码，挂上去只是一个点了没反应的条目。
- 「编辑」补上「复制为纯文本 / 粘贴为纯文本」；末尾的输入法注入项不写进 `Describe`。「查找」在真机验收后被移除，理由见下文「真机验收」。
- 「显示」由「查看」改名，新增切换筛选栏、搜索、后退、前进；刷新不挂快捷键，`CmdOrCtrl+R` 只属于开发菜单的「重新载入」。
- 「窗口」在 Windows 上是我们自己的最小化 / 最大化 / 关闭（没有系统注入）；macOS 上挂 `WindowMenu` role，由 AppKit 追加「填充 / 居中 / 移动与调整大小」等标准项——那几项不在 `Describe` 里，测试也不断言。
- 「开发」是独立顶层菜单，顺序为「重新载入」「开发者控制台」，关闭开发者选项时整菜单不出现（不是置灰）。

### 2. `backend/menu` 注册 Service

原文 §2 写着「菜单不注册 Service，前端没有可调用入口」。第二轮改变了这一点，理由与边界：

- 需要改变的是**菜单项的启用状态**：刷新 / 切换筛选栏 / 搜索依赖「当前在资源库页」，后退 / 前进依赖历史栈；这些状态都在前端，菜单形状在 Go。
- 该 Service 只有一个方法 `ReportDisabledCommands(disabled []Command)`，另有两个 `//wails:ignore` 的读取方法给菜单构建器用。没有持久化、没有跨会话语义——禁用集合是菜单的呈现状态，不属于 ADR-0024 §3 的「设置由 Go 拥有」。
- `backend/native/menu` 依旧不注册 Service：菜单树的形状、文案、快捷键与 role 仍完全由 Go 拥有，前端唯一能做的是「告诉我现在哪些命令不可用」。
- 重建路径从一条变成三条，全部走 `main.go` 的 `installMenu()`：启动、设置变更、禁用集合变更。Windows 上每次重建仍是 `app.Menu.Set` 加 `window.SetMenu`。

### 3. 命令枚举变更

`paste-files` 与 `refresh-availability` 被删除，分别由 `import-from-clipboard` 与 `refresh-library` 取代；新增 `import-from-link`、`toggle-filter-bar`、`focus-search`、`navigate-back`、`navigate-forward`、`check-for-updates`、`copy-as-plain-text`、`paste-as-plain-text`、`maximise-window`。`library:paste-files-requested` 事件连同其订阅方一并删除，能力由「导入来自 › 剪切板」承担。

`reload-window`、`open-devtools`、`maximise-window` 与 `check-for-updates` 仍由 Go 直接执行，不发往前端。

### 4. 文本剪贴板

`native/service` 新增 `ReadClipboardText` / `WriteClipboardText`（macOS 走 NSPasteboard，Windows 走 `CF_UNICODETEXT`，其余平台显式报不支持）。分工：复制 = 前端取选区、Go 写剪贴板；粘贴 = Go 读剪贴板、前端插到焦点处。理由写在 `backend/native/service/clipboard_text.go` 与 `frontend/src/composables/plainTextClipboard.ts`。

### 5. 未消除的缺口

Windows 端仍无真机验证：菜单形状、「开发」菜单出现与否、置灰与 accelerator 分发都只有 `Describe("windows")` 的结构断言与源码级依据（`SetEnabled(false)` 对应 `MF_GRAYED`）。

macOS 侧已做真机验收（interweave.dev.app，2026-11-14），结论如下：

- 七个顶层菜单的形状、文案与快捷键符合本方案；开发者选项关闭时「开发」菜单不出现、打开后作为第 8 个顶层菜单追加在末尾。
- 禁用集合上报有效：切到「关系图谱」后「刷新 / 切换筛选栏 / 搜索」置灰，「后退」可用而「前进」不可用；点「显示 › 后退」回到资源库页后四者反向翻转。
- 「导入来自… › 链接」打开添加对话框并直接翻开链接输入；「切换筛选栏」「搜索」「刷新」「切换侧边栏」「检查更新」均按预期生效。
- 「复制为纯文本」把 WebView 选区写进系统剪贴板（用哨兵值确认已被替换），「粘贴为纯文本」把剪贴板文本插入到焦点输入框。
- **「查找」已从编辑菜单移除**：真机验收时点击无任何可见效果。原因是 Wails 的 `Find` role 只把 selector 设成 `performTextFinderAction:`，没有给菜单项打上 `NSFindPanelActionShowFindPanel` 之类的 tag，AppKit 收到的 action 缺参数，WKWebView 因此不弹查找栏。方案给出的两条退路（改成聚焦资源库搜索、删除该项）经用户裁决取后者：`CmdOrCtrl+F` 交还网页原生查找，菜单里不再有条目。

### 6. 用户验收后的修复（2026-11-14，第三轮）

用户按上面第 5 节验收时报告了四处问题，逐条定位后修复：

- **「放大 / 缩小 / 默认缩放」点了没反应**：`ZoomIn` / `ZoomOut` / `ResetZoom` 三个 role 在 `roleToSelector`（macOS 的 role→selector 表）里没有条目，`newMenuItem` 因此落到自定义回调分支，而 role 条目没有回调；Win32 侧也完全不消费 role。两端都是死条目。改为由 Go 直接执行 `window.ZoomIn()` / `ZoomOut()` / `ZoomReset()`，与 `maximise-window` 同一类。
- **「切换筛选栏」只在筛选栏收起时有效**：页面侧把事件处理写成 `filterOpen = true`，已展开时再点没有任何变化，名不副实。改为真正的切换。
- **编辑菜单末尾的系统注入项（自动填充 / 开始听写 / 表情与符号）与窗口菜单的系统项（全部最小化、填充、居中、移动与调整大小等）是英文**：这些条目由 AppKit 注入，语言取自宿主 bundle 的本地化声明。两个 `Info.plist` 都没有 `CFBundleLocalizations`，AppKit 于是按开发区域（英文）渲染。补上 `CFBundleDevelopmentRegion = zh_CN` 与 `CFBundleLocalizations = [zh_Hans]` 后全部变成中文；不需要额外的 `.lproj` 目录。
- 「隐藏 Interweave」在真机上以三种方式（菜单项辅助功能点击、真实鼠标点击、`Cmd+H`）复测均生效（`NSRunningApplication.isHidden` 变为 `true` 并保持），未做改动。

真机复核：重建后逐项验证——放大 / 缩小 / 默认缩放都改变页面缩放，切换筛选栏可开可关，编辑与窗口菜单的系统注入项均为中文。

### 7. 窗口拖动区改为按元素声明（2026-11-15）

用户验收时报告：按住 header 上的 action buttons 会误触发窗口拖拽，而这一行按钮密集，按下与拖动必然互相干扰。

原因是窗口选项里的 `Mac.InvisibleTitleBarHeight: 50`：它让 AppKit 按鼠标的 y 坐标命中一条横贯整窗、高 50px 的带子，与 DOM 无关。header 正好落在这条带子里，于是任何按下都会被 `performWindowDragWithEvent:` 接管。

修复：

- 删除 `InvisibleTitleBarHeight`，窗口不再有按坐标的拖动带。
- 拖动改为按元素声明：`data-window-drag` 标记可拖窗口的元素，它必须是**与控件同级**的一层透明底（`absolute inset-0 -z-10`），只铺容器里没人占的空白，而不是给容器加标记再让控件逐个退出——`--wails-draggable` 会被继承，而 Wails 只读事件目标自己的计算值，控件压在拖动底上，按下就落不到它。规则在 `frontend/src/assets/global.css`，光标固定 `default`，免得空白处出现 I 形光标。

现有两处拖动区：资源库工具条行内的一层透明底（`absolute inset-0 -z-10`，控件压在它上面，空白与内边距能拖、按钮与输入框不能），以及 macOS 侧栏顶部给红绿灯留的 48px padding 区——那是 layout shadow 里的空白，用一个透明覆盖层声明。两处都是独立元素，所以控件不需要任何退出标记。

「帮助」菜单顶部的搜索框是 AppKit 按标题认领帮助菜单后注入的：试着按 `NSApp.helpMenu` 清掉无效，仅当顶层菜单标题不等于本地化「Help」时它才不出现；而菜单栏显示的正是那个标题，所以没有既保留「帮助」又去掉搜索框的公开做法。结论是接受系统行为（用户裁决），把理由记在 `backend/native/menu/menu.go` 的 `helpMenu` 上，避免后来者再试一遍。

真机验收顺带查出一处一直没生效的判定：`System.IsMac()` 读 `window._wails.environment`，而 Wails 在 `WebViewDidFinishNavigation` 之后才注入 runtime core，壳的 setup 早于它，所以首次读到的必然是 `false`——「给系统窗口按钮留顶部空间」那条从落地起就没应用过，红绿灯一直压在「资料库」上。

修复不放宽到「读到后再补」，而是把首次渲染挡在注入之后：平台、flags 与 bindings 都是注入之后才可信的进程事实，先渲染再补，轻则布局跳变（顶部留白恰好在 header 上），重则启动期的桥接调用直接失败。`frontend/src/services/runtime.ts` 因此成为「runtime 就绪」的唯一判据（`hasWailsRuntime` / `waitForRuntimeConfig`，后者等 `wails:runtime-config-ready` 事件，超时 1.5s 按浏览器预览放行），`frontend/src/main.ts` 在挂载前等它；壳里读平台回到一次性取值。启动层（§4）本来就盖住首帧，这段等待不改变用户看到的东西。

后果：

- 双击拖动区仍按系统偏好缩放或最小化（Wails runtime 的 `wails:drag:doubleclick`）；拖动区之外的双击不再触发窗口操作。
- 没有 header 的页面只能用侧栏顶部那条带子拖窗口。页面要更宽的拖动面，就在自己的 header 里加一层同样的透明底，这条约定写进了 `apps/interweave/AGENTS.md`。
- Windows 不受影响：窗口带原生标题栏，没有 web 层拖动区。

真机复核（interweave.dev.app，2026-11-15）：按住「添加资源 / 选择 / 筛选和排序 / 搜索 / 后退」拖动，窗口不动；从工具条的行空白与侧栏顶部带子拖动，窗口跟随；双击行空白按系统偏好缩放、再双击复原；在搜索框与筛选面板的空白处拖动同样不动窗口，按钮点击照常。

## 备选方案

- **Windows 自绘菜单栏**：需要 frameless 窗口加 `NonClientRegionSupport` 与自绘窗口控件，且 Wails 的 frameless 路径不为 Win32 菜单栏预留高度，组合无支持；也要在 web-ui 里新增 menubar 组件、键盘焦点与拖拽区。放弃。
- **官方 kvstore 直接注册**：省一层代码，但数据无类型、写入非原子，且 `Set`/`Clear` 会直接变成 JS 可调用方法，与「Go 拥有设置」冲突。放弃。
- **第三方配置库（viper / koanf）**：提供的是分层配置合并，不提供原子写与并发保护，且仓库的依赖变更需要单独授权。放弃。

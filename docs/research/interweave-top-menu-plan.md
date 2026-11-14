<!-- corpus-status: reference -->

# Interweave 顶部菜单与 Go 侧设置：开发方案与实施记录

> 状态：非权威参考（时点性记录）。决策以 [ADR-0024](../adr/0024-interweave-native-menu-and-go-owned-settings.md) 为准，行为以源码与测试为准。
> 调研依据见 [`docs/research/interweave-top-menu.md`](./interweave-top-menu.md)。本文是它的落地版本：记录实际落到的结构、与调研的差异，以及各项验收结论。
> 写作时点：2026-11-14。

## 一、落地结构

```
apps/interweave/
  main.go                       装配：数据目录、settings service、菜单树、事件接线
  appversion.go                 从嵌入的 build/config.yml 读 info.version
  events.go                     五个自定义事件的载荷类型登记
  backend/
    internal/atomicfile/        temp + rename 原子写（缩略图与设置共用）
    menu/menu.go                契约：CommandEventName、Command 枚举、MenuCommand DTO
    native/menu/menu.go         菜单形状（Describe）与 Wails 物化（Build）
    settings/                   Settings 类型、色板与校验、kvstore 包装、Wails Service
  frontend/
    index.html                  静态启动层（纯 HTML/CSS）
    src/services/menu/          菜单命令 → 处理函数的分发
    src/services/settings/      GetSettings / UpdateSettings 绑定封装
    src/stores/settings.ts      Go 快照中转
    src/composables/menuActions.ts   壳与页面之间的菜单动作事件名
    src/composables/startupLayer.ts  启动层退场
```

## 二、与调研方案的差异

调研文档里的目标结构与最终实现有三处不同，都是实施中发现的约束造成的：

### 1. 菜单拆成「形状」与「物化」两层

调研方案说 `backend/native/menu/` 直接构建 Wails `Menu`。实施时发现 Wails 的若干 role 在**构造期**就读 `globalApplication`（`NewAboutMenuItem` 读 `options.Name`），所以包级单测无法直接 `Build()`。

拆成：

- `Describe(goos) []Node` —— 纯数据，描述顶层顺序、文案、快捷键、命令归属。测试直接断言它。
- `Build(developerOptions, sink) Tree` —— 把 `Node` 物化成 `*application.Menu`，只在真实应用里调用。

`Tree` 还暴露 `Invoke(label)`，因为 Wails 的 `MenuItem` 回调不可从包外触发，而「哪个 label 对应哪个命令」必须能被核对。物化侧只保留一条 `materialize` 路径，结构断言全部落在 `Describe` 上，两者不会各说一套。

### 2. role 条目的文案与快捷键由应用给定，不用 Wails 默认

调研阶段以为 `AddRole` 就够了。实测装上后菜单出现英文：`About Interweave` / `Hide Interweave` / `Undo` / `Reload` / `Actual Size`。Wails 的 role 生成器写死了英文 label 与它自己的键位表。

改为 `menu.Add(label).SetRole(role)`：role 仍走 responder chain 的 selector（`undo:`、`cut:`、`terminate:` 等系统语义不变），但文案与快捷键由 `Node` 给出。服务与窗口两个菜单位是容器 role，用 `AddSubmenu` 后按 label 回查父菜单补 `SetRole`。

同时**移除**了 Wails 的 `Reload` / `ForceReload` / `OpenDevTools` role：

- `Reload` 的默认键位是 `Cmd+R`，会和「刷新可用性」抢同一个 chord；
- `OpenDevTools` 在 `production` tag 下被编译成空实现（`menuitem_production.go`），而本应用要求它由设置开关控制，不是由构建 tag 控制。

两项都改成普通菜单项，点击走 `menuSink`，由 Go 直接调 `window.Reload()` / `window.OpenDevTools()`，不经前端。

### 3. 版本号用 `go:embed` 读 `build/config.yml`，不用 ldflags

调研方案写的是构建期 ldflags 注入。实施时改掉了：`scripts/sync-version.mjs` 已经把 `package.json` 的版本同步进 `build/config.yml` 的 `info.version`，而 darwin 与 windows 两个 Taskfile 各自有一份 `BUILD_FLAGS`。要让 ldflags 生效就得改两个 Taskfile、加一个 `-X` 参数，还得保证 dev 构建也带上——三处都可能漂。

`appversion.go` 用 `//go:embed` 读同一份配置，在 `info:` 段内取第一个 `version:`（不能全文搜，文件开头 `version: '3'` 是配置格式版本）。dev 与 release 因此读的是同一个来源，零额外配置。

代价：配置文件必须随二进制一起编译，改了 `info.version` 要重新编译才生效——但版本本来就要重新构建才生效，所以这不是新增约束。

## 三、实施中修掉的缺陷

**设置变更监听器自死锁。** `UpdateSettings` 在持锁状态下调用 `ChangeListener`，而菜单重建监听器（`installMenu`）要调 `DeveloperOptionsEnabled()` 读开关——同一把 `sync.Mutex`，直接死锁。

表现：设置开关能写盘、界面也刷新，但菜单栏始终不重建。macOS 上一次运行期验证抓到这个问题。

修复：状态提交后在锁外调用监听器与事件出口（此时回读到的必然是刚提交的新值），并把 `UpdateSettings` 的 `defer Unlock` 改成显式解锁，避免「defer 解锁 + 中途解锁」的脆弱组合。

回归测试 `TestChangeListenerCanReadSettingsBack` 在监听器里做一次真实回读；没有超时机制时它表现为测试卡死，所以断言写成「5s 内必须跑完」。

## 四、验收结果

### 4.1 自动化验证

| 项                       | 命令                                                              | 结果                                               |
| ------------------------ | ----------------------------------------------------------------- | -------------------------------------------------- |
| Go 全量（含 race）       | `go test -race -count=1 ./...`                                    | 13 个包全通过                                      |
| 仓库 Go 检查             | `pnpm run check-go`                                               | 通过                                               |
| 前端全量                 | `pnpm exec turbo test --filter=@greypan/interweave-frontend`      | 34 个文件 / 345 个用例通过                         |
| 根全量                   | `pnpm run test`                                                   | 28/28 任务通过（见下方 flaky 说明）                |
| 类型检查                 | `vue-tsc --build`（由 frontend build 驱动）                       | 通过                                               |
| lint / format            | `pnpm run check-code`                                             | 0 error（12 条 warn 全在我未改动的既有测试文件里） |
| 拼写                     | `pnpm run check-cspell`                                           | 0 issue（新增 `kvstore` 到词表）                   |
| stylelint                | `pnpm run check-stylelint`                                        | 通过（`index.html` 内嵌 CSS 按仓库规则补空行）     |
| context 语料             | `pnpm run check-context`                                          | 通过                                               |
| 仓库脚本测试             | `pnpm run test-scripts`                                           | 通过                                               |
| changeset gate           | `node scripts/checks/check-changeset.mjs --base main --head HEAD` | 通过，`@greypan/interweave` 记 minor               |
| 前端构建 + bindings 生成 | `pnpm exec turbo build --filter=@greypan/interweave-frontend`     | 通过；bindings 只有新增，无删除                    |
| 桌面产物                 | `pnpm run build:macos:app`                                        | 构建成功                                           |

一次全量 `pnpm run test` 里 `@greypan/vue-web-ui-demo#test` 失败，重跑与单跑该包均通过，且本次改动不涉及该包或 `web-ui`（`git diff main` 为空）。按仓库的 flaky 处置口径记为「未复现」，不以加压复现或改无关代码收尾。

新增测试的覆盖面：

- `backend/settings`：默认值、单 key JSON 落盘、白名单逐字段回落、损坏文件回默认并报警告、空对象视为未保存、保存失败回滚内存态、指针 patch 显式清布尔、无变化不推送、监听器注销、监听器回读不死锁、色板前景色对比度。
- `backend/menu`：命令值与事件名逐字钉住、未知命令拒绝。
- `backend/native/menu`：两端顶层结构、About 位置、中文文案、快捷键归属、Reload role 不出现、label 与 accelerator 唯一性、每个业务条目都接进树且报告正确命令、命令集合与契约一一对应。
- `backend/internal/atomicfile`：覆盖写、权限、无临时文件残留、目录缺失报错。
- 前端：菜单命令分发（六条命令各打各的、窗口命令不经前端、畸形载荷忽略）、启动层退场（幂等、过渡期节点仍在、3s 上限）、settings store（拉取、转发、事件覆盖、一次性警告、写失败回读）、SettingsDialog（两个开关的 change 接线）。

### 4.2 macOS 运行时验证（本机实测）

实际启动 `bin/interweave.app` 并用系统菜单与 AX 树核对：

- 菜单栏为 `Interweave / 文件 / 编辑 / 查看 / 窗口 / 帮助`，全部中文；无英文残留。
- 「关于 Interweave」在 App 菜单，「Interweave 文档」在帮助。
- `添加资源… ⌘O`、`粘贴文件 ⌘⇧V`、`刷新可用性 ⌘R`、`切换侧边栏 ⌘B`、`设置… ⌘,` 键位正确。
- 「查看」里没有 Reload，`⌘R` 归「刷新可用性」。
- 开发者选项关闭时无「重新载入 / 开发者工具」；打开后两项出现，**运行期拨动开关菜单即时重建**（这一条最初失败，即上文的自死锁）。
- 「设置…」菜单命令打开设置对话框，面板落在「常规」。
- 「添加资源…」菜单命令打开添加资源对话框。
- 设置文件按 `{"settings":{...}}` 单 key 写入 `~/Library/Application Support/interweave/settings.json`；把开发者选项拨回 false 后文件内容随之更新。
- macOS 上数据目录仍是 `~/Library/Application Support/interweave`，旧 `library.db` 与缩略图正常读取——路径统一没有造成 macOS 侧数据丢失。

### 4.3 未验证的缺口

- **Windows 端没有任何运行时验证。** 菜单栏、accelerator 分发、`window.SetMenu` 重建、`%LOCALAPPDATA%` 路径全部只经过源码级核对与单测（`Describe("windows")` 的结构断言）。调研文档的附录 B 是留给这一步的清单。
- **启动层只验证了「不挡路」，没抓到「可见」的那一帧。** 热启动下设置读取在首帧之前完成，启动层在截图前就已退场。它的存在与退场逻辑由 `index.html` 与 `startupLayer.spec.ts` 覆盖，但「深色首帧不闪白」这条视觉结论未在真机逐帧确认。
- **设置损坏路径没做真机验证。** 单测覆盖了回默认与报警告；真机上会走一次 toast，未实际触发。
- 浮层遮挡：调试期间设置对话框与添加对话框会叠在一起，这是点击测试顺序造成的，不是实现问题；未单独验。

## 五、非目标（与调研一致，未做）

自绘菜单栏与标题栏、tray / dock / 右键菜单改造、菜单随路由启用禁用、快捷键可配置、菜单项图标与 check 双向同步、MCP 写入设置、多窗口同步、旧 `localStorage` 外观值与 Windows 旧库路径迁移。

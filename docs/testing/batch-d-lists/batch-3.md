# Batch 3 — shared 基础设施与表单组/布局（task `web-ui-contract-b3`）

base = `2e0fbcec`（Batch 2 结束）。治理标准：`docs/adr/0005-web-ui-component-architecture.md` §5。
删除判据：`../DELETION-RUBRIC.md`（含本批新增的 §7「内部模块 spec 标准」）。
批次划分：`./batch-plan.md`。

## 0. 范围（29 文件 / 基线 188 例）

本批原计划 38 文件，**实施前收缩为 29 文件**：`components/theme`（6）+ `shared/theme`（3）共 9 个主题/动效文件移入 Batch 6。理由见 §7.1。

- `shared/overlay`（10）：composition · lifecycle · native-dialog-presence · overlay-in-dialog.browser · overlay-positioning-generation · overlay-root · overlay · portal · reduced-motion.browser · theme-overlay-scope
- `shared` 其他基础设施（11）：menu-portal/menu-portal · menu-portal/menu-tree · option-portal/option-portal · scroll-lock/scroll-lock · visible-area/visible-area.browser · events/user-change · focus/pointer-focus · gesture/gesture · group-management/group-management · normalize/normalize · form-association/form-association
- `components`（8）：input/form-association.browser · input/input.jsdom · checkbox-group/checkbox-group · checkbox-group/cross-group.browser · radio-group/radio-group · layout/breakpoint-parity · layout/layout.browser · layout/mobile-toggle-header-alignment.browser

## 1. 实施结果（逐文件对账，已闭合）

合计 **188 → 176（Δ −12）**，与全量套件 1318 → 1306 的差值严格一致。

| 文件                                                       | 前  | 后  | Δ   | 处置                                                    |
| ---------------------------------------------------------- | --- | --- | --- | ------------------------------------------------------- |
| `shared/overlay/native-dialog-presence`                    | 1   | 3   | +2  | 重写：D2 断言 → API 级契约（见 §3.5）                   |
| `shared/overlay/portal`                                    | 5   | 4   | −1  | D2 删 1 例 + D5 删 1 行                                 |
| `shared/overlay/reduced-motion.browser`                    | 2   | —   | −2  | **D1 整文件删除**                                       |
| `shared/overlay/overlay`                                   | 12  | 12  | 0   | D3 用例改写 + 2 处标题按实际断言改名                    |
| `shared/overlay/overlay-in-dialog.browser`                 | 12  | 12  | 0   | 断言层改写（D2 删几何/内部变量），同步手法保留          |
| `components/layout/layout.browser`                         | 29  | 20  | −9  | D2/D3 删 9 例 + 其余全部重写为公开契约                  |
| `components/layout/mobile-toggle-header-alignment.browser` | 1   | —   | −1  | **D1 整文件删除**                                       |
| `components/input/input.jsdom`                             | 1   | —   | −1  | **D1 整文件删除**（D4 重复）                            |
| `shared/menu-portal/menu-portal`                           | 2   | 2   | 0   | D5 删 1 行（内部状态标记）                              |
| `shared/group-management/group-management`                 | 3   | 3   | 0   | 定位器统一（`shadowRoot!.querySelector` → `queryA11y`） |
| `components/checkbox-group/checkbox-group`                 | 24  | 24  | 0   | 定位器统一（同上）                                      |
| `components/radio-group/radio-group`                       | 26  | 26  | 0   | 定位器统一（同上）                                      |
| 其余 17 个文件                                             | 71  | 71  | 0   | **KEEP 未改动**（理由见 §4）                            |

## 2. DELETE 清单

### 2.1 D1 — 整文件删除（3 文件 / 4 例）

| #   | 文件                                                                         | 例  | 被删断言                                                                                                                                                                                                                   | 归类理由                                                                                  | 存活覆盖位置                                                                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `components/input/__tests__/input.jsdom.spec.ts`                             | 1   | `expect(input.value).toBe('foo')`（声明式 value 属性→property）                                                                                                                                                            | **D4 重复**（非视觉）。该文件仅此 1 例，整文件即该例                                      | `shared/form-association/__tests__/form-association.spec.ts:14`「声明式 value 属性作为初始默认值」；`text-control-contract.spec.ts:60` 的 `['value','hello','value','hello']` 反射矩阵；同文件 `:98` 「value 默认 … 且 disabled 默认 false」 |
| 2   | `components/layout/__tests__/mobile-toggle-header-alignment.browser.spec.ts` | 1   | `toggle.getBoundingClientRect().top` 三处 `toBeCloseTo` + `querySelector('.mobile-toggle')`                                                                                                                                | **D2 纯几何**（B1 已批判据：「几何/精确像素，非公开契约，属视觉实现」）。唯一断言即几何量 | —（移动端 toggle 的可交互性与 aria-label 契约由 `layout.browser.spec.ts` 承接）                                                                                                                                                              |
| 3   | `shared/overlay/__tests__/reduced-motion.browser.spec.ts`                    | 2   | `expectNoTranslation(getComputedStyle(x).transform)`、`transitionProperty` 含 `opacity`/`backdrop-filter`、`getComputedStyle(panel).transform === 'none'`；选择器 `.wui-dialog-body`、`shadowRoot.querySelector('dialog')` | **D2 纯计算样式 + D3 内部产物**：两例皆属，无公开可观察量                                 | **缺口已声明的跨批承接**：Batch 6 以 `getAnimations()`（Batch 1 已批范式，见 `svg-draw-lines/__tests__/reduced-motion.browser.spec.ts`）重建 dialog/drawer 的减少动效契约，见 §7.2                                                           |

### 2.2 D2 — 整用例删除（`layout.browser` 9 例 + `portal` 1 例 = 10 例）

`components/layout/__tests__/layout.browser.spec.ts`：

| #   | 用例                                                                                                                                                                                                                                                                              | 被删断言                                                                                                                                        | 理由                                                                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 不创建 sidebar scrollport；Consumer 的标题固定且仅其 nav 滚动                                                                                                                                                                                                                     | `getComputedStyle(viewport).overflowY === 'visible'`、`nav.overflowY === 'auto'`、`nav.scrollTop`、`getBoundingClientRect().top`                | D2 计算样式 + 几何                                                                                                                                                                                                                                          |
| 2–7 | 视觉型 Banner 元素没有文本内容时仍为 Sidebar 预留高度 / Banner 可见时卡片底部和 Toggle 都保留在视口内 / Banner 部分滚出时连续同步其当前可见高度 / 移除 Banner 后清空 Sidebar 的可见高度 / Banner 滚出后 Sidebar sticky 到视口顶部 / 重新连接后恢复 Banner 观察并更新 Sidebar 高度 | `layout.style.getPropertyValue('--wui-layout-visible-banner-height')`、`getBoundingClientRect().bottom/top`、`getComputedStyle(aside).position` | D2。**已核实该变量非消费者 API**：仅由 `layout/index.ts:81` 写在自己 host 上、由 `layout/style.css:8,58-61` 的 `:host` 规则消费，**全仓无 docs/demo/CSS 外部引用**，属组件内部实现通道；该特性的目的（为 Sidebar 预留可见高度以免卡片溢出视口）是纯视觉效果 |
| 8   | 页面使用 Flex 页面级滚动布局                                                                                                                                                                                                                                                      | `getComputedStyle(pageContainer).display === 'flex'`、`minHeight === innerHeight px`                                                            | D2 纯 CSS 布局态                                                                                                                                                                                                                                            |
| 9   | handle 竖线使用 accent 颜色且 hover 时可见                                                                                                                                                                                                                                        | `getComputedStyle(handle).cursor`、`line.background` 含 `rgb(0, 136, 255)`、`line.opacity`                                                      | D2 纯装饰样式（与 B1 已删的 `group-color` / `badge.browser` 同型）                                                                                                                                                                                          |

`shared/overlay/__tests__/portal.spec.ts`：

| #   | 用例                                                        | 被删断言                                        | 理由                                                                                                                  |
| --- | ----------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 10  | 宿主固定 `display: contents`，避免 `:host` 规则泄漏撑开容器 | `getComputedStyle(host).display === 'contents'` | D2 计算样式。该用例是为了防「泄漏的 `:host` 规则撑开容器」这一**视觉**回归，去视觉断言后无等价公开可观察量 → 整例删除 |

### 2.3 D5 — 保留用例内的局部断言删除

| #   | file:line                                                    | 被删内容                                                                                                                                                                                                                                                                                               | 理由                                            | 存活覆盖位置                                                                                                                                                                           |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `shared/overlay/__tests__/portal.spec.ts`（原 :30）          | `expect(portal.panel.dataset.wuiPresence).toBe('entering')`                                                                                                                                                                                                                                            | D5 内部状态标记（presence 状态机），非公开契约  | 同用例保留 `panel.contains(content)`、`restoreContent` 归还、`remove` 后容器为空                                                                                                       |
| 2   | `shared/menu-portal/__tests__/menu-portal.spec.ts`（原 :13） | 同上 `dataset.wuiPresence`                                                                                                                                                                                                                                                                             | 同上                                            | 同用例改为断言 `panel.isConnected` + `content.isConnected` + `panel.contains(content)`                                                                                                 |
| 3   | `shared/overlay/__tests__/overlay-in-dialog.browser.spec.ts` | `--wui-internal-overlay-transform-origin` 取值（2 处）；`expectVisibleInDialog` 内 6 条 `getBoundingClientRect` 边界；用例 8 的 `gap ≤ 8` 几何相邻                                                                                                                                                     | D2：内部实现变量（名字自带 `internal`）+ 几何量 | 保留 `dialog.matches(':modal')` + 「面板位于 dialog 或其 shadow 内」+ 宿主 `open`/`isOpen` + select/autocomplete 的 `value` 结果 + 定位代际契约（放行旧定位后 inline `left/top` 不变） |
| 4   | `components/layout/__tests__/layout.browser.spec.ts`         | 全文件：`getComputedStyle` 的 `width`/`overflowY`/`marginLeft`/`position`/`transitionDuration`/`cursor`/`background`/`opacity`/`display`/`minHeight`/`pointerEvents`、`getBoundingClientRect` 全部几何、`classList.contains('collapsed'｜'is-resizing')`、`::before` 的 `content: '""'`、内部 CSS 变量 | D2/D3                                           | 见 §3.1：改写为「请求-回写协议 + 事件计数与请求值 + `aria-label`/`role`/`tabindex` + attribute↔property 反射」                                                                         |

### 2.4 D3 — 存在性/恒真用例

| #   | file:line                                              | 被删内容                                                               | 处置                                                                                                                                 |
| --- | ------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `shared/overlay/__tests__/overlay.spec.ts`「创建实例」 | `expect(ctx).toBeTruthy()` + `expect(ctx.open).toBeTypeOf('function')` | 不为删除而删除：改写为真实默认态契约「**新建实例初始为未打开**」（`expect(ctx.isOpen()).toBe(false)`，该契约基线零覆盖），用例数不变 |

## 3. REFACTOR（改写要点）

### 3.1 `layout.browser.spec.ts`（29 → 20，全部重写）

保留并改写为公开契约的 12 类行为（详见 §2.3 第 4 行）：
受控折叠请求 + `aria-label` 在「折叠侧边栏 / 展开侧边栏」间翻转 · 外部属性更新不派发用户变更事件（`eventCount === 0`）· kebab-case attribute 存在语义 vs camelCase property 可表达 `false`（Vue 互操作）· 移动端不渲染桌面 `aside` 而用受控 `web-ui-drawer`（`headless` 未设、`dialog-label === '主导航'`、`draggable`）· 移动端 Toggle 请求打开且回写后 `drawer.open` 与 `sidebarOpen` 一致 · 拒绝 Escape/遮罩关闭请求时保持打开且**不泄漏** `open-change` · 正常 Escape 关闭请求 `sidebar-open=false` · `sidebar-resizable` 为 false 时无 `role="separator"` · 拖拽松手派发一次 `sidebar-width-change`（值 ≈ 起始宽度 ± 位移、受 min/max/collapsedWidth 钳制）· 零位移不派发 · `pointercancel` 与 capture 提前丢失的收尾语义 · 键盘步进（步进期间不派发、blur 派发一次）· 折叠态隐藏 handle。

**定位器由内部 class 改为公开抓手**：

- 桌面/移动 Toggle → `[aria-label="折叠侧边栏"｜"展开侧边栏"｜"打开导航菜单"]`（`aria-label` 本身即契约，见 `layout/index.ts:328,390`）
- resize handle → `queryA11y(el, '[role="separator"]')`（`layout/index.ts:359` 已提供 `role`/`aria-orientation`/`aria-label`）
- drawer → `web-ui-drawer` 元素名

### 3.2 `overlay-in-dialog.browser.spec.ts`（12 → 12）

改写为「面板挂载进 dialog + 可达 + 结果值」的集成契约；`vi.mock('@floating-ui/dom')` 的竞态门控与等帧/轮询同步手法**原样保留**。

**残留的内部引用已逐条核实为「同步手法 / mock 定向 / setup」，非断言**（供审查者直接核对，不必再判定）：

| file:line        | 残留                                                              | 性质                                                                                                          |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `:35`            | `floating.classList.contains('context-menu'｜'context-submenu')`  | `vi.mock` 内**定向**目标面板的门控逻辑，非断言                                                                |
| `:80,:83`        | `dialog.classList.contains('is-visible')`                         | `openDrawerDialog` 的**等待前置条件**（判入场过渡已完成），非断言                                             |
| `:91`            | `getComputedStyle(dialog).transform`                              | **等待**过渡 settle 的轮询条件，非断言                                                                        |
| `:113,:405,:419` | `panel.dataset.wuiPresence === 'open'`                            | `waitFor` 的**就绪判据**，非断言                                                                              |
| `:382`           | `dialog.style.setProperty('--wui-duration-float-exit', '2000ms')` | **setup**：拉长出场过渡以构造「同帧关闭→重开」场景；该令牌是公开动效令牌（见 `theme-motion.browser.spec.ts`） |

### 3.3 定位器统一（3 文件）

`checkbox-group` / `radio-group` / `group-management`：`el.shadowRoot!.querySelector('label'｜'slot'｜'[role="checkbox"]')` → `queryA11y(el, …)`（Batch 2 既定范式；`queryA11y` 返回 `Element | null`，`.click()` 处需 `as HTMLElement`）。断言内容未变。

### 3.4 标题按实际断言改名（`overlay.spec.ts`）

| 原名                           | 新名                             | 依据                                                                                              |
| ------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------- |
| `close 时隐藏 overlay`         | `close 后将实例置为未打开`       | 源码 `overlay.ts:201-207` 的 `close()` **不写 `display`**（面板可见性由调用方拥有），原名名不副实 |
| `打开后更新定位选项并重新定位` | `打开后 update 透传新的定位选项` | 用例只断言 `options` 透传，未断言重新定位的几何结果                                               |

### 3.5 `native-dialog-presence.spec.ts`（1 → 3）：把禁用断言换成真实缺口覆盖

基线唯一用例断言 `dialog.classList.contains('is-visible')` 与 `offsetWidth` 被读取的次数（D2/D3：内部状态标记 + 实现顺序），而模块接口注释里**真正有价值的契约零覆盖**：`handleNativeClose()` 用于区分「本模块自己 `finishClosing → dialog.close()` 排队的 close 事件」与「外部关闭（表单 `method="dialog"`、宿主程序化 `dialog.close()`）」——源码注释明确记载这是 **drawer 连续开关后丢失过渡动画的根因**。

改写为 3 例，断言只落在 `dialog.open` 与 `handleNativeClose()` 的返回值（模块接口契约）：

1. `sync(true)` 使原生 dialog 进入 open；
2. `sync(false)` 经 `transform` 过渡收尾后关闭 dialog，且该原生 close 被判定为**自身排队**的关闭（返回 `true`）；
3. 外部 `dialog.close()` **不**被判定为自身排队的关闭（返回 `false`）。

实现手法：用 `requestAnimationFrame` 与真实 `transitionend` 事件驱动状态机（**不**直接读/写内部 class），jsdom 缺 `showModal`/`close` 时按既有风格补桩。

## 4. KEEP 未改动（17 文件 / 71 例）及判定理由

| 文件                                            | 例  | 判定理由                                                                                                                                                                       |
| ----------------------------------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `shared/overlay/composition`                    | 3   | 测 `overlayComposition` 的 `registerPanel`/`contains`/`unregisterPanel` 语义（含递归清理、重挂后无 stale ancestry），零禁用模式                                                |
| `shared/overlay/lifecycle`                      | 5   | `scheduleFrame`/`cancel`/`invalidate`/`dispose`/`resume` + generation 单调性，返回值为 API 语义                                                                                |
| `shared/overlay/overlay-root`                   | 2   | 单例惰性创建 + 跨调用复用 + 不重复创建；`data-wui-overlay-root`/`-container` 是模块自身的 DOM 标记契约（被 `portal.ts`、`components/theme` 依赖）                              |
| `shared/overlay/overlay-positioning-generation` | 3   | 断言 `panel.style.left/top/width/minWidth` —— 这是模块**对调用方元素**的输出（§7 允许的「对测试自建 DOM 的可观察改动」），且覆盖真实竞态（乱序 promise、close 后写入）         |
| `shared/overlay/theme-overlay-scope`            | 5   | `findNearestTheme`/`findRootTheme` 的祖先解析语义（含穿透 shadow host、未设 `appearance` 不参与、取文档序第一个根）                                                            |
| `shared/menu-portal/menu-tree`                  | 2   | 节点迁移白名单 + 禁用项过滤 + 跨 shadow 焦点定位                                                                                                                               |
| `shared/option-portal/option-portal`            | 3   | option id 唯一性/稳定性（aria 引用依赖）、外部已设 id 不被覆盖                                                                                                                 |
| `shared/scroll-lock/scroll-lock`                | 1   | 嵌套实例只释放自己获取的锁；`document.body.style.position` 是本模块**唯一**的可观察后果（模块目的即改写滚动容器样式），非「内部 CSS」                                          |
| `shared/visible-area/visible-area.browser`      | 3   | `lastArea(areas)` 是模块返回语义（交集区计算、滚动/尺寸变化响应、换目标后停止观察旧元素），非 CSS 取值                                                                         |
| `shared/events/user-change`                     | 4   | `UserChangeController` 的 `mark`/`consume` 布尔标记语义                                                                                                                        |
| `shared/focus/pointer-focus`                    | 2   | SSR no-op + 浏览器接线。§5 禁止项不覆盖「事件接线」；该模块的产出**就是**在 document 上按 capture 注册三个监听并返回 disposer，无其他可观察量。**保留为有据的例外**（见 §7.3） |
| `shared/gesture/gesture`                        | 19  | 纯物理函数（clamp/snapToNearest/normalizeProgress/rubberband/springOffsets）+ `attachDragGesture`/`attachPinchGesture` 的生命周期回调、死区、touchmove 守护、捕获转手语义      |
| `shared/normalize/normalize`                    | 8   | `normalizeLiteral`/`normalizeNumber` 纯函数契约（含 NaN/Infinity/非字符串回退）                                                                                                |
| `shared/form-association/form-association`      | 3   | 声明式 value 初值、`restoreState`、`formDisabledCallback`（jsdom 可观察部分）                                                                                                  |
| `components/input/form-association.browser`     | 4   | FormData 提交 + `checkValidity` + `:invalid` + fieldset disabled 窗口——§5 明文允许（FormData/约束校验）                                                                        |
| `components/layout/breakpoint-parity`           | 1   | 断言 TS 断点常量与 CSS media query 阈值一致。**有据的例外**：它不是 CSS 取值断言，而是**两个产物之间的一致性守卫**（防静默漂移），与主题 docs/token parity 同类；见 §7.3       |
| `components/checkbox-group/cross-group.browser` | 2   | 跨组移入/移出后的托管归属、组事件计数、不泄漏到 body                                                                                                                           |

## 5. 门禁结果

| 门禁                                         | 结果                                                                                                                                    |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @greypan/web-ui test`（全量） | **110 文件 / 1306 用例 → 1305 passed, 1 failed**                                                                                        |
| 唯一失败                                     | `shared/overlay/overlay-in-dialog.browser.spec.ts > context-menu 子菜单同帧关闭重开后以最新定位落位`——**既有失败，非本批引入**（见 §6） |
| `vp check`                                   | **0 errors / 0 warnings / 0 format issues**（731 文件格式正确，493 文件 lint+type 通过）                                                |
| `pnpm run check:cspell`                      | **594 文件，0 issues**                                                                                                                  |

对账闭合：`1318 − 4（3 个删除文件）− 9（layout）− 1（portal）+ 2（native-dialog-presence）= 1306`；
文件数 `113 − 3 = 110`。

## 6. 既有失败用例：诊断更新（本批的有价值副产物）

改写后该用例**仍然失败**，但失败位置发生了变化，从而给出了明确诊断：

- 失败发生在**断言之前**的前置条件：`waitFor(...)` 抛出 `Expected the reopened submenu to be positioned`（`overlay-in-dialog.browser.spec.ts:405`，超时 1000ms），两次重跑稳定复现。
  > **Batch 4 修正**：本条"稳定复现"的表述**已被推翻**。b4 实测：该 spec 单独跑 3/3 失败、+1 邻居 spec 同跑仍失败，但**全量套件**（111 文件并行）3 次运行中有 2 次**全通过**。即这是**负载敏感时序抖动**（用例侧对"定位就绪"的等待预算/采样时机假设），不是确定性缺陷。详见 `batch-4.md` §7。
- 即：**同帧关闭→重开路径下，子菜单面板未能在门控放行窗口内完成定位**（第二次 `computePosition` 未确定性落位）。
- 该 `waitFor` 位于本次改写块之前、文本未改动，因此失败由组件行为决定，与本批改动无关。
- **未按「让测试变绿」处理**：未弱化断言、未加宽限期、未改 `expect(true)`。
- 结论：这是**待独立处理的竞态缺陷/用例构造问题**（可能与该用例为构造场景把出场过渡拉长到 `--wui-duration-float-exit: 2000ms` 有关），已列入 §7.4 转出项。

## 7. 遗留项与判据边界说明

### 7.1 主题/动效家族移出本批（判据变更）

`components/theme`（6）+ `shared/theme`（3）= 9 文件 / 43 例，原属本批清单，**实施前移入 Batch 6**。理由：这 9 个文件的断言绝大多数是 `getComputedStyle(...).getPropertyValue('--wui-*')` 取值（§5 明文禁止的 CSS 样式）与 `backdrop-filter`/`transform`/`animationDuration` 等视觉取值，其判据与「容器与动效」批次同源，且需要一条**独立判据**才能动手（见下）。合并在同一批会导致判据混淆与一次 freeze 承载两套标准。

**该家族需要的判据（Batch 6 前必须先定，本文档只记录现状不作裁决）**：

- 已批判例倾向严格：Batch 1 的 D1 删除了 `group-color.browser.spec.ts` 中「尊重宿主传入的 `--wui-button-color`」断言（理由：§5 禁测 CSS 样式与精确颜色值）。
- 但 Batch 1 **同时新增**了 `svg-draw-lines/__tests__/reduced-motion.browser.spec.ts`，其断言是 `path.getAnimations()).toHaveLength(0)`——即**用 Web Animations API 表达动效契约，而非 computed style**，这是已批范式。
- 因此 Batch 6 应倾向：动效/减少动效契约改用 `getAnimations()` 等 API 级可观察量；纯取值类（radius、token 字面量、`backdrop-filter`）按 D2 删除；`theme-tokens`/`theme-token-parity` 这类**源码与 README 文档的一致性守卫**属「产物一致性」而非 CSS 取值，建议保留（与 §7.3 同口径）。

### 7.2 跨批 ADD 承诺（删除产生的覆盖缺口，必须认领）

| 缺口                                                                                                 | 来源                                                                 | 承接批次与形式                                                                                 |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| dialog / drawer 的**减少动效**契约（`prefers-reduced-motion` / `motion=reduced` 下位移与缩放被移除） | 本批 D1 删除 `shared/overlay/reduced-motion.browser.spec.ts`（2 例） | **Batch 6**：用 `getAnimations()`（Batch 1 已批范式）重建，不回到 computed style               |
| `layout` 的 Banner 可见高度追踪 / sticky / 页面级 flex 滚动                                          | `layout.browser` D2 删除 9 例                                        | **不承接**（判定为纯视觉契约，仓库已决定不做视觉基线）。若将来需要，唯一诚实形式是视觉回归测试 |
| resize handle 的 hover/focus 视觉反馈                                                                | `layout.browser` D2 删除 1 例                                        | 同上前提（`:focus-visible` 的可聚焦性已由 `role`/`tabindex` 与键盘步进用例覆盖）               |
| portal 宿主 `display: contents` 防 `:host` 泄漏                                                      | `portal.spec.ts` D2 删除 1 例                                        | 同上（视觉契约）                                                                               |

### 7.3 有据的例外（判据边界，供审查者复核）

两处断言**不属 §5 允许清单的字面范围**，但按 `../DELETION-RUBRIC.md` §7 的「换一份等价实现会不会失败」口径判定为**契约**，保留并在此显式备案：

1. `shared/focus/pointer-focus.spec.ts` 的接线断言（`document.addEventListener('pointerdown'｜'keydown'｜'focusin', fn, true)`，且 `window` 未被使用）。该模块的产出即是全局捕获监听的注册与 disposer，无其他可观察量；§5 的禁止项（内部 class / 私有字段 / CSS / 实现顺序）均不覆盖它。
2. `components/layout/breakpoint-parity.spec.ts`：TS 断点常量与 `style.css` 的 media query 阈值一致性。它不是 CSS 取值断言，而是**跨产物一致性守卫**（防两处断点静默漂移），与主题 docs/token parity 同类。

审查者若不认同，请给 `file:line` 与判据依据，可在本批内改为删除（这两处均只占 1 例，改动面小）。

### 7.4 审查指出的 borderline 项（本批保留，转 Batch 6 判据裁决）

`shared/overlay/__tests__/overlay.spec.ts:152`「minAnchorWidth 读取 `--wui-overlay-min-width` 作为 floor」断言 `overlay.style.minWidth === '200px'`。该断言**既存、非本批引入**，且变量名不带 `internal`：它是模块读取**调用方传入的令牌**后写入自己元素 inline 样式的输出契约。严格 §5 下属 borderline（涉及 CSS 取值），本批不动，转交 Batch 6 的主题令牌判据统一裁决（与 `theme-radius` 的 `--wui-radius-*`、`--wui-duration-*` 同一类问题）。

> 注：本批 §3.4 声称的两处改名中，「close 时隐藏 overlay」在首轮冻结时**实际未落地**（工具报成功但文件未变），由独立 reviewer 在第 1 轮审查中指出，已在冻结前修正为「close 后将实例置为未打开」。

### 7.5 转出项（不属于本批，另立 task）

| 项                                                                                                                       | 类型                                    | 证据                                                                            |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------- |
| `overlay-in-dialog.browser.spec.ts`「context-menu 子菜单同帧关闭重开后以最新定位落位」                                   | **负载敏感时序抖动**（deflake，非缺陷） | 见 §6；**Batch 4 修正**：单跑稳定失败 / 全量并行 2⁄3 通过，详见 `batch-4.md` §7 |
| `checkbox-group` / `radio-group` 的**同输入多用例合并**（如「点击子项只派发一次 input」「只派发一次 change」可并为一例） | D4 去重（低风险但需改断言结构）         | 本批未做，避免在契约改写批里混入去重改动；建议独立去重 pass                     |

### 7.5 全仓发现（与测试无关，供参考）

`find packages/web-ui/src -name "*.spec.ts"` 会多出 2 个结果：`shared/overlay/__tests__/__screenshots__/*.spec.ts` 与 `shared/form-association/__tests__/__screenshots__/*.spec.ts` 是**目录**（名字以 `.spec.ts` 结尾，存放失败截图），被 `.gitignore:64` 与 vitest 默认 `**/__screenshots__/**` 排除。真实 spec 数为 **113**，勿用 `find` 直接计数（Batch 3 曾据此误判"115 与 113 不一致"）。

## 8. 独立审查结论

**第 1 轮：`pass`（reviewer `agent-175f8b6c`，无 blocking finding）**。独立核实动作与结论：

| 核实项                            | 结论                                                                                                                                                                                                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §5 禁用模式 grep（12 个改动文件） | 11/12 零命中；`overlay-in-dialog.browser` 的 `classList`/`getComputedStyle` 全部位于 `vi.mock`（`:35`）、`waitFor`/`openDrawerDialog`（`:80,:83,:91,:113`）、`drawerDialogAppend` setup（`:459`）——判为同步/setup/定向，**非断言**，接受（与 §3.2 的自查表一致） |
| §2.2 的 banner 变量是否内部通道   | **独立核实通过**：`--wui-layout-visible-banner-height` 仅出现在 `layout/index.ts:81`、`layout/style.css:8,58-61` 与 `dist/` 构建产物，**`docs/`、`packages/web-ui/README*`、`apps/`、demo、e2e 均无消费面** → 删除非契约丢失                                     |
| 3 个整文件删除                    | `input.jsdom.spec.ts` 的 D4 成立（存活覆盖 `form-association.spec.ts:14` 为**等价强度**）；另两个为纯几何 / 纯计算样式                                                                                                                                           |
| `layout.browser` 20 例抽查        | 拖拽 ≈ start ± 位移、min/max 钳制、零位移 `toHaveLength(0)`（有真实 down/up 交互）、`pointercancel`、capture 丢失、断点跨越 —— 均为真实行为契约，**未发现恒真/弱化**                                                                                             |
| `native-dialog-presence` 3 例     | 源码追踪确认**真的**驱动状态机（`sync → transition → close → handleNativeClose() === true/false`），且比被删的 `is-visible`/`offsetWidth` 断言捕获到更有价值的语义（drawer 动画丢失根因）                                                                        |
| `overlay-in-dialog` 代际契约      | 断言块 `:413-427` **完好**；`gap ≤ 8` → 「inline `left/top` 不变」判为**同等强度**，非弱化                                                                                                                                                                       |
| §7.3 两处有据例外                 | **均裁决接受**：`pointer-focus`（模块产出即全局 capture 注册 + disposer，唯一可观察量，§5 禁止项不覆盖事件接线）；`breakpoint-parity`（跨产物一致性守卫，非 computed style 取值）                                                                                |
| 数字对账                          | 逐文件 `it()` 计数与 §1 表一致；12 个改动文件无 `it.each`；spec 文件 **110 = 113 − 3**；17 个 KEEP 文件确认未入 diff；Δ **−12** 算术闭合                                                                                                                         |

**第 1 轮 non-blocking findings（已处置）**：

1. **§3.4 报告的改名在第 1 轮冻结时实际未落地**（`overlay.spec.ts:46` 标题仍是「close 时隐藏 overlay」，工具报成功但文件未变）——reviewer 指出后已修正为「close 后将实例置为未打开」，并在 §7.4 如实备案。**这是本批唯一一次「报告与代码不符」，由独立审查拦下。**
2. `overlay.spec.ts:152` 读 `--wui-overlay-min-width` 属判定 borderline（既存、非本批引入）→ 已备案并转 Batch 6 令牌判据（§7.4）。
3. reduced-motion 的覆盖缺口依赖 Batch 6 承接（§7.2）——reviewer 明确提示「务必落地，否则成永久缺口」。
4. `overlay-in-dialog` 子菜单用例 → **负载敏感时序抖动**（b4 修正，非"稳定失败"）→ deflake 转出（§7.5 转出项）。

**第 2 轮：`pass`（同一 reviewer，无新增 blocking）**。核实了 delta 仅为 `overlay.spec.ts:46` 一行标题（该行 hunk 只改 `it(` 行，断言体与基线逐行相同）、其余 11 个文件自首轮后无改动、`batch-3.md` 的两处文档记录与事实一致。第 1 轮的两条 non-blocking（reduced-motion 缺口、子菜单失败用例）**未恶化**，仍按原结论分别待 Batch 6 与独立 triage。

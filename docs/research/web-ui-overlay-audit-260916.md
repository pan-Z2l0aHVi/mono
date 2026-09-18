# web-ui 浮层审计（issue #120 遗留项）

审计日期 2026-09-16，分支 `release/260917`，范围 `packages/web-ui`。本文件只做风险清单，**不实施**；修复按 Block → Should fix → Watch 拆独立 task。

2026-09-17 补充：Block 1 与 Block 2 已由真实 Chromium 探针实证复现（探针跑完即删，未入库），下文「推断路径」字样已被实测数据替换。Should fix 与 Watch 三项仍为静态结论，未实证。

已完成的加固阶段（来自 #120 评论）：`overlay-lifecycle-transaction`、`overlay-composition-ownership`、`overlay-positioning-generation`。本次只审计该三项之后的遗留项，结论全部可追溯到具体代码行。

2026-09-18 补充：本文 Block 1（嵌套浮层 Escape 无跨组件归属）已由 `overlay-open-owner-260918` 修复。归属判定收敛到 `shared/overlay/open-overlay.ts`，`overlayComposition` / `escape-dismiss` / `lifecycle` 三个模块被合并进它并删除；组件侧不再各自实现 Escape 判定。原文的 `overlayComposition` 描述与行号属**当时的快照**，不再对应现状，见 ADR-0006 §7。Block 2 仍待处理。

## Block

### 1. 嵌套浮层的 Escape 没有跨组件归属，一次 Escape 会连带关闭外层

`overlayComposition` 只服务 outside-click（`popover/index.ts:298`）与 focusout（`popover/index.ts:310`），**没有任何 Escape 判定读它**。各组件各自实现：

- `shared/menu-behavior/index.ts:155-160`：Escape → `delegate.closeDeepestOrAll()` + `preventDefault()`，**没有 `stopPropagation()`**；同一文件 `:200-201` 的其它分支却有 stopPropagation。菜单内部的「最深层优先」只覆盖自身子菜单（dropdown `:143`、context-menu `:106`），跨组件无效。
- `popover/index.ts:319-327`：document 级 Escape，无条件关闭。
- `select/index.ts:289-298`、`autocomplete/index.ts:385-394`：preventDefault，不 stopPropagation。
- `drawer/index.ts:536-556`：归属守卫只查 composedPath 上的 `HTMLDialogElement`，portal 面板不是 dialog，守卫不命中。

**实测（2026-09-17，真实 Chromium，探针已删）**：drawer 内放 `web-ui-select`，打开后从 portal 面板派发一次 Escape：

| `select.portal` | 面板祖先链                                   | 一次 Escape 后                               |
| --------------- | -------------------------------------------- | -------------------------------------------- |
| `true`          | `div < div < dialog[dialog] < web-ui-drawer` | `select.open = true`，`drawer.open = false`  |
| `false`         | `div < div < web-ui-select < web-ui-drawer`  | `select.open = false`，`drawer.open = false` |

两点与原先的推断不同，且都更糟：

1. `portal=true` 时面板**确实挂进了 drawer 的 `<dialog>`**（印证 `portal.ts:349` 的 `findEnclosingOpenDialog`，即 §3 的机制），这不是理论假设。
2. 该配置下结果是**反的**：最内层的 select 没关，外层的 drawer 反而被关。原因是 select 的 keydown 监听在宿主上，而面板 portal 出去后事件路径不再经过宿主 → select 收不到 Escape；drawer 的监听挂在 dialog 上，路径经过 → drawer 关闭。于是按一次 Esc 想关下拉框，结果是整个抽屉被关、下拉框面板随 dialog 的 `display:none` 隐形但仍 `open`（即 §3 的悬挂态）。

`portal=false` 时两者同时关闭（原推断的场景）。两种配置下 drawer 都会被误关。

- 建议修法：Escape 收敛到单一共享模块，用 `overlayComposition` 选出最内层 open panel，只关它并 stopPropagation。修复时必须同时覆盖「面板 portal 出宿主后事件不再经过宿主」这一条，否则只加 stopPropagation 会让 portal 场景变成谁都不关。
- 回归测试：drawer 内打开 portal select，一次 Escape 后断言只有 select 关闭、drawer 未派发 `open-change`；`portal=false` 同样断言一遍。

### 2. dialog / drawer 打开态被 remove 再 append 后不对账

- `dialog/index.ts:53-58` 只有 `disconnectedCallback`（`_presence.dispose()` + `_scrollLock.release()`），**整个文件没有 `connectedCallback`**；`updated()`（`:44-51`）开头是 `if (!this.isConnected) return`。
- `drawer/index.ts:442-446` 的 `connectedCallback` 只重算 header/footer slot 标志，不恢复 presence / scrollLock / nestedLayers。
- Lit 重连只 `setConnected(true)`，不 requestUpdate；`open` 未变化时 `updated()` 也不进入 → `_presence.sync()` 与 `_syncScrollLock()` 永不补跑。

后果：框架条件渲染把打开中的 dialog/drawer 摘下再挂回，`open` 仍为 `true`，但滚动锁已释放（`scroll-lock.ts:65-67`）、presence 面板状态停留在 dispose 之后。

**实测（2026-09-17，真实 Chromium，探针已删）**：drawer 打开后摘下再挂回，观察 `documentElement.style.overflow`（滚动锁的公开面，`scroll-lock.ts:20` 写 `hidden`）：

| 阶段             | `html.style.overflow` | `drawer.open` | `dialog.open` |
| ---------------- | --------------------- | ------------- | ------------- |
| 打开后           | `"hidden"`            | `true`        | `true`        |
| `remove()` 后    | `""`                  | —             | —             |
| 再 `append()` 后 | `""`                  | `true`        | `true`        |

即：`open` 与原生 dialog 都还在，但滚动锁已经丢干净——页面在「抽屉仍打开」的状态下可以滚动。与推断一致。

- 建议修法：两个组件的 `connectedCallback` 按当前 `open` 做一次 reconcile（presence sync + 滚动锁 + 嵌套层）。
- 回归测试：打开态 remove + append 后断言 `open === true`、`documentElement.style.overflow === 'hidden'`、面板可见。

## Should fix

### 3. 挂在原生 `<dialog>` 上的 portal 没有回收路径

- `portal.ts:197` + `:349-365`：portal host 在 make 时一次性挂到 `findEnclosingOpenDialog()` 的结果上，**此后不再重算**；`menu-portal.ts:36-46` 同构，且 `:40-44` 专门给 `container instanceof HTMLDialogElement` 注入样式，说明这是既定设计。
- 全仓唯一的原生 dialog `close` 监听在 `nested-drawer-layers.ts:91`，其 `handleAnyDialogClose`（`:83-87`）只重算嵌套缩放，与浮层无关；`native-dialog-presence.ts` 的消费方只有 dialog / drawer / image-preview 三者自身。

后果：`dialog.close()` 后 UA 给 `dialog:not([open])` 加 `display:none`，挂在它上面的 dropdown / tooltip 面板随之隐形，但组件 `open` 仍为 `true`、内容仍被 `trackedNodes` 扣住，只能等宿主 disconnect 才由 `anchored-panel.ts:38-45` 回收；且重开会沿用旧 portal。内容不会永久丢失（`portal.ts:275` 的 `restoreContent()` 总是回插 `ctx.target`），属悬挂态而非泄漏。

- 建议修法：为挂载目标是原生 dialog 的 portal 增加 close 时的强制 `restoreContent()` + 关闭收敛。
- 回归测试：drawer 内打开 portal dropdown，关闭 drawer 后断言 `dropdown.open === false` 且内容已回到宿主 light DOM。

### 4. dropdown 重挂载后 open 与焦点不收敛

- `dropdown/index.ts:165` `connectedCallback()` 只 `_lifecycle.resume()`；`:173` `firstUpdated()` 只绑 slotchange，且只执行一次；`:197` 开启动作的唯一入口是 `changed.has('open')`，重挂载时 `open` 未变化即不触发。
- `:181-191` disconnect 走 `_cleanupClosedMenu()` 销毁面板但不重置 `open`；对比 `context-menu/index.ts:161-163` 显式 `this._isOpen = false` 并注明原因（select `:173`、autocomplete `:222` 同）。
- 焦点：`:272` 的 `if (this.open || !this.isConnected) return` 使回焦路径在该场景不可达；现有 `dropdown.browser.spec.ts:104` 已把「卸载后 `activeElement === body`」写成期望值，等于把缺口固化成契约。

- 建议修法：`connectedCallback` 里做 open 收敛（已连接且 `open` 为真则重建面板并把焦点落回首个可用项），并同步订正上面那条用例。
- 回归测试：browser 用例「`open=true` 卸载 → 重挂载，断言面板重建且 `activeElement` 为首个可用菜单项」。

## Watch

### 5. tooltip 的 slot 内容切换存在同步缺口（非孤儿泄漏）

- 已闭环的部分：`tooltip/index.ts:209-211` 注册了 `migrateAddedNodes`，打开期新增的 `slot="content"` 会实时迁入；marker 与游离注释的清理由 `portal.ts:118`、`:162-195`、`:277`、`:286` 覆盖。
- 缺口：`portal.ts:226` 的 hostObserver 只订阅 `{ childList: true }`，**无 `subtree`、无 `characterData`**（对比 `dropdown/index.ts:170` 有 `subtree: true`）；tooltip 全量无 `slotchange` 处理（对比 `dropdown/index.ts:178`、`popover/index.ts:107`）；`tooltip/index.ts:150` 只在 `changed.has('content')` 时同步。

后果：框架把内容插进宿主内的 wrapper、或只替换文本节点时观察不到 → 面板内容不更新（视觉陈旧），不是节点泄漏。

- 建议修法：为 tooltip 补具名 slot 的 slotchange，或把 hostObserver 扩到 `subtree + characterData`，并让 slot 内容变化复用同一同步入口。
- 回归测试：打开中替换宿主 wrapper 内的 `slot="content"` 子节点，断言面板内容更新且宿主无残留节点。

### 6. 真实浏览器定位 / update 覆盖缺口

有真实引擎定位断言的只有：`shared/overlay/__tests__/overlay-in-dialog.browser.spec.ts`（`:279-289`、`:318-319`、`:425-436`）与 `autocomplete.browser.spec.ts:798`。`popover`、`tooltip`、`select`、`context-menu` 的 browser 用例定位断言为 0；`dropdown` 的 `conditional.browser.spec.ts:48,117` 只是 `pollUntil(style.left)` 的前置等待，不是断言。

影响：`positioning-generation` 的代数守卫目前只在共享层与 autocomplete 上有真实引擎证据，其余组件只有 jsdom。

- 建议修法：按组件补齐真实浏览器的定位与 update 用例（滚动、容器尺寸变化、锚点移动触发的重定位）。

---

# 附：#123 手势回弹 CSS 化的现状核对

结论：**#123 的剩余范围实际只剩 drawer 一处**，issue 里记的 image-preview 已不再适用。

- drawer 仍是 WAAPI 弹簧：`drawer/index.ts:9` 导入 `springOffsets` / `SPRING_PRESETS`；`:320`、`:395` 采样轨迹；`:329`、`:406` 用 `dialog.animate(keyframes, { duration, easing: 'linear', fill: 'both' })`；`:335`、`:409` 由 `onfinish` 收尾；`:363-365` 的 reflow 烘焙补丁（绕过 Safari transition before-change style 怪癖）仍在。
- image-preview 的 swipe settle 已经是 CSS transition 驱动：`image-preview/index.ts:559-586` 只设置 `_swipeOffset` 目标值，`:588-591` 由 `transitionend` 收尾，`:585` 保留无过渡环境的兜底 timer。全组件无 `element.animate()`。

迁移方向（待真机 A/B 由用户拍板后实施，不在本次）：释放速度只用于动态设定 transition 时长与缓动（Base UI `useSwipeDismiss` 形态），删除 `springOffsets` 采样与 `onfinish` 烘焙；取舍是丢掉 overshoot 手感，换取对 Safari 采样怪癖的机制免疫。

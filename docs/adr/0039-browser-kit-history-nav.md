# ADR-0039: browser-kit 自研 history-nav（Navigation API 只读子集）

## 背景

Interweave shell 的 header 需要「后退 / 前进」按钮禁用态（`canGoBack` / `canGoForward`）。vue-router 只在 `router.push()` 时维护 `history.state.back/forward`；本应用没有 `router.push`，页面间导航全部来自地址栏输入与浏览器前进/后退，浏览器会克隆旧 state，导致 `back/forward` 恒为 `null`，无法据此判断可用性。

候选方案：

1. **原生 Navigation API**：`window.navigation.canGoBack/canGoForward/currentEntry.index` 直接读浏览器历史栈，语义最准。但 Navigation API 到 2026 年初才成为 Baseline（Chrome 102+、Firefox 147+、Safari 26.2+），而 Interweave 跑在 Wails 桌面 webview 中，webview 版本不受控；兼容性要求无法满足。
2. **第三方 ponyfill**：调研 `navigation-ponyfill`（13 stars、约 770 周下载、0 依赖，但全局 patch 且往 `history.state` 注入 `__NAVIGATION_PONYFILL` 元数据、要求 state 必须是 object）与 `@virtualstate/navigation`（118 stars、约 890 周下载，但仍是 alpha、约 10 个月未发版、unpacked 2.3MB）。两者都接近单维护者、低使用量，且核心思路（URL/entry 栈 + sessionStorage 持久化）与仓库内已实现的 `useHistoryNav` 一致。
3. **自研进 `browser-kit`**：需求极小（两个布尔值），已有一版经过真实浏览器全矩阵验证的栈实现；放进 `browser-kit` 可复用于其他应用，且完全绕开第三方库的全局副作用与维护风险。

## 决策

### 1. 通用模块，只承诺只读子集

在 `@greypan/browser-kit` 新增 `history-nav` 子模块，公开 API 对齐 Navigation API 的**只读子集**：`canGoBack`、`canGoForward`、`currentEntry`、`entries()`、`currententrychange` 事件。**不承诺** `navigate()` / `intercept()` / transition——那是 router 级 API，自有实现无法忠实还原原生语义，vue-router 已承担 router 职责。

### 2. 观察机制：全局 patch，但旁路记录、不注入 state

全局 patch `history.pushState` 与 `history.replaceState`，只在旁路数据结构中记录 URL/entry，**不往 `history.state` 写入任何元数据**（区别于 `navigation-ponyfill` 的注入做法）。`popstate` 处理浏览器前进/后退与地址栏导航，沿用「栈内查找」启发式：目标 URL 在栈中靠前→后退、靠后→前进、都不在→截断前进分支并追加。

### 3. 永远自有栈，不做 native-first

第一版永远使用自有 entry 栈，行为跨浏览器完全确定，单一实现路径便于测试；不优先使用原生 `window.navigation`。native-first 留作后续增强。

### 4. `defineHistoryNav(options?)` 幂等单例 + `dispose`

导出 `defineHistoryNav(options?)`，对齐 `defineStorage`/`defineLocal`/`defineTracker` 的 `define*` 惯例；子路径导出 `@greypan/browser-kit/history-nav`。模块级**幂等单例**：首次调用安装 patch，后续调用返回同一实例；`dispose()` 还原 patch 并清理监听（主要用于测试恢复）。选项含 `namespace`，持久化键名以其为前缀，避免多应用共存互踩。

### 5. entry id/key 栈，形状对齐 NavigationHistoryEntry

条目采用稳定 `id` + 跨 replace 保持的 `key`（消掉「URL 字符串栈无法区分连续两次 push 相同 URL」的已知局限）。`currentEntry`/`entries()` 返回 `{ id, key, index, url, sameDocument, getState() }`：`getState()` 返回 push/replace 时捕获的 `history.state` 克隆；`sameDocument` 恒为 `true`，对本模块是**正确语义**（只跟踪本文档内导航），而非妥协。

### 6. 事件只承诺 `currententrychange`

公共事件仅 `currententrychange`（载荷含 `from` 与 `navigationType`）。`dispose` 等条目生命周期仅内部使用，不作为公共事件承诺。

### 7. 持久化复用 `defineSession`

刷新存活依赖 sessionStorage，直接复用同包 `storage` 模块的 `defineSession(namespace)`：自带 SecurityError 安全降级（读 null、写 false）、namespace 前缀与单例缓存。内存栈是事实来源，sessionStorage 只是镜像；存储被禁时静默降级为内存态（功能不崩，仅刷新不保留）。`sessionStorage` 按 tab 隔离与浏览器历史按 tab 隔离天然一致。

## 后果

- **Interweave 接入**：`apps/interweave/frontend/src/composables/useHistoryNav.ts` 改为 `defineHistoryNav` 的薄包装（ref 绑定 + 订阅 `currententrychange`），页面零改动。
- **测试**：真实 Chromium browser-mode 全矩阵——新 tab 直达双禁用、地址栏导航、前进/后退、刷新持久化、push/replace 区分、同 URL 连续 push。
- **维护**：自有实现需自行维护与测试，换取零第三方小库依赖、无全局 state 注入、API 面完全可控。
- **术语**：「导航条目」「同文档导航」已入 `CONTEXT.md` 历史导航词汇。

# 主题切换过渡复核（issue #105）：View Transitions 在当前 Chrome 的真实表现

复核日期 2026-09-17，工作区 `release/260917`，被测分支 `origin/feat/theme-transition`（tip `92d0ad47`），被测浏览器 Google Chrome 153.0.8010.48（macOS，headed 与 headless=new 各跑一轮）。本文件只做事实核验，**不实施任何代码修改**。

## 结论

issue #105 记录的三条挂起理由，在当前 Chrome 上**都不成立**：

| issue 的断言                             | 实测结论                                                                                                                           |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 「在最新 Chrome 上不稳定」               | 不成立。真实 app 内连续 6 次主题切换 6/6 成功，headed 窗口再 3/3 成功，`ready` 9–33ms，无 `ready:reject`、无 console/pageerror。   |
| 「transform-origin 表现异常」            | 不成立。分支写法下 `::view-transition-group(root)` 的 `transform` 恒为 `matrix(1, 0, 0, 1, 0, 0)`，`transform-origin` 根本不参与。 |
| 「受 View Transitions API 实现质量制约」 | 无对应现象。同一手法在 antd 官网线上正常运行，规范与 Chrome 实现均无对应缺陷。                                                     |

真正可复现的缺陷有两条，都在分支自带的参数与交互选择里，与 Chrome 无关：

1. **动画时长 `4.6s linear`**。规范范例与 antd 线上取值都是 `500ms` + `ease-in`，分支写的 4.6s 是它的 9.2 倍。4.6s 的圆形揭示在观感上接近「页面卡住」，不是主题过渡。
2. **transition 期间整页输入被吞**。规范明确要求 rendering suppression 期间「all pointer hit testing must target its document element, ignoring all other elements」（[css-view-transitions-1 §7.1.1](https://www.w3.org/TR/css-view-transitions-1/)），实测在 transition 未结束前点 `web-ui-select` 面板不展开（`optionW=0`、`aria-expanded=false`），`document.elementFromPoint(400,400)` 只返回 `HTML`。把时长写成 4.6s，等于每次切主题后 UI 死掉 4.6 秒——「点没反应 → 再点一次 → 页面还冻着」正好会被记成「不稳定」。

另有两条与 issue 记载不符的事实需要更正：分支相对 `main` 的 3 个 commit 里只有 `92d0ad47` 是主题过渡，另两个是 stylelint/deps 清理；`apps/vue-web-ui-demo/src/assets/theme-transition.css` 与 `apps/react-web-ui-demo/src/assets/theme-transition.css` 两个文件在分支上**没有任何 import**（`git grep theme-transition.css 92d0ad47 -- apps` 无输出），真正生效的只有 `index.vue` 里的非 scoped `<style>` 块。

## 分支实现的静态事实

`apps/vue-web-ui-demo/src/app/index.vue`（`92d0ad47`）：

- 半径取 `Math.ceil(Math.hypot(window.innerWidth, window.innerHeight))`，与点击位置无关；规范示例取 `Math.hypot(Math.max(x, w-x), Math.max(y, h-y))`（到最远角）。结果只是半径偏大，不影响正确性。
- 时长 `animation: theme-transition-reveal 4.6s linear both`，`to-light` 方向用 `reverse`。
- 显式关闭 `::view-transition-group(root)` 与两个快照伪元素的 UA 动画，只保留自己的 `clip-path` 关键帧，并用 `z-index: 2/1` 决定新旧层级。
- 起点来自 `pointermove`/`pointerdown`/`click` 三处监听写入的 `themeTransitionOrigin`，缺省回落到视口中心。
- 降级判断只有 `reducedMotion || !document.startViewTransition`，没有 `transition.ready` 失败分支——实测未触发，不构成缺陷。

## 实测一：真实 app（分支代码，Chrome 153）

在独立 worktree 跑起 `feat/theme-transition` 的 `vue-web-ui-demo`，用真实鼠标事件点 `web-ui-select`（`aria-label=全局主题`）的选项，Playwright 驱动真实 Chrome：

| 轮次         | 方向     | VT 启动 | `updateCallbackDone` | `ready` | `finished`       | group `transform` | `clip-path` 圆心 |
| ------------ | -------- | ------- | -------------------- | ------- | ---------------- | ----------------- | ---------------- |
| A1           | 浅→深    | 是      | 7ms                  | 9ms     | 2869ms\*         | identity          | `1324px 109px`   |
| A2           | 深→浅    | 是      | 17ms                 | 33ms    | 2932ms\*         | identity          | `1324px 77px`    |
| B1（不冻结） | 浅→深    | 是      | 6ms                  | 9ms     | **4634ms**       | —                 | —                |
| B2           | 深→浅    | 是      | 19ms                 | 20ms    | 2849ms\*         | identity          | `1324px 77px`    |
| C1           | 浅→深    | 是      | 12ms                 | 14ms    | 2826ms\*         | identity          | `1324px 109px`   |
| C2           | 深→浅    | 是      | 14ms                 | 16ms    | 2827ms\*         | identity          | `1324px 77px`    |
| headed 0/1/2 | 深/浅/深 | 是      | —                    | 10–12ms | 4617/4621/4623ms | —                 | —                |

\* 冻结探针把动画暂停在 50% 采样，故 `finished` 约为全长一半；B1 与 headed 三轮未冻结，实测全长 4.62–4.63s，与 `4.6s` 声明一致。

其它采样：`::view-transition-group(root)` 尺寸恒为视口 `1440x900`，`transform-origin` 恒为 `720px 450px`（Chrome UA 给 group 的默认中心值，规范 UA stylesheet 里并未声明 `transform-origin`）；`to-dark` 时动画挂在 `::view-transition-new(root)`、`to-light` 时挂在 `::view-transition-old(root)`，与代码意图一致；切换结束后 `html` 上无残留 class、无残留 `view-transition` 动画；页面背景 `rgb(255,255,255) ↔ rgb(24,24,26)` 正确落到终态。截图显示圆形揭示的圆心就是鼠标点，无位移、无缩放、无闪烁。

## 实测二：两种手法的对照（隔离页面）

同一份最小页面（`file://`，仅主题变量切换）跑两种实现，用来定位「transform-origin 异常」这句话的来源：

- **clip-path 手法**（分支采用的、也是规范示例采用的）：group `animation: none`，`transform` 全程 identity，`transform-origin` 无作用对象，圆心 = 指针位置。即使让深色主题少渲染一行内容制造 old/new 文档高度差、或把页面滚动 600px，group 依旧是 identity——`root` 快照取的是 snapshot containing block（视口尺寸），old/new 同尺寸，规范里的映射变换退化为恒等。
- **group scale 手法**（`::view-transition-group(root){transform-origin:X Y; animation:scale}`）：`transform-origin` 会被正确写成指针坐标并按 `scale(0)→scale(1)` 播放，但因为 group 同时包裹 old 与 new 两张快照，缩放会把**整页两张快照一起放大**，观感是「整页从点击点 zoom 出来」；再叠加 Chrome UA 自己的 `-ua-view-transition-group-anim-root`（`animation-duration: 0.25s`，同样写 group 的 `transform`），作者想只改 `transform-origin` 而不接管 group 动画时就会看到「原点不生效 / 原点把画面推歪」。这是规范的既有行为，不是 Chrome 缺陷——也是「transform-origin 表现异常」最合理的出处。

## 实测三：antd 官网线上实现

`https://ant.design/index-cn`（站点 6.6.4）在同一 Chrome 内的实测，头部主题按钮 → 下拉「暗黑主题 / 浅色主题」：

```css
/* 页面运行时读到的规则 */
::view-transition-old(root),
::view-transition-new(root) {
  animation: 0.5s linear 0s 1 normal forwards running keepAlive;
  mix-blend-mode: normal;
}
.dark::view-transition-old(root) {
  z-index: 1;
}
.dark::view-transition-new(root) {
  z-index: 999;
}
::view-transition-old(root) {
  z-index: 999;
}
::view-transition-new(root) {
  z-index: 1;
}
```

`keepAlive` 只负责把 `z-index` 从 999 收尾到 -1；真正的揭示由 WAAPI 挂在伪元素上：`clip-path: circle(0px at 1325px 143px) → circle(1526px at 1325px 143px)`，`duration: 500ms`，`easing: ease-in`，目标伪元素 `::view-transition-new(root)`（深→浅时换成 `::view-transition-old(root)`，方向反过来）。group 保留 UA 动画 `-ua-view-transition-group-anim-root`（250ms）但 `transform` 仍是 identity。生命周期 `updateCallbackDone` 124ms、`ready` 166ms、`finished` 790ms，两个方向都干净收尾（`html` class 变成 `dark` / `light`）。在第一段 transition 未结束时再触发一次 `startViewTransition`，前一条按规范被跳过（`finished` 315ms），后一条正常播完，无 reject。

仓库里那两个未被引用的 `theme-transition.css`（`@keyframes keep-alive` + `.dark` 层级交换 + 注释「对齐 ant.design 实现」）就是 antd 这套 CSS 的直译；线上真正的差异在 JS 侧的 500ms/ease-in 与「动画挂在哪个伪元素」，而分支最终改用 CSS `@keyframes` + 4.6s linear。

## 规范与状态事实（一手来源）

- View Transitions Level 1 规范 UA stylesheet：`:root::view-transition-group(*) { position: absolute; top: 0; left: 0; animation-duration: 0.25s; animation-fill-mode: both }`，`:root::view-transition-old(*), :root::view-transition-new(*) { position: absolute; inset-block-start: 0; inline-size: 100%; block-size: auto }`。规范通篇没有为 group 声明 `transform-origin`。来源：<https://www.w3.org/TR/css-view-transitions-1/>
- 输入抑制条款原文：「While a Document's rendering suppression for view transitions is true, all pointer hit testing must target its document element, ignoring all other elements.」同上 §7.1.1。
- 规范给出的圆形揭示范例：`endRadius = Math.hypot(Math.max(x, innerWidth-x), Math.max(y, innerHeight-y))`，`duration: 500`，`easing: 'ease-in'`，`pseudoElement: '::view-transition-new(root)'`。同上（示例代码块）。
- 浏览器支持：`api.ViewTransition` Chrome `version_added: 111`、Safari `18`。来源：<https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/ViewTransition.json>
- 当前 Chrome 稳定版节奏：cycle 153 于 2026-09-08 发布，cycle 152 于 2026-08-25 发布。来源：<https://endoflife.date/api/chrome.json>。本机实测 `Chrome 153.0.8010.48` 与 `Google Chrome for Testing 153.0.8010.12`。

## 未能验证的部分

- 挂起决定记录于 2026-09-08，当时稳定版是 Chrome 150/151；本机只有 Chrome 153 一个二进制，**无法回跑当时的浏览器**，所以「当时是否真的不稳定」无法证伪，只能确认「现在不复现」。
- 没有逐条核对 Chromium issue tracker。结论建立在「当前 Chrome 上行为与规范逐条吻合」之上，而不是「已确认没有相关 open bug」。若要正式推翻挂起理由，建议在恢复轮里补一次 tracker 检索留证。
- 探针脚本（Playwright + 最小复现页）跑在 `/tmp/vt105/`，未入库，跑完即弃；worktree 见文末。

## 如果决定恢复该功能（判据，不实施）

1. 时长与缓动对齐既有事实：`500ms` + `ease-in`，半径取到最远角；`to-light` 保持挂 `::view-transition-old(root)`。
2. 半径/圆心只在 `startViewTransition` 前一次性写死，`to-*` class 与自定义属性在 `transition.finished` 后清理——分支现有逻辑已满足，保留。
3. 明确接受「transition 期间整页不可点」这条规范约束：时长压到 500ms 后它不再是可感问题，但不要在 transition 中排队等待第二次切换；如需连点，走 `skipTransition()`。
4. 删除两个未引用的 `theme-transition.css`，或改为真正单一来源并让 `index.vue` 引用它——现状是「看起来有实现文件、实际生效在 `<style>` 块」。
5. 浏览器验证按 [`docs/agents/browser-verification.md`](../agents/browser-verification.md) 补齐 react/vue 两个 demo 的双向切换与 reduced-motion 分支。

## 复现方法

```sh
git worktree add ../mono-worktrees/verify-theme-transition-105 -b verify/theme-transition-105 origin/feat/theme-transition
cd ../mono-worktrees/verify-theme-transition-105 && pnpm install --frozen-lockfile
pnpm turbo build --filter '@greypan/vue-web-ui-demo^...'
pnpm --filter @greypan/vue-web-ui-demo dev   # https://localhost:5174/
```

探针核心两步：包装 `document.startViewTransition` 记录 `updateCallbackDone`/`ready`/`finished` 与 `ready:reject`；`await transition.ready` 后 `document.getAnimations().forEach(a => a.pause())`，按 `currentTime = duration * f` 定位到任意进度，再读 `getComputedStyle(document.documentElement, '::view-transition-group(root)')` 与 `::view-transition-{old,new}(root)` 的 `transform`/`transform-origin`/`clip-path` 并截图。伪元素动画在 `document.getAnimations()` 里以 `effect.pseudoElement` 标识，不需要 CDP 扩展。

验证用的临时 worktree `mono-worktrees/verify-theme-transition-105` 与分支 `verify/theme-transition-105` 已在复核结束后删除，其中不含独有改动。

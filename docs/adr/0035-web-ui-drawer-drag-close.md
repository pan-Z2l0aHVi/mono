# ADR-0035: Drawer 边缘拖拽关闭

## 背景

`web-ui-drawer` 基于原生 `<dialog>` + `showModal()` 实现（ADR-0003/0005）。原生 dialog 在关闭态（`open` 为 false）**不渲染任何可见 DOM**——`:host` 为 `display: contents`，dialog 本身脱离文档流。这与移动端 App 或 React 第三方 drawer 库不同：后者在关闭态也常保留一个常驻的屏幕边缘热区供拖拽打开。

本组件需要支持“边缘拖拽关闭”（参考 ui-layouts directional-drawer）：打开态在抽屉内缘显示可拖拽的 drag bar，拖拽实时跟手、松手按位移与甩动速度判定关闭或弹回。

## 决策

### 1. 仅支持拖拽关闭，不做拖拽打开

关闭态的原生 dialog 无任何可见渲染物，因此无法挂载可被指针命中的抓取元素。若要实现“从关闭态拖拽打开”，组件必须在 `<dialog>` 之外常驻渲染一个独立的屏幕边缘热区——这等于引入一套永久可见（或 hover 浮现）的浮层，与“关闭态零渲染”的架构承诺相悖，也会增加触屏场景下的可发现性与误触问题。

**结论**：`draggable` 仅控制打开态的拖拽关闭；拖拽打开不在范围内。打开仍走 `show()` / 命令式 / 声明式属性，或移动端的 headless drawer toggle。

### 2. Drag bar 仅存在于打开态，位置随 placement 适配

打开且 `draggable` 时，在 dialog 内缘渲染 drag bar（灰色胶囊 `~4×48px` + 约 `24px` 加宽命中条，便于触屏命中）。位置随 placement 切换：

> 注：非 headless 抽屉的视觉容器已改为浮动圆角卡片（ADR-0036），drag bar 仍贴 dialog 内缘定位，机制不变。

- `right` → 左缘（抽屉向右闭合）；
- `left` → 右缘（向左闭合）；
- `top` → 下缘（向上闭合）；
- `bottom` → 上缘（向下闭合）。

胶囊本身使用中性 token `color-mix(... var(--wui-color-text) ...)`（带 light 同值兜底），不新增 `--wui-*` token（ADR-0010）；达到关闭阈值时变 accent 色作为视觉确认。

### 3. 实时跟手 + 松手判定

拖拽中 dialog 的 `transform` 与遮罩 `::backdrop` 透明度按指针位移 1:1 跟手（遮罩透明度由 JS 写入 `--wui-internal-drag-backdrop-opacity`），开启方向施加橡皮筋阻尼（最多回弹 10% 抽屉尺寸）。松手判定：

- 闭合方向位移 > 抽屉尺寸 × 1/3；或
- 闭合方向甩动速度 > 500px/s（flick）；

满足则关闭，否则弹回。判定阈值与速度均不进 token 矩阵。

### 4. 弹簧物理用 WAAPI，不进 token 矩阵

松手 snap 用 Web Animations API（`element.animate`）按释放速度做半隐式欧拉积分生成关键帧：关闭方向近临界阻尼（避免越过闭合位回弹），弹回方向欠阻尼（保留轻微弹性）。**不新增 `--wui-*` 动效 token**——弹簧是手势尾随的物理插值，与服务端可主题化的语义时长（如 `--wui-duration-drawer-exit`）不同，纳入 token 矩阵反而会污染消费者可控的语义。

`prefers-reduced-motion` 下松手即时到位（无弹簧），并保持现有 reduced-motion 退出行为（transform 置 none、仅 opacity 过渡）。

### 5. 与受控契约一致

拖拽属于用户手势。`request-only` 模式下，松手达阈值只派发 `open-change(false)` 请求（与 Escape/遮罩同语义），不修改 `open`；Consumer 拒绝回写时，组件在闭合位短暂保持后弹簧弹回打开位。非 request-only 下走原生关闭管线（`is-closing` → `dialog.close()`），复用现有 `defineNativeDialogPresence` 生命周期，不重复实现关闭时序。

## 后果

- `draggable` 是 `web-ui-drawer` 的新增布尔属性（默认 false），关闭态无渲染代价。
- 测试需在 browser mode 下用真实 `PointerEvent` 验证跟手、阈值关闭、短拖弹回、request-only 拒绝弹回与 reduced-motion 即时到位——jsdom 无法证明原生 dialog / `setPointerCapture` / WAAPI 行为。
- 移动端 layout 内部的 headless drawer 直接启用 `draggable`，手势关闭无需新 prop。
- 关闭态“无渲染”的约束被显式记录，避免后续有人尝试在关闭态挂载拖拽热区。

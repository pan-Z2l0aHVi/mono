# ADR-0036: Drawer 浮动卡片视觉语言

## 背景

`web-ui-drawer` 原本贴边渲染：右侧抽屉为全高、右缘贴视口的竖直面板。引入拖拽关闭（ADR-0035）后暴露一个视觉问题——打开方向的橡皮筋弹性使 dialog 平移，锚定反侧在静止时与视口完全贴合（0px），位移会突然拉开一条矩形露底缝隙；由于卡片是半透明玻璃而遮罩很淡，这条缝读作渲染 bug 而非物理运动。

候选方案：

1. **填缝层**：拖拽期间从卡片边缘向锚定反侧延伸一层同色元素盖住缝隙。能根治但多出一份 DOM、内部变量和测试，且只为服务「贴边 + 弹性」这一组合。
2. **遮罩做实 / 降弹性**：视觉掩盖，不消除根因。
3. **浮动圆角卡片**：抽屉四周留边（8px）并加圆角，与 `web-ui-layout` sidebar 的既有卡片语言一致。静止态本就有可见边距，弹性只是让边距变化——「缝」从一个类别上不存在。

考察外部实现：ui-layouts 的 directional-drawer 在真桌面宽度（≥768px）实际禁用拖拽（`dismissible=false`），其预览里的可拖拽表现来自窄 iframe 的移动端模式；vaul 官方方向 demo 同样贴边且依赖实色卡片 + 深遮罩弱化接缝。两者都没有在「半透明贴边卡片 + 桌面弹性拖拽」组合下的现成解法。

## 决策

- 所有 **non-headless** drawer 改为浮动卡片：dialog 四周留边 8px，`.wui-drawer-body` 铺满并带圆角。四个 placement 一致处理。
- 几何放在 dialog 自身的 insets 上，不再包一层 wrapper：transform 动画、遮罩跟手淡出、drag bar 定位均不变。
- 新增公开 token `--wui-drawer-radius`（fallback `28px`，与 layout sidebar 圆角一致）。留边经公开 token `--wui-drawer-inset` 暴露（fallback `8px`；后续修订：初始版本为写死的内部值，Consumer 无法贴边，置 0 即 headless 同款贴边几何，通常与 radius 0 搭配）。
- 闭合位移必须越过留边才能完全滑出视口：CSS 闭合态 transform 以内部变量 `--wui-internal-drawer-inset` 补偿（如 `translateX(calc(100% + var(--wui-internal-drawer-inset)))`）；JS 在 controlled 悬停终态读取同一变量。headless 在 `:host([headless]) dialog` 上把该变量显式归零（防止嵌套在非 headless drawer 内时沿 flattened tree 继承到 8px），保持贴边几何由 Consumer 自绘。
- 开放态需要显式的更高特异性守卫恢复 `translate(0,0)`，否则闭合补偿会在级联中反超基础打开态规则。

## 后果

- 这是全局视觉契约变更：所有未设 `headless` 的 drawer 外观改变（含非 draggable 使用方），Consumer 若精确依赖旧的贴边几何需感知。
- 拖拽弹性不再产生任何露底缝隙，无需维持填缝层类的补偿机制。
- headless 模式零改动（layout 移动端侧边栏继续自绘浮动卡片，样式恰好与本决策同语言）。
- 未来修改 drawer 视觉容器（留边、圆角、贴边语义）应更新或取代本 ADR；ADR-0035 继续约束拖拽手势本身。

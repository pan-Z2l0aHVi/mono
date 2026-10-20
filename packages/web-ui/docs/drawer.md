---
component: drawer
tag: web-ui-drawer
---

侧边 drawer，基于原生 `<dialog>`，自带滑入 / 滑出动画，并可从四周内缘拖拽关闭。

## 示例

### 基础

`placement` 决定滑入方向，`heading` 是无 header 插槽时的标题回落。

```react
const [open, setOpen] = useState(false)

return (
  <>
    <web-ui-button onClick={() => setOpen(true)}>打开 drawer</web-ui-button>
    <web-ui-drawer open={open} placement="right" heading="设置" onopen-change={event => setOpen(event.detail.open)}>
      <p>drawer 正文</p>
    </web-ui-drawer>
  </>
)
```

```vue
<template>
  <web-ui-button @click="open = true">打开 drawer</web-ui-button>
  <web-ui-drawer :open="open" placement="right" heading="设置" @open-change="open = $event.detail.open">
    <p>drawer 正文</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### 拖拽关闭

开启 `draggable` 后，drawer 内缘出现 drag bar，向关闭方向拖过半或快速甩动即关闭。

```react
<web-ui-drawer open={open} placement="bottom" draggable heading="快捷操作">
  <p>向下拖拽关闭</p>
</web-ui-drawer>
```

```vue
<template>
  <web-ui-drawer :open="open" placement="bottom" draggable heading="快捷操作">
    <p>向下拖拽关闭</p>
  </web-ui-drawer>
</template>
```

### footer 操作

`header` / `footer` 插槽与正文分离，正文滚动时两者保持可见。

```react
<web-ui-drawer open={open} heading="编辑资料">
  <web-ui-button slot="footer" variant="primary">
    保存
  </web-ui-button>
  <p>正文内容</p>
</web-ui-drawer>
```

```vue
<template>
  <web-ui-drawer :open="open" heading="编辑资料">
    <web-ui-button slot="footer" variant="primary">保存</web-ui-button>
    <p>正文内容</p>
  </web-ui-drawer>
</template>
```

## API

### Props

| 名称                | 说明                                                  | 类型              | 默认值    |
| ------------------- | ----------------------------------------------------- | ----------------- | --------- |
| `open`              | drawer 可见性。                                       | `boolean`         | `false`   |
| `no-scroll-lock`    | 打开时不锁定页面滚动。                                | `boolean`         | `false`   |
| `no-backdrop-close` | 禁止点击 backdrop 关闭。                              | `boolean`         | `false`   |
| `controlled`        | 用户关闭仅请求 `open=false`，由消费方回写。           | `boolean`         | `false`   |
| `placement`         | 滑入方向：`right`（默认）、`left`、`top`、`bottom`。  | `DrawerPlacement` | `'right'` |
| `heading`           | 标题文字，`header` 插槽为空时的回落。                 | `string`          | `''`      |
| `closable`          | 显示内置关闭 button。                                 | `boolean`         | `false`   |
| `headless`          | 仅保留 overlay 行为，默认插槽不渲染内置 drawer UI。   | `boolean`         | `false`   |
| `dialog-label`      | 内部原生 dialog 的可访问名称；`headless` 下必须提供。 | `string`          | `''`      |
| `draggable`         | 在 drawer 内缘显示 drag bar，支持拖拽关闭手势。       | `boolean`         | `false`   |

### Events

| 名称          | 说明                                            |
| ------------- | ----------------------------------------------- |
| `open-change` | open 状态变化，`detail.open` 为请求的目标状态。 |

### Slots

| 名称      | 说明         |
| --------- | ------------ |
| `default` | 正文内容。   |
| `header`  | 顶部标题区。 |
| `footer`  | 底部操作区。 |

### Methods

| 名称      | 说明                            |
| --------- | ------------------------------- |
| `show()`  | 打开 drawer；已打开时为 no-op。 |
| `close()` | 关闭 drawer；已关闭时为 no-op。 |

### 行为说明

`headless` 保留原生 dialog、backdrop、placement 动画、Escape/backdrop 关闭行为和滚动锁定，但不渲染内置 glass 主体、header、关闭 button 或 footer；Consumer 负责完整定义默认插槽内容的样式，并且必须提供 `dialog-label`，确保原生 dialog 具有可访问名称。

关闭时保留原生 dialog 的 top layer，待退出过渡完成后调用 `dialog.close()`。Escape 始终走此关闭路径；`no-backdrop-close` 仅控制 backdrop 点击。

启用 `closable` 时，内置关闭 button 固定在 header 右上角（默认顶部 `16px`、右侧 `16px`），不会再拉伸到 drawer 中间。顶部 `16px` 经 `--wui-space-4` 解析，因此与 drawer 的 header padding 同源；右侧 `16px` 是 button 自身到 panel 右边沿的偏移，它并不等于 header 的水平内边距（`20px`），因此保持字面量。

`--wui-drawer-nested-peek-base` 不需要消费方声明：默认值 `43.2px` 是组件用 `CSS.registerProperty` 注册该属性时的 `initialValue`（`components/drawer/index.ts`），窄视口的 `28.8px` 基准来自 `components/drawer/style.css` 的 `@media (width <= 640px)` 规则——这两处就是内置基准的所在地。在宿主或任意祖先上设置该 token 可同时覆盖两者，在任何视口宽度下都生效。

按内置基准，四层 `320px` 等宽堆叠逐层露边在桌面端为 `29.94px` / `17.52px` / `12.43px`、窄视口为 `19.96px` / `11.68px` / `8.29px`，对应总堆叠宽度 `59.89px` 与 `39.93px`。单层始终不动，因为 `ln(1)` 为 `0`。

### 拖拽关闭

启用 `draggable` 后，打开的 drawer 在内缘显示灰色胶囊 drag bar（默认 4×56px，视觉中线距内缘 10px；`right` 在左缘、`left` 在右缘、`top` 在下缘、`bottom` 在上缘）：

中线跟随 `--wui-drawer-content-padding` 的半值，并以「半个胶囊厚度 + 4px 呼吸间距」兜底：把该 padding 归零、让内容贴边铺满时，胶囊仍留可见内缩，既不会越出 panel 内缘，也不会贴死 panel 边缘。

胶囊是纯视觉件：`pointer-events: none`，本身不吃任何一次按下。真正被按下的是命中层。左右 placement 只有 drag zone；上下 placement 有三层——拖拽 drag zone、沿可抓取边缘的一条端头 drag edge（宽度与胶囊等宽，厚度不小于 `--wui-drawer-drag-edge-size`），以及整块的 header（`placement=bottom`）或 footer（`placement=top`）。drag edge 的高度取「胶囊外沿」与该 token 的较大者，按构造覆盖胶囊所在的带，所以在四个 placement 上，按住胶囊能开始拖拽、悬停胶囊会点亮它。

让开 header（`placement=bottom`）或 footer（`placement=top`）的是 drag zone 本身，因此那一节不会把胶囊推离 panel 边缘；而那一节改由**自己**接拖拽，不再整块按不动：在它里面任意一点起手都能开始拖拽，标题文字同样在内。控件的让开是**逐个控件、在事件层**做的，不是把命中面几何切开——按下路径上只要出现可点元素（原生 `button` / `input` / `select` / `textarea` / `label` / `a[href]` / `summary`，任何 `contenteditable`，交互语义 `role`（`button`、`checkbox`、`switch`、`tab`、`menuitem`、`option`、`slider` 等），以及任何显式 `tabindex` 且不为 `-1`），这一次按下就交给控件、不起拖拽。自绘控件若本身不是原生可交互元素，需要带上其中之一才会被认出来；补 `role` 或 `tabindex` 就是入口，而它本身也是无障碍上该做的事。几何切割是被有意否掉的：它必须测量每个控件的位置，控件一动就失效，而且只是把 A6 那条缺陷换了个位置。代价是明说的：内置关闭 button 贴着 panel 右缘、在胶囊跨度之外，仍可点击；落在胶囊水平跨度内的控件，其顶部到 drag edge 高度之间仍被拖拽面盖住。

「drag bar 占位」自带一条推论：落在这条跨度内、顶边又落在 drag edge 高度（`--wui-drawer-drag-edge-size`，默认 20px；胶囊外沿更厚时以胶囊为准）之内的控件，上部会被拖拽面盖住——drag bar 就画在那里，起手必须从 drag bar 所在的位置开始。抬 `z-index` 没用（Chromium 里 drag edge 始终压在 slotted 内容之上），量得着的杠杆是 `--wui-drawer-drag-bar-length`（同时决定胶囊长度与 drag edge 宽度）与 `--wui-drawer-drag-edge-size`（drag edge 厚度）。

- 拖拽实时跟手，backdrop 透明度按比例淡出。
- backdrop 点击关闭只认**轻点链路**：按下起点在 backdrop 上、且按-放位移在轻点量级内的 click 才关闭。浏览器对「按下 → 拖动 → 松手」生成的 click 落在起点与松手点的共同祖先（dialog）上——从 panel 内容或 backdrop 上开始拖拽、松手落在 backdrop 时，click 的 target 同样是 dialog；组件在 `pointerdown` 记录起点与坐标做回溯校验，这类拖拽松手一律弹回。`detail` 为 0 的 click（键盘/程序化来源）不消费指针记录。
- 松手时自抓取瞬间起的**净位移**超过 drawer 尺寸的一半（下限 10px）或快速甩动即关闭，否则弹回打开位；方向随 placement 适配。判定的每一环都与 Base UI `useSwipeDismiss` 对齐：
  - 位移零点与判定时钟都在**首个 `pointermove`** 处重置，用来吸收「按下 → 首个 move」之间的空隙；该次 move 的整程位移被整体丢弃，因此一次手势至少要两个 move 才可能累积出位移。
  - 甩动看的是**整段手势**的平均速度（净位移 ÷ 手势时长，分母下限 50ms）**达到** 500px/s，不是释放瞬间的瞬时速度。滑窗只描述最后一小段轨迹；在整段平均速度下，「先往边缘拖出、再快速扫回」不再能凑成甩动。时长为 0 时速度取 0 而不是按 50ms 兜底，因此测不到时长的手势永远不会被读成甩动。
  - 净位移没有朝闭合方向的松手一律弹回打开位。
  - 距离判据同样用净位移：从弹回途中抓取后不再拖动就松手，不会被当成「已经拖过一半」。
  - 自「方向确认点」起反向回撤满 10px 即取消本次甩动，因此拖出后回扫不会关闭。位移重新越过距离阈值会清除该标记，所以「已经拖过一半」不受小幅回撤影响。上游有同一个守卫（`cancelledSwipe`），但在 drawer 这条路径上永远走不到——`DrawerViewport.onRelease` 必然返回一个决定。
  - 朝打开方向的拖拽按平方根压缩（`sign(d) · |d| ** 0.5`），对齐 `applyDirectionalDamping`。阻尼作用于本次手势的**增量**、叠加在抓取瞬间的位移之上，因此自限幅而不需要固定的位移上限。
- 释放速度只决定收尾过渡的时长（180–420ms）；收尾本身是一次交还 CSS 的 `transform` 过渡，不再创建 WAAPI 动画。
- 启用 `controlled` 后，超过阈值松手仅派发 `open-change(false)`；drawer 在闭合位短暂等待（120ms 回写窗口），Consumer 拒绝或超时未回写时弹回打开位。
- 不支持拖拽打开——关闭态的 drawer 在原生 dialog 之外没有任何渲染物。
- `prefers-reduced-motion` 下松手即时到位，不播放收尾过渡。

### CSS Custom Properties

| 名称                              | 说明                                                                                                                                                                      | 默认值                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `--wui-drawer-width`              | drawer 宽度                                                                                                                                                               | `320px`                            |
| `--wui-drawer-height`             | drawer 高度（上/下）                                                                                                                                                      | `300px`                            |
| `--wui-drawer-bg`                 | drawer 背景色                                                                                                                                                             | `var(--wui-color-surface-overlay)` |
| `--wui-drawer-radius`             | 浮动卡片圆角（非 headless）                                                                                                                                               | `var(--wui-radius-overlay, 28px)`  |
| `--wui-drawer-inset`              | 浮动卡片视口留边（非 headless）；置 `0` 为贴边几何                                                                                                                        | `8px`                              |
| `--wui-drawer-nested-peek-base`   | 嵌套堆叠露边基准 `A`（`width <= 640px` 时为 `28.8px`）；堆叠总宽按 `A · ln(n)` 增长，单层因此完全不动，每多一层新增的露边递减。置 `0` 关闭露边。详见下方说明              | `43.2px`                           |
| `--wui-drawer-overlay-bg`         | backdrop 背景色                                                                                                                                                           | `rgb(0 0 0 / 0.12)`                |
| `--wui-drawer-drag-zone-size`     | Drag-to-close 命中 drag zone 厚度（draggable）                                                                                                                            | `20px`                             |
| `--wui-drawer-drag-zone-inset`    | 拖拽 drag zone 与它避让的那一节（`placement=bottom` 的 header / `placement=top` 的 footer）之间的呼吸间距；该节不存在时为 0                                               | `var(--wui-space-1, 4px)`          |
| `--wui-drawer-drag-bar-thickness` | Drag bar 胶囊厚度（短轴）                                                                                                                                                 | `4px`                              |
| `--wui-drawer-drag-bar-length`    | Drag bar 胶囊长度（沿 drawer 边缘）                                                                                                                                       | `56px`                             |
| `--wui-drawer-drag-edge-size`     | 胶囊命中带沿可抓取边缘的厚度（仅上下 placement）。以胶囊外沿兜底，胶囊所在的带恒被覆盖；默认值与 `--wui-drawer-drag-zone-size` 同值，于是 drag bar 不会比旁边的带子更难按 | `20px`                             |
| `--wui-drawer-header-padding`     | Header 区域 padding                                                                                                                                                       | `16px 20px`                        |
| `--wui-drawer-close-top`          | 内置关闭 button 相对 header 顶部的偏移                                                                                                                                    | `16px`                             |
| `--wui-drawer-close-right`        | 内置关闭 button 相对 drawer 右缘的偏移                                                                                                                                    | `16px`                             |
| `--wui-drawer-content-padding`    | 内容区 padding；同时驱动 drag bar 视觉中线（取半值，不低于半个胶囊厚度 + 4px）                                                                                            | `20px`                             |
| `--wui-drawer-footer-padding`     | Footer 区域 padding                                                                                                                                                       | `16px 20px`                        |

---
component: theme
tag: web-ui-theme
---

主题提供者：在自己的子树内定义基础、颜色、层级、阴影与动效 token，并作为该子树的 theme-owned overlay root。

## 示例

### 基础

`appearance` 选择配色方案，未设置时主题保持 inactive 但解析输出使用默认的 `light`。

```react
<web-ui-theme appearance="dark">
  <web-ui-button variant="primary">暗色主题下的按钮</web-ui-button>
</web-ui-theme>
```

```vue
<template>
  <web-ui-theme appearance="dark">
    <web-ui-button variant="primary">暗色主题下的按钮</web-ui-button>
  </web-ui-theme>
</template>
```

### 跟随系统与动效范围

`appearance="system"` 跟随 `prefers-color-scheme`；`motion` 定义当前范围的动效偏好，`reduced` 归零转场、两个无限加载循环只放慢。

```react
<web-ui-theme appearance="system" motion="reduced">
  {children}
</web-ui-theme>
```

```vue
<template>
  <web-ui-theme appearance="system" motion="reduced">
    <slot />
  </web-ui-theme>
</template>
```

### 绑定解析后的外观

`resolved-appearance` 是只读的派生输出，可以放心把选择器绑到它上面，无需再维护第二份主题状态。

```react
<div style={{ colorScheme: 'light dark' }}>
  <web-ui-theme appearance={appearance}>
    <div className="hero">当前外观由 resolved-appearance 选择器控制</div>
  </web-ui-theme>
</div>
```

```vue
<template>
  <web-ui-theme :appearance="appearance">
    <div class="hero">当前外观由 resolved-appearance 选择器控制</div>
  </web-ui-theme>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const appearance = ref<'light' | 'dark' | 'system'>('system')
</script>
```

## API

### Props

| 名称                  | 说明                                                        | 类型                           | 默认值     |
| --------------------- | ----------------------------------------------------------- | ------------------------------ | ---------- |
| `appearance`          | 配色方案：`light`、`dark` 或 `system`。                     | `ThemeAppearance \| undefined` | —          |
| `resolved-appearance` | 解析后的配色方案，只读反射输出。                            | `ResolvedThemeAppearance`      | `'light'`  |
| `motion`              | 当前嵌套主题范围的动效偏好：`full`、`reduced` 或 `system`。 | `ThemeMotion`                  | `'system'` |

### Slots

| 名称      | 说明                 |
| --------- | -------------------- |
| `default` | 主题作用域内的内容。 |

### Methods

| 名称                | 说明                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `getOverlayRoot()`  | 返回该主题拥有的 theme-owned overlay root；未设置 `appearance` 时返回 `undefined`。                               |
| `isReducedMotion()` | 当前主题范围是否应减少动效：`motion` 为 `reduced` / `full` 时直接给出 `true` / `false`，`system` 时跟随系统偏好。 |

### Portal 挂载契约

每个 active `<web-ui-theme>` 同时是默认的 scoped theme-owned overlay root。Portal 类组件在未显式传入 `overlayContainer` 时，会解析到最近的 active theme 的 `getOverlayRoot()`；无 target 的调用优先使用 root theme 的 theme-owned overlay root。没有 active theme 提供 root 时，回退到全局 fallback overlay root。

### 行为说明

在其子树中定义基础、颜色、层级、阴影和动效 token。`motion="system"` 跟随 `prefers-reduced-motion`；使用 `motion="reduced"` 降低当前作用域动效，或在嵌套主题中使用 `motion="full"` 恢复默认 token。System 配色模式跟随 `prefers-color-scheme`。

`resolved-appearance` 是只读的派生宿主属性（同时以 `resolvedAppearance` property 暴露）：值恒为 `light` 或 `dark`；显式 `appearance` 直接透传，`appearance="system"` 从 `prefers-color-scheme` 解析，OS 深浅翻转时实时更新。未设置 `appearance` 的主题仍保持 inactive，但解析输出使用默认值 `light`。该 attribute 由组件独占写入并会恢复外部改动，因此消费端可以直接把选择器或 Tailwind custom variant 绑定到 `resolved-appearance`，无需再维护第二份主题状态。

配色变化是否使用 View Transitions API 播放动画，由当前主题范围的 `motion` 档位决定：`full` 始终播放揭示，`reduced` 直接落地新 appearance、不播放揭示，`system` 跟随 `prefers-reduced-motion`。根主题揭示整页；嵌套主题只揭示自己的 capture box。圆心优先取最近一次 pointerdown 坐标，否则回退主题盒或视口中心；揭示方向跟随解析后的外观，包括 `appearance="system"` 从 `prefers-color-scheme` 解析出的结果，深浅两个方向反向播放。不支持的浏览器、reduced-motion 作用域、时长为 0 以及同一 flight 内已有未完成请求都会立即落地新 appearance；当前版本对 `appearance="system"` 的 OS 深浅翻转不做动画。

揭示进行中，View Transitions 的 rendering-suppression 规则会强制所有 pointer hit-test 指向 document element，因此 CSS `pointer-events` 覆盖无法让底层页面继续交互。主题只在 `pointerdown` 或 wheel 时调用 `skipTransition()`；`pointermove` 与 `pointerup` 永远不会结束揭示，因此发起控件的收尾移动或过渡期间的普通移动都不会打断动画。触发 skip 的事件本身仍按规范以 document element 为目标，但失效窗口到此为止，不会持续满整个揭示时长。

主题宿主使用 `display: contents` 且不绘制任何背景：组件库不在宿主页面画背景，嵌入方对主题子树背后的表面保留完全控制权。自定义属性仍可靠继承到 slotted 内容。

### 从已移除的 transition 属性迁移

删掉该属性，改用 `motion` 表达意图。原先带 `transition` 的主题在默认 `motion="system"` 下揭示行为不变；需要在系统偏好 reduce 时仍播放揭示，则加 `motion="full"`。原先不带 `transition` 的主题现在默认就会揭示，若要保持无动画直接切换，请显式设置 `motion="reduced"`。

### 根节点 page 色同步

最外层 active theme 会把自己计算出的 `--wui-color-page` 以行内自定义属性的形式镜像到 `document.documentElement` 上。它补上的正是该 token 自己到不了的那一处——自定义属性的继承链到 documentElement 就断了，所以消费方写 `body { background: var(--wui-color-page) }` 只能给滚动区上色，橡皮筋回弹（macOS rubber-band）露出的画布区仍是 UA 背景色；有了这个镜像属性，回弹区也跟随主题。写入时机是主题连接时与 appearance 变化时（含 `appearance="system"` 跟随系统深浅翻转）；写入的是该主题的计算值，因此消费者在 host 上覆盖 `--wui-color-page` 会被按当前值原样镜像。**非实时：** 组件不观察 host 自身的样式变化，因此运行中改该属性（改行内样式、切 class、host 级媒体查询）不会实时镜像到 root，要等下一个写入触发点——连接、`appearance` 变成另一个值、或系统深浅翻转；把 `appearance` 重新赋成当前值不算触发点，因为值没变时更新会被跳过。页面色需要独立于主题 appearance 变化时，消费者自己在该变量上持有它：在 `:root` 或 `body` 上用 `!important` 定义 `--wui-color-page`，重要声明在层级上压过本模块写在 documentElement 上的行内值；或者让页面色跟随 `appearance` 走。只有最外层主题会写入：嵌套主题保留自己的作用域，不改写 root 值。同步权按 connect 顺序归属，最外层断开时顺延给下一个已连接主题；最后一个主题断开时刻意保留最后值而不是移除，避免主题切换间隙闪回 UA 背景。组件库在 documentElement 上只写这一个自定义属性，不写其它内容。

### Foundation tokens

| 名称                      | 说明                     | 默认值  |
| ------------------------- | ------------------------ | ------- |
| `--wui-input-width`       | 紧凑表单控件默认宽度     | `200px` |
| `--wui-control-size`      | 控件默认高度和方形最小宽 | `36px`  |
| `--wui-overlay-min-width` | 锚定浮层最小宽度         | `200px` |
| `--wui-focus-ring-width`  | Focus 指示器宽度         | `3px`   |

### 排版 token

字号按文字扮演的角色命名，而不是按它在尺度里的位置——`caption` 是密集 chrome 上的小标签，`readout` 是数字读数，无后缀的基准字号是正文，`title` 是有界卡片标题。字重按重量命名，行高按这段文字需要的垂直空气命名。这一族与外观无关：light 和 dark 下取值相同。

组件里的 `line-height: 1` 与 `line-height: 0` 刻意不做 token：前者是控件内单行标签的垂直居中手段，后者是把包裹盒高收缩到内容——两者都不是排版行高，token 化会诱使调用方把它们当成行高去整体调节。

### Typography tokens

| 名称                         | 说明                                               | 默认值 |
| ---------------------------- | -------------------------------------------------- | ------ |
| `--wui-font-size-caption`    | 密集 chrome 标签（徽标、toast 时间戳、菜单分组头） | `12px` |
| `--wui-font-size-readout`    | 数字读数（图片预览的计数与缩放比）                 | `13px` |
| `--wui-font-size`            | 正文与控件的基础字号（含控件的占位文本）           | `14px` |
| `--wui-font-size-title`      | 有界卡片标题（dialog、drawer）                     | `18px` |
| `--wui-font-weight-medium`   | 强调行内文字的中等字重                             | `500`  |
| `--wui-font-weight-semibold` | 标题的半粗字重                                     | `600`  |
| `--wui-line-height-tight`    | 大号标题的紧行高                                   | `1.2`  |
| `--wui-line-height-snug`     | 中号标题的适中行高                                 | `1.4`  |
| `--wui-line-height-normal`   | 正文的常规行高                                     | `1.5`  |
| `--wui-line-height-relaxed`  | 长文阅读的宽松行高                                 | `1.6`  |

### 间距 token

4px 基准的六级阶，止于 24px——组件层以生效的静态节奏字面量写入的最大间距值。（唯一更宽的是 `<web-ui-empty>` 的 `32px 24px`，它由 `--wui-empty-size` 在 JS 侧派生，属尺寸那根轴而非节奏，理由见下面的排除项。）它不替代组件各自的覆盖 token（`--wui-button-px`、`--wui-dialog-padding` 等），而是充当那些 token 的 fallback 默认值——组件仍然决定自己的 padding，间距阶只说明这个值在整体节奏里的位置。因此覆盖某一级，就等于给嵌入应用一根作用于所有已挂阶调用点的密度杠杆——它调的是节奏，不是结构，理由见下面的排除项。

这一阶刻意不含 `1px`、`2px`、`6px`、`7.5px`、`10px` 和负值。`1px` 是发丝线和描边环的结构宽度；`2px`、`6px`、`7.5px` 是光学修正；`10px` 是 4px 阶之外的半档耦合值；负 margin 用来抵消 flex gap 或按钮的 padding。它们的「为什么是这个数」各自独立，没有共享间距语义，收进同一把尺子只会让覆盖其中之一时误伤其余。

第二类排除按语义而非按取值：对齐视口边缘或宿主自身内容边缘的偏移量，即使正好落在 4px 阶上也不挂阶——`--wui-image-preview-edge-gap`、`--wui-toast-viewport-gap`、`--wui-layout-mobile-toggle-inset`、`--wui-back-top-right` / `--wui-back-top-left` / `--wui-back-top-bottom`、`--wui-drawer-inset` 与 `--wui-drawer-close-right`。它们的参照系是屏幕或宿主的内容边缘，不是相邻元素之间的节奏；并进间距阶会让「收紧 `--wui-space-2`」意外把组件推离屏幕边缘。`--wui-drawer-close-top` 是反例：它经 `--wui-space-4` 解析，因为它要跟随 drawer 的 header padding，两者必须一起动。

第三类排除是由组件**尺寸** prop 派生、而非写成节奏值的间距：`<web-ui-empty>` 让 `padding`、`min-block-size` 与图形尺寸跟随 `--wui-empty-size` 缩放，`40` / `56` / `72` 三档实测 padding 分别是 `23px 17px` / `32px 24px` / `41px 31px`。这六个值里有四个是奇数，4px 阶根本无法表示；`56` 档的 `32px 24px` 落在基准上纯属尺寸选值的巧合——`56` 是三档里唯一被 7 整除的，商恰为 8，而 8 本身是 4 的倍数，取整在这一档根本没有发生。一根在三个尺寸里有两个静默失效、只在第三个上碰巧生效的密度杠杆，比没有杠杆更糟；何况整组值本来就随 `size` 走，因此不挂阶。这里直接写 px 即可。

覆盖必须落在 `<web-ui-theme>` 作用域内，因为 theme 宿主只为自己的子树声明这些级。已知边界：`assets/*.css` 的浮层样式有两条注入路径——经 theme 自带的 overlay root 注入时间距阶生效，退到 document 级 fallback overlay root（一个看不到 theme token 的普通 `div`）时，浮层间距恒取字面量 fallback。

### Spacing tokens

| 名称            | 说明                       | 默认值 |
| --------------- | -------------------------- | ------ |
| `--wui-space-1` | 紧凑内边距（徽标、菜单）   | `4px`  |
| `--wui-space-2` | 控件间距、组间距、行内间距 | `8px`  |
| `--wui-space-3` | 控件水平内边距             | `12px` |
| `--wui-space-4` | 标准区块间距               | `16px` |
| `--wui-space-5` | 浮层内容内边距             | `20px` |
| `--wui-space-6` | 宽浮层内边距               | `24px` |

### Selection control tokens

| 名称                           | 说明                                 | 默认值               |
| ------------------------------ | ------------------------------------ | -------------------- |
| `--wui-selection-control-size` | 指示器（圆点 / 方框）宽高            | `18px`               |
| `--wui-radio-group-gap`        | `<web-ui-radio-group>` 的成员间距    | `var(--wui-space-2)` |
| `--wui-checkbox-group-gap`     | `<web-ui-checkbox-group>` 的成员间距 | `var(--wui-space-2)` |

### Radius tokens

| 名称                   | 说明                                                 | 默认值                 |
| ---------------------- | ---------------------------------------------------- | ---------------------- |
| `--wui-radius-control` | 小型控件的胶囊圆角（button、input、switch、option…） | `calc(infinity * 1px)` |
| `--wui-radius-menu`    | 菜单/Popover 浮动面板、多行 textarea 与 toast        | `18px`                 |
| `--wui-radius-overlay` | 大型覆盖层：dialog、drawer、layout sidebar           | `28px`                 |

### Layer tokens

| 名称                         | 说明           | 默认值 |
| ---------------------------- | -------------- | ------ |
| `--wui-layer-inline-overlay` | 组件内部浮层   | `1`    |
| `--wui-layer-header`         | 页面 Header    | `10`   |
| `--wui-layer-auxiliary`      | 悬浮工具控件   | `20`   |
| `--wui-layer-banner`         | Banner         | `30`   |
| `--wui-layer-tabbar`         | Tab Bar        | `40`   |
| `--wui-layer-sidebar`        | 侧边栏         | `50`   |
| `--wui-layer-menu`           | 菜单/浮动面板  | `100`  |
| `--wui-layer-menu-nested`    | 嵌套菜单       | `110`  |
| `--wui-layer-toast`          | Toast          | `200`  |
| `--wui-layer-loading`        | 阻塞式 Loading | `300`  |

### 动效 token

duration 默认值为 `--wui-duration-press: 80ms`、`--wui-duration-feedback: 100ms`、`--wui-duration-trigger: 160ms`、`--wui-duration-focus: 200ms`、`--wui-duration-float-enter: 240ms`、`--wui-duration-float-exit: 160ms`、`--wui-duration-dialog-enter: 320ms`、`--wui-duration-dialog-exit: 260ms`、`--wui-duration-drawer-enter: 280ms`、`--wui-duration-drawer-exit: 240ms`、`--wui-duration-drawer-nested: 450ms`、`--wui-duration-toast-enter: 280ms`、`--wui-duration-toast-exit: 200ms`、`--wui-duration-collapse-enter: 200ms`、`--wui-duration-collapse-exit: 160ms`、`--wui-duration-layout: 200ms`、`--wui-duration-swipe-settle: 220ms`（image-preview 轮播回位）、`--wui-duration-spin: 600ms`（icon 旋转）、`--wui-duration-spinner: 800ms`（spinner 叶片追光）与 `--wui-theme-transition-duration: 500ms`（主题配色揭示）。Easing token 是 `--wui-ease-enter`、`--wui-ease-dialog`（`cubic-bezier(0.2, 0, 0, 1)`）、`--wui-ease-slide`、`--wui-ease-float`（`cubic-bezier(0.4, 0.38, 0.2, 1)`，锚定浮动面板专用的无回弹弹簧拟合曲线）、`--wui-ease-swipe`（`cubic-bezier(0.32, 0.72, 0, 1)`，轮播回位的减速收尾）与 `--wui-theme-transition-easing: ease-in`；进入缩放是 `--wui-scale-enter: 0.95`（浮动面板与 image-preview 的图片舞台层由小到大展开），dialog 使用 `--wui-dialog-scale-enter: 1.1`（由大到小收缩入场，退场反向）。`motion="reduced"` 下所有转场时长归零（轮播回位一并归零），两个无限加载循环只放慢、不停（`--wui-duration-spin` / `--wui-duration-spinner`：`600ms` / `800ms` → `1600ms`）。加载指示冻结会被读成界面卡死。hover/active 背景反馈即时切换、无过渡动画；选中态、按压与 focus 走带时长的过渡，reduce 下同样归零。

### Color tokens

| 名称                               | 说明                             | 浅色默认值                                                           | 深色默认值                                                              |
| ---------------------------------- | -------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `--wui-color-page`                 | 页面背景                         | `#fff`                                                               | `#242628`                                                               |
| `--wui-color-surface`              | 普通 表面                        | `#fff`                                                               | `#2c2c2e`                                                               |
| `--wui-color-surface-raised`       | 抬升表面                         | `#f2f2f7`                                                            | `#2c2c2e`                                                               |
| `--wui-color-surface-control`      | 中性可交互控件表面               | `#dfdfdf`                                                            | `#3a3a3c`                                                               |
| `--wui-color-surface-track`        | Slider/Switch 轨道表面           | `#e5e5ea`                                                            | `#444446`                                                               |
| `--wui-color-surface-menu`         | Menu 和浮动面板表面              | `rgb(250 250 250 / 0.76)`                                            | `rgb(49 48 50 / 0.74)`                                                  |
| `--wui-color-surface-glass`        | 液态玻璃表面                     | `rgb(250 250 250 / 0.34)`                                            | `rgb(44 44 46 / 0.42)`                                                  |
| `--wui-color-surface-glass-hover`  | Glass 完整悬停背景               | `color-mix(... text 6%, surface-glass)`                              | `color-mix(... text 6%, surface-glass)`                                 |
| `--wui-color-surface-glass-active` | Glass 完整按下背景               | `color-mix(... text 15%, surface-glass)`                             | `color-mix(... text 15%, surface-glass)`                                |
| `--wui-color-surface-overlay`      | 半透明浮层表面                   | `rgb(248 248 248 / 0.92)`                                            | `rgb(32 34 34 / 0.92)`                                                  |
| `--wui-color-surface-sidebar`      | 侧边栏面板表面                   | `rgb(233 233 233 / 0.82)`                                            | `rgb(44 44 46 / 0.8)`                                                   |
| `--wui-color-surface-segmented`    | Segmented 指示器表面             | `#e5e5ea`                                                            | `#3a3a3c`                                                               |
| `--wui-color-surface-selected`     | 选中表面                         | `#fff`                                                               | `#5c5c5e`                                                               |
| `--wui-color-text`                 | 主要文本                         | `#1b1b1b`                                                            | `#e9eaea`                                                               |
| `--wui-color-text-secondary`       | 次要文本                         | `#6a6a6a`                                                            | `#a1a1a6`                                                               |
| `--wui-color-text-tertiary`        | 三级文本和弱意图图标             | `color-mix(in srgb, var(--wui-color-text) 35%, transparent)`         | `color-mix(in srgb, var(--wui-color-text) 42%, transparent)`            |
| `--wui-color-text-disabled`        | 禁用态前景文本                   | `color-mix(in srgb, var(--wui-color-text) 32%, transparent)`         | `color-mix(in srgb, var(--wui-color-text) 38%, transparent)`            |
| `--wui-color-state-layer-hover`    | 透明悬停层                       | `color-mix(in srgb, var(--wui-color-text) 6%, transparent)`          | `color-mix(in srgb, var(--wui-color-text) 6%, transparent)`             |
| `--wui-color-state-layer-active`   | 透明按下层                       | `color-mix(in srgb, var(--wui-color-text) 15%, transparent)`         | `color-mix(in srgb, var(--wui-color-text) 15%, transparent)`            |
| `--wui-color-border`               | 常规边框和分隔线                 | `rgb(0 0 0 / 0.1)`                                                   | `rgb(255 255 255 / 0.14)`                                               |
| `--wui-color-glass-highlight`      | 表面 inset 高光                  | `rgb(255 255 255 / 0.9)`                                             | `rgb(255 255 255 / 0.1)`                                                |
| `--wui-color-glass-ring`           | 1px 描边环底色                   | `rgb(0 0 0 / 0.05)`                                                  | `rgb(255 255 255 / 0.05)`                                               |
| `--wui-color-glass-ring-sheen`     | 描边环角落受光光泽               | `rgb(255 255 255 / 0.5)`                                             | `rgb(255 255 255 / 0.2)`                                                |
| `--wui-color-glass-ring-shade`     | 描边环角落背光压暗               | `rgb(0 0 0 / 0.03)`                                                  | `rgb(0 0 0 / 0.5)`                                                      |
| `--wui-color-accent`               | Accent 和输入焦点边框            | `#08f`                                                               | `#0a84ff`                                                               |
| `--wui-color-on-accent`            | Accent 上的前景色                | `#fff`                                                               | `#fff`                                                                  |
| `--wui-color-on-control`           | 控件内芯前景色                   | `#fff`                                                               | `#f2f2f7`                                                               |
| `--wui-color-success`              | 成功                             | `#16a34a`                                                            | `#30d158`                                                               |
| `--wui-color-warning`              | 警告                             | `#d97706`                                                            | `#ff9f0a`                                                               |
| `--wui-color-danger`               | 危险                             | `#dc2626`                                                            | `#ff453a`                                                               |
| `--wui-color-info`                 | 信息                             | `#2563eb`                                                            | `#64d2ff`                                                               |
| `--wui-color-backdrop`             | Modal 遮罩                       | `rgb(0 0 0 / 0.12)`                                                  | `rgb(0 0 0 / 0.48)`                                                     |
| `--wui-color-focus-ring`           | Focus 指示器颜色，由 accent 派生 | `color-mix(in srgb, var(--wui-color-accent, #08f) 40%, transparent)` | `color-mix(in srgb, var(--wui-color-accent, #0a84ff) 62%, transparent)` |

### Shadow tokens

| 名称                   | 说明              | 浅色默认值                       | 深色默认值                      |
| ---------------------- | ----------------- | -------------------------------- | ------------------------------- |
| `--wui-shadow-overlay` | Modal/Drawer 阴影 | `2px 16px 40px rgb(0 0 0 / 0.4)` | `0 18px 48px rgb(0 0 0 / 0.48)` |
| `--wui-shadow-panel`   | 小型浮动面板阴影  | `0 3px 9px rgb(0 0 0 / 0.27)`    | `0 4px 16px rgb(0 0 0 / 0.32)`  |
| `--wui-shadow-glass`   | 液态玻璃基础阴影  | 四层扩散阴影                     | `0 8px 24px rgb(0 0 0 / 0.08)`  |

### 玻璃效果 token

`--wui-glass-brightness` 浅色模式为 `1.06`，深色模式为 `1.02`。`--wui-glass-corner-radius` 默认值为 `32px`；非 pill 玻璃表面以自身语义圆角（`--wui-radius-menu` / `--wui-radius-overlay`，drawer 为 `--wui-drawer-radius`）覆盖它，使对角描边光影跟随 token 覆盖联动。pill 控件例外：光影渐变需要物理尺寸，继续使用由控件实际尺寸或内部尺寸 token 派生的有限圆角值。

### 内部 token

以 `--wui-internal-*` 为前缀的变量是 Shadow DOM 内部接线变量，不属于公共 token API，Consumer 不应覆盖。

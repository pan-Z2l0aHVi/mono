# Layout

[English](./layout.md) | 简体中文

响应式页面布局：可选全宽横幅、桌面端可折叠侧边栏，应用将 `mobile` 设为 `true` 时使用抽屉。设置 `no-sidebar` 可去掉整块侧边栏，只保留内容布局。页面本身滚动；横幅滚出后，桌面端侧边栏和头部固定在视口内。

## 示例

### 基础用法

五个插槽各占一区。`banner` 在主体上方全宽，`header` 是内容区的吸顶头部，`sidebar` 是侧边栏卡片内容，默认插槽是主内容区，`tabbar` 是底部栏。

`header-glow` 在头部插槽内容背后加一层装饰性晕染，它属于背景层，插槽内容始终在它上方。

layout 是应用外壳级的整屏布局，默认铺满视口；装进限高容器时，把 `--wui-layout-viewport-height` 设为容器高度，页面最小高度和桌面端侧边栏都限制在这个容器内。

移动端开关只派发 `sidebar-open-change` 请求，打开抽屉需要调用方把值回写 `sidebar-open`。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]">
      <web-ui-layout header-glow sidebarOpen={open} onsidebar-open-change={event => setOpen(event.detail.open)}>
        <div
          slot="banner"
          className="flex items-center justify-center bg-(--wui-color-accent) px-4 py-2 text-sm text-(--wui-color-on-accent)"
        >
          全宽 Banner
        </div>
        <div slot="header" className="flex items-center px-4 py-2 text-sm font-medium">
          Header
        </div>
        <nav slot="sidebar" className="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
          <span className="rounded-md p-2 text-sm">Overview</span>
          <span className="rounded-md p-2 text-sm">Components</span>
          <span className="rounded-md p-2 text-sm">Theme</span>
        </nav>
        <div className="p-4">
          <p className="m-0 text-sm">正文区随内层滚动条滚动，header 与 tabbar 各贴在容器上下缘。</p>
          <div className="mt-3 h-[420px] rounded-md bg-(--wui-color-surface-control)" />
        </div>
        <div slot="tabbar" className="flex justify-center p-2">
          <div className="w-full max-w-64 rounded-full border border-(--wui-color-border) bg-(--wui-color-surface) px-6 py-2 text-center text-xs shadow-lg">
            Tabbar
          </div>
        </div>
      </web-ui-layout>
    </div>
  )
}
```

```vue
<template>
  <div
    class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]"
  >
    <web-ui-layout header-glow :sidebarOpen="open" @sidebar-open-change="open = $event.detail.open">
      <div
        slot="banner"
        class="flex items-center justify-center bg-(--wui-color-accent) px-4 py-2 text-sm text-(--wui-color-on-accent)"
      >
        全宽 Banner
      </div>
      <div slot="header" class="flex items-center px-4 py-2 text-sm font-medium">Header</div>
      <nav slot="sidebar" class="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
        <span class="rounded-md p-2 text-sm">Overview</span>
        <span class="rounded-md p-2 text-sm">Components</span>
        <span class="rounded-md p-2 text-sm">Theme</span>
      </nav>
      <div class="p-4">
        <p class="m-0 text-sm">正文区随内层滚动条滚动，header 与 tabbar 各贴在容器上下缘。</p>
        <div class="mt-3 h-[420px] rounded-md bg-(--wui-color-surface-control)" />
      </div>
      <div slot="tabbar" class="flex justify-center p-2">
        <div
          class="w-full max-w-64 rounded-full border border-(--wui-color-border) bg-(--wui-color-surface) px-6 py-2 text-center text-xs shadow-lg"
        >
          Tabbar
        </div>
      </div>
    </web-ui-layout>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### 无侧边栏

`no-sidebar` 把侧边栏结构整块从布局里去掉：桌面端没有侧栏区域与收起按钮，窄视口也没有头部开关与抽屉，只留下 `banner` / `header` / 默认内容 / `tabbar` 四个分区。

`sidebar` 插槽随之不渲染，但调用方节点仍留在 light DOM；撤下属性即恢复原布局。

```tsx
import { lucideFileText, lucideHouse, lucideShoppingCart, lucideUser } from '@greypan/web-ui/icons'
import { useState } from 'react'

export default function Demo() {
  const [tab, setTab] = useState('home')

  return (
    <div className="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]">
      <web-ui-layout no-sidebar header-glow>
        <div slot="header" className="flex items-center px-4 py-2 text-sm font-medium">
          Header
        </div>
        <div className="p-4">
          <p className="m-0 text-sm">no-sidebar 下没有 aside、开关和 Drawer，内容列占满整行。</p>
          <div className="mt-3 h-[420px] rounded-md bg-(--wui-color-surface-control)" />
        </div>
        <div slot="tabbar" className="flex justify-center p-2">
          <web-ui-segmented aria-label="底部导航" value={tab} onInput={event => setTab(event.currentTarget.value)}>
            <web-ui-segmented-trigger value="home" aria-label="首页">
              <web-ui-icon icon={lucideHouse} />
            </web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="orders" aria-label="订单">
              <web-ui-icon icon={lucideFileText} />
            </web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="cart" aria-label="购物车">
              <web-ui-icon icon={lucideShoppingCart} />
            </web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="account" aria-label="我">
              <web-ui-icon icon={lucideUser} />
            </web-ui-segmented-trigger>
          </web-ui-segmented>
        </div>
      </web-ui-layout>
    </div>
  )
}
```

```vue
<template>
  <div
    class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]"
  >
    <web-ui-layout no-sidebar header-glow>
      <div slot="header" class="flex items-center px-4 py-2 text-sm font-medium">Header</div>
      <div class="p-4">
        <p class="m-0 text-sm">no-sidebar 下没有 aside、开关和 Drawer，内容列占满整行。</p>
        <div class="mt-3 h-[420px] rounded-md bg-(--wui-color-surface-control)" />
      </div>
      <div slot="tabbar" class="flex justify-center p-2">
        <web-ui-segmented aria-label="底部导航" :value="tab" @input="tab = $event.currentTarget.value">
          <web-ui-segmented-trigger value="home" aria-label="首页"
            ><web-ui-icon :icon="lucideHouse"
          /></web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="orders" aria-label="订单"
            ><web-ui-icon :icon="lucideFileText"
          /></web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="cart" aria-label="购物车"
            ><web-ui-icon :icon="lucideShoppingCart"
          /></web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="account" aria-label="我"
            ><web-ui-icon :icon="lucideUser"
          /></web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>
    </web-ui-layout>
  </div>
</template>

<script setup lang="ts">
import { lucideFileText, lucideHouse, lucideShoppingCart, lucideUser } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const tab = ref('home')
</script>
```

### 可折叠侧边栏

`sidebar-collapsed` 是桌面端侧边栏的受控收起状态。它只把桌面端 aside 收窄到 `collapsed-width`，不影响移动端抽屉。

只有声明 `sidebar-collapsible` 后 layout 才渲染桌面端收起 / 展开按钮，调用方再把 `sidebar-collapsed-change` 的请求值回写。

两条分支渲染的是同一份 `sidebar` 插槽内容。如果内容密度要跟随收起状态变化，调用方必须按 `mobile` 收窄这个条件（例如 `collapsed && !layout.mobile`，或 CSS 的 `web-ui-layout[mobile]`），否则收起状态会同样出现在抽屉中。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [collapsed, setCollapsed] = useState(false)
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]">
        <web-ui-layout
          sidebarCollapsible
          sidebarCollapsed={collapsed}
          onsidebar-collapsed-change={event => setCollapsed(event.detail.collapsed)}
          sidebarOpen={open}
          onsidebar-open-change={event => setOpen(event.detail.open)}
        >
          <nav slot="sidebar" className="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
            <span className="truncate rounded-md p-2 text-sm">Overview</span>
            <span className="truncate rounded-md p-2 text-sm">Components</span>
            <span className="truncate rounded-md p-2 text-sm">Theme</span>
            <span className="truncate rounded-md p-2 text-sm">Settings</span>
          </nav>
          <div className="p-4">
            <p className="m-0 text-sm">点侧边栏底部的按钮收起 / 展开，layout 只把桌面端 aside 收窄到 60px。</p>
          </div>
        </web-ui-layout>
      </div>
      <p className="text-sm text-(--wui-color-text-secondary)">sidebar-collapsed：{collapsed ? 'true' : 'false'}</p>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <div
      class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]"
    >
      <web-ui-layout
        sidebar-collapsible
        :sidebarCollapsed="collapsed"
        @sidebar-collapsed-change="collapsed = $event.detail.collapsed"
        :sidebarOpen="open"
        @sidebar-open-change="open = $event.detail.open"
      >
        <nav slot="sidebar" class="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
          <span class="truncate rounded-md p-2 text-sm">Overview</span>
          <span class="truncate rounded-md p-2 text-sm">Components</span>
          <span class="truncate rounded-md p-2 text-sm">Theme</span>
          <span class="truncate rounded-md p-2 text-sm">Settings</span>
        </nav>
        <div class="p-4">
          <p class="m-0 text-sm">点侧边栏底部的按钮收起 / 展开，layout 只把桌面端 aside 收窄到 60px。</p>
        </div>
      </web-ui-layout>
    </div>
    <p class="text-sm text-(--wui-color-text-secondary)">sidebar-collapsed：{{ collapsed ? 'true' : 'false' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const collapsed = ref(false)
const open = ref(false)
</script>
```

### 拖拽调整尺寸

开启 `sidebar-resizable` 后，桌面端侧边栏右缘出现宽度调整手柄（收起状态下隐藏），拖拽实时改宽。键盘聚焦后可用 ←/→ 以 16px 步进（Shift 加速到 64px），Home/End 跳到上下限。

手柄支持鼠标、触摸和触控笔；移动端布局使用抽屉，不显示调宽手柄。

拖拽释放或键盘 Enter 提交时派发一次 `sidebar-width-change`，携带最终像素宽度；调用方回写后宽度重新由 `sidebar-width` 接管，Escape 撤回未提交的调整。

`sidebar-min-width` / `sidebar-max-width` 是 px 字面量，上限还受一半视口限制，内置上限优先于配置值。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [width, setWidth] = useState('240px')
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]">
        <web-ui-layout
          sidebar-resizable
          sidebarWidth={width}
          sidebar-min-width="160px"
          sidebar-max-width="360px"
          onsidebar-width-change={event => setWidth(event.detail.width)}
          sidebarOpen={open}
          onsidebar-open-change={event => setOpen(event.detail.open)}
        >
          <nav slot="sidebar" className="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
            <span className="rounded-md p-2 text-sm">Overview</span>
            <span className="rounded-md p-2 text-sm">Components</span>
            <span className="rounded-md p-2 text-sm">Theme</span>
          </nav>
          <div className="p-4">
            <p className="m-0 text-sm">
              拖桌面端侧边栏右缘的手柄改宽；聚焦后用 ←/→ 步进、Enter 提交、Escape 撤回未提交的调整。
            </p>
          </div>
        </web-ui-layout>
      </div>
      <p className="text-sm text-(--wui-color-text-secondary)">sidebar-width：{width}</p>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <div
      class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]"
    >
      <web-ui-layout
        sidebar-resizable
        :sidebarWidth="width"
        sidebar-min-width="160px"
        sidebar-max-width="360px"
        @sidebar-width-change="width = $event.detail.width"
        :sidebarOpen="open"
        @sidebar-open-change="open = $event.detail.open"
      >
        <nav slot="sidebar" class="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
          <span class="rounded-md p-2 text-sm">Overview</span>
          <span class="rounded-md p-2 text-sm">Components</span>
          <span class="rounded-md p-2 text-sm">Theme</span>
        </nav>
        <div class="p-4">
          <p class="m-0 text-sm">
            拖桌面端侧边栏右缘的手柄改宽；聚焦后用 ←/→ 步进、Enter 提交、Escape 撤回未提交的调整。
          </p>
        </div>
      </web-ui-layout>
    </div>
    <p class="text-sm text-(--wui-color-text-secondary)">sidebar-width：{{ width }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const width = ref('240px')
const open = ref(false)
</script>
```

### 移动端 drawer

`mobile` 由应用控制。设置为 `true` 时侧边栏使用 drawer，应用可按视口或自己的布局策略决定该值。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <web-ui-layout
      mobile
      style={{ '--wui-layout-mobile-toggle-inset': '24px', '--wui-layout-mobile-toggle-top': '16px' }}
      sidebarOpen={open}
      onsidebar-open-change={event => setOpen(event.detail.open)}
    >
      <div slot="sidebar">导航</div>
      <div>内容</div>
    </web-ui-layout>
  )
}
```

```vue
<template>
  <web-ui-layout
    :mobile="true"
    style="--wui-layout-mobile-toggle-inset: 24px; --wui-layout-mobile-toggle-top: 16px"
    :sidebarOpen="open"
    @sidebar-open-change="open = $event.detail.open"
  >
    <div slot="sidebar">导航</div>
    <div>内容</div>
  </web-ui-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const open = ref(false)
</script>
```

## API

### 属性

| 名称                       | 说明                                                                                                                                                               | 类型               | 默认值    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | --------- |
| `no-sidebar`               | 不渲染任何侧边栏结构：桌面端 aside、收起按钮与宽度调整手柄，移动端头部开关与抽屉；`sidebar` 插槽内容随之不渲染。                                                   | `boolean`          | `false`   |
| `sidebar-collapsible`      | 渲染桌面端收起 / 展开按钮。未声明时不渲染按钮，也不会因点击产生 `sidebar-collapsed-change` 请求；桌面宽度仍由 `sidebar-collapsed` 控制，移动端抽屉的开关不受影响。 | `boolean`          | `false`   |
| `sidebar-collapsed`        | 桌面端侧边栏的受控收起状态；只收窄桌面端，不影响移动端抽屉。                                                                                                       | `boolean`          | `false`   |
| `sidebar-open`             | 移动端侧边栏抽屉受控打开状态。                                                                                                                                     | `boolean`          | `false`   |
| `mobile-header-full-width` | 移动端头部插槽占满整行，侧栏按钮悬浮其上；消费方负责给首行按钮留出空间。                                                                                           | `boolean`          | `false`   |
| `header-glow`              | 在头部插槽内容背后显示装饰性晕染。                                                                                                                                 | `boolean`          | `false`   |
| `ariaLabels`               | 内置无障碍名（侧栏折叠/展开、调宽、打开导航菜单、主导航）的成组覆盖（property）；未提供的键使用内置英文文案，`no-sidebar` 下侧栏相关的键不参与渲染。               | `LayoutAriaLabels` | —         |
| `mobile`                   | 是否使用移动端布局，由调用方控制。                                                                                                                                 | `boolean`          | `false`   |
| `sidebar-width`            | 桌面端和移动端展开时的侧边栏宽度。                                                                                                                                 | `string`           | `'240px'` |
| `collapsed-width`          | 桌面端收起时的侧边栏宽度。                                                                                                                                         | `string`           | `'60px'`  |
| `sidebar-resizable`        | 启用桌面端侧边栏右边缘拖拽调整宽度。                                                                                                                               | `boolean`          | `false`   |
| `sidebar-min-width`        | 拖拽调整的下限（px）；默认为 `collapsed-width`。                                                                                                                   | `string`           | —         |
| `sidebar-max-width`        | 拖拽调整的上限（px）；限制在视口一半以内，内置上限优先。                                                                                                           | `string`           | —         |

### 事件

| 名称                       | 说明                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| `sidebar-collapsed-change` | 请求更新桌面端收起状态；`detail.collapsed` 是请求值，调用方须回写到 `sidebar-collapsed`。 |
| `sidebar-open-change`      | 请求更新移动端抽屉打开状态；`detail.open` 是请求值。                                      |
| `sidebar-width-change`     | 拖拽释放或键盘 Enter 提交调整后请求更新宽度；`detail.width` 是最终像素宽度。              |

### Slot

| 名称      | 说明                                                                                    |
| --------- | --------------------------------------------------------------------------------------- |
| `banner`  | 位于布局主体上方的可选全宽横幅。                                                        |
| `header`  | 内容区的吸顶头部。                                                                      |
| `sidebar` | 侧边栏卡片内容；桌面端的固定区域与滚动容器由调用方自行定义；`no-sidebar` 置位时不渲染。 |
| `default` | 主内容区。                                                                              |
| `tabbar`  | 底部标签栏。                                                                            |

### 移动端状态

`mobile` 由调用方传入，反射为同名 attribute；CSS 可通过 `web-ui-layout[mobile]` 选择移动端布局。

### 收起只作用于桌面端

`sidebar-collapsed` 只收窄桌面端侧边栏，布局不会对移动端抽屉应用收起后的尺寸。

两条分支承载的是同一份 `sidebar` 插槽内容。如果侧边栏内容密度跟着该属性变化，调用方必须按 `mobile` 收窄这个条件（例如 `collapsed && !layout.mobile`，或 CSS 的 `web-ui-layout[mobile]`），否则桌面端的收起状态会同样出现在抽屉中。

### 无侧边栏布局

`no-sidebar` 置位后，桌面端不渲染 aside、收起按钮与宽度调整手柄，移动端不渲染头部开关与抽屉；`banner`、`header`、默认内容与 `tabbar` 的分区与滚动行为不变，内容列直接占满整行。

`sidebar` 插槽没有渲染出口，但调用方节点仍留在 light DOM。该模式下 `sidebar-collapsed`、`sidebar-open`、`sidebar-width` 等属性与 `sidebar-*` 事件都不产生可见效果。侧边栏相关的 `ariaLabels` key 与 CSS Custom Properties 也不产生可见效果。

`mobile` 仍由调用方控制。切换进该模式时，进行中的拖拽手势与未提交的宽度调整会被终止，撤下属性后回到 `sidebar-*` 属性管辖的布局。

### 侧边栏调整宽度

启用 `sidebar-resizable` 后，桌面端侧边栏右边缘会出现宽度调整手柄（收起状态下隐藏）；悬停或拖拽时显示 3px 宽的强调色垂直线和 `col-resize` 光标。

- 拖拽时实时更新宽度（禁止过渡动画，限制在 `[min, max]` 和视口范围内）。
- 释放时触发 `sidebar-width-change` 事件并携带最终像素宽度，调用方回写后宽度重新由 `sidebar-width` 属性接管。`pointercancel` 会恢复属性控制的宽度，且不触发事件。
- 键盘操作（WAI-ARIA splitter 模式）：聚焦后用 ←/→ 以 16px 步进调整（Shift 加速到 64px），Home/End 跳到 min/max，Enter 以同一 `sidebar-width-change` 请求提交，Escape 撤回未提交的调整。
- 移动端抽屉始终通过其内置 `draggable` 抽屉支持拖拽关闭，并启用 `page-shift`。打开时整页朝抽屉的进场方向（向右）移动 `16vw`，拖拽期间页面不跟手，关闭后归位。

### 行为说明

`web-ui-layout` 只约束侧边栏卡片的可用空间并管理桌面端的收起 / 展开按钮，不创建桌面端侧边栏的滚动容器。

若仅让桌面端侧边栏的一部分滚动，请将 `sidebar` 插槽根节点设为 `height: 100%; min-height: 0` 的 flex column，再将 `overflow-y: auto` 设置到目标子元素。

这样调用方可以自行固定头部和底部，无需额外的公共插槽：

```html
<div slot="sidebar" class="sidebar-root">
  <div class="sidebar-title">组件列表</div>
  <nav class="sidebar-nav">...</nav>
</div>
```

```css
.sidebar-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.sidebar-title {
  flex-shrink: 0;
}

.sidebar-nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
```

当 `mobile` 为 `true` 时，侧边栏会切换为使用内置玻璃主体、可滚动内容和拖拽区的 `web-ui-drawer`。

移动端抽屉的宽度跟随 `sidebar-width`，圆角跟随 `--wui-layout-sidebar-radius`。

移动端开关以玻璃变体位于头部行内。其左缩进默认 `8px`，可通过 `--wui-layout-mobile-toggle-inset` 与调用方自身的头部内边距对齐。

`header-glow` 会在头部插槽内容和移动端开关的背后添加 `pointer-events: none` 的装饰性晕染。它属于头部背景层，不在前景层，因此插槽内容始终位于其上方。

晕染来自共享的 `.wui-glow` 样式（`@greypan/web-ui/classes.css`），同一个 class 也能用在任意容器上。

晕染由颜色渐变与一层真实背景模糊叠加而成：渐变从 `--wui-color-page` 过渡到全透明，模糊沿高度衰减到 0，两层互不牵制。

默认渐变方向为 `to bottom`；要改颜色，在 `web-ui-layout`、theme 或其上层任意位置覆盖 `--wui-glow-color` 即可，浅色/暗色模式自动跟随。

模糊层向下探出 `24px`；衰减按绝对长度计，头部更高时底缘强度不变。

横向不越出头部盒，纵向尾巴会覆盖头部下方 24px 内的内容。

可通过 `--wui-glow-overhang`、`--wui-glow-fade`、`--wui-glow-blur`、`--wui-glow-gradient` 与 `--wui-glow-gradient-direction` 调整；设为 `--wui-glow-gradient: none` 只保留模糊。

完整 token 表见包根 README 的 Classes 小节。

布局层级顺序为头部（`10`）< 辅助控件（`20`）< 横幅（`30`）< 标签栏（`40`）< 侧边栏（`50`）。

侧边栏卡片表面使用 `--wui-color-surface-sidebar`：浅色保持半透明中性分层，深色比 `--wui-color-page` 浅一级，与 `--wui-color-surface` 相同。

它与 dialog、抽屉、toast 共用的 `--wui-color-surface-overlay` 相互独立，侧边栏可以采用不同表面。

### CSS 自定义属性

| 名称                                   | 说明                                                            | 默认值                   |
| -------------------------------------- | --------------------------------------------------------------- | ------------------------ |
| `--wui-layout-viewport-height`         | layout 使用的可用视口高度；嵌入限高容器时设为容器高度           | `100vh` / `100dvh`       |
| `--wui-layout-sidebar-content-padding` | 移动端侧边栏抽屉内容的内边距                                    | `20px`                   |
| `--wui-layout-sidebar-radius`          | 侧边栏卡片圆角（桌面端和移动端共用）                            | `24px`                   |
| `--wui-layout-sidebar-padding-top`     | 侧边栏卡片上方间距（桌面及移动端）                              | `--wui-space-2`（`8px`） |
| `--wui-layout-sidebar-padding-left`    | 侧边栏卡片左侧间距（桌面及移动端）                              | `--wui-space-2`（`8px`） |
| `--wui-layout-sidebar-padding-bottom`  | 侧边栏卡片下方间距（桌面及移动端）                              | `--wui-space-2`（`8px`） |
| `--wui-layout-mobile-toggle-inset`     | 移动端头部开关的左缩进                                          | `8px`                    |
| `--wui-layout-mobile-toggle-top`       | 移动端头部开关的上边距                                          | `8px`                    |
| `--wui-layout-sidebar-toggle-width`    | 桌面端侧边栏收起按钮的宽度，下限为 `--wui-control-size`（36px） | `36px`                   |

# Layout

响应式页面布局：可选全宽 Banner、桌面端可折叠侧边栏，移动端默认使用 drawer。设置 `no-sidebar` 可去掉整块侧边栏，只保留内容布局。页面本身滚动；Banner 滚出后，桌面端 sidebar 和 header 固定在视口内。

## Samples

### Basic

五个插槽各占一区。`banner` 在主体上方全宽，`header` 是内容区的 sticky header，`sidebar` 是侧边栏卡片内容，默认插槽是主内容区，`tabbar` 是底部栏。

`header-glow` 在 header 插槽内容背后加一层装饰性晕染，它属于背景层，插槽内容始终在它上方。

layout 是应用外壳级的整屏布局，默认铺满视口；装进限高容器时，把 `--wui-layout-viewport-height` 设为容器高度，页面最小高度和桌面端侧边栏都限制在这个容器内。

移动端 Toggle 只派发 `sidebar-open-change` 请求，打开 Drawer 需要调用方把值回写 `sidebar-open`。

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
        <div slot="tabbar" className="flex items-center justify-center px-4 py-2 text-xs">
          Tabbar
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
      <div slot="tabbar" class="flex items-center justify-center px-4 py-2 text-xs">Tabbar</div>
    </web-ui-layout>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### No sidebar

`no-sidebar` 把侧边栏结构整块从布局里去掉：桌面端没有 aside 与收起 Toggle，窄视口也没有 header Toggle 与 Drawer，只留下 `banner` / `header` / 默认内容 / `tabbar` 四个分区。

`sidebar` 插槽随之不渲染，但调用方节点仍留在 light DOM；撤下属性即恢复原布局。

```tsx
export default function Demo() {
  return (
    <div className="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]">
      <web-ui-layout no-sidebar header-glow>
        <div slot="header" className="flex items-center px-4 py-2 text-sm font-medium">
          Header
        </div>
        <div className="p-4">
          <p className="m-0 text-sm">no-sidebar 下没有 aside、Toggle 和 Drawer，内容列占满整行。</p>
          <div className="mt-3 h-[420px] rounded-md bg-(--wui-color-surface-control)" />
        </div>
        <div slot="tabbar" className="flex items-center justify-center px-4 py-2 text-xs">
          Tabbar
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
        <p class="m-0 text-sm">no-sidebar 下没有 aside、Toggle 和 Drawer，内容列占满整行。</p>
        <div class="mt-3 h-[420px] rounded-md bg-(--wui-color-surface-control)" />
      </div>
      <div slot="tabbar" class="flex items-center justify-center px-4 py-2 text-xs">Tabbar</div>
    </web-ui-layout>
  </div>
</template>
```

### Collapsible sidebar

`sidebar-collapsed` 是桌面端侧边栏的受控收起状态。它只把桌面端 aside 收窄到 `collapsed-width`，不影响移动端 Drawer。

只有声明 `sidebar-collapsible` 后 layout 才渲染桌面 Toggle，调用方再把 `sidebar-collapsed-change` 的请求值回写。

两条分支渲染的是同一份 `sidebar` 插槽内容。如果内容密度要跟随收起状态变化，调用方必须按 `mobile` 收窄这个条件（例如 `collapsed && !layout.mobile`，或 CSS 的 `web-ui-layout[mobile]`），否则收起状态会同样出现在 Drawer 中。

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
            <span className="rounded-md p-2 text-sm">Overview</span>
            <span className="rounded-md p-2 text-sm">Components</span>
            <span className="rounded-md p-2 text-sm">Theme</span>
            <span className="rounded-md p-2 text-sm">Settings</span>
          </nav>
          <div className="p-4">
            <p className="m-0 text-sm">点侧边栏底部的 Toggle 收起 / 展开，layout 只把桌面端 aside 收窄到 60px。</p>
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
          <span class="rounded-md p-2 text-sm">Overview</span>
          <span class="rounded-md p-2 text-sm">Components</span>
          <span class="rounded-md p-2 text-sm">Theme</span>
          <span class="rounded-md p-2 text-sm">Settings</span>
        </nav>
        <div class="p-4">
          <p class="m-0 text-sm">点侧边栏底部的 Toggle 收起 / 展开，layout 只把桌面端 aside 收窄到 60px。</p>
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

### Resize by dragging

开启 `sidebar-resizable` 后，桌面端侧边栏右缘出现调整 handle（收起状态下隐藏），拖拽实时改宽。键盘聚焦后可用 ←/→ 以 16px 步进（Shift 加速到 64px），Home/End 跳到上下限。

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
              拖桌面端侧边栏右缘的 handle 改宽；聚焦后用 ←/→ 步进、Enter 提交、Escape 撤回未提交的调整。
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
            拖桌面端侧边栏右缘的 handle 改宽；聚焦后用 ←/→ 步进、Enter 提交、Escape 撤回未提交的调整。
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

### Mobile drawer and viewport detection

`sidebar-open` 是移动端 Drawer 的受控可见性，与 `sidebar-collapsed` 相互独立。

`mobile` 由 layout 独占写入，在 `640px` 断点处翻转，与页面切到移动端分支同时发生，并额外派发一次 `mobile-change`。

React 要在 `useLayoutEffect` 里先读 `layout.mobile` 再订阅（挂载那一刻派发的事件早于订阅）；跨断点那次回写用 `flushSync`，否则会有一帧新树已上屏而调用方的值还是旧的。

Vue 的模板监听在元素插入前挂好，直接绑即可。

把视口收窄到 640px 及以下，layout 会切到移动端分支：header 里出现 Toggle，点它经 `sidebar-open-change` 请求打开 Drawer。移动端 Drawer 同时启用 `draggable` 与 `page-shift`：打开时整页向左移动 `16vw`（视口宽度变化时自动重算），关闭后归位。

```tsx
import type { WebUiLayout } from '@greypan/web-ui'
import { useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

export default function Demo() {
  const layoutRef = useRef<WebUiLayout>(null)
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState(false)

  useLayoutEffect(() => {
    const layout = layoutRef.current
    if (!layout) return
    setMobile(layout.mobile)
    const onChange = (event: Event) => {
      const next = (event as CustomEvent<{ mobile: boolean }>).detail.mobile
      flushSync(() => setMobile(next))
    }
    layout.addEventListener('mobile-change', onChange)
    return () => layout.removeEventListener('mobile-change', onChange)
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div className="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]">
        <web-ui-layout ref={layoutRef} sidebarOpen={open} onsidebar-open-change={event => setOpen(event.detail.open)}>
          <div slot="header" className="flex items-center px-4 py-2 text-sm font-medium">
            Header
          </div>
          <nav slot="sidebar" className="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
            <span className="rounded-md p-2 text-sm">导航</span>
            <span className="rounded-md p-2 text-sm">组件</span>
          </nav>
          <div className="p-4">
            <p className="m-0 text-sm">
              把视口收窄到 640px 及以下，header 出现 Toggle；点它经 sidebar-open-change 请求打开 Drawer。
            </p>
          </div>
        </web-ui-layout>
      </div>
      <p className="text-sm text-(--wui-color-text-secondary)">
        mobile：{mobile ? 'true' : 'false'} · sidebar-open：{open ? 'true' : 'false'}
      </p>
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
        :sidebarOpen="open"
        @sidebar-open-change="open = $event.detail.open"
        @mobile-change="mobile = $event.detail.mobile"
      >
        <div slot="header" class="flex items-center px-4 py-2 text-sm font-medium">Header</div>
        <nav slot="sidebar" class="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
          <span class="rounded-md p-2 text-sm">导航</span>
          <span class="rounded-md p-2 text-sm">组件</span>
        </nav>
        <div class="p-4">
          <p class="m-0 text-sm">
            把视口收窄到 640px 及以下，header 出现 Toggle；点它经 sidebar-open-change 请求打开 Drawer。
          </p>
        </div>
      </web-ui-layout>
    </div>
    <p class="text-sm text-(--wui-color-text-secondary)">
      mobile：{{ mobile ? 'true' : 'false' }} · sidebar-open：{{ open ? 'true' : 'false' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const mobile = ref(false)
</script>
```

## API

### Props

| 名称                  | 说明                                                                                                                                                                             | 类型               | 默认值    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------- |
| `no-sidebar`          | 不渲染任何侧边栏结构：桌面端 aside、收起 Toggle 与 resize handle，移动端 header Toggle 与 Drawer；`sidebar` 插槽内容随之不渲染。                                                 | `boolean`          | `false`   |
| `sidebar-collapsible` | 渲染桌面端收起 / 展开 Toggle。未声明时不渲染 Toggle，也不会因点击产生 `sidebar-collapsed-change` 请求；桌面宽度仍由 `sidebar-collapsed` 控制，移动端 Drawer 的 Toggle 不受影响。 | `boolean`          | `false`   |
| `sidebar-collapsed`   | 桌面端侧边栏的受控收起状态；只收窄桌面端，不影响移动端 Drawer。                                                                                                                  | `boolean`          | `false`   |
| `sidebar-open`        | 移动端侧边栏 Drawer 受控打开状态。                                                                                                                                               | `boolean`          | `false`   |
| `header-glow`         | 在 header 插槽内容背后显示装饰性晕染。                                                                                                                                           | `boolean`          | `false`   |
| `ariaLabels`          | 内置无障碍名（侧栏折叠/展开、调宽、打开导航菜单、主导航）的成组覆盖；未提供的 key 使用内置英文文案，`no-sidebar` 下侧栏相关 key 不参与渲染。                                     | `LayoutAriaLabels` | —         |
| `mobile`              | 只读计算值：当前视口是否处于移动端断点及以下；写 attribute 会被恢复，property 赋值不生效。                                                                                       | `boolean`          | `false`   |
| `sidebar-width`       | 桌面端和移动端展开时的侧边栏宽度。                                                                                                                                               | `string`           | `'240px'` |
| `collapsed-width`     | 桌面端收起时的侧边栏宽度。                                                                                                                                                       | `string`           | `'60px'`  |
| `sidebar-resizable`   | 启用桌面端侧边栏右边缘拖拽调整宽度。                                                                                                                                             | `boolean`          | `false`   |
| `sidebar-min-width`   | 拖拽调整的下限（px）；默认为 `collapsed-width`。                                                                                                                                 | `string`           | —         |
| `sidebar-max-width`   | 拖拽调整的上限（px）；限制在视口一半以内，内置上限优先。                                                                                                                         | `string`           | —         |

### Events

| 名称                       | 说明                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `sidebar-collapsed-change` | 请求更新桌面端收起状态；`detail.collapsed` 是请求值，调用方须回写到 `sidebar-collapsed`。              |
| `sidebar-open-change`      | 请求更新移动端 Drawer 打开状态；`detail.open` 是请求值。                                               |
| `sidebar-width-change`     | 拖拽释放或键盘 Enter 提交调整后请求更新宽度；`detail.width` 是最终像素宽度。                           |
| `mobile-change`            | 不是请求：报告 layout 自己的派生视口状态，`detail.mobile` 与 `mobile` 属性同值，每次跨断点只派发一次。 |

### Slots

| 名称      | 说明                                                                                    |
| --------- | --------------------------------------------------------------------------------------- |
| `banner`  | 位于布局主体上方的可选全宽 Banner。                                                     |
| `header`  | 内容区的 sticky header。                                                                |
| `sidebar` | 侧边栏卡片内容；桌面端的固定区域与滚动容器由调用方自行定义；`no-sidebar` 置位时不渲染。 |
| `default` | 主内容区。                                                                              |
| `tabbar`  | 底部 tabbar。                                                                           |

### 移动端视口状态

`mobile` 是只读输出，不是额外的输入，由 layout 写入。property 只读（赋值不生效，严格模式下抛错），写 attribute 会被立即恢复，两种写法都不派发事件。

它在 `640px` 断点处翻转，与页面切到移动端分支是同一时刻，不经过 resize 去抖。

`mobile-change` 每次跨断点只派发一次，元素在窄视口挂载时的初始求值也算一次。

调用方用 `layout.mobile` 读当前值、用 `mobile-change` 收更新即可，CSS 侧可以写 `web-ui-layout[mobile]`。

### 框架中的使用方式

在宏任务上响应的调用方会读到旧值，而新树已经在屏幕上了：

- Vue：模板里绑 `@mobile-change`，用 `ref` 存值。模板监听在元素插入前挂好，能收到挂载时那次通知。
- React：用 ref 拿到元素，在 `useLayoutEffect` 里先读 `layout.mobile` 再订阅，并用 `flushSync` 回写。先读是为了拿到挂载初值；`flushSync` 是为了让运行时跨断点时抢在 layout 组件重渲染之前，否则会出现一帧「drawer 已按新状态渲染、调用方的值还是旧的」。
- CSS：直接按 `web-ui-layout[mobile]` 写样式，或把它包成一个变体。Tailwind v4 的 app 可以只写一次这条边界的移动端一侧，而不是每个工具类各写一遍：`@custom-variant mobile (&:where(web-ui-layout[mobile], web-ui-layout[mobile] *));`。有两条限制：属性选择器只影响 layout 子树内的节点，被 overlay portal 到 `document.body` 的内容仍需媒体查询；不要用自定义变体处理 min-width 那一侧，因为 Tailwind 把 `@custom-variant` 规则排在主题断点之后，同属性的 `desktop:` 变体会在每个更宽的尺寸静默覆盖 `md:`/`lg:`。

### 收起只作用于桌面端

`sidebar-collapsed` 只收窄桌面端侧边栏，布局不会对移动端 Drawer 应用收起后的尺寸。

两条分支承载的是同一份 `sidebar` 插槽内容。如果侧边栏内容密度跟着该属性变化，调用方必须按 `mobile` 收窄这个条件（例如 `collapsed && !layout.mobile`，或 CSS 的 `web-ui-layout[mobile]`），否则桌面端的收起状态会同样出现在 Drawer 中。

### 无 sidebar 布局

`no-sidebar` 置位后，桌面端不渲染 aside、收起 Toggle 与 resize handle，移动端不渲染 header Toggle 与 Drawer；`banner`、`header`、默认内容与 `tabbar` 的分区与滚动行为不变，内容列直接占满整行。

`sidebar` 插槽没有渲染出口，但调用方节点仍留在 light DOM。该模式下 `sidebar-collapsed`、`sidebar-open`、`sidebar-width` 等属性与 `sidebar-*` 事件都不产生可见效果。侧边栏相关的 `ariaLabels` key 与 CSS Custom Properties 也不产生可见效果。

`mobile` 与 `mobile-change` 照常跟随视口变化。切换进该模式时，进行中的拖拽手势与未提交的宽度调整会被终止，撤下属性后回到 `sidebar-*` 属性管辖的布局。

### 侧边栏调整宽度

启用 `sidebar-resizable` 后，桌面端侧边栏右边缘会出现调整 handle（收起状态下隐藏）；悬停或拖拽时显示 3px 宽的强调色垂直线和 `col-resize` 光标。

- 拖拽时实时更新宽度（禁止过渡动画，限制在 `[min, max]` 和视口范围内）。
- 释放时触发 `sidebar-width-change` 事件并携带最终像素宽度，调用方回写后宽度重新由 `sidebar-width` 属性接管。`pointercancel` 会恢复属性控制的宽度，且不触发事件。
- 键盘操作（WAI-ARIA splitter 模式）：聚焦后用 ←/→ 以 16px 步进调整（Shift 加速到 64px），Home/End 跳到 min/max，Enter 以同一 `sidebar-width-change` 请求提交，Escape 撤回未提交的调整。
- 移动端 Drawer 始终通过其内置 `draggable` drawer 支持拖拽关闭，并启用 `page-shift`。打开时整页向左移动 `16vw`，拖拽期间页面不跟手，关闭后归位。

### 行为说明

`web-ui-layout` 只约束侧边栏卡片的可用空间并管理桌面端 Toggle，不创建桌面端侧边栏 scrollport。

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

在 `640px` 及以下（与 `mobile` 报告的正是同一条条件），侧边栏会切换为使用内置 glass body、可滚动 content 和 drag zone 的 `web-ui-drawer`。

移动端 Drawer 的宽度跟随 `sidebar-width`，圆角跟随 `--wui-layout-sidebar-radius`。

移动端 Toggle 以 glass 变体位于 header 行内。其左缩进默认 `8px`，可通过 `--wui-layout-mobile-toggle-inset` 与调用方自身的 header 内边距对齐。

`header-glow` 会在 header 插槽内容和移动端 Toggle 的背后添加 `pointer-events: none` 的装饰性晕染。它属于 Header 背景层，不在前景层，因此插槽内容始终位于其上方。

晕染来自共享的 `.wui-glow` 样式（`@greypan/web-ui/classes.css`），同一个 class 也能用在任意容器上。

晕染由颜色渐变与一层真实背景模糊叠加而成：渐变从 `--wui-color-page` 过渡到全透明，模糊沿高度衰减到 0，两层互不牵制。

默认渐变方向为 `to bottom`；要改颜色，在 `web-ui-layout`、theme 或其上层任意位置覆盖 `--wui-glow-color` 即可，浅色/暗色模式自动跟随。

模糊层向下探出 `24px`；衰减按绝对长度计，header 更高时底缘强度不变。

横向不越出 header 盒，纵向尾巴会覆盖 header 下方 24px 内的内容。

可通过 `--wui-glow-overhang`、`--wui-glow-fade`、`--wui-glow-blur`、`--wui-glow-gradient` 与 `--wui-glow-gradient-direction` 调整；设为 `--wui-glow-gradient: none` 只保留模糊。

完整 token 表见包根 README 的 Classes 小节。

布局层级顺序为 Header（`10`）< Auxiliary（`20`）< Banner（`30`）< Tabbar（`40`）< Sidebar（`50`）。

侧边栏卡片表面使用 `--wui-color-surface-sidebar`：浅色保持半透明中性分层，深色比 `--wui-color-page` 浅一级，与 `--wui-color-surface` 相同。

它与 dialog、drawer、toast 共用的 `--wui-color-surface-overlay` 相互独立，侧边栏可以采用不同表面。

### CSS Custom Properties

| 名称                                | 说明                                                                | 默认值             |
| ----------------------------------- | ------------------------------------------------------------------- | ------------------ |
| `--wui-layout-viewport-height`      | layout 使用的可用视口高度；嵌入限高容器时设为容器高度               | `100vh` / `100dvh` |
| `--wui-layout-sidebar-radius`       | 侧边栏卡片圆角（桌面端和移动端共用）                                | `24px`             |
| `--wui-layout-mobile-toggle-inset`  | 移动端 header Toggle 的左缩进                                       | `8px`              |
| `--wui-layout-sidebar-toggle-width` | 桌面端侧边栏收起 Toggle 的宽度，下限为 `--wui-control-size`（36px） | `36px`             |

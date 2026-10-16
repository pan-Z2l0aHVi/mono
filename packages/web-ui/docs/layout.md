---
component: layout
tag: web-ui-layout
---

响应式页面布局：可选全宽 Banner、桌面端可折叠侧边栏，移动端默认 drawer。页面本身滚动；Banner 滚出后，桌面端 sidebar 和 header 固定在视口内。

## 示例

### 基础

五个插槽各占一区：`banner` 在主体上方全宽，`header` 是内容区的 sticky header，`sidebar` 是侧边栏卡片内容，默认插槽是主内容区，`tabbar` 是底部栏。`header-glow` 在 header 插槽内容背后加一层装饰性晕染，它属于背景层，插槽内容始终在它上方。

```react
<web-ui-layout header-glow>
  <div slot="banner">全宽 Banner</div>
  <div slot="header">Header</div>
  <nav slot="sidebar">侧边栏</nav>
  <p>正文</p>
  <div slot="tabbar">Tabbar</div>
</web-ui-layout>
```

```vue
<template>
  <web-ui-layout header-glow>
    <div slot="banner">全宽 Banner</div>
    <div slot="header">Header</div>
    <nav slot="sidebar">侧边栏</nav>
    <p>正文</p>
    <div slot="tabbar">Tabbar</div>
  </web-ui-layout>
</template>
```

### 折叠侧边栏

`sidebar-collapsed` 是桌面端的受控折叠状态：它只把桌面端 aside 收窄到 `collapsed-width`，不影响移动端 Drawer。桌面端 Toggle 由 layout 自己渲染，Consumer 只负责把 `sidebar-collapsed-change` 的请求值回写。两条分支渲染的是同一份 `sidebar` 插槽内容，所以内容密度要跟着折叠变的 Consumer 必须按 `mobile` 收窄那个条件（例如 `collapsed && !layout.mobile`，或 CSS 的 `web-ui-layout[mobile]`），否则折叠态会一路渲染进 Drawer（issue #195）。

```react
const [collapsed, setCollapsed] = useState(false)

<web-ui-layout
  sidebarCollapsed={collapsed}
  onsidebar-collapsed-change={event => setCollapsed(event.detail.collapsed)}
>
  <nav slot="sidebar">侧边栏</nav>
  <p>正文</p>
</web-ui-layout>
```

```vue
<template>
  <web-ui-layout :sidebarCollapsed="collapsed" @sidebar-collapsed-change="collapsed = $event.detail.collapsed">
    <nav slot="sidebar">侧边栏</nav>
    <p>正文</p>
  </web-ui-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const collapsed = ref(false)
</script>
```

### 拖拽调整宽度

开启 `sidebar-resizable` 后，桌面端侧边栏右缘出现调整手柄（折叠态隐藏），拖拽实时改宽；键盘聚焦后用 ←/→ 以 16px 步进（Shift 加速到 64px），Home/End 跳到上下限。拖拽释放或键盘 Enter 提交时派发一次 `sidebar-width-change`，携带最终像素宽度；Consumer 回写后宽度重新由 `sidebar-width` 接管，Escape 撤回未提交的调整。`sidebar-min-width` / `sidebar-max-width` 是 px 字面量，上限还受一半视口钳制，内置上限优先于配置值。

```react
const [width, setWidth] = useState('240px')

<web-ui-layout
  sidebar-resizable
  sidebarWidth={width}
  sidebar-min-width="160px"
  sidebar-max-width="360px"
  onsidebar-width-change={event => setWidth(event.detail.width)}
>
  <nav slot="sidebar">侧边栏</nav>
  <p>正文</p>
</web-ui-layout>
```

```vue
<template>
  <web-ui-layout
    sidebar-resizable
    :sidebarWidth="width"
    sidebar-min-width="160px"
    sidebar-max-width="360px"
    @sidebar-width-change="width = $event.detail.width"
  >
    <nav slot="sidebar">侧边栏</nav>
    <p>正文</p>
  </web-ui-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const width = ref('240px')
</script>
```

### 移动端 Drawer 与视口判定

`sidebar-open` 是移动端 Drawer 的受控可见性，与 `sidebar-collapsed` 相互独立。`mobile` 由 layout 独占写入，它、layout 的渲染分支和 CSS 的 `@media (width <= 640px)` 是同一条条件，翻转瞬间三者一起变，还额外派发一次 `mobile-change`。React 要在 `useLayoutEffect` 里先读 `layout.mobile` 再订阅（挂载那一刻派发的事件早于订阅）；跨断点那次回写用 `flushSync`，否则会有一帧新树已上屏而 Consumer 还是旧值（挂载那次读就在 `useLayoutEffect` 里，`setState` 本身上屏前生效，不必再包一层）。Vue 的模板监听在元素插入前挂好，直接绑即可。

```react
import { flushSync } from 'react-dom'
import { useLayoutEffect, useRef, useState } from 'react'

const layoutRef = useRef(null)
const [open, setOpen] = useState(false)
const [mobile, setMobile] = useState(false)

useLayoutEffect(() => {
  const layout = layoutRef.current
  if (!layout) return
  setMobile(layout.mobile)
  const onChange = event => flushSync(() => setMobile(event.detail.mobile))
  layout.addEventListener('mobile-change', onChange)
  return () => layout.removeEventListener('mobile-change', onChange)
}, [])

<web-ui-layout
  ref={layoutRef}
  sidebarOpen={open}
  onsidebar-open-change={event => setOpen(event.detail.open)}
>
  <nav slot="sidebar">导航</nav>
  {mobile ? '移动端' : '桌面端'}
</web-ui-layout>
```

```vue
<template>
  <web-ui-layout
    :sidebarOpen="open"
    @sidebar-open-change="open = $event.detail.open"
    @mobile-change="mobile = $event.detail.mobile"
  >
    <nav slot="sidebar">导航</nav>
    {{ mobile ? '移动端' : '桌面端' }}
  </web-ui-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const mobile = ref(false)
</script>
```

## API

### Props

| 名称                | 说明                                                                                       | 类型      | 默认值    |
| ------------------- | ------------------------------------------------------------------------------------------ | --------- | --------- |
| `sidebar-collapsed` | 桌面端侧边栏受控折叠状态；只收窄桌面端，不影响移动端 Drawer。                              | `boolean` | `false`   |
| `sidebar-open`      | 移动端侧边栏 Drawer 受控打开状态。                                                         | `boolean` | `false`   |
| `header-glow`       | 在 header 插槽内容背后显示装饰性晕染。                                                     | `boolean` | `false`   |
| `mobile`            | 只读派生值：当前视口是否处于移动端断点及以下；写 attribute 会被恢复，property 赋值不生效。 | `boolean` | `false`   |
| `sidebar-width`     | 桌面端和移动端展开时的侧边栏宽度。                                                         | `string`  | `'240px'` |
| `collapsed-width`   | 桌面端折叠时的侧边栏宽度。                                                                 | `string`  | `'68px'`  |
| `sidebar-resizable` | 启用桌面端侧边栏右边缘拖拽调整宽度。                                                       | `boolean` | `false`   |
| `sidebar-min-width` | 拖拽调整的下限（px）；默认回退到 `collapsed-width`。                                       | `string`  | —         |
| `sidebar-max-width` | 拖拽调整的上限（px）；钳制在视口一半以内，内置上限优先。                                   | `string`  | —         |

### Events

| 名称                       | 说明                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `sidebar-collapsed-change` | 请求更新桌面端折叠状态；`detail.collapsed` 是请求值，Consumer 须回写到 `sidebar-collapsed`。           |
| `sidebar-open-change`      | 请求更新移动端 Drawer 打开状态；`detail.open` 是请求值。                                               |
| `sidebar-width-change`     | 拖拽释放或键盘 Enter 提交调整后请求更新宽度；`detail.width` 是最终像素宽度。                           |
| `mobile-change`            | 不是请求：报告 layout 自己的派生视口状态，`detail.mobile` 与 `mobile` 属性同值，每次跨断点只派发一次。 |

### Slots

| 名称      | 说明                                                               |
| --------- | ------------------------------------------------------------------ |
| `banner`  | 位于布局主体上方的可选全宽 Banner。                                |
| `header`  | 内容区的 sticky header。                                           |
| `sidebar` | 侧边栏卡片内容；桌面端内部固定区域与滚动容器由 Consumer 自行定义。 |
| `default` | 主内容区。                                                         |
| `tabbar`  | 底部 tabbar。                                                      |

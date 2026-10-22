---
component: back-top
tag: web-ui-back-top
---

back top button：滚动超过阈值后出现在角落，点击或按 Enter 平滑 back top；也可以挂到自定义滚动容器内。

## 示例

### 基础

默认跟随页面滚动（`scrollTarget` 为 `window`），超过 `threshold` 后显示。

```tsx
<web-ui-back-top threshold={200}></web-ui-back-top>
```

```vue
<template>
  <web-ui-back-top :threshold="200"></web-ui-back-top>
</template>
```

### 滚动行为

`scroll-behavior` 为 `auto` 时点击立即到位，不播放平滑滚动动画。

```tsx
<web-ui-back-top scroll-behavior="auto"></web-ui-back-top>
```

```vue
<template>
  <web-ui-back-top scroll-behavior="auto"></web-ui-back-top>
</template>
```

### 自定义滚动容器

把 `scrollTarget` 指向自己的滚动容器后，button 以 `position: sticky` 悬浮在容器右下角，只随该容器滚动出现。`scrollTarget` 是 element 属性，需要在挂载后赋值。

```tsx
const scrollBoxRef = useRef(null)
const backTopRef = useRef(null)

useEffect(() => {
  if (scrollBoxRef.current && backTopRef.current) {
    backTopRef.current.scrollTarget = scrollBoxRef.current
  }
}, [])

return (
  <div ref={scrollBoxRef} className="scroll-box">
    <web-ui-back-top ref={backTopRef} threshold={300}></web-ui-back-top>
  </div>
)
```

```vue
<template>
  <div ref="scrollBox" class="scroll-box">
    <web-ui-back-top ref="backTop" :threshold="300"></web-ui-back-top>
  </div>
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'

const scrollBox = useTemplateRef('scrollBox')
const backTop = useTemplateRef('backTop')

onMounted(() => {
  if (scrollBox.value && backTop.value) backTop.value.scrollTarget = scrollBox.value
})
</script>
```

### 自定义内容

默认插槽替换 button 内容，交互语义仍由组件提供。

```tsx
<web-ui-back-top>
  <web-ui-button variant="primary">back top</web-ui-button>
</web-ui-back-top>
```

```vue
<template>
  <web-ui-back-top>
    <web-ui-button variant="primary">back top</web-ui-button>
  </web-ui-back-top>
</template>
```

## API

### Props

| 名称              | 说明                                                     | 类型                    | 默认值     |
| ----------------- | -------------------------------------------------------- | ----------------------- | ---------- |
| `scroll-behavior` | 滚动行为：`smooth`（默认）或 `auto`。                    | `'smooth' \| 'auto'`    | `'smooth'` |
| `visible`         | 当前可见状态，由滚动位置驱动。                           | `boolean`               | `false`    |
| `scrollTarget`    | 滚动容器，`window`（默认）或 `HTMLElement`（property）。 | `HTMLElement \| Window` | `window`   |
| `threshold`       | 显示 button 的滚动阈值（px）。                           | `number`                | `200`      |

### Slots

| 名称      | 说明                 |
| --------- | -------------------- |
| `default` | 自定义 button 内容。 |

### Methods

| 名称      | 说明                                        |
| --------- | ------------------------------------------- |
| `toTop()` | 滚动回顶部，行为由 `scroll-behavior` 决定。 |

### 定位

`scrollTarget` 为 `window` 时 button 固定在视口角落；为 `HTMLElement` 时需将元素放置在容器内部，button 通过 `position: sticky` 悬浮于容器底部角落。偏移量沿用 `--wui-back-top-top/right/bottom/left` CSS 变量。

角色：`button`，键盘 Enter 触发 back top。

### CSS Custom Properties

| 名称                      | 说明     | 默认值                           |
| ------------------------- | -------- | -------------------------------- |
| `--wui-back-top-position` | CSS 定位 | `fixed`                          |
| `--wui-back-top-z-index`  | 层级     | `var(--wui-layer-auxiliary, 20)` |
| `--wui-back-top-top`      | 上偏移   | `auto`                           |
| `--wui-back-top-right`    | 右偏移   | `20px`                           |
| `--wui-back-top-bottom`   | 下偏移   | `20px`                           |
| `--wui-back-top-left`     | 左偏移   | `auto`                           |

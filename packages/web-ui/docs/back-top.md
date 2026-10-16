---
component: back-top
tag: web-ui-back-top
---

回到顶部按钮：滚动超过阈值后出现在角落，点击或按 Enter 平滑回到顶部；也可以挂到自定义滚动容器内。

## 示例

### 基础

默认跟随页面滚动（`scrollTarget` 为 `window`），超过 `threshold` 后显示。

```react
<web-ui-back-top threshold={200}></web-ui-back-top>
```

```vue
<template>
  <web-ui-back-top :threshold="200"></web-ui-back-top>
</template>
```

### 滚动行为

`scroll-behavior` 为 `auto` 时点击立即到位，不播放平滑滚动动画。

```react
<web-ui-back-top scroll-behavior="auto"></web-ui-back-top>
```

```vue
<template>
  <web-ui-back-top scroll-behavior="auto"></web-ui-back-top>
</template>
```

### 自定义滚动容器

把 `scrollTarget` 指向自己的滚动容器后，按钮以 `position: sticky` 悬浮在容器右下角，只随该容器滚动出现。`scrollTarget` 是 element 属性，需要在挂载后赋值。

```react
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

默认插槽替换按钮内容，交互语义仍由组件提供。

```react
<web-ui-back-top>
  <web-ui-button variant="primary">回到顶部</web-ui-button>
</web-ui-back-top>
```

```vue
<template>
  <web-ui-back-top>
    <web-ui-button variant="primary">回到顶部</web-ui-button>
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
| `threshold`       | 显示按钮的滚动阈值（px）。                               | `number`                | `200`      |

### Slots

| 名称      | 说明             |
| --------- | ---------------- |
| `default` | 自定义按钮内容。 |

### Methods

| 名称      | 说明                                        |
| --------- | ------------------------------------------- |
| `toTop()` | 滚动回顶部，行为由 `scroll-behavior` 决定。 |

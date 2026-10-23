---
component: back-top
tag: web-ui-back-top
---

回到顶部 button（`web-ui-back-top`）：滚动位置达到 `threshold` 后出现在角落，点击或按 Enter / Space 回到顶部。默认平滑回顶；主题设置为 `motion="reduced"`，或 `motion="system"` 且系统偏好减少动效时，点击或按 Enter 会立即回顶。默认跟随页面滚动；把 `scrollTarget` 指向某个滚动容器后，它只随该容器滚动出现，并停在容器底部角落。

## 示例

### 自定义滚动容器 {#container}

`scrollTarget` 是 element property 而不是 attribute，所以只能在挂载后赋值：先用 `ref` 拿到容器与 `<web-ui-back-top>`，再在 `useEffect` / `onMounted` 里把容器交给它。赋值后组件把 `scroll` 监听重绑到该容器，并切到容器模式——宿主变成 `position: sticky`、停在容器底部，容器滚动达到 `threshold` 后 button 才出现，点击回容器顶部。因此元素必须放在滚动容器内部，容器自己要有可滚动的溢出内容；三条示例都用原生 `overflow-auto`。

```tsx
import type { WebUiBackTop } from '@greypan/web-ui'
import { useEffect, useRef } from 'react'

export default function Demo() {
  const boxRef = useRef<HTMLDivElement>(null)
  const backTopRef = useRef<WebUiBackTop>(null)

  useEffect(() => {
    const box = boxRef.current
    if (box && backTopRef.current) backTopRef.current.scrollTarget = box
  }, [])

  return (
    <div ref={boxRef} className="h-40 w-full overflow-auto rounded-xl border border-(--wui-color-border) p-3">
      {Array.from({ length: 20 }, (_, index) => (
        <p key={index} className="m-0 py-1 text-sm">
          滚动容器第 {index + 1} 行
        </p>
      ))}
      <web-ui-back-top ref={backTopRef} threshold={100}></web-ui-back-top>
    </div>
  )
}
```

```vue
<template>
  <div ref="box" class="h-40 w-full overflow-auto rounded-xl border border-(--wui-color-border) p-3">
    <p v-for="row in rows" :key="row" class="m-0 py-1 text-sm">{{ row }}</p>
    <web-ui-back-top ref="backTop" :threshold="100"></web-ui-back-top>
  </div>
</template>

<script setup lang="ts">
import type { WebUiBackTop } from '@greypan/web-ui'
import { onMounted, useTemplateRef } from 'vue'

const rows = Array.from({ length: 20 }, (_, index) => `滚动容器第 ${index + 1} 行`)
const box = useTemplateRef<HTMLDivElement>('box')
const backTop = useTemplateRef<WebUiBackTop>('backTop')

onMounted(() => {
  if (box.value && backTop.value) backTop.value.scrollTarget = box.value
})
</script>
```

### 自定义内容 {#custom-content}

default slot 整体替换 button 的视觉内容，交互语义仍由组件提供：内层 wrapper 是 `role="button"`、`tabindex="0"`，指针点击、Enter 与 Space 都触发 `toTop()`。默认内容是 `web-ui-button` 包着的上箭头 icon；换成一条 primary button 后，出现时机、阈值与滚动行为都不变。

button 的无障碍名称默认来自 slot 内容；默认 icon 内容回退为 `Back to top`。可在宿主设置 `aria-label` 指定名称；设置时应包含可见标签文本。自定义内容本身没有可访问名称时，也应设置宿主 `aria-label`。

```tsx
import type { WebUiBackTop } from '@greypan/web-ui'
import { useEffect, useRef } from 'react'

export default function Demo() {
  const boxRef = useRef<HTMLDivElement>(null)
  const backTopRef = useRef<WebUiBackTop>(null)

  useEffect(() => {
    const box = boxRef.current
    if (box && backTopRef.current) backTopRef.current.scrollTarget = box
  }, [])

  return (
    <div ref={boxRef} className="h-40 w-full overflow-auto rounded-xl border border-(--wui-color-border) p-3">
      {Array.from({ length: 20 }, (_, index) => (
        <p key={index} className="m-0 py-1 text-sm">
          滚动容器第 {index + 1} 行
        </p>
      ))}
      <web-ui-back-top ref={backTopRef} threshold={100}>
        <web-ui-button variant="primary">回到顶部</web-ui-button>
      </web-ui-back-top>
    </div>
  )
}
```

```vue
<template>
  <div ref="box" class="h-40 w-full overflow-auto rounded-xl border border-(--wui-color-border) p-3">
    <p v-for="row in rows" :key="row" class="m-0 py-1 text-sm">{{ row }}</p>
    <web-ui-back-top ref="backTop" :threshold="100">
      <web-ui-button variant="primary">回到顶部</web-ui-button>
    </web-ui-back-top>
  </div>
</template>

<script setup lang="ts">
import type { WebUiBackTop } from '@greypan/web-ui'
import { onMounted, useTemplateRef } from 'vue'

const rows = Array.from({ length: 20 }, (_, index) => `滚动容器第 ${index + 1} 行`)
const box = useTemplateRef<HTMLDivElement>('box')
const backTop = useTemplateRef<WebUiBackTop>('backTop')

onMounted(() => {
  if (box.value && backTop.value) backTop.value.scrollTarget = box.value
})
</script>
```

### 立即回到顶部 {#instant}

`scroll-behavior="auto"` 不请求平滑滚动，点击直接跳到顶部。主题要求减少动效时，即使属性为默认的 `smooth` 或滚动容器的 CSS 指定 `scroll-behavior: smooth`，点击或按 Enter 也会立即到位。两者只在滚动方式上不同：可见性判断、阈值与 slot 都不受影响。

```tsx
import type { WebUiBackTop } from '@greypan/web-ui'
import { useEffect, useRef } from 'react'

export default function Demo() {
  const boxRef = useRef<HTMLDivElement>(null)
  const backTopRef = useRef<WebUiBackTop>(null)

  useEffect(() => {
    const box = boxRef.current
    if (box && backTopRef.current) backTopRef.current.scrollTarget = box
  }, [])

  return (
    <div ref={boxRef} className="h-40 w-full overflow-auto rounded-xl border border-(--wui-color-border) p-3">
      {Array.from({ length: 20 }, (_, index) => (
        <p key={index} className="m-0 py-1 text-sm">
          滚动容器第 {index + 1} 行
        </p>
      ))}
      <web-ui-back-top ref={backTopRef} threshold={100} scrollBehavior="auto"></web-ui-back-top>
    </div>
  )
}
```

```vue
<template>
  <div ref="box" class="h-40 w-full overflow-auto rounded-xl border border-(--wui-color-border) p-3">
    <p v-for="row in rows" :key="row" class="m-0 py-1 text-sm">{{ row }}</p>
    <web-ui-back-top ref="backTop" :threshold="100" scroll-behavior="auto"></web-ui-back-top>
  </div>
</template>

<script setup lang="ts">
import type { WebUiBackTop } from '@greypan/web-ui'
import { onMounted, useTemplateRef } from 'vue'

const rows = Array.from({ length: 20 }, (_, index) => `滚动容器第 ${index + 1} 行`)
const box = useTemplateRef<HTMLDivElement>('box')
const backTop = useTemplateRef<WebUiBackTop>('backTop')

onMounted(() => {
  if (box.value && backTop.value) backTop.value.scrollTarget = box.value
})
</script>
```

## API

### Props

| 名称              | 说明                                                                                    | 类型                    | 默认值                      |
| ----------------- | --------------------------------------------------------------------------------------- | ----------------------- | --------------------------- |
| `aria-label`      | button 名称。宿主值优先；否则使用 slot 内容的可访问名称，默认内容回退为 `Back to top`。 | `string`                | `'Back to top'`（默认内容） |
| `scroll-behavior` | 滚动行为：`smooth`（默认）或 `auto`；主题要求减少动效时立即滚动。                       | `'smooth' \| 'auto'`    | `'smooth'`                  |
| `visible`         | 当前可见状态，由滚动位置驱动。                                                          | `boolean`               | `false`                     |
| `scrollTarget`    | 滚动容器，`window`（默认）或 `HTMLElement`（property）。                                | `HTMLElement \| Window` | `window`                    |
| `threshold`       | 显示 button 的滚动阈值（px）。                                                          | `number`                | `200`                       |

### Slots

| 名称      | 说明                 |
| --------- | -------------------- |
| `default` | 自定义 button 内容。 |

### Methods

| 名称      | 说明                                     |
| --------- | ---------------------------------------- |
| `toTop()` | 滚动回顶部；主题要求减少动效时立即滚动。 |

### 定位

`scrollTarget` 为 `window` 时 button 固定在视口角落；为 `HTMLElement` 时需将元素放置在容器内部，button 通过 `position: sticky` 悬浮于容器底部角落。偏移量沿用 `--wui-back-top-top/right/bottom/left` CSS 变量。

角色：`button`，默认内容无障碍名称为 `Back to top`；自定义内容时名称来自 slot，宿主 `aria-label` 可显式指定名称。键盘 Enter 与 Space 都触发 back top。

### CSS Custom Properties

| 名称                      | 说明     | 默认值                           |
| ------------------------- | -------- | -------------------------------- |
| `--wui-back-top-position` | CSS 定位 | `fixed`                          |
| `--wui-back-top-z-index`  | 层级     | `var(--wui-layer-auxiliary, 20)` |
| `--wui-back-top-top`      | 上偏移   | `auto`                           |
| `--wui-back-top-right`    | 右偏移   | `20px`                           |
| `--wui-back-top-bottom`   | 下偏移   | `20px`                           |
| `--wui-back-top-left`     | 左偏移   | `auto`                           |

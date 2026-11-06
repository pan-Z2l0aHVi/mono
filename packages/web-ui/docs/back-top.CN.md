# Back Top

回到顶部按钮（`web-ui-back-top`）在滚动位置达到 `threshold` 后出现在角落。点击它，或按 Enter / Space，回到顶部。

默认平滑回顶。主题设置为 `motion="reduced"`，或 `motion="system"` 且系统偏好减少动效时，点击或按 Enter 会立即回顶。

默认跟随页面滚动。把 `scrollTarget` 指向某个滚动容器后，它只随该容器滚动出现，并停在容器的底部角落。

## Samples

### Custom scroll container

`scrollTarget` 是元素上的 property，不是 attribute，所以只能在挂载后赋值：先用 `ref` 拿到容器和 `<web-ui-back-top>`，再在 `useEffect` / `onMounted` 里把容器交给它。

赋值后，按钮在容器内以 `position: sticky` 停在底部，容器滚动达到 `threshold` 后才出现，点击回到容器顶部。

因此元素必须放在滚动容器内部，容器自己要有可滚动的溢出内容。

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

### Custom content

默认插槽整体替换按钮的视觉内容。点击、Enter 和 Space 都触发 `toTop()`，角色仍是 `button`。

默认内容是一个上箭头图标，外层是 `web-ui-button`。

按钮的无障碍名称默认来自插槽内容。默认图标内容回退为内置英文文案（`Back to top`，不随文档 `lang` 变化）。可以在宿主上设置 `aria-label` 指定名称；设置时应包含可见的标签文本。自定义内容本身没有可访问名称时，也应设置宿主的 `aria-label`。

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

### Jump to top immediately

`scroll-behavior="auto"` 不请求平滑滚动，点击直接跳到顶部。

主题要求减少动效时，即使属性为默认的 `smooth` 或滚动容器的 CSS 指定 `scroll-behavior: smooth`，点击或按 Enter 也会立即到位。

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

| 名称              | 说明                                                                                       | 类型                    | 默认值                      |
| ----------------- | ------------------------------------------------------------------------------------------ | ----------------------- | --------------------------- |
| `aria-label`      | 按钮名称。宿主值优先；否则使用插槽内容的可访问名称，默认内容回退为内置英文 `Back to top`。 | `string`                | `'Back to top'`（英文文档） |
| `scroll-behavior` | 滚动行为：`smooth`（默认）或 `auto`；主题要求减少动效时立即滚动。                          | `'smooth' \| 'auto'`    | `'smooth'`                  |
| `visible`         | 当前可见状态，由滚动位置驱动。                                                             | `boolean`               | `false`                     |
| `scrollTarget`    | 滚动容器，`window`（默认）或 `HTMLElement`（property）。                                   | `HTMLElement \| Window` | `window`                    |
| `threshold`       | 显示按钮的滚动阈值（px）。                                                                 | `number`                | `200`                       |

### Slots

| 名称      | 说明             |
| --------- | ---------------- |
| `default` | 自定义按钮内容。 |

### Methods

| 名称      | 说明                                     |
| --------- | ---------------------------------------- |
| `toTop()` | 滚动回顶部；主题要求减少动效时立即滚动。 |

### 定位

`scrollTarget` 为 `window` 时，按钮固定在视口角落，四个方向的偏移由 `--wui-back-top-top/right/bottom/left` 控制。`scrollTarget` 为 `HTMLElement` 时，元素需要放在容器内部，按钮通过 `position: sticky` 停在容器底部角落。水平偏移使用 `--wui-back-top-left/right`，垂直偏移使用 `--wui-back-top-bottom`，`--wui-back-top-top` 不参与容器内的定位。

角色是 `button`。默认内容的无障碍名称回退为内置英文 `Back to top`。使用自定义内容时，名称来自插槽内容，宿主 `aria-label` 可以显式指定名称。键盘 Enter 和 Space 都能触发回到顶部。

### CSS Custom Properties

| 名称                      | 说明                     | 默认值                            |
| ------------------------- | ------------------------ | --------------------------------- |
| `--wui-back-top-position` | CSS 定位                 | `fixed`                           |
| `--wui-back-top-z-index`  | 层级                     | `var(--wui-layer-auxiliary, 200)` |
| `--wui-back-top-top`      | 上偏移（仅 window 模式） | `auto`                            |
| `--wui-back-top-right`    | 右偏移                   | `20px`                            |
| `--wui-back-top-bottom`   | 下偏移                   | `20px`                            |
| `--wui-back-top-left`     | 左偏移                   | `auto`                            |

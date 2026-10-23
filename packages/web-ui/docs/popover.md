---
component: popover
tag: web-ui-popover
---

锚定触发元素的弹出层，支持 click / hover / manual 三种触发方式，`trigger` 插槽放 trigger、默认插槽放 panel 内容。

## 示例

### 基础 {#basic}

click 模式点 trigger 切换，点 panel 外或按 Escape 关闭；trigger 请放入可交互元素（`web-ui-button` 或原生 `button`），开合状态会回写到它的 `aria-expanded` / `aria-controls`。`open-change` 只在用户来源的开合后派发，程序式写 `open` 不派发；下面那行读数就是最近一次通知的值。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <web-ui-popover
        onopen-change={event => {
          setCount(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <web-ui-button slot="trigger" variant="secondary">
          显示详情
        </web-ui-button>
        <div className="flex max-w-xs flex-col gap-1 text-sm">
          <span className="font-semibold">发布详情</span>
          <span>panel 放任意节点；点 trigger 切换，点外面或按 Escape 关闭。</span>
        </div>
      </web-ui-popover>
      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change：{count} 次 · 最后一次 detail.open = {last}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <web-ui-popover @open-change="onOpenChange">
      <web-ui-button slot="trigger" variant="secondary">显示详情</web-ui-button>
      <div class="flex max-w-xs flex-col gap-1 text-sm">
        <span class="font-semibold">发布详情</span>
        <span>panel 放任意节点；点 trigger 切换，点外面或按 Escape 关闭。</span>
      </div>
    </web-ui-popover>
    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change：{{ count }} 次 · 最后一次 detail.open = {{ last }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiPopover } from '@greypan/web-ui'
import { ref } from 'vue'

const count = ref(0)
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiPopover, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### Hover 触发 {#hover}

`trigger="hover"` 用 `pointerenter` / `pointerleave` 加 100ms 延迟控制开合；指针从 trigger 移进 panel 不会收起。click 与 focus 在这个模式下都不触发，读数同样只跟随用户来源的 `open-change`。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <web-ui-popover
        trigger="hover"
        placement="top"
        onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
      >
        <web-ui-button slot="trigger" variant="secondary">
          悬停我
        </web-ui-button>
        <div className="max-w-xs text-sm">悬停显示的 panel；移进 panel 内仍然开着，离开 100ms 后才收起。</div>
      </web-ui-popover>
      <output className="text-sm text-(--wui-color-text-secondary)">最后一次 detail.open = {last}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <web-ui-popover trigger="hover" placement="top" @open-change="last = $event.detail.open ? 'true' : 'false'">
      <web-ui-button slot="trigger" variant="secondary">悬停我</web-ui-button>
      <div class="max-w-xs text-sm">悬停显示的 panel；移进 panel 内仍然开着，离开 100ms 后才收起。</div>
    </web-ui-popover>
    <output class="text-sm text-(--wui-color-text-secondary)">最后一次 detail.open = {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const last = ref('—')
</script>
```

### 受控开合 {#controlled}

`trigger="manual"` 不响应悬停，点 panel 外与 Escape 也不会关闭；开合由外部 button 调用 `show()` / `close()` 或点 trigger 自己切换。`open` 由页面状态持有：程序式调用不派发 `open-change`，所以 button 在调用后自己同步状态；用户点 trigger 时组件切换并派发 `open-change`，handler 把 `detail.open` 回写进同一份状态。下面读数就是页面持有的 `open`。

```tsx
import type { WebUiPopover } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const panel = useRef<WebUiPopover>(null)
  const [open, setOpen] = useState(false)

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <web-ui-popover ref={panel} trigger="manual" open={open} onopen-change={event => setOpen(event.detail.open)}>
        <web-ui-button slot="trigger" variant="secondary">
          手动开合
        </web-ui-button>
        <div className="flex max-w-xs flex-col gap-1 text-sm">
          <span className="font-semibold">manual 模式</span>
          <span>不响应悬停；点击面板外或按 Escape 也不关闭。</span>
        </div>
      </web-ui-popover>
      <div className="flex flex-wrap items-center gap-2">
        <web-ui-button
          size="28"
          variant="secondary"
          onClick={() => {
            panel.current?.show()
            setOpen(true)
          }}
        >
          show()
        </web-ui-button>
        <web-ui-button
          size="28"
          variant="secondary"
          onClick={() => {
            panel.current?.close()
            setOpen(false)
          }}
        >
          close()
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">open = {String(open)}</output>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <web-ui-popover ref="panel" trigger="manual" :open="open" @open-change="open = $event.detail.open">
      <web-ui-button slot="trigger" variant="secondary">手动开合</web-ui-button>
      <div class="flex max-w-xs flex-col gap-1 text-sm">
        <span class="font-semibold">manual 模式</span>
        <span>不响应悬停；点击面板外或按 Escape 也不关闭。</span>
      </div>
    </web-ui-popover>
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button size="28" variant="secondary" @click="show">show()</web-ui-button>
      <web-ui-button size="28" variant="secondary" @click="close">close()</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">open = {{ open }}</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiPopover } from '@greypan/web-ui'
import { ref, useTemplateRef } from 'vue'

const panel = useTemplateRef<WebUiPopover>('panel')
const open = ref(false)

function show() {
  panel.value?.show()
  open.value = true
}

function close() {
  panel.value?.close()
  open.value = false
}
</script>
```

## API

### Props

| 名称               | 说明                                           | 类型                             | 默认值     |
| ------------------ | ---------------------------------------------- | -------------------------------- | ---------- |
| `open`             | 弹出层可见性。                                 | `boolean`                        | `false`    |
| `disabled`         | 禁用状态。                                     | `boolean`                        | `false`    |
| `placement`        | Floating UI 位置。                             | `Placement`                      | `'bottom'` |
| `offset`           | 与锚点的距离（px）。                           | `number`                         | `8`        |
| `trigger`          | 触发方式：`click`（默认）、`hover`、`manual`。 | `'click' \| 'hover' \| 'manual'` | `'click'`  |
| `portal`           | 在 theme-owned overlay root 中渲染。           | `boolean`                        | `false`    |
| `overlayContainer` | 显式 Portal 容器（property）。                 | `OverlayContainer`               | —          |

### Events

| 名称          | 说明                                   |
| ------------- | -------------------------------------- |
| `open-change` | 弹出层开合，`detail.open` 为当前状态。 |

### Slots

| 名称      | 说明                        |
| --------- | --------------------------- |
| `trigger` | trigger，请放入可交互元素。 |
| `default` | 弹出层内容。                |

### Methods

| 名称       | 说明                                          |
| ---------- | --------------------------------------------- |
| `show()`   | 打开弹出层；`disabled` 或已打开时不产生效果。 |
| `close()`  | 关闭弹出层；已关闭时不产生效果。              |
| `toggle()` | 按当前 `open` 切换。                          |

### 行为说明

Hover 模式使用 `pointerenter`/`pointerleave` 加延迟控制。Click 模式点击切换。Manual 模式不响应悬停，点击面板外与 Escape 也不关闭；trigger 点击与 `show()` / `close()` 都能改 `open`，其中程序式调用不派发 `open-change`。

### trigger ARIA

开合状态回写到 trigger 元素：`aria-expanded` 与 `aria-controls`（指向 panel）设在 `trigger` slot 的首个 assigned element 上（包装结构上的同名属性保留兼容）。trigger slot 请放入可交互元素（原生 button、`web-ui-button`）。

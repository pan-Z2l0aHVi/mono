# Popover

锚定在触发元素上的弹出层。`trigger` 用空格分隔的手势集合说明哪些操作能开合它，可写 `click`、`hover`、`focus`、`manual`；`trigger` 插槽放 trigger，默认插槽放 panel 内容。

## Samples

### Basic

click 模式下点 trigger 切换开合，点 panel 外或按 Escape 关闭。trigger 里请放可交互元素（`web-ui-button` 或原生 `button`），开合状态会回写到它的 `aria-expanded` / `aria-controls`。

`open-change` 只在用户操作引起的开合后派发，程序式写 `open` 不派发。

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

### Hover trigger

`trigger="hover"` 由指针进出控制开合，带短暂延迟。指针从 trigger 移进 panel 不会收起。这个取值下 click 与 focus 都不触发；要让指针和键盘都能开，把两个手势并排写：`trigger="hover focus"`。

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

### Focus trigger

`trigger="focus"` 由键盘聚焦展开：判定跟浏览器的焦点环一致（`:focus-visible`），用鼠标点出来的聚焦不算。焦点离开 trigger 和 panel 之后收起。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-popover trigger="focus" onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}>
          <web-ui-button slot="trigger" variant="secondary">
            键盘聚焦
          </web-ui-button>
          <div className="max-w-xs text-sm">Tab 走到这个按钮时展开，焦点离开后收起；用鼠标点它不会开。</div>
        </web-ui-popover>
        <web-ui-popover trigger="click focus" placement="top">
          <web-ui-button slot="trigger" variant="secondary">
            点击或聚焦
          </web-ui-button>
          <div className="max-w-xs text-sm">点击切换开合，键盘聚焦直接展开。</div>
        </web-ui-popover>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">「键盘聚焦」最近一次 detail.open = {last}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-popover trigger="focus" @open-change="last = $event.detail.open ? 'true' : 'false'">
        <web-ui-button slot="trigger" variant="secondary">键盘聚焦</web-ui-button>
        <div class="max-w-xs text-sm">Tab 走到这个按钮时展开，焦点离开后收起；用鼠标点它不会开。</div>
      </web-ui-popover>
      <web-ui-popover trigger="click focus" placement="top">
        <web-ui-button slot="trigger" variant="secondary">点击或聚焦</web-ui-button>
        <div class="max-w-xs text-sm">点击切换开合，键盘聚焦直接展开。</div>
      </web-ui-popover>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">「键盘聚焦」最近一次 detail.open = {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const last = ref('—')
</script>
```

### Controlled open state

`trigger="manual"` 不响应悬停，点 panel 外或按 Escape 也不会关闭。开合由 `show()` / `close()` 或点 trigger 切换。程序式调用不派发 `open-change`，因此调用方需要自己同步 `open`；用户操作引起的开合再通过 `open-change` 回写。

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

| 名称               | 说明                                                                                                         | 类型               | 默认值     |
| ------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------ | ---------- |
| `open`             | 弹出层可见性。                                                                                               | `boolean`          | `false`    |
| `disabled`         | 禁用状态。                                                                                                   | `boolean`          | `false`    |
| `placement`        | panel 位置，默认 `bottom`。                                                                                  | `Placement`        | `'bottom'` |
| `offset`           | 与锚点的距离（px）。                                                                                         | `number`           | `8`        |
| `trigger`          | 触发手势集合，空格分隔：`click`、`hover`、`focus`、`manual`；property 通道也可直接给数组，读回始终是字符串。 | `string`           | `'click'`  |
| `portal`           | 在主题的 overlay 容器中渲染。                                                                                | `boolean`          | `false`    |
| `overlayContainer` | 显式指定 panel 挂载的 overlay 容器（property）。                                                             | `OverlayContainer` | —          |

### Events

| 名称          | 说明                                   |
| ------------- | -------------------------------------- |
| `open-change` | 弹出层开合，`detail.open` 为当前状态。 |

### Slots

| 名称      | 说明                      |
| --------- | ------------------------- |
| `trigger` | trigger；请放可交互元素。 |
| `default` | 弹出层内容。              |

### Methods

| 名称       | 说明                                          |
| ---------- | --------------------------------------------- |
| `show()`   | 打开弹出层；`disabled` 或已打开时不产生效果。 |
| `close()`  | 关闭弹出层；已关闭时不产生效果。              |
| `toggle()` | 按当前 `open` 切换。                          |

### 行为说明

`trigger` 里的每个手势各接各的事件，可以任意组合：

- `click`：点 trigger 切换；点 panel 外、或者焦点离开 trigger 和 panel 之后收起。
- `hover`：指针进 trigger 延迟 100ms 展开，离开 trigger 与 panel 后延迟 100ms 收起；触屏指针不算。
- `focus`：键盘聚焦（`:focus-visible`）立即展开；焦点离开 trigger 和 panel 之后收起。
- `manual`：不接受任何自动收起，点 panel 外、失焦与 Escape 都不关。

按 Escape 收起由覆盖层统一仲裁：`manual` 之外都能关，`manual` 会把这次按键接住，不外溢到外层 overlay。trigger 点击与 `show()` / `close()` 都能改 `open`，其中程序式调用不派发 `open-change`。

`trigger` 里出现 `manual` 时整串只按 `manual` 处理；一个已知手势都没写时回退到默认的 `click`。

### trigger ARIA

开合状态回写到 trigger 元素：`aria-expanded` 与 `aria-controls`（指向 panel）设在 `trigger` 插槽的第一个元素上。

trigger 插槽请放可交互元素（原生 button、`web-ui-button`）。

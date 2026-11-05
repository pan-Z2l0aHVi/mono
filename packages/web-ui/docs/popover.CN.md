# Popover

锚定在触发元素上的弹出层。`trigger` 用手势集合说明哪些操作能开合它，可写 `click`、`hover`、`focus`、`none`；`trigger` 插槽放触发器，默认插槽放面板内容。

## Samples

### Basic

点击模式下点触发器切换开合，点面板外或按 Escape 关闭。触发器里请放可交互元素（`web-ui-button` 或原生 `button`），开合状态会回写到它的 `aria-expanded` / `aria-controls`。

`open-change` 在手势或 `show()` / `hide()` 改变开合后派发；直接写 `open` 是静默的。

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
          <span>面板放任意节点；点触发器切换，点外面或按 Escape 关闭。</span>
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
        <span>面板放任意节点；点触发器切换，点外面或按 Escape 关闭。</span>
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

`trigger="hover"` 由指针进出控制开合，带延迟：进入触发器后按 `show-delay` 展开，离开触发器与面板后按 `hide-delay` 收起。指针从触发器移进面板不会收起。这个取值下点击与焦点都不触发；要让指针和键盘都能开，把两个手势并排写：`trigger="hover focus"`。

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
        <div className="max-w-xs text-sm">悬停显示的面板；移进面板内仍然开着，离开 100ms 后才收起。</div>
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
      <div class="max-w-xs text-sm">悬停显示的面板；移进面板内仍然开着，离开 100ms 后才收起。</div>
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

`trigger="focus"` 由键盘聚焦展开：判定跟浏览器的焦点环一致（`:focus-visible`），用鼠标点出来的聚焦不算。焦点离开触发器和面板之后收起。

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

`trigger="none"` 不接受任何手势，也不参与点面板外关闭和 Escape。开合只由 `show()` / `hide()` 或写在 `open` 上的声明式属性控制。`show()` / `hide()` 会派发 `open-change`，可以像下面这样把 `detail.open` 回写到 `open`；直接给 `open` 赋值是静默的。

```tsx
import type { WebUiPopover } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const panel = useRef<WebUiPopover>(null)
  const [open, setOpen] = useState(false)

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <web-ui-popover ref={panel} trigger="none" open={open} onopen-change={event => setOpen(event.detail.open)}>
        <web-ui-button slot="trigger" variant="secondary">
          手动开合
        </web-ui-button>
        <div className="flex max-w-xs flex-col gap-1 text-sm">
          <span className="font-semibold">none 模式</span>
          <span>不响应手势；点击面板外或按 Escape 也不关闭。</span>
        </div>
      </web-ui-popover>
      <div className="flex flex-wrap items-center gap-2">
        <web-ui-button size="28" variant="secondary" onClick={() => panel.current?.show()}>
          show()
        </web-ui-button>
        <web-ui-button size="28" variant="secondary" onClick={() => panel.current?.hide()}>
          hide()
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
    <web-ui-popover ref="panel" trigger="none" :open="open" @open-change="open = $event.detail.open">
      <web-ui-button slot="trigger" variant="secondary">手动开合</web-ui-button>
      <div class="flex max-w-xs flex-col gap-1 text-sm">
        <span class="font-semibold">none 模式</span>
        <span>不响应手势；点击面板外或按 Escape 也不关闭。</span>
      </div>
    </web-ui-popover>
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button size="28" variant="secondary" @click="panel?.show()">show()</web-ui-button>
      <web-ui-button size="28" variant="secondary" @click="panel?.hide()">hide()</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">open = {{ open }}</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiPopover } from '@greypan/web-ui'
import { ref, useTemplateRef } from 'vue'

const panel = useTemplateRef<WebUiPopover>('panel')
const open = ref(false)
</script>
```

## API

### Props

| 名称               | 说明                                                                                      | 类型               | 默认值     |
| ------------------ | ----------------------------------------------------------------------------------------- | ------------------ | ---------- |
| `open`             | 弹出层可见性。                                                                            | `boolean`          | `false`    |
| `isOpen`           | 当前是否打开（只读）。                                                                    | `boolean`          | —          |
| `disabled`         | 禁用状态。                                                                                | `boolean`          | `false`    |
| `placement`        | 面板位置，默认 `bottom`。                                                                 | `Placement`        | `'bottom'` |
| `offset`           | 与锚点的距离（px）。                                                                      | `number`           | `8`        |
| `trigger`          | 触发手势集合，空格或逗号分隔：`click`、`hover`、`focus`、`none`；读回为逗号分隔的规范串。 | `string`           | `'click'`  |
| `show-delay`       | 悬停打开的延迟（毫秒）；只影响 hover 来源。                                               | `number`           | `200`      |
| `hide-delay`       | 悬停收起的延迟（毫秒）；只影响 hover 来源。                                               | `number`           | `100`      |
| `portal`           | 在主题的 overlay 容器中渲染。                                                             | `boolean`          | `false`    |
| `overlayContainer` | 显式指定面板挂载的 overlay 容器（property）。                                             | `OverlayContainer` | —          |

### Events

| 名称          | 说明                                                                                    |
| ------------- | --------------------------------------------------------------------------------------- |
| `open-change` | 手势或 `show()` / `hide()` 改变开合时派发，`detail.open` 是当前状态；写 `open` 不派发。 |

### Slots

| 名称      | 说明                     |
| --------- | ------------------------ |
| `trigger` | 触发器；请放可交互元素。 |
| `default` | 弹出层内容。             |

### Methods

| 名称       | 说明                                                              |
| ---------- | ----------------------------------------------------------------- |
| `show()`   | 打开弹出层并派发 `open-change`；`disabled` 或已打开时不产生效果。 |
| `hide()`   | 关闭弹出层并派发 `open-change`；已关闭时不产生效果。              |
| `toggle()` | 按当前 `open` 切换，并派发 `open-change`。                        |

### 行为说明

`trigger` 里的每个手势各接各的事件，可以任意组合；未知取值会被丢弃，一个已知手势都没写时回退到默认的 `click`。

- `click`：点触发器切换；点面板外面收起。键盘激活（Enter / Space）与点击同等对待。
- `hover`：指针进入触发器后按 `show-delay` 展开；指针离开触发器与面板、且焦点不在其中时按 `hide-delay` 收起。触屏指针不算。
- `focus`：键盘聚焦（`:focus-visible`）立即展开；焦点离开触发器和面板之后收起。
- `none`：不接受任何手势，点面板外与 Escape 都不关闭；只能由 `open` 属性或 `show()` / `hide()` 控制。

`show-delay` / `hide-delay` 只作用于 hover 来源的开合；点击、焦点与程序式调用都立即生效。

弹出层能否打开看的是 `default` 插槽里还有没有内容可展示；`trigger` 插槽不算内容。没有内容时手势不展开，`show()` 与写 `open` 仍可空开。关闭态新增内容不会打开面板；打开期间内容清空时立即收起，不播退场过渡。

点触发器外面与失焦会收起所有非 `none` 的层，不取决于 `trigger` 是否包含 `click` 或 `focus`。按 Escape 收起由覆盖层统一仲裁：非 `none` 的层都能关，`none` 既不响应也不拦截这次按键，它会继续传给外层 overlay。

`open` 是组件自行管理的状态。手势和 `show()` / `hide()` 都会更新它，直接给 property 赋值也会开合面板，但该写入是静默的，不派发 `open-change`。

### trigger ARIA

开合状态回写到触发器元素：`aria-expanded` 与 `aria-controls`（指向面板）设在 `trigger` 插槽的第一个元素上。

触发器插槽请放可交互元素（原生按钮、`web-ui-button`）。

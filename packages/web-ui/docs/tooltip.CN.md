# Tooltip

tooltip 的显示手势由 `trigger` 声明，默认仅由指针悬停触发。`content` 属性提供纯文本，`content` 插槽可以放更丰富的内容。

## Samples

### Basic

默认插槽是触发器。`content` 属性给出纯文本提示。

指针进入后按 `show-delay` 延迟显示，指针离开后按 `hide-delay` 收起。需要键盘聚焦时显示，可设置 `trigger="hover focus"`。

`open-change` 在手势或 `show()` / `hide()` 改变可见性后派发，`detail.open` 是组件已经切换到的状态；直接写 `open` 属性是静默的。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('-')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <web-ui-tooltip
        content="保存当前更改"
        onopen-change={event => {
          setCount(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <web-ui-button variant="secondary">保存</web-ui-button>
      </web-ui-tooltip>
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
    <web-ui-tooltip content="保存当前更改" @open-change="onOpenChange">
      <web-ui-button variant="secondary">保存</web-ui-button>
    </web-ui-tooltip>
    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change：{{ count }} 次 · 最后一次 detail.open = {{ last }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiTooltip } from '@greypan/web-ui'
import { ref } from 'vue'

const count = ref(0)
const last = ref('-')

function onOpenChange(event: WebUiEvent<WebUiTooltip, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### Rich content

`content` 插槽替代纯文本，可以放多行文本、粗体或行内代码。插槽元素必须是 tooltip 的直接子节点，并带 `slot="content"`。默认插槽里的触发器不要写 `slot` 属性。

触发器请用带 `aria-label` 的图标按钮，确保键盘和读屏用户能识别操作。需要聚焦时显示提示，可设置 `trigger="hover focus"`。

```tsx
import { lucideInfo } from '@greypan/web-ui/icons'
import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('-')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-tooltip onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}>
          <web-ui-button icon variant="ghost" aria-label="查看快捷键">
            <web-ui-icon icon={lucideInfo}></web-ui-icon>
          </web-ui-button>
          <div slot="content" className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">快捷键提示</span>
            <span>
              按 <kbd className="rounded border border-(--wui-color-border) px-1 font-mono text-xs">⌘K</kbd>{' '}
              打开命令面板
            </span>
          </div>
        </web-ui-tooltip>
        <span className="text-sm text-(--wui-color-text-secondary)">悬停图标按钮</span>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">最后一次 detail.open = {last}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-tooltip @open-change="last = $event.detail.open ? 'true' : 'false'">
        <web-ui-button icon variant="ghost" aria-label="查看快捷键">
          <web-ui-icon :icon="lucideInfo"></web-ui-icon>
        </web-ui-button>
        <div slot="content" class="flex flex-col gap-1 text-sm">
          <span class="font-semibold">快捷键提示</span>
          <span>
            按 <kbd class="rounded border border-(--wui-color-border) px-1 font-mono text-xs">⌘K</kbd>
            打开命令面板
          </span>
        </div>
      </web-ui-tooltip>
      <span class="text-sm text-(--wui-color-text-secondary)">悬停图标按钮</span>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">最后一次 detail.open = {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { lucideInfo } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const last = ref('-')
</script>
```

### Delay

`show-delay` / `hide-delay` 控制指针进出时的显示与隐藏延迟，`0` 表示不等待。`disabled` 关掉所有触发：指针、焦点和点击都不会让提示出现，已经显示的提示会立刻收起，等待中的延迟被取消；禁用期间不派发 `open-change`。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('-')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-tooltip
          content="立即出现"
          show-delay={0}
          hide-delay={0}
          onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
        >
          <web-ui-button variant="secondary">即时提示</web-ui-button>
        </web-ui-tooltip>
        <web-ui-tooltip content="禁用后不会出现" disabled>
          <web-ui-button variant="secondary">禁用提示</web-ui-button>
        </web-ui-tooltip>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">
        即时提示最近一次 detail.open = {last} · 禁用提示不派发
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-tooltip
        content="立即出现"
        :show-delay="0"
        :hide-delay="0"
        @open-change="last = $event.detail.open ? 'true' : 'false'"
      >
        <web-ui-button variant="secondary">即时提示</web-ui-button>
      </web-ui-tooltip>
      <web-ui-tooltip content="禁用后不会出现" disabled>
        <web-ui-button variant="secondary">禁用提示</web-ui-button>
      </web-ui-tooltip>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">
      即时提示最近一次 detail.open = {{ last }} · 禁用提示不派发
    </output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const last = ref('-')
</script>
```

### Trigger modes

`trigger` 是手势集合，用空格或逗号分隔，可写 `click`、`hover`、`focus`、`none`。默认 `hover`，由指针悬停打开。换成 `trigger="click"`，提示改由点触发器切换、点提示外面收起；手势可以并排写：`trigger="hover focus click"`。

`none` 不接受任何手势，也不参与点外关闭和 Escape，只能由 `open` 属性或 `show()` / `hide()` 控制。`none` 与手势互斥：同时写时按 `none` 处理，并在开发期打印 warning。

```tsx
import type { WebUiTooltip } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const hint = useRef<WebUiTooltip>(null)
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-tooltip
          content="点一下开，再点一下关"
          trigger="click"
          onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
        >
          <web-ui-button variant="secondary">点击提示</web-ui-button>
        </web-ui-tooltip>
        <web-ui-tooltip
          ref={hint}
          content="只跟着 show() / hide() 走"
          trigger="none"
          onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
        >
          <web-ui-button variant="secondary" onClick={() => hint.current?.show()}>
            show()
          </web-ui-button>
        </web-ui-tooltip>
        <web-ui-button size="28" variant="secondary" onClick={() => hint.current?.hide()}>
          hide()
        </web-ui-button>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">最近一次 detail.open = {last}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-tooltip
        content="点一下开，再点一下关"
        trigger="click"
        @open-change="last = $event.detail.open ? 'true' : 'false'"
      >
        <web-ui-button variant="secondary">点击提示</web-ui-button>
      </web-ui-tooltip>
      <web-ui-tooltip
        ref="hint"
        content="只跟着 show() / hide() 走"
        trigger="none"
        @open-change="last = $event.detail.open ? 'true' : 'false'"
      >
        <web-ui-button variant="secondary" @click="hint?.show()">show()</web-ui-button>
      </web-ui-tooltip>
      <web-ui-button size="28" variant="secondary" @click="hint?.hide()">hide()</web-ui-button>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">最近一次 detail.open = {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiTooltip } from '@greypan/web-ui'
import { ref, useTemplateRef } from 'vue'

const hint = useTemplateRef<WebUiTooltip>('hint')
const last = ref('—')
</script>
```

## API

### Props

| 名称               | 说明                                                                                      | 类型               | 默认值    |
| ------------------ | ----------------------------------------------------------------------------------------- | ------------------ | --------- |
| `placement`        | tooltip 位置，默认 `top`。                                                                | `Placement`        | `'top'`   |
| `trigger`          | 触发手势集合，空格或逗号分隔：`click`、`hover`、`focus`、`none`；读回为逗号分隔的规范串。 | `string`           | `'hover'` |
| `show-delay`       | 悬停打开的延迟（毫秒）；只影响 hover 来源。                                               | `number`           | `200`     |
| `hide-delay`       | 悬停收起的延迟（毫秒）；只影响 hover 来源。                                               | `number`           | `100`     |
| `disabled`         | 禁用状态。                                                                                | `boolean`          | `false`   |
| `offset`           | 与触发器的距离（px）。                                                                    | `number`           | `6`       |
| `content`          | 提示文本，是 `content` 插槽的纯文本替代。                                                 | `string`           | `''`      |
| `open`             | 可见性。                                                                                  | `boolean`          | `false`   |
| `isOpen`           | 当前是否可见（只读）。                                                                    | `boolean`          | —         |
| `portal`           | 在主题的 overlay 容器中渲染。                                                             | `boolean`          | `false`   |
| `overlayContainer` | 显式指定面板挂载的 overlay 容器（property）。                                             | `OverlayContainer` | —         |

### Events

| 名称          | 说明                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------- |
| `open-change` | 手势或 `show()` / `hide()` 改变可见性时派发，`detail.open` 是当前状态；写 `open` 不派发。 |

### Slots

| 名称      | 说明                                |
| --------- | ----------------------------------- |
| `default` | 触发器。                            |
| `content` | 提示面板内容，替代 `content` 属性。 |

### Methods

| 名称       | 说明                                               |
| ---------- | -------------------------------------------------- |
| `show()`   | 打开提示，派发 `open-change`；`none` 下同样可用。  |
| `hide()`   | 收起提示，派发 `open-change`；已收起时不产生效果。 |
| `toggle()` | 按当前可见性切换，并派发 `open-change`。           |

### 行为说明

`trigger` 里的每个手势各接各的事件，可以任意组合；未知取值会被丢弃，一个已知手势都没写时回退到默认的 `hover`。

- `click`：点触发器切换，点提示外面收起；键盘激活（Enter / Space）与点击同等对待，不播入场动画。
- `hover`：指针进入按 `show-delay` 显示；指针离开触发器与面板后按 `hide-delay` 收起；仅当 `trigger` 包含 `focus` 时焦点会保持提示打开。触屏指针不算。
- `focus`：键盘聚焦（`:focus-visible`）直接显示，不播入场动画；焦点离开触发器与面板后收起。
- `none`：不接受任何手势，点外面和 Escape 都不关闭；只能由 `open` 属性或 `show()` / `hide()` 控制。

`show-delay` / `hide-delay` 只作用于 hover 来源的开合；点击、焦点与程序式调用都立即生效。

提示能否显示看的是有没有内容：`content` 文本或至少一个 `slot="content"` 节点。没有内容时手势不显示，`show()` 与写 `open` 仍可空开。关闭态新增内容不会显示提示；显示期间内容清空时立即收起，不播退场过渡。

`click` 包含外点关闭，`focus` 包含焦点离开关闭；Escape 关闭所有非 `none` 的提示。

`open` 是组件自行管理的可见性属性。手势和 `show()` / `hide()` 都会更新它，直接给 property 赋值也会显示或隐藏提示，但该写入是静默的，不派发 `open-change`。

一个 tooltip 显示后，把指针移到相邻 tooltip 会立即切换。

打开时把提示文本写到触发器可聚焦元素的 `aria-description`，包括该元素内部的原生控件；关闭时还原原值。读屏描述不使用 `aria-describedby`：面板和触发器通常位于不同的 DOM 树中，IDREF 无法跨树解析。

### CSS Custom Properties

| 名称                      | 说明         | 默认值  |
| ------------------------- | ------------ | ------- |
| `--wui-tooltip-max-width` | 提示最大宽度 | `240px` |
| `--wui-tooltip-font-size` | 提示字号     | `13px`  |

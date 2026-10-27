---
component: tooltip
tag: web-ui-tooltip
---

tooltip，支持指针与焦点触发；`content` 属性提供纯文本，`content` 插槽可放更丰富的内容。

## Samples

### Basic

默认插槽是 trigger，`content` 属性给出纯文本提示。

指针进入按 `show-delay` 延迟显示，键盘聚焦（`:focus-visible`）立即显示；指针离开按 `hide-delay` 收起，失焦则立即收起。

`open-change` 只在用户来源的开合后派发，`detail.open` 是组件已经落到的状态；下面那行读数就是最近一次通知的值。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('—')

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
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiTooltip, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### Rich content

`content` 插槽替代纯文本，可以放多行、加粗或行内代码。插槽元素必须是 tooltip 的直接子节点并带 `slot="content"`；默认插槽里的 trigger 不要写 slot 属性。

trigger 用带 `aria-label` 的 icon button，保持可聚焦，键盘用户也能看到提示。

```tsx
import { lucideInfo } from '@greypan/web-ui/icons'
import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-tooltip onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}>
          <web-ui-button icon variant="ghost" aria-label="查看快捷键">
            <web-ui-icon icon={lucideInfo} size={16}></web-ui-icon>
          </web-ui-button>
          <div slot="content" className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">快捷键提示</span>
            <span>
              按 <kbd className="rounded border border-(--wui-color-border) px-1 font-mono text-xs">⌘K</kbd>{' '}
              打开命令面板
            </span>
          </div>
        </web-ui-tooltip>
        <span className="text-sm text-(--wui-color-text-secondary)">悬停或聚焦图标按钮</span>
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
          <web-ui-icon :icon="lucideInfo" :size="16"></web-ui-icon>
        </web-ui-button>
        <div slot="content" class="flex flex-col gap-1 text-sm">
          <span class="font-semibold">快捷键提示</span>
          <span>
            按 <kbd class="rounded border border-(--wui-color-border) px-1 font-mono text-xs">⌘K</kbd>
            打开命令面板
          </span>
        </div>
      </web-ui-tooltip>
      <span class="text-sm text-(--wui-color-text-secondary)">悬停或聚焦图标按钮</span>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">最后一次 detail.open = {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { lucideInfo } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const last = ref('—')
</script>
```

### Delay

`show-delay` / `hide-delay` 控制指针进出时的显示与隐藏延迟，`0` 表示不等待。`disabled` 关闭触发：指针与焦点都不会让提示出现，已经显示的提示不会被这条属性收掉。第二条始终不显示，读数只跟随第一条；禁用状态不派发 `open-change`。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

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

const last = ref('—')
</script>
```

## API

### Props

| 名称               | 说明                                      | 类型               | 默认值  |
| ------------------ | ----------------------------------------- | ------------------ | ------- |
| `placement`        | Floating UI 位置，默认 `top`。            | `Placement`        | `'top'` |
| `show-delay`       | 显示延迟（毫秒）。                        | `number`           | `200`   |
| `hide-delay`       | 隐藏延迟（毫秒）。                        | `number`           | `100`   |
| `disabled`         | 禁用状态。                                | `boolean`          | `false` |
| `offset`           | 与 trigger 的距离（px）。                 | `number`           | `6`     |
| `content`          | 提示文本，是 `content` 插槽的纯文本替代。 | `string`           | `''`    |
| `open`             | 可见性。                                  | `boolean`          | `false` |
| `portal`           | 在 theme-owned overlay root 中渲染。      | `boolean`          | `false` |
| `overlayContainer` | 显式 Portal 容器（property）。            | `OverlayContainer` | —       |

### Events

| 名称          | 说明                                 |
| ------------- | ------------------------------------ |
| `open-change` | 提示开合，`detail.open` 为当前状态。 |

### Slots

| 名称      | 说明                                   |
| --------- | -------------------------------------- |
| `default` | trigger。                              |
| `content` | 提示 panel 内容，替代 `content` 属性。 |

### 行为说明

`open` 是自管理的可见性属性。指针/焦点触发会更新它，直接赋值 property 也会同步本地或 Portal panel；`open-change` 仅用户来源的 toggle 时派发。

第一个 Tooltip 显示后，相邻 Tooltip 会立即切换；其余 pointer/focus 触发使用延迟计时器。

### CSS Custom Properties

| 名称                      | 说明         | 默认值  |
| ------------------------- | ------------ | ------- |
| `--wui-tooltip-max-width` | 提示最大宽度 | `240px` |
| `--wui-tooltip-font-size` | 提示字号     | `13px`  |

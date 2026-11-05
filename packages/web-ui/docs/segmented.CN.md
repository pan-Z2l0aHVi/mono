# Segmented

segmented 是单选 button group，子项是 `<web-ui-segmented-trigger>`。`value` 同步选中项，组件与原生 `<form>` 集成。

## Samples

### Basic controlled

默认插槽投影 segmented-trigger，`value` 决定哪一项选中。用户点击（或按 Enter / Space）后，`input` 带回新值，页面把它写回 `value` 以维持受控。

按住当前选中项横向拖拽也能连续切换。松手后 indicator 吸附到最近的 trigger；快速划过时按速度切换。

`aria-label` 会转发给组内的 listbox，作为这组选项的名称。`aria-labelledby` 的 IDREF 无法跨组件边界解析，需要可见文本标签时请直接用 `aria-label`。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [day, setDay] = useState('wed')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-segmented aria-label="Weekday" value={day} onInput={event => setDay(event.currentTarget.value)}>
        <web-ui-segmented-trigger value="mon">周一</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="tue">周二</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="wed">周三</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="thu">周四</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="fri">周五</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output className="text-sm text-(--wui-color-text-secondary)">当前选中：{day}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-segmented aria-label="Weekday" :value="day" @input="day = $event.currentTarget.value">
      <web-ui-segmented-trigger value="mon">周一</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="tue">周二</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="wed">周三</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="thu">周四</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="fri">周五</web-ui-segmented-trigger>
    </web-ui-segmented>
    <output class="text-sm text-(--wui-color-text-secondary)">当前选中：{{ day }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const day = ref('wed')
</script>
```

### Variant comparison

`variant` 决定 track 与 indicator 的材质。`inset`（默认）把 indicator 嵌进带常驻描边环与投影的 track；`raised` 的 indicator 浮在 track 上方。两个变体的交互、按压态与文字色一致，只有静止外观不同。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [insetView, setInsetView] = useState('week')
  const [raisedView, setRaisedView] = useState('week')

  return (
    <div className="flex flex-wrap items-start gap-8">
      <div className="flex flex-col items-start gap-3">
        <span className="text-sm text-(--wui-color-text-secondary)">inset（默认）</span>
        <web-ui-segmented value={insetView} onInput={event => setInsetView(event.currentTarget.value)}>
          <web-ui-segmented-trigger value="day">日</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="week">周</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="month">月</web-ui-segmented-trigger>
        </web-ui-segmented>
        <output className="text-sm text-(--wui-color-text-secondary)">选中值：{insetView}</output>
      </div>

      <div className="flex flex-col items-start gap-3">
        <span className="text-sm text-(--wui-color-text-secondary)">raised</span>
        <web-ui-segmented
          variant="raised"
          value={raisedView}
          onInput={event => setRaisedView(event.currentTarget.value)}
        >
          <web-ui-segmented-trigger value="day">日</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="week">周</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="month">月</web-ui-segmented-trigger>
        </web-ui-segmented>
        <output className="text-sm text-(--wui-color-text-secondary)">选中值：{raisedView}</output>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-start gap-8">
    <div class="flex flex-col items-start gap-3">
      <span class="text-sm text-(--wui-color-text-secondary)">inset（默认）</span>
      <web-ui-segmented :value="insetView" @input="insetView = $event.currentTarget.value">
        <web-ui-segmented-trigger value="day">日</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="week">周</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="month">月</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output class="text-sm text-(--wui-color-text-secondary)">选中值：{{ insetView }}</output>
    </div>

    <div class="flex flex-col items-start gap-3">
      <span class="text-sm text-(--wui-color-text-secondary)">raised</span>
      <web-ui-segmented variant="raised" :value="raisedView" @input="raisedView = $event.currentTarget.value">
        <web-ui-segmented-trigger value="day">日</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="week">周</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="month">月</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output class="text-sm text-(--wui-color-text-secondary)">选中值：{{ raisedView }}</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const insetView = ref('week')
const raisedView = ref('week')
</script>
```

### Item and group disabled

`disabled` 加在 trigger 上只禁用这一项，其余项照常切换。加在 `<web-ui-segmented>` 上禁用整组：子项自身的 `disabled` 属性不变，但全部退出 Tab 序列，也不再响应点击。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [view, setView] = useState('list')
  const [lockedView] = useState('list')

  return (
    <div className="flex flex-wrap items-start gap-8">
      <div className="flex flex-col items-start gap-3">
        <span className="text-sm text-(--wui-color-text-secondary)">单项 disabled</span>
        <web-ui-segmented value={view} onInput={event => setView(event.currentTarget.value)}>
          <web-ui-segmented-trigger value="list">列表</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="grid" disabled>
            网格
          </web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="board">看板</web-ui-segmented-trigger>
        </web-ui-segmented>
        <output className="text-sm text-(--wui-color-text-secondary)">选中值：{view}</output>
      </div>

      <div className="flex flex-col items-start gap-3">
        <span className="text-sm text-(--wui-color-text-secondary)">组级 disabled</span>
        <web-ui-segmented disabled value={lockedView}>
          <web-ui-segmented-trigger value="list">列表</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="grid">网格</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="board">看板</web-ui-segmented-trigger>
        </web-ui-segmented>
        <output className="text-sm text-(--wui-color-text-secondary)">选中值：{lockedView}（不可切换）</output>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-start gap-8">
    <div class="flex flex-col items-start gap-3">
      <span class="text-sm text-(--wui-color-text-secondary)">单项 disabled</span>
      <web-ui-segmented :value="view" @input="view = $event.currentTarget.value">
        <web-ui-segmented-trigger value="list">列表</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="grid" disabled>网格</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="board">看板</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output class="text-sm text-(--wui-color-text-secondary)">选中值：{{ view }}</output>
    </div>

    <div class="flex flex-col items-start gap-3">
      <span class="text-sm text-(--wui-color-text-secondary)">组级 disabled</span>
      <web-ui-segmented disabled :value="lockedView">
        <web-ui-segmented-trigger value="list">列表</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="grid">网格</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="board">看板</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output class="text-sm text-(--wui-color-text-secondary)">选中值：{{ lockedView }}（不可切换）</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const view = ref('list')
const lockedView = ref('list')
</script>
```

### Icon-only

纯图标 trigger 仍需要自己的可访问名，请给每个 `<web-ui-segmented-trigger>` 写 `aria-label`。组的单选、拖拽与键盘行为保持不变。

```tsx
import { lucideLayoutGrid, lucideList, lucideSettings } from '@greypan/web-ui/icons'
import { useState } from 'react'

export default function Demo() {
  const [view, setView] = useState('grid')

  return (
    <web-ui-segmented aria-label="View mode" value={view} onInput={event => setView(event.currentTarget.value)}>
      <web-ui-segmented-trigger value="grid" aria-label="Grid view">
        <web-ui-icon icon={lucideLayoutGrid} size={16}></web-ui-icon>
      </web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="list" aria-label="List view">
        <web-ui-icon icon={lucideList} size={16}></web-ui-icon>
      </web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="settings" aria-label="Settings view">
        <web-ui-icon icon={lucideSettings} size={16}></web-ui-icon>
      </web-ui-segmented-trigger>
    </web-ui-segmented>
  )
}
```

```vue
<template>
  <web-ui-segmented aria-label="View mode" :value="view" @input="view = $event.currentTarget.value">
    <web-ui-segmented-trigger value="grid" aria-label="Grid view">
      <web-ui-icon :icon="lucideLayoutGrid" :size="16"></web-ui-icon>
    </web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="list" aria-label="List view">
      <web-ui-icon :icon="lucideList" :size="16"></web-ui-icon>
    </web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="settings" aria-label="Settings view">
      <web-ui-icon :icon="lucideSettings" :size="16"></web-ui-icon>
    </web-ui-segmented-trigger>
  </web-ui-segmented>
</template>

<script setup lang="ts">
import { lucideLayoutGrid, lucideList, lucideSettings } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const view = ref('grid')
</script>
```

### Form field

`name` 让当前选中值以该字段名进入 `FormData`；没有选中任何项时不提交该字段。`form.reset()` 把 `value` 退回挂载时的初始值。

```tsx
import { useRef, useState } from 'react'

export default function Demo() {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitted, setSubmitted] = useState('')
  const [day, setDay] = useState('wed')

  return (
    <form
      ref={formRef}
      className="flex flex-col items-start gap-3"
      onSubmit={event => {
        event.preventDefault()
        const fields: string[] = []
        for (const [name, value] of new FormData(event.currentTarget)) {
          if (typeof value === 'string') fields.push(`${name}=${value}`)
        }
        setSubmitted(fields.join(' · '))
      }}
    >
      <web-ui-segmented name="day" value={day} onInput={event => setDay(event.currentTarget.value)}>
        <web-ui-segmented-trigger value="mon">周一</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="tue">周二</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="wed">周三</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="thu">周四</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="fri">周五</web-ui-segmented-trigger>
      </web-ui-segmented>
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button type="submit">提交</web-ui-button>
        <web-ui-button
          onClick={() => {
            formRef.current?.reset()
            setSubmitted('')
            setDay('wed')
          }}
        >
          重置
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">
          {submitted === '' ? '尚未提交' : submitted}
        </output>
      </div>
    </form>
  )
}
```

```vue
<template>
  <form ref="form" class="flex flex-col items-start gap-3" @submit="onSubmit">
    <web-ui-segmented name="day" :value="day" @input="day = $event.currentTarget.value">
      <web-ui-segmented-trigger value="mon">周一</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="tue">周二</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="wed">周三</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="thu">周四</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="fri">周五</web-ui-segmented-trigger>
    </web-ui-segmented>
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button type="submit">提交</web-ui-button>
      <web-ui-button @click="reset">重置</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">
        {{ submitted === '' ? '尚未提交' : submitted }}
      </output>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

const submitted = ref('')
const day = ref('wed')
const form = useTemplateRef('form')

function onSubmit(event: Event) {
  event.preventDefault()
  const fields: string[] = []
  for (const [name, value] of new FormData(event.currentTarget as HTMLFormElement)) {
    if (typeof value === 'string') fields.push(`${name}=${value}`)
  }
  submitted.value = fields.join(' · ')
}

function reset() {
  form.value?.reset()
  submitted.value = ''
  day.value = 'wed'
}
</script>
```

### input and change

每次用户切换（点击、Enter / Space 或拖拽）都会先派发 `input`，再派发 `change`，各一次；点击已是当前项的 trigger 不派发。直接改 `value` 属于程序化更新：indicator 会移动，两个计数都不变。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [view, setView] = useState('week')
  const [inputCount, setInputCount] = useState(0)
  const [changeCount, setChangeCount] = useState(0)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-segmented
        value={view}
        onInput={event => {
          setView(event.currentTarget.value)
          setInputCount(count => count + 1)
        }}
        onChange={event => {
          setView(event.currentTarget.value)
          setChangeCount(count => count + 1)
        }}
      >
        <web-ui-segmented-trigger value="day">日</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="week">周</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="month">月</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output className="text-sm text-(--wui-color-text-secondary)">
        input: {inputCount} / change: {changeCount} · 当前值：{view}
      </output>
      <web-ui-button onClick={() => setView('month')}>外部设为「月」</web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-segmented :value="view" @input="onInput" @change="onChange">
      <web-ui-segmented-trigger value="day">日</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="week">周</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="month">月</web-ui-segmented-trigger>
    </web-ui-segmented>
    <output class="text-sm text-(--wui-color-text-secondary)">
      input: {{ inputCount }} / change: {{ changeCount }} · 当前值：{{ view }}
    </output>
    <web-ui-button @click="view = 'month'">外部设为「月」</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiSegmented } from '@greypan/web-ui'
import { ref } from 'vue'

const view = ref('week')
const inputCount = ref(0)
const changeCount = ref(0)

function onInput(event: WebUiEvent<WebUiSegmented, 'input'>) {
  view.value = event.currentTarget.value
  inputCount.value += 1
}

function onChange(event: WebUiEvent<WebUiSegmented, 'change'>) {
  view.value = event.currentTarget.value
  changeCount.value += 1
}
</script>
```

## API

### Props

| 名称         | 说明                                                                                                 | 类型                  | 默认值    |
| ------------ | ---------------------------------------------------------------------------------------------------- | --------------------- | --------- |
| `name`       | 表单字段名。                                                                                         | `string`              | `''`      |
| `variant`    | 材质变体：`inset`（默认）或 `raised`。                                                               | `'inset' \| 'raised'` | `'inset'` |
| `disabled`   | 禁用全部 trigger。                                                                                   | `boolean`             | `false`   |
| `required`   | 只反射属性，不参与校验。                                                                             | `boolean`             | `false`   |
| `aria-label` | 组的可访问名称；`aria-labelledby` 无法跨组件边界解析，名称转发到 shadow 内的 `role="listbox"` 元素。 | `string`              | -         |
| `value`      | 当前选中值。                                                                                         | `string`              | `''`      |

### Events

| 名称     | 说明                                           |
| -------- | ---------------------------------------------- |
| `input`  | 用户点击、使用键盘或结束拖拽改变选中项时触发。 |
| `change` | 与 `input` 成对派发，一次切换各一次。          |

### Slots

| 名称      | 说明                                     |
| --------- | ---------------------------------------- |
| `default` | 投影 `<web-ui-segmented-trigger>` 子项。 |

### 变体

`inset`（默认）的 indicator 嵌在带常驻 1px 描边环与投影的不透明 track 里；`raised` 的 track 没有描边环与投影，indicator 带柔和投影浮在其上。两个变体的交互与文字色一致。

非法值回退到 `inset`。

与原生 `<form>` 集成：`name` 提交当前值，`form.reset()` 退回初始值。

组件按 `value` 同步子 trigger 的 `checked` 状态。`disabled` 为整组提供可继承的有效禁用状态，不改写 trigger 自身的 `disabled` 属性。直接设置 `value` 不派发事件。

键盘用户按 Tab 进入当前选中项；没有选中项时进入首个启用项。组内只有这一项参与 Tab 顺序。

水平组中，ArrowLeft / ArrowRight 在启用项之间循环移动焦点并更新选中值；Home / End 移到首个 / 末个启用项；禁用项会跳过。

ArrowUp / ArrowDown 不移动焦点。

按住当前选中项横向拖拽可以滑动 indicator，松手后吸附到最近的 option；快速划过时按速度切换。

trigger 宽度不等时，拖拽中的 indicator 使用离自身中心最近的那一项的宽度，也就是松手后会落到的那一项。它不会保持按下那一项的宽度。

触摸面声明 `touch-action: none`，拖拽激活期间阻止 `touchmove` 的默认滚动，避免 iOS Safari 中断手势。

### 按压态

两个变体的按压 / 拖拽态一致：indicator 转成透明玻璃面（模糊、描边环与 1.5x 放大），按下第一帧就到位，松开后淡回各自的静止外观。

### 文字色

所有 label 一律使用 `--wui-color-text`，选中与未选中项同色。选中状态由 indicator 表现，任何 label 都不使用 `--wui-color-accent`。在内建 light/dark 主题下，14px 文字满足 4.5:1。

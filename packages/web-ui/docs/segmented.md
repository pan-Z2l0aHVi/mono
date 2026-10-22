---
component: segmented
tag: web-ui-segmented
---

segmented（单选 button group），子项是 `<web-ui-segmented-trigger>`；`value` 同步选中项，并与原生 `<form>` 集成。

## 示例

### 基础受控 {#basic}

默认插槽投影 segmented-trigger，`value` 决定哪一项选中；点击（或 Enter / Space）后由 `input` 带回新值，页面把它写回 `value` 维持受控。按住当前选中项横向拖拽也能连续切换，松手吸附到离 indicator 中心最近的 trigger，快速抛掷按速度切换。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [day, setDay] = useState('wed')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-segmented value={day} onInput={event => setDay(event.currentTarget.value)}>
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
    <web-ui-segmented :value="day" @input="day = $event.currentTarget.value">
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

### 变体对比 {#variants}

`variant` 选择 track 与 indicator 的材质：`inset`（默认）把 indicator 嵌进带常驻环与投影的 track，`raised` 是经典浮起形态。两个变体的交互、按压态与文字色一致，只有静止面不同。

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

### 单项禁用与组级禁用 {#disabled}

`disabled` 加在 trigger 上只禁这一项，其余项照常切换；加在 `<web-ui-segmented>` 上禁用整组，子项自身的 `disabled` 属性不变，但全部退出 Tab 序列并停止响应点击。

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

### 表单字段 {#form}

`name` 让当前选中值以该字段名进入 `FormData`，未选中任何项时不提交该字段。组件通过 ElementInternals 接入 `<form>`，`form.reset()` 会把 `value` 退回挂载时的初始值。

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

### input 与 change {#events}

每次用户切换（点击、Enter / Space 或拖拽）都会先 `input` 再 `change` 各派发一次，点击已是当前项的 trigger 不派发。下面的按钮直接改 `value` 走程序化路径：indicator 会移动，两个计数都不变。

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

| 名称       | 说明                                   | 类型                  | 默认值    |
| ---------- | -------------------------------------- | --------------------- | --------- |
| `name`     | 表单字段名。                           | `string`              | `''`      |
| `variant`  | 材质变体：`inset`（默认）或 `raised`。 | `'inset' \| 'raised'` | `'inset'` |
| `disabled` | 禁用全部 trigger。                     | `boolean`             | `false`   |
| `required` | 只反射属性，不参与校验。               | `boolean`             | `false`   |
| `value`    | 当前选中值。                           | `string`              | `''`      |

### Events

| 名称     | 说明                                       |
| -------- | ------------------------------------------ |
| `input`  | 用户点击、键盘或拖拽结束改变选中项时触发。 |
| `change` | 与 `input` 成对派发，一次切换各一次。      |

### Slots

| 名称      | 说明                                     |
| --------- | ---------------------------------------- |
| `default` | 投影 `<web-ui-segmented-trigger>` 子项。 |

### 变体

`inset`（默认，「凹」）是不透明实体 track（`--wui-color-surface`）——1px 描边环与投影全程常驻，静止 indicator 是 `--wui-color-surface-segmented` 纯灰底，视觉上嵌入 track。浅色下该 token 与 `--wui-color-page` 同值，track 与页面齐平，凹感只由常驻环与投影承担；深色下它是「比页面高一档」的 elevation，track 依旧浮离页面。`raised`（「凸」）是经典形态：flat 灰 track（`--wui-color-surface-segmented-track`，无环无投影），静止 indicator 是 `--wui-color-surface-selected` 实体底加柔投影，浮起于 track 之上。浅色这对是 `#e5e5ea → #fff`：indicator 与 `--wui-color-page` 同为最白，凸起由「与页面同色的实色面浮在沉下去的轨道上 + 柔投影」读出。深色方向正好相反——`--wui-color-page`（`#242628`）是阶梯最暗的一档，「与 page 同色」等于把 indicator 压到轨道之下，于是 indicator 取 `#3a3a3c`，与同主题 `secondary` button 的面同一个色，轨道随之沉到 `#2c2c2e`。结果是深色下两个变体共用同一对灰阶，凹与凸只由装饰区分（常驻环与投影 vs 柔投影）。两个变体的按压/拖拽态一致——indicator 转透明玻璃（backdrop blur、80ms 淡入的描边环、1.5x 放大），松开淡回各自静止面。非法值回退 `inset`。

与原生 `<form>` 集成（通过 `ElementInternals`）。

根据 `value` 同步子 trigger 的 `checked` 状态。`disabled` 提供继承的有效禁用状态，不改写 trigger 自身的 `disabled` 属性。直接设 `value` 不派发事件。

键盘用户按 Tab 进入当前选中项；没有选中项时进入首个启用项。组内只有这一项参与 Tab 顺序。水平组中，ArrowLeft / ArrowRight 在启用项间循环移动焦点并更新选中值，Home / End 移到首个 / 末个启用项；禁用项会跳过。ArrowUp / ArrowDown 不移动焦点。

按住当前选中项横向拖拽可滑动 indicator，松手吸附到最近 option（快速抛掷按速度切换）。trigger 宽度不等时，拖拽中的 indicator 取「离自身中心最近的那一项」的宽度——即预览松手会落到的那一项，而不是保持按下那一项的宽度。触摸面声明 `touch-action: none`，拖拽激活期间阻止 `touchmove` 默认滚动，避免 iOS Safari 中断手势。

### 按压态

track 在所有状态下都是不透明实体面（`--wui-color-surface`，浅色即 page 同色、无 backdrop filter），1px 描边环与投影全程不变；转为玻璃的是 indicator 这一层。静止态 indicator 是 `--wui-color-surface-segmented` 实色底、玻璃输出全部关闭；按压/拖拽态获得 backdrop blur、随 80ms 过渡淡入的玻璃描边环与 1.5x 放大，底色全透明：indicator 的 blur 采样面整个落在 track 之内，此前的玻璃 track 上全透明 indicator 在均匀深底与相邻 track 仅差 +0.5 阶，条纹底实测 indicator 内部灰度 std 1.89（背景渗透）；track 实体化后同一采样 std 归零，按压态本体的可感知性由实色 track 与放大/环/投影共同承担，不再需要 tint 打底或压制 track 边缘装饰。底色不淡入——按下第一帧即落定；松开时 indicator 经 `--wui-duration-press` 淡回实色灰底。

### 文字色

选中与未选中项文字一律保持 `--wui-color-text-secondary`——`inset`/`raised` 两个变体一致，静止态与按压/拖拽态一致。选中态只由 indicator 承担，任何 label 都不着 `--wui-color-accent`。

---
component: input-number
tag: web-ui-input-number
---

数字 input，左右各一个步进 button，支持 `min` / `max` / `step` / `precision`；越界与非法输入都在提交点收敛回有效值。

## 示例

### 基础 {#basic}

不接 `value` 时组件自己持有数值，默认 `0`。`value` 恒为数字、没有空态，所以 `placeholder` 只在编辑中把内容清空时露出来：内部控件绑的是编辑草稿，草稿为空才让占位文本显形。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input-number></web-ui-input-number>
      <web-ui-input-number value={12}></web-ui-input-number>
      <web-ui-input-number placeholder="件" value={0}></web-ui-input-number>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-input-number></web-ui-input-number>
    <web-ui-input-number :value="12"></web-ui-input-number>
    <web-ui-input-number placeholder="件" :value="0"></web-ui-input-number>
  </div>
</template>
```

### 取值范围 {#range}

`min` / `max` 收住取值，`step` 决定步进幅度。落在端点时对应那一侧的步进 button 自己变禁用；编辑中可以写出越界文本，越界值在提交那一刻被拉回范围。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input-number value={5} min={0} max={10}></web-ui-input-number>
      <web-ui-input-number value={20} min={0} max={100} step={5}></web-ui-input-number>
      <web-ui-input-number value={999} min={0} max={100}></web-ui-input-number>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-input-number :value="5" :min="0" :max="10"></web-ui-input-number>
    <web-ui-input-number :value="20" :min="0" :max="100" :step="5"></web-ui-input-number>
    <web-ui-input-number :value="999" :min="0" :max="100"></web-ui-input-number>
  </div>
</template>
```

### 小数精度 {#precision}

`precision` 决定读取与提交时保留的小数位数，赋值时不抹掉原始小数——`value={1.5}` 与 `precision={1}` 的书写顺序不影响结果。未显式设置时按 `step` 的小数位数推导：`step={0.3}` 在默认设置下每次规整到 1 位小数；显式设置 `precision` 后按该值规整，例如 `precision={0}` 会把小数步进结果取整。`step` 本身不会因 `precision` 而退化，`precision={2}` 时步幅仍是 `1`。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input-number value={1.5} precision={1} min={0} max={10}></web-ui-input-number>
      <web-ui-input-number value={0.01} precision={2} step={0.01} min={0} max={1}></web-ui-input-number>
      <web-ui-input-number value={2.345} precision={2}></web-ui-input-number>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-input-number :value="1.5" :precision="1" :min="0" :max="10"></web-ui-input-number>
    <web-ui-input-number :value="0.01" :precision="2" :step="0.01" :min="0" :max="1"></web-ui-input-number>
    <web-ui-input-number :value="2.345" :precision="2"></web-ui-input-number>
  </div>
</template>
```

### 受控值与事件 {#events}

`value` 是受控值，接住 `input` 才能跟着输入与步进走。`input` 每敲一个字、每点一次步进 button 都派发；`change` 只在提交点派发——文本失焦提交与 ArrowUp / ArrowDown，点击步进 button 不派发。两条都接住，下面的读数才会分开显示这两种节奏。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [live, setLive] = useState(1)
  const [committed, setCommitted] = useState(1)

  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-input-number
        value={live}
        min={0}
        max={99}
        step={1}
        onInput={event => setLive(event.currentTarget.value)}
        onChange={event => setCommitted(event.currentTarget.value)}
      ></web-ui-input-number>
      <output className="text-sm text-(--wui-color-text-secondary)">
        跟随 input：{live} · 只在提交点变化的 change：{committed}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-input-number
      :value="live"
      :min="0"
      :max="99"
      :step="1"
      @input="live = $event.currentTarget.value"
      @change="committed = $event.currentTarget.value"
    ></web-ui-input-number>
    <output class="text-sm text-(--wui-color-text-secondary)">
      跟随 input：{{ live }} · 只在提交点变化的 change：{{ committed }}
    </output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const live = ref(1)
const committed = ref(1)
</script>
```

### 禁用与只读 {#states}

`disabled` 关掉输入与步进，校验一并退让，宿主整体降到四成不透明度。`readonly` 保留可读与可复制，两个步进 button 直接画成禁用态，ArrowUp / ArrowDown 无响应，失焦提交也不转发 `change`。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input-number value={5} disabled></web-ui-input-number>
      <web-ui-input-number value={5} readonly></web-ui-input-number>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-input-number :value="5" disabled></web-ui-input-number>
    <web-ui-input-number :value="5" readonly></web-ui-input-number>
  </div>
</template>
```

### 表单值 {#form}

`name` 是字段名，提交值是 `String(value)`。`required` 在编辑中清空时拦下提交（`valueMissing`），`form.reset()` 回填挂载时的初值。表单里的 `input-number` 请保持整数 `step`，理由写在下面的行为说明。

```tsx
import { useRef, useState } from 'react'

export default function Demo() {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitted, setSubmitted] = useState('')

  return (
    <form
      ref={formRef}
      className="flex flex-wrap items-center gap-4"
      onSubmit={event => {
        event.preventDefault()
        const fields: string[] = []
        for (const [name, value] of new FormData(event.currentTarget)) {
          if (typeof value === 'string') fields.push(`${name}=${value}`)
        }
        setSubmitted(fields.join(' · ') || '(没有字段)')
      }}
    >
      <web-ui-input-number name="quantity" value={3} min={1} max={9} step={1} required></web-ui-input-number>
      <web-ui-button type="submit">提交</web-ui-button>
      <web-ui-button
        onClick={() => {
          formRef.current?.reset()
          setSubmitted('')
        }}
      >
        重置
      </web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">{submitted === '' ? '尚未提交' : submitted}</output>
    </form>
  )
}
```

```vue
<template>
  <form ref="form" class="flex flex-wrap items-center gap-4" @submit="onSubmit">
    <web-ui-input-number name="quantity" :value="3" :min="1" :max="9" :step="1" required></web-ui-input-number>
    <web-ui-button type="submit">提交</web-ui-button>
    <web-ui-button @click="reset">重置</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">{{ submitted === '' ? '尚未提交' : submitted }}</output>
  </form>
</template>

<script setup lang="ts">
import { useTemplateRef, ref } from 'vue'

const submitted = ref('')
const form = useTemplateRef('form')

function onSubmit(event: Event) {
  event.preventDefault()
  const fields: string[] = []
  for (const [name, value] of new FormData(event.currentTarget as HTMLFormElement)) {
    if (typeof value === 'string') fields.push(`${name}=${value}`)
  }
  submitted.value = fields.join(' · ') || '(没有字段)'
}

function reset() {
  form.value?.reset()
  submitted.value = ''
}
</script>
```

### CSS 变量 {#sizing}

宽度取 `--wui-input-width`（与 `<web-ui-input>` 同一个 token），`input-number` 自己没有 `full`；再窄也会被 `--wui-control-size` 兜住最小宽度。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input-number value={12} className="[--wui-input-width:280px]"></web-ui-input-number>
      <web-ui-input-number value={12} className="[--wui-input-width:120px]"></web-ui-input-number>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-input-number :value="12" class="[--wui-input-width:280px]"></web-ui-input-number>
    <web-ui-input-number :value="12" class="[--wui-input-width:120px]"></web-ui-input-number>
  </div>
</template>
```

## API

### Props

| 名称              | 说明                                                              | 类型             | 默认值     |
| ----------------- | ----------------------------------------------------------------- | ---------------- | ---------- |
| `placeholder`     | 占位文本；只在编辑中清空内容时露出。                              | `string`         | `''`       |
| `name`            | 表单字段名。                                                      | `string`         | `''`       |
| `disabled`        | 禁用状态。                                                        | `boolean`        | `false`    |
| `readonly`        | 只读状态；步进 button 与键盘增减一并让路。                        | `boolean`        | `false`    |
| `required`        | 必填校验。                                                        | `boolean`        | `false`    |
| `value`           | 当前值，也是表单提交值；越界写入会收敛到范围端点。                | `number`         | `0`        |
| `min`             | 最小值。                                                          | `number`         | `0`        |
| `max`             | 最大值。                                                          | `number`         | `Infinity` |
| `step`            | 步进幅度；未显式设置 `precision` 时，其小数位数决定默认规整精度。 | `number`         | `1`        |
| `precision`       | 显式设置时按该值规整；设为 `null` 或移除属性时按 `step` 推导。    | `number \| null` | `0`        |
| `aria-label`      | 输入框的无障碍名称。                                              | `string`         | —          |
| `aria-labelledby` | 无障碍名称引用，用于命名内部输入框。                              | `string`         | —          |

### Events

| 名称     | 说明                                                                          |
| -------- | ----------------------------------------------------------------------------- |
| `input`  | 每敲一个字、每点一次步进 button 派发；组件没有可清空值的清除 button。         |
| `change` | 提交点派发：文本失焦提交、ArrowUp / ArrowDown。点击步进 button 不派发这一条。 |

### 行为说明

`value` 没有空态：默认 `0`，赋值与提交都先过 `min` / `max` 收敛，因此写 `999` 进 `max=100` 得到的是 `100`。编辑是另一层——内部控件绑的是草稿，`1.`、空串、非数字文本都只改显示不改 `value`；失焦时合法草稿写回并提交，非法或空草稿回填上一个提交值且不派发 `change`。

`precision` 不参与赋值，只发生在读取（`get value`）与步进提交两点，所以声明顺序无关；`0.01` 不会被默认设置提前取整成 `0`。未显式设置 `precision` 时按 `step` 的小数位数推导规整精度，小数场景不再必须显式写 `step={0.01}` 配 `precision`；显式设置后按该值规整，`step` 本身不退化。

事件分派节奏不一致是组件的现状：文本输入的 `input` 来自内部原生控件冒泡，`change` 因为原生 `change` 不组合、过不了 shadow 边界而由组件在宿主上补发一次；步进 button 只派发 `input`，ArrowUp / ArrowDown 派发 `input` 与 `change` 两条。只听 `change` 的受控写法会漏掉点击步进。

校验只透传 `required` / `disabled` / `readonly` 到内部控件，`min` / `max` / `step` 没有透传。因此 `valueMissing` 正常生效（清空后必填拦下提交），`rangeUnderflow` / `rangeOverflow` 基本不会触发——越界早在提交时被 clamp；而 `stepMismatch` 按原生 `number` 控件的默认 `step=1`、基准 `0` 判定，非整数取值有被判成不合法并拦下提交的风险。表单里的 `input-number` 建议保持整数 `step`，需要小数就在外层自己校验。

组件没有 slot：`prefix` / `suffix` 是 `<web-ui-input>` 与 `<web-ui-textarea>` 的能力，写在 `input-number` 里的子节点不会渲染。也没有 `focus()` / `blur()` / `select()` 委托：宿主自身没有 tab 位，按 Tab 进的是 shadow 内的原生控件，在宿主上调这三个方法不会落到它上面。禁用态由宿主上的 `disabled` 属性驱动，焦点态反射成 `focused` 属性，focus ring 跟着这条属性走。

### 布局

宿主是 inline-block。输入区宽度取 `--wui-input-width`（`200px`），最小宽度与高度都取 `--wui-control-size`（`36px`），圆角取 `--wui-radius-control`（胶囊），底面是共享的 glass 表面；两枚步进 button 是 shadow 内的原生 `<button class="num-btn">`（不是 `<web-ui-button>`），30×30、无边框透明底，取二级文本色，hover 与 active 走 state layer token，到达 `min` / `max` 或 `readonly` 时进入禁用态。数字居中显示（`text-align: center`），原生 spinner 被隐藏，改由这两个 button 承担增减。文字取 `--wui-font-size`，粗指针设备上钳到不小于 `16px`，避免 iOS Safari 聚焦时缩放页面；占位文本取二级文本色。

### CSS Custom Properties

| 名称                | 说明                                                                 | 默认值  |
| ------------------- | -------------------------------------------------------------------- | ------- |
| `--wui-input-width` | 输入区宽度，与 `<web-ui-input>` 共用同一个 token；没有 `full` 变体。 | `200px` |

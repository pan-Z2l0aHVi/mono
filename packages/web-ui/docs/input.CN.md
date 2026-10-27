---
component: input
tag: web-ui-input
---

文本 input，支持清除 button 与前后缀插槽，并与原生 `<form>` 集成；宿主自身不可聚焦，焦点委托到 shadow 内的原生 input。

## Samples

### Basic

`placeholder` 只在空值时显示，`value` 既是显示值也是表单提交值。不接 `input` 时组件自己持有输入内容；要由页面同步这个值就写 `value` 并接住 `input`，见下面的受控值与事件。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input placeholder="请输入昵称"></web-ui-input>
      <web-ui-input aria-label="已有昵称" value="web-ui"></web-ui-input>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-input placeholder="请输入昵称"></web-ui-input>
    <web-ui-input aria-label="已有昵称" value="web-ui"></web-ui-input>
  </div>
</template>
```

### Input types

`type` 原样透传给内部原生 input，掩码与格式判定都由原生类型提供：`password` 掩码输入内容，`email` 在表单提交时校验格式。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input type="text" placeholder="文本"></web-ui-input>
      <web-ui-input type="password" placeholder="密码"></web-ui-input>
      <web-ui-input type="email" placeholder="邮箱"></web-ui-input>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-input type="text" placeholder="文本"></web-ui-input>
    <web-ui-input type="password" placeholder="密码"></web-ui-input>
    <web-ui-input type="email" placeholder="邮箱"></web-ui-input>
  </div>
</template>
```

### Prefix and suffix

`prefix` / `suffix` 插槽在输入区两侧放 icon 或文字；哪一侧没有指派节点就整块收起，不留 `gap` 的间距。没有可见 label 的输入用 `aria-label` 提供无障碍名称。

```tsx
import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input aria-label="搜索" clearable placeholder="搜索组件">
        <web-ui-icon slot="prefix" icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-input>
      <web-ui-input aria-label="官网" value="web-ui">
        <span slot="prefix">www.</span>
        <span slot="suffix">.com</span>
      </web-ui-input>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-input aria-label="搜索" clearable placeholder="搜索组件">
      <web-ui-icon slot="prefix" :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-input>
    <web-ui-input aria-label="官网" value="web-ui">
      <span slot="prefix">www.</span>
      <span slot="suffix">.com</span>
    </web-ui-input>
  </div>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### Clear button

`clearable` 只在有值且未设置 `disabled` 或 `readonly` 时画出清除 button；空值、禁用或只读时不画。点击清除 button 会清空值，并**同时派发 `input` 与 `change`**——清空是一次已提交的离散变更，不是连续输入，只监听 `change` 的消费者也必须收到。`full` 让控件占满父容器宽度。

```tsx
export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-input full clearable aria-label="可清除的内容" value="web-ui"></web-ui-input>
      <web-ui-input full clearable placeholder="还没有内容，所以没有清除 button"></web-ui-input>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-input full clearable aria-label="可清除的内容" value="web-ui"></web-ui-input>
    <web-ui-input full clearable placeholder="还没有内容，所以没有清除 button"></web-ui-input>
  </div>
</template>
```

### Disabled and readonly

`disabled` 关掉输入、校验与清除操作，宿主整体降到四成不透明度；`readonly` 保留可读、可全选与可复制，但不接受输入，并收起清除 button——清除会改值，与只读语义冲突。

```tsx
import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input disabled placeholder="禁用"></web-ui-input>
      <web-ui-input disabled aria-label="禁用且有值的输入框" value="禁用且有值"></web-ui-input>
      <web-ui-input readonly clearable aria-label="只读输入框" value="只读：可选中复制，不能改">
        <web-ui-icon slot="prefix" icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-input>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-input disabled placeholder="禁用"></web-ui-input>
    <web-ui-input disabled aria-label="禁用且有值的输入框" value="禁用且有值"></web-ui-input>
    <web-ui-input readonly clearable aria-label="只读输入框" value="只读：可选中复制，不能改">
      <web-ui-icon slot="prefix" :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-input>
  </div>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### Borderless

`borderless` 移除边框、背景、模糊与 glass 描边环，只留 padding 与 focus ring，供外层自己画容器；输入区宽度仍走 `--wui-input-width`。

```tsx
import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input borderless placeholder="无边框输入"></web-ui-input>
      <web-ui-input borderless aria-label="无边框输入框" value="无边框且有值"></web-ui-input>
      <web-ui-input borderless aria-label="搜索" placeholder="无边框带 icon">
        <web-ui-icon slot="prefix" icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-input>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-input borderless placeholder="无边框输入"></web-ui-input>
    <web-ui-input borderless aria-label="无边框输入框" value="无边框且有值"></web-ui-input>
    <web-ui-input borderless aria-label="搜索" placeholder="无边框带 icon">
      <web-ui-icon slot="prefix" :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-input>
  </div>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### Controlled value and events

`input` 每敲一个字派发一次，`change` 与内部原生控件对齐：值改动后失焦时转发一次。两者都只带事件本身，取值读宿主的 `value`。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [value, setValue] = useState('')
  const [committed, setCommitted] = useState('')

  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-input
        full
        clearable
        value={value}
        placeholder="输入后失焦即提交"
        onInput={event => setValue(event.currentTarget.value)}
        onChange={event => setCommitted(event.currentTarget.value)}
      ></web-ui-input>
      <output className="text-sm text-(--wui-color-text-secondary)">
        input：{value || '(空)'} / change：{committed || '(未提交)'}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-input
      full
      clearable
      :value="value"
      placeholder="输入后失焦即提交"
      @input="value = $event.currentTarget.value"
      @change="committed = $event.currentTarget.value"
    ></web-ui-input>
    <output class="text-sm text-(--wui-color-text-secondary)">
      input：{{ value || '(空)' }} / change：{{ committed || '(未提交)' }}
    </output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const value = ref('')
const committed = ref('')
</script>
```

### Form value

`name` 是字段名，提交值就是当前输入内容；`required` 在未填时拦下原生提交（`valueMissing`），`type="email"` 的格式不符同样拦下（`typeMismatch`）。判定经 ElementInternals 转发给宿主 `<form>`，所以原生校验气泡指向的是这个控件。

```tsx
import { useRef, useState } from 'react'

export default function Demo() {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitted, setSubmitted] = useState('')

  return (
    <form
      ref={formRef}
      className="flex w-full flex-col items-start gap-3"
      onSubmit={event => {
        event.preventDefault()
        const fields: string[] = []
        for (const [name, value] of new FormData(event.currentTarget)) {
          if (typeof value === 'string') fields.push(`${name}=${value}`)
        }
        setSubmitted(fields.join(' · ') || '(没有字段)')
      }}
    >
      <web-ui-input name="nickname" required placeholder="昵称（必填）"></web-ui-input>
      <web-ui-input name="email" type="email" placeholder="邮箱（可留空，填了要成格式）"></web-ui-input>
      <div className="flex items-center gap-3">
        <web-ui-button type="submit">提交</web-ui-button>
        <web-ui-button
          onClick={() => {
            formRef.current?.reset()
            setSubmitted('')
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
  <form ref="form" class="flex w-full flex-col items-start gap-3" @submit="onSubmit">
    <web-ui-input name="nickname" required placeholder="昵称（必填）"></web-ui-input>
    <web-ui-input name="email" type="email" placeholder="邮箱（可留空，填了要成格式）"></web-ui-input>
    <div class="flex items-center gap-3">
      <web-ui-button type="submit">提交</web-ui-button>
      <web-ui-button @click="reset">重置</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">{{ submitted === '' ? '尚未提交' : submitted }}</output>
    </div>
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

### Focus and select all

`focus()` / `blur()` 委托到 shadow 内的原生 input，`select()` 全选当前值；`focus()` 与 `select()` 在 `disabled` 下不产生效果，`blur()` 没有这道守卫，只是禁用态的内部控件本来就拿不到焦点。

宿主自身没有 tab 位，所以按 Tab 进来的也是内部控件的焦点，焦点环由组件自己的焦点态画出。

```tsx
import type { WebUiInput } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiInput>(null)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input aria-label="待聚焦的输入框" ref={fieldRef} value="把焦点交给它"></web-ui-input>
      <web-ui-button onClick={() => fieldRef.current?.focus()}>聚焦</web-ui-button>
      <web-ui-button onClick={() => fieldRef.current?.select()}>全选</web-ui-button>
      <web-ui-button onClick={() => fieldRef.current?.blur()}>失焦</web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-input aria-label="待聚焦的输入框" ref="field" value="把焦点交给它"></web-ui-input>
    <web-ui-button @click="field?.focus()">聚焦</web-ui-button>
    <web-ui-button @click="field?.select()">全选</web-ui-button>
    <web-ui-button @click="field?.blur()">失焦</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import type { WebUiInput } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const field = useTemplateRef<WebUiInput>('field')
</script>
```

### CSS variables

`--wui-input-width` 决定输入区宽度（`full` 下由 100% 接管），`--wui-input-clear-color` 决定清除 button 的颜色，默认取三级文本色。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input
        clearable
        aria-label="较宽的输入框"
        value="宽一档、清除色改 danger"
        className="[--wui-input-width:280px] [--wui-input-clear-color:var(--wui-color-danger)]"
      ></web-ui-input>
      <web-ui-input
        clearable
        aria-label="较窄的输入框"
        value="窄一档"
        className="[--wui-input-width:120px]"
      ></web-ui-input>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-input
      clearable
      aria-label="较宽的输入框"
      value="宽一档、清除色改 danger"
      class="[--wui-input-width:280px] [--wui-input-clear-color:var(--wui-color-danger)]"
    ></web-ui-input>
    <web-ui-input clearable aria-label="较窄的输入框" value="窄一档" class="[--wui-input-width:120px]"></web-ui-input>
  </div>
</template>
```

## API

### Props

| 名称          | 说明                                                                | 类型             | 默认值   |
| ------------- | ------------------------------------------------------------------- | ---------------- | -------- |
| `type`        | HTML input 类型，透传给内部原生 input。                             | `string`         | `'text'` |
| `placeholder` | 占位文本。                                                          | `string`         | `''`     |
| `name`        | 表单字段名。                                                        | `string`         | `''`     |
| `disabled`    | 禁用状态。                                                          | `boolean`        | `false`  |
| `readonly`    | 只读状态。                                                          | `boolean`        | `false`  |
| `required`    | 必填校验。                                                          | `boolean`        | `false`  |
| `clearable`   | 有值且未设置 `disabled` 或 `readonly` 时显示清除 button。           | `boolean`        | `false`  |
| `clear-label` | 清除 button 的无障碍名称；默认跟随最近的 `lang`（中文为「清除」）。 | `string`         | `''`     |
| `full`        | 占满父容器宽度。                                                    | `boolean`        | `false`  |
| `borderless`  | ghost 形态：移除边框、背景与阴影，保留 padding 与 focus ring。      | `boolean`        | `false`  |
| `aria-label`  | 无障碍 label。                                                      | `string \| null` | `null`   |
| `value`       | 输入值，也是表单提交值。                                            | `string`         | `''`     |

### Events

| 名称     | 说明                                                                   |
| -------- | ---------------------------------------------------------------------- |
| `input`  | 每次输入派发；点击清除 button 清空时一起派发。                         |
| `change` | 值改动后失焦时由内部原生控件转发一次；点击清除 button 清空时一起派发。 |
| `focus`  | 内部原生控件的 `focus`，组合但不冒泡：宿主上要监听请用捕获阶段。       |
| `blur`   | 内部原生控件的 `blur`，与 `focus` 同一条路径。                         |

### Slots

| 名称     | 说明                                                 |
| -------- | ---------------------------------------------------- |
| `prefix` | 输入区左侧的 icon 或文字；空插槽整块收起，不占间距。 |
| `suffix` | 输入区右侧的 icon 或文字；清除 button 画在它之前。   |

### Methods

| 名称              | 说明                                                         |
| ----------------- | ------------------------------------------------------------ |
| `focus(options?)` | 聚焦 shadow 内的原生 input；`disabled` 时不产生效果。        |
| `blur()`          | 让 shadow 内的原生 input 失焦。                              |
| `select()`        | 全选当前值；`disabled` 时不产生效果，`readonly` 下仍然可用。 |

### 行为说明

宿主自身不可聚焦，也没有 tab 位：Tab 与点击都把焦点交给 shadow 内的原生 input，组件把焦点态反射成宿主上的 `focused` 属性，focus ring 由这条属性驱动。编程式 `focus()` / `blur()` / `select()` 一并委托给这个内部控件。

内部控件的 `input` 原生就冒泡且组合，所以宿主直接收得到；原生 `change` 不组合，过不了 shadow 边界，由组件在宿主上补发一个 `composed` 的 `change`。

清除 button 走的是同一次离散变更，`input` 与 `change` 一起派发，`v-model.lazy` 这类只听 `change` 的消费者不会漏掉清空。

`disabled` 与表单级禁用（外层 `<fieldset disabled>`）都让输入与校验退出：`required` 与 `type="email"` 的判定（`valueMissing` / `typeMismatch`）经 ElementInternals 转发给宿主 `<form>`，禁用时不拦截提交。

`readonly` 同样让校验退出，不只是拦输入：只读的原生控件按 HTML 规范被豁免于约束验证，`validity.valid` 恒为真，转发的状态因此总是干净——`required readonly` 的空值拦不下提交。

`form.reset()` 按挂载时的初值回填。

### 布局

宿主是 inline-block，`full` 时改成 block 并把输入区铺满父容器；输入区高度取 `--wui-control-size`（`36px`），圆角取 `--wui-radius-control`（胶囊），底面是共享的 glass 表面，`borderless` 连描边环一起去掉。

文字取 `--wui-font-size`，粗指针设备上钳到不小于 `16px`，避免 iOS Safari 聚焦时缩放页面。

占位文本与 slot 内容取二级文本色，placeholder 的排版只写 `font: inherit`，由控件字号统一决定。

前后缀之间的 `gap` 归容器所有：某一侧插槽没有指派节点时那个 slot 盒整块收起，不留半个 `gap`——判定读的是 `slot.assignedElements().length`，只看有没有被指派的元素，不度量它是否真的画出东西；指派一个自己 `display: none` 的节点同样算「有内容」，`gap` 照留。

清除 button 复用 icon ghost 形态的 `<web-ui-button>`，只在有值、未禁用且非只读时挂上，并用负 margin 抵掉容器的 `gap` 与自身 padding，使它贴住输入文本。

### CSS Custom Properties

| 名称                      | 说明                                  | 默认值                           |
| ------------------------- | ------------------------------------- | -------------------------------- |
| `--wui-input-width`       | 输入区宽度；`full` 时被 `100%` 接管。 | `200px`                          |
| `--wui-input-clear-color` | 清除 button 的颜色。                  | `var(--wui-color-text-tertiary)` |

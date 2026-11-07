# Input

文本输入框，支持清除按钮与前后缀插槽，并与原生 `<form>` 集成。宿主自身不可聚焦，焦点落在内部原生输入框上；`focus()` / `blur()` / `select()` 都作用于它。

## Samples

### Basic

`placeholder` 只在空值时显示，`value` 既是显示值也是表单提交值。不接 `input` 时，组件自己持有输入内容。要由页面同步这个值，就写 `value` 并接住 `input`，见下面的受控值与事件。

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

`type` 原样传给原生输入框，掩码与格式判定都由原生类型提供：`password` 掩码输入内容，`email` 在表单提交时校验格式。

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

`prefix` / `suffix` 插槽在输入区两侧放图标或文字；哪一侧没有指派节点就整块收起，不留 `gap` 的间距。没有可见标签的输入用 `aria-label` 提供无障碍名称。

```tsx
import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input aria-label="搜索" clearable placeholder="搜索组件">
        <web-ui-icon slot="prefix" icon={lucideSearch}></web-ui-icon>
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
      <web-ui-icon slot="prefix" :icon="lucideSearch"></web-ui-icon>
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

`clearable` 只在有值且未设置 `disabled` 或 `readonly` 时画出清除按钮；空值、禁用或只读时不画。点击清除按钮会清空值，同时派发 `input` 与 `change`。清空是一次已提交的离散变更，不是连续输入，所以只监听 `change` 的调用方也必须收到。`full` 让控件占满父容器宽度。

```tsx
export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-input full clearable aria-label="可清除的内容" value="web-ui"></web-ui-input>
      <web-ui-input full clearable placeholder="还没有内容，所以没有清除按钮"></web-ui-input>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-input full clearable aria-label="可清除的内容" value="web-ui"></web-ui-input>
    <web-ui-input full clearable placeholder="还没有内容，所以没有清除按钮"></web-ui-input>
  </div>
</template>
```

### Disabled and readonly

`disabled` 关掉输入、校验与清除操作，宿主整体降到四成不透明度。`readonly` 保留可读、可全选与可复制，但不接受输入，并收起清除按钮。清除会改值，与只读语义冲突。

```tsx
import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input disabled placeholder="禁用"></web-ui-input>
      <web-ui-input disabled aria-label="禁用且有值的输入框" value="禁用且有值"></web-ui-input>
      <web-ui-input readonly clearable aria-label="只读输入框" value="只读：可选中复制，不能改">
        <web-ui-icon slot="prefix" icon={lucideSearch}></web-ui-icon>
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
      <web-ui-icon slot="prefix" :icon="lucideSearch"></web-ui-icon>
    </web-ui-input>
  </div>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### Borderless

`borderless` 移除边框、背景、模糊、阴影与 glass 描边环，只留内边距与焦点环，供外层自己画容器；输入区宽度仍取 `--wui-input-width`。

```tsx
import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input borderless placeholder="无边框输入"></web-ui-input>
      <web-ui-input borderless aria-label="无边框输入框" value="无边框且有值"></web-ui-input>
      <web-ui-input borderless aria-label="搜索" placeholder="无边框带 icon">
        <web-ui-icon slot="prefix" icon={lucideSearch}></web-ui-icon>
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
      <web-ui-icon slot="prefix" :icon="lucideSearch"></web-ui-icon>
    </web-ui-input>
  </div>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### Controlled value and events

`input` 每敲一个字派发一次。`change` 与内部原生控件对齐：值改动后失焦时转发一次。两者都只带事件本身，取值读宿主的 `value`。

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

`name` 是字段名，提交值就是当前输入内容；`required` 在未填时拦下原生提交（`valueMissing`），`type="email"` 的格式不符同样拦下（`typeMismatch`）。校验由原生 `<form>` 接管，气泡指向这个控件。

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

`focus()` / `blur()` / `select()` 作用于内部原生输入框；`focus()` 与 `select()` 在 `disabled` 下不产生效果，`blur()` 没有这道守卫。

宿主自身没有 Tab 位，Tab 进来的是内部控件。

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

`--wui-input-width` 决定输入区宽度（`full` 下由 100% 接管），`--wui-input-clear-color` 决定清除按钮的颜色，默认取三级文本色。

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

| 名称               | 说明                                                             | 类型             | 默认值   |
| ------------------ | ---------------------------------------------------------------- | ---------------- | -------- |
| `type`             | HTML 输入框类型，透传给内部原生输入框。                          | `string`         | `'text'` |
| `placeholder`      | 占位文本。                                                       | `string`         | `''`     |
| `autocomplete`     | 传递给原生输入框的浏览器自动填充值；空值不设置属性。             | `string`         | `''`     |
| `name`             | 表单字段名。                                                     | `string`         | `''`     |
| `disabled`         | 禁用状态。                                                       | `boolean`        | `false`  |
| `readonly`         | 只读状态。                                                       | `boolean`        | `false`  |
| `required`         | 必填校验。                                                       | `boolean`        | `false`  |
| `clearable`        | 有值且未设置 `disabled` 或 `readonly` 时显示清除按钮。           | `boolean`        | `false`  |
| `aria-clear-label` | 清除按钮的无障碍名称；未设置时回退内置英文文案（`Clear`）。      | `string`         | `''`     |
| `full`             | 占满父容器宽度。                                                 | `boolean`        | `false`  |
| `borderless`       | ghost 形态：移除边框、背景、背景模糊与阴影，保留内边距与焦点环。 | `boolean`        | `false`  |
| `aria-label`       | 无障碍标签。                                                     | `string \| null` | `null`   |
| `value`            | 输入值，也是表单提交值。                                         | `string`         | `''`     |

### Events

| 名称     | 说明                                                               |
| -------- | ------------------------------------------------------------------ |
| `input`  | 每次输入派发；点击清除按钮清空时一起派发。                         |
| `change` | 值改动后失焦时由内部原生控件转发一次；点击清除按钮清空时一起派发。 |
| `focus`  | 内部原生控件的 `focus`，组合但不冒泡：宿主上要监听请用捕获阶段。   |
| `blur`   | 内部原生控件的 `blur`，与 `focus` 同一条路径。                     |

### Slots

| 名称     | 说明                                               |
| -------- | -------------------------------------------------- |
| `prefix` | 输入区左侧的图标或文字；空插槽整块收起，不占间距。 |
| `suffix` | 输入区右侧的图标或文字；清除按钮画在它之前。       |

### Methods

| 名称              | 说明                                                         |
| ----------------- | ------------------------------------------------------------ |
| `focus(options?)` | 聚焦内部原生输入框；`disabled` 时不产生效果。                |
| `blur()`          | 让内部原生输入框失焦。                                       |
| `select()`        | 全选当前值；`disabled` 时不产生效果，`readonly` 下仍然可用。 |

### 行为说明

宿主自身不可聚焦，也没有 Tab 位：Tab 与点击都把焦点交给内部原生输入框，`focused` 属性反映焦点态并驱动焦点环。`focus()` / `blur()` / `select()` 都作用于它。

`input` 原生冒泡且组合，宿主直接收得到；`change` 由组件在宿主上补发一个 `composed` 事件。

清除按钮触发同一次离散变更，`input` 与 `change` 一起派发，`v-model.lazy` 这类只听 `change` 的调用方不会漏掉清空。

`disabled` 与表单级禁用（外层 `<fieldset disabled>`）都让输入与校验退出：`required` 与 `type="email"` 的判定（`valueMissing` / `typeMismatch`）交给宿主 `<form>`，禁用时不拦截提交。

`readonly` 同样让校验退出：`required readonly` 的空值拦不下提交。

`form.reset()` 按挂载时的初值回填。

### 布局

宿主是 inline-block，`full` 时铺满父容器。输入区高度取 `--wui-control-size`（`36px`），圆角取 `--wui-radius-control`（胶囊）；`borderless` 去掉边框、背景与描边环。

文字取 `--wui-font-size`，粗指针设备上不小于 `16px`，避免 iOS Safari 聚焦时缩放页面。

占位文本与插槽内容取二级文本色。

某一侧插槽没有指派节点时不留 `gap`；指派一个自己 `display: none` 的节点仍算「有内容」，`gap` 照留。

清除按钮只在有值、未禁用且非只读时出现，位置贴着输入文本。

### CSS Custom Properties

| 名称                      | 说明                                  | 默认值                           |
| ------------------------- | ------------------------------------- | -------------------------------- |
| `--wui-input-width`       | 输入区宽度；`full` 时被 `100%` 接管。 | `200px`                          |
| `--wui-input-clear-color` | 清除按钮的颜色。                      | `var(--wui-color-text-tertiary)` |

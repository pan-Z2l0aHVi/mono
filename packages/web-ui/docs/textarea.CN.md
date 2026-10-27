---
component: textarea
tag: web-ui-textarea
---

多行文本 input，支持清除 button、自动高度与前后缀插槽；焦点委托到 shadow 内的原生 textarea。

## Samples

### Basic

`rows` 决定初始显示行数（默认 3 行），`placeholder` 在空值时显示；不接 `input` 时组件自己持有内容，要由页面同步就写 `value` 并接住 `input`，见下面的受控值与事件。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <web-ui-textarea placeholder="默认三行"></web-ui-textarea>
      <web-ui-textarea rows={6} placeholder="六行高"></web-ui-textarea>
      <web-ui-textarea aria-label="已填写的多行文本" rows={3} value="已经写好的内容"></web-ui-textarea>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <web-ui-textarea placeholder="默认三行"></web-ui-textarea>
    <web-ui-textarea :rows="6" placeholder="六行高"></web-ui-textarea>
    <web-ui-textarea aria-label="已填写的多行文本" :rows="3" value="已经写好的内容"></web-ui-textarea>
  </div>
</template>
```

### Autosize

`autosize` 让高度跟着内容走：组件把高度写成内联值，同时关掉原生拖拽手柄，两套高度来源不并存。

`max-height`（px，`0` 表示不限）单独写在内部控件的内联样式上，只要大于 0 就生效，跟开没开 `autosize` 无关：开着时它是自动高度的上限，到顶之后框内滚动；没开时它钳住拖拽手柄拉出来的高度。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <web-ui-textarea autosize full placeholder="输入多行内容，高度随内容增长"></web-ui-textarea>
      <web-ui-textarea autosize full max-height={120} placeholder="超过 120px 之后在框内滚动"></web-ui-textarea>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <web-ui-textarea autosize full placeholder="输入多行内容，高度随内容增长"></web-ui-textarea>
    <web-ui-textarea autosize full :max-height="120" placeholder="超过 120px 之后在框内滚动"></web-ui-textarea>
  </div>
</template>
```

### Prefix and suffix

`prefix` / `suffix` 插槽放 icon 或文字，它们与首行文字顶对齐；没有可见 label 时用 `aria-label` 给出无障碍名称（`aria-labelledby` 的限制见下面的行为说明）。

```tsx
import { lucideFileText } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <web-ui-textarea aria-label="备注" clearable placeholder="带前缀 icon">
        <web-ui-icon slot="prefix" icon={lucideFileText} size={16}></web-ui-icon>
      </web-ui-textarea>
      <web-ui-textarea aria-label="反馈" clearable placeholder="前后缀都是文字">
        <span slot="prefix">备注：</span>
        <span slot="suffix">最多 200 字</span>
      </web-ui-textarea>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <web-ui-textarea aria-label="备注" clearable placeholder="带前缀 icon">
      <web-ui-icon slot="prefix" :icon="lucideFileText" :size="16"></web-ui-icon>
    </web-ui-textarea>
    <web-ui-textarea aria-label="反馈" clearable placeholder="前后缀都是文字">
      <span slot="prefix">备注：</span>
      <span slot="suffix">最多 200 字</span>
    </web-ui-textarea>
  </div>
</template>

<script setup lang="ts">
import { lucideFileText } from '@greypan/web-ui/icons'
</script>
```

### Controlled value and character count

`value` 是输入值也是表单提交值；`input` 每敲一个字（含换行）派发一次，`change` 与内部原生控件对齐，值改动后失焦时转发一次。`maxlength` 限制可输入长度，计数器由页面按 `value` 自己算。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [value, setValue] = useState('')
  const [committed, setCommitted] = useState('')

  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-textarea
        full
        clearable
        rows={4}
        maxlength={20}
        value={value}
        placeholder="最多 20 字，输入后失焦即提交"
        onInput={event => setValue(event.currentTarget.value)}
        onChange={event => setCommitted(event.currentTarget.value)}
      ></web-ui-textarea>
      <div className="flex items-center gap-3 text-sm text-(--wui-color-text-secondary)">
        <output>
          input：{value.length} / 20 · change：{committed ? `${committed.length} 字` : '(未提交)'}
        </output>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-textarea
      full
      clearable
      :rows="4"
      :maxlength="20"
      :value="value"
      placeholder="最多 20 字，输入后失焦即提交"
      @input="value = $event.currentTarget.value"
      @change="committed = $event.currentTarget.value"
    ></web-ui-textarea>
    <div class="flex items-center gap-3 text-sm text-(--wui-color-text-secondary)">
      <output>input：{{ value.length }} / 20 · change：{{ committed ? `${committed.length} 字` : '(未提交)' }}</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const value = ref('')
const committed = ref('')
</script>
```

### Clear button

`clearable` 只在有值且未设置 `disabled` 或 `readonly` 时画出清除 button；空值、禁用或只读时不画。清除 button 对齐首行而不是整框垂直居中；点它清空值并派发 `input`。`full` 让控件占满父容器宽度，`--wui-textarea-width` 只在非 `full` 时生效。

```tsx
export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-textarea full clearable aria-label="可清除的多行文本" value="这一段可以一次清掉"></web-ui-textarea>
      <web-ui-textarea full clearable placeholder="空值时没有清除 button"></web-ui-textarea>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-textarea full clearable aria-label="可清除的多行文本" value="这一段可以一次清掉"></web-ui-textarea>
    <web-ui-textarea full clearable placeholder="空值时没有清除 button"></web-ui-textarea>
  </div>
</template>
```

### Disabled and readonly

`disabled` 关掉输入、校验与清除操作，宿主整体降到四成不透明度；`readonly` 保留可读、可全选与可复制，仍可拖拽右下角改高度，但不接受输入，并收起清除 button。

```tsx
export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-textarea full disabled aria-label="禁用的多行文本" value="禁用：读得到，改不动"></web-ui-textarea>
      <web-ui-textarea
        full
        readonly
        clearable
        aria-label="只读的多行文本"
        value="只读：清除 button 已收起"
      ></web-ui-textarea>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-textarea full disabled aria-label="禁用的多行文本" value="禁用：读得到，改不动"></web-ui-textarea>
    <web-ui-textarea
      full
      readonly
      clearable
      aria-label="只读的多行文本"
      value="只读：清除 button 已收起"
    ></web-ui-textarea>
  </div>
</template>
```

### Borderless

`borderless` 移除边框、背景、模糊与 glass 描边环，只留 padding 与 focus ring，圆角仍取 `--wui-radius-menu`；外层自己画容器时用这一形态。

```tsx
export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-textarea full borderless placeholder="无边框输入"></web-ui-textarea>
      <web-ui-textarea
        full
        borderless
        aria-label="无边框多行文本"
        rows={4}
        value="无边框且有值，容器由外层负责"
      ></web-ui-textarea>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-textarea full borderless placeholder="无边框输入"></web-ui-textarea>
    <web-ui-textarea
      full
      borderless
      aria-label="无边框多行文本"
      :rows="4"
      value="无边框且有值，容器由外层负责"
    ></web-ui-textarea>
  </div>
</template>
```

### Form value

`name` 是字段名，提交值就是当前内容。`required` 在未填时拦下提交（`valueMissing`），`minlength` 在字数不够时拦下（`tooShort`）；两条判定都经 ElementInternals 转发给宿主 `<form>`。

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
          if (typeof value === 'string') fields.push(`${name}=${value.replace(/\n/g, '\\n')}`)
        }
        setSubmitted(fields.join(' · ') || '(没有字段)')
      }}
    >
      <web-ui-textarea
        name="notes"
        rows={3}
        required
        minlength={10}
        placeholder="备注：必填，至少 10 字"
      ></web-ui-textarea>
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
    <web-ui-textarea
      name="notes"
      :rows="3"
      required
      :minlength="10"
      placeholder="备注：必填，至少 10 字"
    ></web-ui-textarea>
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
    if (typeof value === 'string') fields.push(`${name}=${value.replace(/\n/g, '\\n')}`)
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

`focus()` / `blur()` 委托到 shadow 内的原生 textarea，`select()` 全选当前内容；三条在 `disabled` 下都不产生效果。宿主自身没有 tab 位，按 Tab 进来的始终是内部控件的焦点。

```tsx
import type { WebUiTextarea } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiTextarea>(null)

  return (
    <div className="flex flex-col gap-3">
      <web-ui-textarea
        aria-label="待全选的多行文本"
        ref={fieldRef}
        rows={3}
        value="全选之后可以直接输入替换"
      ></web-ui-textarea>
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button onClick={() => fieldRef.current?.focus()}>聚焦</web-ui-button>
        <web-ui-button onClick={() => fieldRef.current?.select()}>全选</web-ui-button>
        <web-ui-button onClick={() => fieldRef.current?.blur()}>失焦</web-ui-button>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <web-ui-textarea
      aria-label="待全选的多行文本"
      ref="field"
      :rows="3"
      value="全选之后可以直接输入替换"
    ></web-ui-textarea>
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button @click="field?.focus()">聚焦</web-ui-button>
      <web-ui-button @click="field?.select()">全选</web-ui-button>
      <web-ui-button @click="field?.blur()">失焦</web-ui-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiTextarea } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const field = useTemplateRef<WebUiTextarea>('field')
</script>
```

### CSS variables

`--wui-textarea-width` 决定输入区宽度（`full` 时被 `100%` 接管），`--wui-textarea-clear-color` 决定清除 button 的颜色。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <web-ui-textarea
        clearable
        aria-label="较宽的多行文本"
        value="宽一档、清除色改 danger"
        className="[--wui-textarea-width:280px] [--wui-textarea-clear-color:var(--wui-color-danger)]"
      ></web-ui-textarea>
      <web-ui-textarea
        clearable
        aria-label="较窄的多行文本"
        value="窄一档"
        className="[--wui-textarea-width:120px]"
      ></web-ui-textarea>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-start gap-3">
    <web-ui-textarea
      clearable
      aria-label="较宽的多行文本"
      value="宽一档、清除色改 danger"
      class="[--wui-textarea-width:280px] [--wui-textarea-clear-color:var(--wui-color-danger)]"
    ></web-ui-textarea>
    <web-ui-textarea
      clearable
      aria-label="较窄的多行文本"
      value="窄一档"
      class="[--wui-textarea-width:120px]"
    ></web-ui-textarea>
  </div>
</template>
```

## API

### Props

| 名称              | 说明                                                           | 类型                  | 默认值  |
| ----------------- | -------------------------------------------------------------- | --------------------- | ------- |
| `placeholder`     | 占位文本。                                                     | `string`              | `''`    |
| `name`            | 表单字段名。                                                   | `string`              | `''`    |
| `disabled`        | 禁用状态。                                                     | `boolean`             | `false` |
| `readonly`        | 只读状态。                                                     | `boolean`             | `false` |
| `required`        | 必填校验。                                                     | `boolean`             | `false` |
| `full`            | 占满父容器宽度。                                               | `boolean`             | `false` |
| `clearable`       | 有值且未设置 `disabled` 或 `readonly` 时显示清除 button。      | `boolean`             | `false` |
| `borderless`      | ghost 形态：移除边框、背景与阴影，保留 padding 与 focus ring。 | `boolean`             | `false` |
| `rows`            | 显示行数，也是自动高度的起点。                                 | `number`              | `3`     |
| `minlength`       | 最小长度校验。                                                 | `number \| undefined` | —       |
| `maxlength`       | 最大长度校验。                                                 | `number \| undefined` | —       |
| `autosize`        | 自动调整高度，同时强制 `resize: none`。                        | `boolean`             | `false` |
| `max-height`      | 自动高度上限（px），0 表示不限制。                             | `number`              | `0`     |
| `aria-label`      | 无障碍 label。                                                 | `string \| null`      | `null`  |
| `aria-labelledby` | 无障碍 label 引用。                                            | `string \| undefined` | —       |
| `value`           | 输入值，也是表单提交值。                                       | `string`              | `''`    |

### Events

| 名称     | 说明                                                     |
| -------- | -------------------------------------------------------- |
| `input`  | 每次输入派发。                                           |
| `change` | 值改动后失焦时由内部原生控件转发一次。                   |
| `focus`  | 内部原生控件的 `focus`，组合但不冒泡：宿主上要捕获监听。 |
| `blur`   | 内部原生控件的 `blur`，与 `focus` 同一条路径。           |

### Slots

| 名称     | 说明                                                  |
| -------- | ----------------------------------------------------- |
| `prefix` | textarea 左侧的 icon 或文字，与首行对齐。             |
| `suffix` | textarea 右侧的 icon 或文字；清除 button 画在它之前。 |

### Methods

| 名称              | 说明                                                         |
| ----------------- | ------------------------------------------------------------ |
| `focus(options?)` | 聚焦 shadow 内的原生 textarea；`disabled` 时不产生效果。     |
| `blur()`          | 让 shadow 内的原生 textarea 失焦。                           |
| `select()`        | 全选当前值；`disabled` 时不产生效果，`readonly` 下仍然可用。 |

### 行为说明

宿主不可聚焦，也没有 tab 位：Tab 与点击都把焦点交给 shadow 内的原生 textarea，组件把焦点态反射成宿主上的 `focused` 属性，focus ring 由这条属性驱动。

内部控件的 `input` 原生就冒泡且组合；`change` 不组合，由组件在宿主上补发一次 `composed` 的 `change`。

清除 button 只派发 `input`，不派发 `change`——这一点与 `<web-ui-input>` 不同，只听 `change` 的消费者收不到这次清空。

`autosize` 独占高度：它把高度写成内联值，所以同时关掉原生拖拽手柄，避免拖完之后下一次内容变化又被拉回。

高度在每次取值变化与 `rows` 变化时重算，不依赖 `ResizeObserver` 的回调，因此同一个控件随外层切换长文案与短文案时不会留着旧高度。

`max-height` 写成内联样式，与 `autosize` 无关地钳制内部控件：开着时封顶自动高度，到顶框内滚动；没开时钳住拖拽出来的高度。`0` 表示不限。

`required` / `minlength` / `maxlength` 的判定（`valueMissing` / `tooShort` / `tooLong`）经 ElementInternals 转发给宿主 `<form>`；`disabled` 与表单级禁用让校验一并退让。

`readonly` 也让校验退让：只读的原生控件按 HTML 规范被豁免于约束验证，转发的状态恒为干净，`required readonly` 的空值拦不下提交。

`form.reset()` 按挂载时的初值回填。

无障碍名称只有 `aria-label` 这一条是通的：它连同 `aria-labelledby` 一起被透传到 shadow 内的原生 `<textarea>`，而 `aria-labelledby` 的 IDREF 只在同一棵 shadow 树里解析，够不到 light DOM，所以指向宿主外面某个元素的写法取不到名字。

组件也没有把内部控件的 id 暴露出来，外层的 `<label for>` 同样接不上（宿主不是 labelable 元素）。

要给控件供名，写 `aria-label`：`prefix` slot 里的可见文字落在容器上，不在原生 `<textarea>` 的盒子里，不会成为它的名称。

### 布局

宿主是 block 盒，输入区宽度取 `--wui-textarea-width`（`200px`），`full` 时改成 `100%`；容器按内容折行，最小高度取 `--wui-control-size`（`36px`），圆角取 `--wui-radius-menu`（`18px`），底面是共享的 glass 表面，`borderless` 连描边环一起去掉。

未开 `autosize` 时原生拖拽手柄可用（`resize: vertical`）。

文字取 `--wui-font-size`，行高取 `--wui-line-height-normal`，粗指针设备上字号钳到不小于 `16px`，避免 iOS Safari 聚焦时缩放页面。占位文本与 slot 内容取二级文本色。

清除 button 复用 icon ghost 形态的 `<web-ui-button>`，用负 margin 抵掉容器 `gap` 与自身 padding，并按首行中心对齐——容器顶对齐使它在多行框里也贴着第一行。

### CSS Custom Properties

| 名称                         | 说明                                  | 默认值                           |
| ---------------------------- | ------------------------------------- | -------------------------------- |
| `--wui-textarea-width`       | 输入区宽度；`full` 时被 `100%` 接管。 | `200px`                          |
| `--wui-textarea-clear-color` | 清除 button 的颜色。                  | `var(--wui-color-text-tertiary)` |

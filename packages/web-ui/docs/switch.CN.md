---
component: switch
tag: web-ui-switch
---

开关，声明 `role="switch"` 与 `aria-checked`；点击即时开合，也支持按住 track 横拖与甩动定值，空格与 Enter 都能键盘切换。

默认插槽的子文本会作为可见标签和默认 accessible name；也可以在 host 上设置 `aria-label` 或 `aria-labelledby`。

## Samples

### 基础 {#basic}

`checked` 是开合状态。写在 `<web-ui-switch>` 里的文字渲染成开关旁的可见标签（见 Slots）；不要可见标签时，把 label 放在宿主外面。由页面持有这个值时，接住 `change` 再写回 `checked`。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [enabled, setEnabled] = useState(false)

  return (
    <div className="flex items-center gap-3">
      <web-ui-switch checked={enabled} onChange={event => setEnabled(event.currentTarget.checked)}></web-ui-switch>
      <span className="text-sm text-(--wui-color-text-secondary)">{enabled ? '已开启' : '已关闭'}</span>
    </div>
  )
}
```

```vue
<template>
  <div class="flex items-center gap-3">
    <web-ui-switch :checked="enabled" @change="onChange"></web-ui-switch>
    <span class="text-sm text-(--wui-color-text-secondary)">{{ enabled ? '已开启' : '已关闭' }}</span>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiSwitch } from '@greypan/web-ui'
import { ref } from 'vue'

const enabled = ref(false)

function onChange(event: WebUiEvent<WebUiSwitch, 'change'>) {
  enabled.value = event.currentTarget.checked
}
</script>
```

### 禁用与加载 {#states}

`disabled` 与 `loading` 都阻断交互、都走同一条禁用外观。

区别在语义与画面，也区别在校验：`loading` 在 thumb 里画一个旋转 icon，表示结果未定，`checked` 保持不动，适合"提交中"的等待态；`required` 的判定只认 `disabled`（含表单级禁用），`loading` 时未选中照旧上报 `valueMissing` 并拦下提交。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <web-ui-switch checked disabled></web-ui-switch>
        <span className="text-sm text-(--wui-color-text-secondary)">disabled：开着但改不动</span>
      </div>
      <div className="flex items-center gap-3">
        <web-ui-switch checked loading></web-ui-switch>
        <span className="text-sm text-(--wui-color-text-secondary)">loading：保持当前值等结果</span>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-3">
      <web-ui-switch checked disabled></web-ui-switch>
      <span class="text-sm text-(--wui-color-text-secondary)">disabled：开着但改不动</span>
    </div>
    <div class="flex items-center gap-3">
      <web-ui-switch checked loading></web-ui-switch>
      <span class="text-sm text-(--wui-color-text-secondary)">loading：保持当前值等结果</span>
    </div>
  </div>
</template>
```

### 事件节奏 {#events}

事件只在用户操作后派发：点击、Enter 与空格都由组件派发 `input` 加 `change` 两条。程序写入 `checked` 两条都不派发——下面这个按钮走的正是这条路。

```tsx
import type { WebUiSwitch } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiSwitch>(null)
  const [inputs, setInputs] = useState(0)
  const [changes, setChanges] = useState(0)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-switch
        ref={fieldRef}
        onInput={() => setInputs(count => count + 1)}
        onChange={() => setChanges(count => count + 1)}
      ></web-ui-switch>
      <web-ui-button
        onClick={() => {
          const field = fieldRef.current
          if (field) field.checked = !field.checked
        }}
      >
        程序写入 checked
      </web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">
        input {inputs} 次 · change {changes} 次
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-switch ref="field" @input="inputs = inputs + 1" @change="changes = changes + 1"></web-ui-switch>
    <web-ui-button @click="writeChecked">程序写入 checked</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">input {{ inputs }} 次 · change {{ changes }} 次</output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiSwitch } from '@greypan/web-ui'
import { useTemplateRef, ref } from 'vue'

const inputs = ref(0)
const changes = ref(0)
const field = useTemplateRef<WebUiSwitch>('field')

function writeChecked() {
  const element = field.value
  if (element) element.checked = !element.checked
}
</script>
```

### 拖拽与甩动 {#drag}

按下之后横向移动超过 6px 才进入拖拽，thumb 跟着指针走；松手时位移过半就定值，横向速度超过 ±300 px/s 则按甩动方向定值，不看落点。

一次拖拽只算一次取值变更，`input` 与 `change` 各派发一次，紧随其后的 click 被拖拽标记吞掉，不会二次翻转。

宿主 `touch-action: none`，竖屏滚动不会抢走这个手势。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [log, setLog] = useState<string[]>([])

  function record(name: string) {
    setLog(entries => [...entries.slice(-5), name])
  }

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <div className="flex items-center gap-3">
        <web-ui-switch onInput={() => record('input')} onChange={() => record('change')}></web-ui-switch>
        <span className="text-sm text-(--wui-color-text-secondary)">按住整块拖，跨过中点或甩手即定值</span>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">
        {log.length === 0 ? '等待操作' : log.join(' → ')}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col items-start gap-3">
    <div class="flex items-center gap-3">
      <web-ui-switch @input="record('input')" @change="record('change')"></web-ui-switch>
      <span class="text-sm text-(--wui-color-text-secondary)">按住整块拖，跨过中点或甩手即定值</span>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">
      {{ log.length === 0 ? '等待操作' : log.join(' → ') }}
    </output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const log = ref<string[]>([])

function record(name: string) {
  log.value = [...log.value.slice(-5), name]
}
</script>
```

### 表单值 {#form}

`name` 是字段名，`value` 是提交值，留空时提交 `'on'`。

未选中时这个字段整个不进 `FormData`；`required` 在未选中时拦下提交（`valueMissing`），外层 `<fieldset disabled>` 禁用时校验一并退让。

可见标签同时命名 switch；`aria-label` 或 `aria-labelledby` 可覆盖默认名称。

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
      <web-ui-switch name="newsletter" value="yes" required></web-ui-switch>
      <span className="text-sm text-(--wui-color-text-secondary)">订阅邮件：必填</span>
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
    <web-ui-switch name="newsletter" value="yes" required></web-ui-switch>
    <span class="text-sm text-(--wui-color-text-secondary)">订阅邮件：必填</span>
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

## API

### Props

| 名称       | 说明                                                               | 类型      | 默认值  |
| ---------- | ------------------------------------------------------------------ | --------- | ------- |
| `checked`  | 开合状态；不是观察属性，程序写入生效但不反射成属性、也不派发事件。 | `boolean` | `false` |
| `name`     | 表单字段名。                                                       | `string`  | `''`    |
| `value`    | 表单提交值，留空时提交 `'on'`；未选中时字段不提交。                | `string`  | `''`    |
| `disabled` | 禁用状态，阻断交互并让校验退让。                                   | `boolean` | `false` |
| `required` | 必填校验：未选中时拦下提交。                                       | `boolean` | `false` |
| `loading`  | 加载状态：阻断交互，thumb 内显示旋转 icon，当前值保持不动。        | `boolean` | `false` |

### Slots

| 名称      | 说明                                                                   |
| --------- | ---------------------------------------------------------------------- |
| `default` | 可见标签文本，并作为 switch 的 accessible name；为空时不增加额外间距。 |

### Events

| 名称     | 说明                                                                |
| -------- | ------------------------------------------------------------------- |
| `input`  | 用户切换时派发：点击、Enter、空格与拖拽定值，四条路径都由组件派发。 |
| `change` | 与 `input` 同一批提交点派发；程序写入 `checked` 不派发。            |

### 行为说明

`checked` 不是观察属性，而是内部状态上的一对 getter / setter：原生标签上写下的 `checked` 只在挂载时被读一次，之后 Lit 不再看这个属性；框架的动态绑定落到 property 上才会随渲染更新。

直接写 `el.checked = true` 生效，但不反射成属性，也不派发任何事件。

要跟着页面走就接住 `change` 再写回，见上面的基础示例。

三条激活路径的最终出口相同：点击、Space / Enter 与拖拽定值都经组件写入新值，并在宿主上派发 `input` 与 `change` 两条 `composed` 事件。

host 自己承接 click 与 keydown（Space / Enter `preventDefault()` 后切换，不依赖内部原生控件），所以三条路径不再有冒泡与转发之分，程序写入 `checked` 仍不派发。

`disabled` 与 `loading` 共用同一条禁用路径：`_isDisabled`（含表单级禁用）或 `loading` 时，点击、键盘与拖拽三条入口都在处理函数最前面返回，thumb 停在当前值。

校验只走一半：`required` 的 `valueMissing` 判定读的是 `_isDisabled`，因此 `disabled` 上报干净状态、`loading` 不上报。

键盘焦点落在 host 上（可用态 `tabindex=0`），焦点环靠 `:host(:focus-visible)` 画在 track 上；鼠标触发的焦点不画环，交给共享的 pointer focus 抑制机制。

`disabled` 或 `loading` 时 host 的 `tabindex` 被压成 `-1`（原值记下、恢复时还原），整块离开 tab 序列，焦点环也就无从出现。

accessible name：默认插槽内容就是可见标签，同时也是 switch 的 accessible name；需要引用外部 label 时在 `web-ui-switch` host 上设置 `aria-labelledby`，或直接设置 `aria-label`。

host 上的 `role="switch"`、`aria-checked` 与 `aria-disabled` 由组件同步维护。

### 布局

标签与 track 之间默认间距为 `8px`；default slot 没有可渲染宽度时（空槽位或只放了视觉隐藏的无障碍名）间距收起，宿主宽度不会超过 track。

track 是 40×20 的胶囊盒，圆角取 `--wui-radius-control`，底色取 `--wui-color-surface-track`，打开时换成 `--wui-color-accent`。

thumb 是 16×16 圆点，静止态用 `--wui-color-on-control` 实心加阴影，按压与拖拽时换成 glass 表面并加宽到 20px、`scale(1.5)`，两条形态切换由 transition 衔接。

打开态位移 20px（按压态 16px，配合放大后的视觉位置一致）。

拖拽期间的位置走内联的 `--wui-switch-drag-offset`，同时关掉 transition 让它跟手——这个变量由组件自己驱动，不要当样式钩子写。

宿主与 track 都是 `touch-action: none`，`user-select: none` 只写在 track 上；禁用与加载落到 `.is-disabled`，整块降到四成不透明度并换 `not-allowed` 光标。

组件没有自有的尺寸或颜色 token，全部走主题共享 token，因此这里不列 CSS Custom Properties 表：宽度与颜色要改，改的是 `--wui-color-surface-track` 与 `--wui-color-accent` 这类主题变量本身，作用范围是所有控件。

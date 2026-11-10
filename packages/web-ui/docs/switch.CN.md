# Switch

[English](./switch.md) | 简体中文

开关，声明 `role="switch"` 与 `aria-checked`。点击即时开合，也支持按住轨道横向拖动与快速甩动定值；空格与 Enter 都能切换。

默认插槽的文字会成为可见标签和默认的可访问名称。也可以在宿主上设置 `aria-label` 或 `aria-labelledby`。

## 示例

### 基础用法

`checked` 是开合状态。写在 `<web-ui-switch>` 里的文字渲染成开关旁的可见标签（见插槽）；不要可见标签时，把标签放在宿主外面。由页面持有这个值时，接住 `change` 再写回 `checked`。

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

### 禁用和加载

`disabled` 与 `loading` 都阻断交互，外观也相同。

区别在语义与校验：`loading` 在滑块里画一个旋转图标，`checked` 保持不动；`required` 只认 `disabled`（含表单级禁用），`loading` 时未选中照旧上报 `valueMissing` 并拦下提交。

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

### 事件触发时机

事件只在用户操作后派发：点击、Enter 与空格都由组件派发 `input` 加 `change` 两条。程序写入 `checked` 时两条都不派发。下面这个按钮就是这样做的。

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

### 拖拽和甩动

按住轨道横向拖动：松手时位移过半就定值，快速甩动则按方向定值。

一次拖拽只算一次取值变更，`input` 与 `change` 各派发一次，不会二次翻转。

竖屏下滚动页面不会干扰这个手势。

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

### 表单值

`name` 是字段名，`value` 是提交值，留空时提交 `'on'`。

未选中时这个字段整个不进 `FormData`；`required` 在未选中时拦下提交（`valueMissing`），外层 `<fieldset disabled>` 禁用时校验一并失效。

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

### 自定义尺寸

通过 `--wui-switch-height` 设置轨道高度；宽度默认是高度的两倍，也可用 `--wui-switch-width` 单独设置。滑块与拖拽行程随轨道派生。

```tsx
export default function Demo() {
  return <web-ui-switch style={{ '--wui-switch-height': '28px' }}>较大开关</web-ui-switch>
}
```

```vue
<template>
  <web-ui-switch style="--wui-switch-height: 28px">较大开关</web-ui-switch>
</template>
```

## API

### 属性

| 名称       | 说明                                                                         | 类型      | 默认值  |
| ---------- | ---------------------------------------------------------------------------- | --------- | ------- |
| `checked`  | 开合状态；通过 property 设置时立即生效，不会更新 attribute，也不会派发事件。 | `boolean` | `false` |
| `name`     | 表单字段名。                                                                 | `string`  | `''`    |
| `value`    | 表单提交值，留空时提交 `'on'`；未选中时字段不提交。                          | `string`  | `''`    |
| `disabled` | 禁用状态，阻断交互并让校验失效。                                             | `boolean` | `false` |
| `required` | 必填校验：未选中时拦下提交。                                                 | `boolean` | `false` |
| `loading`  | 加载状态：阻断交互，滑块内显示旋转图标，当前值保持不动。                     | `boolean` | `false` |

### Slot

| 名称      | 说明                                                             |
| --------- | ---------------------------------------------------------------- |
| `default` | 可见标签文本，并作为 switch 的可访问名称；为空时不增加额外间距。 |

### 事件

| 名称     | 说明                                                                |
| -------- | ------------------------------------------------------------------- |
| `input`  | 用户切换时派发：点击、Enter、空格与拖拽定值，四条路径都由组件派发。 |
| `change` | 与 `input` 同一批提交点派发；程序写入 `checked` 不派发。            |

### 行为说明

`checked` 不会写回 attribute：标签上写的 `checked` 只在挂载时读取一次；框架的动态绑定只有在写到 property 上时，才会随渲染更新。

直接写 `el.checked = true` 生效，但不反射成属性，也不派发任何事件。

要跟随页面状态，就接住 `change` 再写回。

点击、Space / Enter 与拖拽定值都在宿主上派发 `input` 与 `change` 两条 `composed` 事件。

宿主自己承接点击与 keydown，三条路径行为一致；程序写入 `checked` 不派发事件。

`disabled`（含表单级禁用）与 `loading` 都阻断点击、键盘与拖拽，滑块停在当前值。

校验：`disabled`（含表单级禁用）上报干净状态；`loading` 不参与校验判定，未选中加 `required` 照常上报 `valueMissing`。

键盘焦点落在宿主上（可用态 `tabindex=0`），焦点环画在轨道上；鼠标触发的焦点不画环。

`disabled` 或 `loading` 时宿主离开 Tab 序列。

默认插槽内容就是可见标签，同时也是 switch 的可访问名称；需要引用外部标签时，在 `web-ui-switch` 宿主上设置 `aria-labelledby`，或直接设置 `aria-label`。

宿主上的 `role="switch"`、`aria-checked` 与 `aria-disabled` 由组件同步维护。

### 布局

标签与轨道之间默认间距为 `8px`；默认插槽没有可渲染宽度时（空槽位或只放了视觉隐藏的无障碍名），间距收起，宿主宽度不会超过轨道。

轨道默认是 40×20 的胶囊盒，圆角取 `--wui-radius-control`，底色取 `--wui-color-surface-track`，打开时换成 `--wui-color-accent`。

滑块默认是 16×16 圆点，静止态用 `--wui-color-on-control` 实心加阴影，按压与拖拽时换成 glass 表面并略微放大。

`--wui-switch-drag-offset` 由组件自己驱动，不要当样式钩子写。

禁用与加载整块降到四成不透明度并用 `not-allowed` 光标。

轨道高度由 `--wui-switch-height` 控制（默认 `20px`）；`--wui-switch-width` 默认是高度的两倍。颜色使用主题变量 `--wui-color-surface-track` 与 `--wui-color-accent`。

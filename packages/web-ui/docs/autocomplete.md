---
component: autocomplete
tag: web-ui-autocomplete
---

可输入并过滤候选的单值选择器：输入文本按 `option` 的 label 过滤候选，选中后把 label 回填到 input，并把该项的 value 暴露为只读的 `selected-value`。

## 示例

### 基础 {#basic}

`value` 是当前输入文本，由页面持有：键入按 label 过滤候选（默认 `contains`），没有匹配项时 panel 保持关闭；选中后文本回填为该项 label，`selected-value` 给出该项的 value。

```tsx
import { useState } from 'react'

const frameworks = ['Vue', 'React', 'Svelte', 'Angular']

export default function Demo() {
  const [text, setText] = useState('')
  const [picked, setPicked] = useState('')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-autocomplete
        value={text}
        placeholder="输入框架名"
        onInput={event => setText(event.currentTarget.value)}
        onChange={event => {
          setText(event.currentTarget.value)
          setPicked(event.currentTarget.selectedValue)
        }}
      >
        {frameworks.map(name => (
          <web-ui-option key={name} value={name} label={name}></web-ui-option>
        ))}
      </web-ui-autocomplete>
      <output className="text-sm text-(--wui-color-text-secondary)">
        输入：{text || '(空)'} · selected-value：{picked || '(空)'}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-autocomplete :value="text" placeholder="输入框架名" @input="onInput" @change="onChange">
      <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name"></web-ui-option>
    </web-ui-autocomplete>
    <output class="text-sm text-(--wui-color-text-secondary)">
      输入：{{ text || '(空)' }} · selected-value：{{ picked || '(空)' }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiAutocomplete, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const frameworks = ['Vue', 'React', 'Svelte', 'Angular']
const text = ref('')
const picked = ref('')

function onInput(event: WebUiEvent<WebUiAutocomplete, 'input'>) {
  text.value = event.currentTarget.value
}

function onChange(event: WebUiEvent<WebUiAutocomplete, 'change'>) {
  text.value = event.currentTarget.value
  picked.value = event.currentTarget.selectedValue
}
</script>
```

### 过滤模式 {#filter}

`filter` 取 `contains`（默认）、`prefix` 或 `none`：前两者按 label 包含或前缀匹配，`none` 关闭过滤、候选始终全量列出。

```tsx
import { useState } from 'react'

type FilterMode = 'contains' | 'prefix' | 'none'

const frameworks = ['Vue', 'React', 'Svelte', 'Angular']

export default function Demo() {
  const [mode, setMode] = useState<FilterMode>('contains')

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-select
          className="[--wui-input-width:140px]"
          value={mode}
          onChange={event => setMode(event.currentTarget.value as FilterMode)}
        >
          <web-ui-option value="contains" label="contains"></web-ui-option>
          <web-ui-option value="prefix" label="prefix"></web-ui-option>
          <web-ui-option value="none" label="none"></web-ui-option>
        </web-ui-select>
        <output className="text-sm text-(--wui-color-text-secondary)">当前模式：{mode}</output>
      </div>
      <web-ui-autocomplete filter={mode} placeholder="输入框架名">
        {frameworks.map(name => (
          <web-ui-option key={name} value={name} label={name}></web-ui-option>
        ))}
      </web-ui-autocomplete>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-select class="[--wui-input-width:140px]" :value="mode" @change="onModeChange">
        <web-ui-option value="contains" label="contains"></web-ui-option>
        <web-ui-option value="prefix" label="prefix"></web-ui-option>
        <web-ui-option value="none" label="none"></web-ui-option>
      </web-ui-select>
      <output class="text-sm text-(--wui-color-text-secondary)">当前模式：{{ mode }}</output>
    </div>
    <web-ui-autocomplete :filter="mode" placeholder="输入框架名">
      <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name"></web-ui-option>
    </web-ui-autocomplete>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiSelect } from '@greypan/web-ui'
import { ref } from 'vue'

type FilterMode = 'contains' | 'prefix' | 'none'

const frameworks = ['Vue', 'React', 'Svelte', 'Angular']
const mode = ref<FilterMode>('contains')

function onModeChange(event: WebUiEvent<WebUiSelect, 'change'>) {
  mode.value = event.currentTarget.value as FilterMode
}
</script>
```

### change 与 selected-value {#change-selected-value}

选中候选后 `selected-value` 是该项的 value；输入不再精确匹配任何 label 时它清空——它由组件在更新周期里派生，所以在 `input` 里读它要等一拍（`requestAnimationFrame`），`change` 里读到的才是当次提交的值。

```tsx
import { useState } from 'react'

const cities = [
  { label: '北京', value: 'beijing' },
  { label: '上海', value: 'shanghai' },
  { label: '广州', value: 'guangzhou' },
  { label: '深圳', value: 'shenzhen' }
]

export default function Demo() {
  const [text, setText] = useState('')
  const [liveSelected, setLiveSelected] = useState('')
  const [committed, setCommitted] = useState('')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-autocomplete
        placeholder="选中北京后再删掉一个字"
        onInput={event => {
          const host = event.currentTarget
          setText(host.value)
          // selected-value 在组件的更新周期里派生，下一帧读到的才是与当前文本对应的值
          requestAnimationFrame(() => setLiveSelected(host.selectedValue))
        }}
        onChange={event => {
          setText(event.currentTarget.value)
          setLiveSelected(event.currentTarget.selectedValue)
          setCommitted(event.currentTarget.selectedValue)
        }}
      >
        {cities.map(city => (
          <web-ui-option key={city.value} value={city.value} label={city.label}></web-ui-option>
        ))}
      </web-ui-autocomplete>
      <output className="text-sm text-(--wui-color-text-secondary)">
        输入：{text || '(空)'} · selected-value：{liveSelected || '(空)'}
      </output>
      <output className="text-sm text-(--wui-color-text-secondary)">
        最近一次 change 的 selected-value：{committed || '(空)'}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-autocomplete placeholder="选中北京后再删掉一个字" @input="onInput" @change="onChange">
      <web-ui-option v-for="city in cities" :key="city.value" :value="city.value" :label="city.label"></web-ui-option>
    </web-ui-autocomplete>
    <output class="text-sm text-(--wui-color-text-secondary)">
      输入：{{ text || '(空)' }} · selected-value：{{ liveSelected || '(空)' }}
    </output>
    <output class="text-sm text-(--wui-color-text-secondary)">
      最近一次 change 的 selected-value：{{ committed || '(空)' }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiAutocomplete, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const cities = [
  { label: '北京', value: 'beijing' },
  { label: '上海', value: 'shanghai' },
  { label: '广州', value: 'guangzhou' },
  { label: '深圳', value: 'shenzhen' }
]
const text = ref('')
const liveSelected = ref('')
const committed = ref('')

function onInput(event: WebUiEvent<WebUiAutocomplete, 'input'>) {
  const host = event.currentTarget
  text.value = host.value
  // selected-value 在组件的更新周期里派生，下一帧读到的才是与当前文本对应的值
  requestAnimationFrame(() => (liveSelected.value = host.selectedValue))
}

function onChange(event: WebUiEvent<WebUiAutocomplete, 'change'>) {
  text.value = event.currentTarget.value
  liveSelected.value = event.currentTarget.selectedValue
  committed.value = event.currentTarget.selectedValue
}
</script>
```

### 自定义 trigger {#custom-trigger}

把可编辑组件放进 `trigger` 插槽即可替换默认 input：多行 trigger 保留 Enter 换行语义，关闭 panel 改用 Escape 或 blur；这里同时用 `filter="none"` 让候选始终全量列出。

`focus()` 委托给当前 trigger，落在 `web-ui-textarea` 内部的原生控件上。

```tsx
import type { WebUiAutocomplete } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiAutocomplete>(null)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-autocomplete ref={fieldRef} filter="none">
        <web-ui-textarea
          slot="trigger"
          rows={3}
          className="[--wui-textarea-width:20rem]"
          placeholder="多行 trigger：Enter 换行，Escape 或失焦关闭 panel"
        ></web-ui-textarea>
        <web-ui-option value="bug" label="缺陷"></web-ui-option>
        <web-ui-option value="feature" label="需求"></web-ui-option>
      </web-ui-autocomplete>
      <web-ui-button onClick={() => fieldRef.current?.focus()}>聚焦 trigger</web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-autocomplete ref="field" filter="none">
      <web-ui-textarea
        slot="trigger"
        :rows="3"
        class="[--wui-textarea-width:20rem]"
        placeholder="多行 trigger：Enter 换行，Escape 或失焦关闭 panel"
      ></web-ui-textarea>
      <web-ui-option value="bug" label="缺陷"></web-ui-option>
      <web-ui-option value="feature" label="需求"></web-ui-option>
    </web-ui-autocomplete>
    <web-ui-button @click="field?.focus()">聚焦 trigger</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import type { WebUiAutocomplete } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const field = useTemplateRef<WebUiAutocomplete>('field')
</script>
```

### 允许自定义值 {#custom-value}

开启 `allow-custom-value` 后，输入不在候选中的文本也能提交：按 Enter 把输入原文作为 custom value，panel 随之关闭，`change` 触发，`selected-value` 保持为空；过滤后没有候选时 panel 不展开，Enter 仍可提交。

```tsx
import { useState } from 'react'

const frameworks = ['Vue', 'React', 'Svelte', 'Angular']

export default function Demo() {
  const [submitted, setSubmitted] = useState('')
  const [selected, setSelected] = useState('')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-autocomplete
        allowCustomValue
        placeholder="输入候选之外的文本后按 Enter"
        onChange={event => {
          setSubmitted(event.currentTarget.value)
          setSelected(event.currentTarget.selectedValue)
        }}
      >
        {frameworks.map(name => (
          <web-ui-option key={name} value={name} label={name}></web-ui-option>
        ))}
      </web-ui-autocomplete>
      <output className="text-sm text-(--wui-color-text-secondary)">
        最近提交：{submitted || '(空)'} · selected-value：{selected || '(空)'}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-autocomplete allow-custom-value placeholder="输入候选之外的文本后按 Enter" @change="onChange">
      <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name"></web-ui-option>
    </web-ui-autocomplete>
    <output class="text-sm text-(--wui-color-text-secondary)">
      最近提交：{{ submitted || '(空)' }} · selected-value：{{ selected || '(空)' }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiAutocomplete, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const frameworks = ['Vue', 'React', 'Svelte', 'Angular']
const submitted = ref('')
const selected = ref('')

function onChange(event: WebUiEvent<WebUiAutocomplete, 'change'>) {
  submitted.value = event.currentTarget.value
  selected.value = event.currentTarget.selectedValue
}
</script>
```

### 禁用与只读 {#disabled-readonly}

`disabled` 与 `readonly` 都不接受输入、不展开 panel，预填的 `value` 仍照常显示；两者在必填校验上都按通过处理。

```tsx
const frameworks = ['Vue', 'React', 'Svelte', 'Angular']

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-autocomplete value="Vue" disabled placeholder="禁用">
        {frameworks.map(name => (
          <web-ui-option key={name} value={name} label={name}></web-ui-option>
        ))}
      </web-ui-autocomplete>
      <web-ui-autocomplete value="Vue" readonly placeholder="只读">
        {frameworks.map(name => (
          <web-ui-option key={name} value={name} label={name}></web-ui-option>
        ))}
      </web-ui-autocomplete>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-autocomplete value="Vue" disabled placeholder="禁用">
      <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name"></web-ui-option>
    </web-ui-autocomplete>
    <web-ui-autocomplete value="Vue" readonly placeholder="只读">
      <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name"></web-ui-option>
    </web-ui-autocomplete>
  </div>
</template>

<script setup lang="ts">
const frameworks = ['Vue', 'React', 'Svelte', 'Angular']
</script>
```

## API

### Props

| 名称                 | 说明                                                           | 类型                  | 默认值       |
| -------------------- | -------------------------------------------------------------- | --------------------- | ------------ |
| `placeholder`        | input 占位文本。                                               | `string`              | `''`         |
| `borderless`         | ghost 形态：移除边框、背景与阴影，保留 padding 与 focus ring。 | `boolean`             | `false`      |
| `disabled`           | 禁用态，不可输入、不可展开下拉。                               | `boolean`             | `false`      |
| `readonly`           | 只读态：不可输入、不可展开下拉。                               | `boolean`             | `false`      |
| `required`           | 必填校验。                                                     | `boolean`             | `false`      |
| `portal`             | 在 theme-owned overlay root 中渲染下拉 panel。                 | `boolean`             | `false`      |
| `no-scroll-lock`     | 打开时不锁定页面滚动。                                         | `boolean`             | `false`      |
| `allow-custom-value` | 允许 Enter 提交不在候选中的输入原文。                          | `boolean`             | `false`      |
| `overlayContainer`   | 显式 Portal 容器（property，不是 attribute）。                 | `OverlayContainer`    | —            |
| `name`               | 表单字段名。                                                   | `string`              | `''`         |
| `aria-label`         | 无障碍名称。                                                   | `string \| null`      | `null`       |
| `aria-labelledby`    | 无障碍名称引用。                                               | `string \| undefined` | —            |
| `filter`             | 候选过滤模式：`contains`（默认）、`prefix` 或 `none`。         | `FilterMode`          | `'contains'` |
| `value`              | 当前输入文本，也是表单提交值。                                 | `string`              | `''`         |

### Events

| 名称          | 说明                                        |
| ------------- | ------------------------------------------- |
| `input`       | 输入时触发，`value` 为当前文本。            |
| `change`      | 选中候选或提交 custom value 时触发。        |
| `focus`       | trigger 获得焦点时触发。                    |
| `blur`        | trigger 失去焦点时触发。                    |
| `open-change` | 下拉 panel 开合，`detail.open` 为当前状态。 |

### Slots

| 名称      | 说明                                 |
| --------- | ------------------------------------ |
| `trigger` | 自定义触发区域内容，替换默认 input。 |
| `default` | 投影 `<web-ui-option>` 候选。        |

### Methods

| 名称      | 说明                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `focus()` | 聚焦当前 trigger：`web-ui-input` / `web-ui-textarea` trigger 把焦点交给内部原生控件，没有自己的 focus 重定向的自定义 trigger 则聚焦 trigger 元素自身。 |
| `blur()`  | 让当前 trigger 失焦。                                                                                                                                  |

### 行为说明

键入时按 label 过滤候选（`contains` 或 `prefix`，`none` 关闭过滤）。

没有匹配项时下拉 panel 保持关闭；删除字符后重新出现匹配项时，panel 会再次打开。

选择 option 时文本回填为该项 label，`selected-value` 暴露该项的 value；`change` 在选择提交时触发。

支持 ArrowDown/ArrowUp/Enter/Escape 键盘导航。

Portal panel 创建时会镜像 host 上解析后的这些变量；更新 host 后需重新打开 Portal panel 才会生效。

### trigger

默认 trigger 是 shadow 内的 `web-ui-input`。

把任意可编辑组件放进 `trigger` slot 即可替换它——包装 div 继续承载 combobox ARIA，并以 `data-custom-trigger` 标记当前使用自定义 trigger，overlay 始终以 trigger 元素为锚点。

组件的 `focus()` / `blur()` 委托到当前生效的 trigger：`web-ui-input` 与 `web-ui-textarea` 会把焦点落到内部原生控件；自定义 trigger 没有自己的 focus 重定向时，聚焦 trigger 元素自身。

```html
<web-ui-autocomplete placeholder="描述问题">
  <web-ui-textarea slot="trigger" rows="3"></web-ui-textarea>
  <web-ui-option value="bug" label="缺陷"></web-ui-option>
  <web-ui-option value="feature" label="需求"></web-ui-option>
</web-ui-autocomplete>
```

自定义 trigger 与默认 trigger 共用同一份契约：字符串 `value` 承载文本、可聚焦，并派发组件委托监听的事件（`input`、`click`、`focus`、`blur`）。

`web-ui-input` 与 `web-ui-textarea` 开箱即用；自定义元素只要暴露字符串 `value` property 即可接入。

包装 div 不占 tab 位（`tabindex="-1"`）：顺序焦点归 trigger 自身，自定义 trigger 必须可聚焦，键盘用户才能到达 combobox。

多行 trigger（可编辑元素为 `<textarea>`）保留 Enter 换行语义：Enter 不会选中高亮项，也不会提交 custom value，关闭 panel 用 Escape 或 blur。选择 option 仍会把该项 label 回写到 trigger。

单行自定义 trigger 保持默认的 Enter 语义。

panel 打开时 ArrowUp/ArrowDown 适用同一例外：方向键移动文本光标而不导航候选，该状态下键盘无法导航 option——用指针点击选择。panel 关闭时 ArrowDown/ArrowUp 仍可打开 panel。

启用 `allow-custom-value` 后，无匹配且无活动 option 时，Enter 会把当前输入原文作为 custom value 提交并关闭 panel；`change` 会触发，`selected-value` 保持为空。

过滤后没有任何候选时 panel 不展开（已展开则收起），此时 Enter 仍走同一条提交路径。

组件不会自动创建 option，也不会 trim 原文。命中禁用 option 的文本不会绕过禁用语义，也不会派生为已选 option。

### CSS Custom Properties

| 名称                            | 说明                 | 默认值  |
| ------------------------------- | -------------------- | ------- |
| `--wui-autocomplete-max-width`  | 下拉框最大宽度       | `500px` |
| `--wui-autocomplete-max-height` | 下拉滚动区域最大高度 | `200px` |
| `--wui-overlay-min-width`       | 下拉框最小宽度       | `200px` |

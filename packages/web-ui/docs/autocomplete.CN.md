# Autocomplete

可输入并过滤候选的单值选择器。输入的文本按 `option` 的标签过滤候选；选中后，组件把标签回填到输入框，并把该项的值暴露为只读的 `selected-value`。

## Samples

### Basic

`value` 是当前输入文本，由页面持有。键入时按标签过滤候选（默认 `contains`）；没有可展示的内容时面板保持关闭。选中后，文本回填为该项标签，`selected-value` 给出该项的值。

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

### Filter modes

`filter` 取 `contains`（默认）、`prefix` 或 `none`。前两者按标签文本包含或前缀匹配；`none` 关闭过滤，候选始终全量列出。

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

### change and selected-value

选中候选后，`selected-value` 是该项的值；输入与任何标签都不完全一致时，它清空。在 `input` 里读它要等一帧（`requestAnimationFrame`），在 `change` 里读到的才是当次提交的值。

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

### Trigger modes

`trigger` 是手势集合，用空格或逗号分隔，可写 `click`、`hover`、`focus`、`none`，默认 `click`。输入框的点击只打开、不关闭；再次点击不会收起，关闭靠点外面、Escape 或 `hide()`。`hover` 由指针进出开合，`focus` 在键盘聚焦（`:focus-visible`）时展开；手势可以并排写。

`none` 关掉所有自动打开：点击、键入、方向键、聚焦与悬停都不再展开面板，只能由 `open` 属性或 `show()` / `hide()` 控制。`none` 与手势互斥：同时写时按 `none` 处理，并在开发期打印 warning。

`show-delay` / `hide-delay` 只作用于 hover 来源的开合；点击、键入、焦点与程序式调用都立即生效。

```tsx
import type { WebUiAutocomplete } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const field = useRef<WebUiAutocomplete>(null)
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <web-ui-autocomplete
        ref={field}
        trigger="none"
        placeholder="none 模式"
        aria-label="none 模式"
        onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
      >
        <web-ui-option value="bug" label="缺陷"></web-ui-option>
        <web-ui-option value="feature" label="需求"></web-ui-option>
      </web-ui-autocomplete>
      <div className="flex flex-wrap items-center gap-2">
        <web-ui-button size="28" variant="secondary" onClick={() => field.current?.show()}>
          show()
        </web-ui-button>
        <web-ui-button size="28" variant="secondary" onClick={() => field.current?.hide()}>
          hide()
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">最近一次 detail.open = {last}</output>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <web-ui-autocomplete
      ref="field"
      trigger="none"
      placeholder="none 模式"
      aria-label="none 模式"
      @open-change="last = $event.detail.open ? 'true' : 'false'"
    >
      <web-ui-option value="bug" label="缺陷"></web-ui-option>
      <web-ui-option value="feature" label="需求"></web-ui-option>
    </web-ui-autocomplete>
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button size="28" variant="secondary" @click="field?.show()">show()</web-ui-button>
      <web-ui-button size="28" variant="secondary" @click="field?.hide()">hide()</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">最近一次 detail.open = {{ last }}</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiAutocomplete } from '@greypan/web-ui'
import { ref, useTemplateRef } from 'vue'

const field = useTemplateRef<WebUiAutocomplete>('field')
const last = ref('—')
</script>
```

### Custom trigger slot

把可编辑组件放进 `trigger` 插槽即可替换默认输入框。多行触发器保留 Enter 换行语义，关闭面板改用 Escape 或失焦。`filter="none"` 让候选始终全量列出。`focus()` 落在 `web-ui-textarea` 内部的原生控件上。

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
          placeholder="多行触发器：Enter 换行，Escape 或失焦关闭面板"
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
        placeholder="多行触发器：Enter 换行，Escape 或失焦关闭面板"
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

### Allow custom values

开启 `allow-custom-value` 后，输入不在候选中的文本也能提交。按 Enter 时，输入原文作为自定义值提交，面板随之关闭，`change` 触发，`selected-value` 保持为空。过滤后没有可展示的内容时，面板不展开，Enter 仍可提交。

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

### Disabled and readonly

`disabled` 与 `readonly` 都不接受输入，也不展开面板；预填的 `value` 仍然照常显示。两者在必填校验上都按通过处理。

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

| 名称                 | 说明                                                                                      | 类型                  | 默认值           |
| -------------------- | ----------------------------------------------------------------------------------------- | --------------------- | ---------------- |
| `placeholder`        | 输入框占位文本。                                                                          | `string`              | `''`             |
| `borderless`         | ghost 形态：移除边框、背景、背景模糊与阴影，保留内边距与焦点环。                          | `boolean`             | `false`          |
| `disabled`           | 禁用态，不可输入、不可展开下拉。                                                          | `boolean`             | `false`          |
| `readonly`           | 只读态：不可输入、不可展开下拉。                                                          | `boolean`             | `false`          |
| `required`           | 必填校验。                                                                                | `boolean`             | `false`          |
| `portal`             | 在主题的 overlay 容器中渲染下拉面板。                                                     | `boolean`             | `false`          |
| `placement`          | 下拉面板位置，默认从触发器左下角向下展开。                                                | `Placement`           | `'bottom-start'` |
| `no-scroll-lock`     | 打开时不锁定页面滚动。                                                                    | `boolean`             | `false`          |
| `allow-custom-value` | 允许 Enter 提交不在候选中的输入原文。                                                     | `boolean`             | `false`          |
| `overlayContainer`   | 显式指定面板挂载的 overlay 容器（property，不是 attribute）。                             | `OverlayContainer`    | —                |
| `name`               | 表单字段名。                                                                              | `string`              | `''`             |
| `aria-label`         | 无障碍名称。                                                                              | `string \| null`      | `null`           |
| `aria-labelledby`    | 无障碍名称引用。                                                                          | `string \| undefined` | —                |
| `filter`             | 候选过滤模式：`contains`（默认）、`prefix` 或 `none`。                                    | `FilterMode`          | `'contains'`     |
| `value`              | 当前输入文本，也是表单提交值。                                                            | `string`              | `''`             |
| `trigger`            | 触发手势集合，空格或逗号分隔：`click`、`hover`、`focus`、`none`；读回为逗号分隔的规范串。 | `string`              | `'click'`        |
| `show-delay`         | 悬停打开的延迟（毫秒）；只影响 hover 来源。                                               | `number`              | `200`            |
| `hide-delay`         | 悬停收起的延迟（毫秒）；只影响 hover 来源。                                               | `number`              | `100`            |
| `open`               | 声明式开关；直接写入静默，不派发 `open-change`。                                          | `boolean`             | `false`          |
| `isOpen`             | 当前是否打开（只读）。                                                                    | `boolean`             | —                |

### Events

| 名称          | 说明                                                                                    |
| ------------- | --------------------------------------------------------------------------------------- |
| `input`       | 输入时触发，`value` 为当前文本。                                                        |
| `change`      | 选中候选或提交自定义值时触发。                                                          |
| `focus`       | 触发器获得焦点时触发。                                                                  |
| `blur`        | 触发器失去焦点时触发。                                                                  |
| `open-change` | 手势或 `show()` / `hide()` 改变开合时派发，`detail.open` 是当前状态；写 `open` 不派发。 |

### Slots

| 名称      | 说明                                                                      |
| --------- | ------------------------------------------------------------------------- |
| `trigger` | 自定义触发区域内容，替换默认输入框。                                      |
| `default` | 投影 `<web-ui-option>` 候选；其他节点同样算面板内容，可用来放自定义空态。 |

### Methods

| 名称       | 说明                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `focus()`  | 聚焦当前触发器：`web-ui-input` / `web-ui-textarea` 触发器把焦点交给内部原生控件，没有自己的焦点重定向的自定义触发器则聚焦触发器元素自身。 |
| `blur()`   | 让当前触发器失焦。                                                                                                                        |
| `show()`   | 打开面板并派发 `open-change`；`none` 下同样可用。                                                                                         |
| `hide()`   | 关闭面板并派发 `open-change`；已关闭时不产生效果。                                                                                        |
| `toggle()` | 按当前 `open` 切换，并派发 `open-change`。                                                                                                |

### 行为说明

键入时按标签过滤候选（`contains` 或 `prefix`，`none` 关闭过滤）。

面板能否打开看的是「还有没有内容可展示」：匹配的候选，或 `default` 插槽里的任意其他节点。被过滤或被 `hidden` 的候选、注释、纯空白文本、`script` / `style` / `template`，以及为已移除的 `slot="empty"` 保留的节点都不算内容；空 wrapper 算内容。没有内容时，自动来源的手势（点击、键入、方向键、聚焦、悬停）都不展开。`show()` 与写 `open` 仍可空开；关闭态新增内容不会打开面板。面板打开期间最后一段内容消失时，立即收起，不播退场过渡。

选择选项时，文本回填为该项的标签，`selected-value` 暴露该项的值。`change` 在选择提交时触发。

支持 ArrowDown/ArrowUp/Enter/Escape 键盘导航；`none` 下关闭态的 ArrowDown 不再自动打开面板。

点击输入框只打开、不关闭；关闭由点外面、Escape、选择候选或 `hide()` 完成。`hover` 由指针进出开合，指针离开触发器与面板、且焦点不在其中时按 `hide-delay` 收起。`show-delay` / `hide-delay` 只作用于 hover 来源；点击、键入、焦点与程序式调用都立即生效。Escape、点外面与失焦会收起所有非 `none` 的面板，不取决于 `trigger` 是否包含 `click` 或 `focus`。

启用 `portal` 的面板在创建时读取宿主上的这些变量值；更新宿主后需重新打开面板才会生效。

### Trigger slot

默认触发器是一个 `web-ui-input`。

把任意可编辑组件放进 `trigger` 插槽即可替换它。使用自定义触发器时，shadow DOM 内的触发器包装 `<div>` 带上 `data-custom-trigger`，overlay 始终以触发器元素为锚点；宿主自身不带这个属性，外部样式选不到它。

组件的 `focus()` / `blur()` 委托到当前生效的触发器：`web-ui-input` 与 `web-ui-textarea` 会把焦点落到内部原生控件；自定义触发器没有自己的焦点重定向时，聚焦触发器元素自身。

```html
<web-ui-autocomplete placeholder="描述问题">
  <web-ui-textarea slot="trigger" rows="3"></web-ui-textarea>
  <web-ui-option value="bug" label="缺陷"></web-ui-option>
  <web-ui-option value="feature" label="需求"></web-ui-option>
</web-ui-autocomplete>
```

自定义触发器与默认触发器共用同一套规则：用字符串 `value` 承载文本，可聚焦，并派发组件委托监听的事件（`input`、`click`、`focus`、`blur`）。

`web-ui-input` 与 `web-ui-textarea` 开箱即用；自定义元素只要暴露字符串 `value` property 即可接入。

顺序焦点落在触发器自身，所以自定义触发器必须可聚焦，键盘用户才能到达 combobox。

多行触发器（可编辑元素为 `<textarea>`）保留 Enter 换行语义：Enter 不会选中高亮项，也不会提交自定义值；关闭面板用 Escape 或失焦。选择选项仍会把该项标签回写到触发器。

单行自定义触发器保持默认的 Enter 语义。

面板打开时，ArrowUp/ArrowDown 适用同样的例外：方向键移动文本光标，不导航候选，此时键盘无法导航选项，请用指针点击选择。面板关闭时，ArrowDown/ArrowUp 仍可打开面板。

启用 `allow-custom-value` 后，无匹配且无活动选项时，Enter 会把当前输入原文作为自定义值提交并关闭面板；`change` 会触发，`selected-value` 保持为空。

过滤后没有任何可展示的内容时，面板不展开（已展开则收起）；此时 Enter 仍使用同一条提交路径。

组件不会自动创建选项，也不会去掉原文的首尾空白。命中禁用选项的文本不会绕过禁用语义，也不会派生为已选选项。

### CSS Custom Properties

| 名称                            | 说明                 | 默认值  |
| ------------------------------- | -------------------- | ------- |
| `--wui-autocomplete-max-width`  | 下拉框最大宽度       | `500px` |
| `--wui-autocomplete-max-height` | 下拉滚动区域最大高度 | `200px` |
| `--wui-overlay-min-width`       | 下拉框最小宽度       | `200px` |

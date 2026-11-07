# Select

[English](./select.md) | 简体中文

选择器下拉框。默认插槽放 `<web-ui-option>` 候选，`trigger` 插槽可以替换默认的触发区域。组件支持键盘导航与 Portal。

## 示例

### 基础用法

`value` 由页面持有。用户选中某项后，`change` 会把 `event.currentTarget.value` 交回来；把它写回 `value`，触发器的文本就会更新。不写 `value` 时，触发器显示 `placeholder`。程序写入 `value` 不派发事件，因此「清除」只是改变页面状态。

`disabled` 让整个控件不再响应交互。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [framework, setFramework] = useState('vue')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-select
        aria-label="前端框架"
        value={framework}
        placeholder="请选择框架"
        onChange={event => setFramework(event.currentTarget.value)}
      >
        <web-ui-option value="vue" label="Vue"></web-ui-option>
        <web-ui-option value="react" label="React"></web-ui-option>
        <web-ui-option value="svelte" label="Svelte"></web-ui-option>
      </web-ui-select>
      <div className="flex items-center gap-3">
        <web-ui-button onClick={() => setFramework('')}>清除</web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">当前值：{framework || '（空）'}</output>
      </div>
      <web-ui-select placeholder="禁用状态" disabled>
        <web-ui-option value="a" label="不可选"></web-ui-option>
      </web-ui-select>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-select
      aria-label="前端框架"
      :value="framework"
      placeholder="请选择框架"
      @change="framework = $event.currentTarget.value"
    >
      <web-ui-option value="vue" label="Vue"></web-ui-option>
      <web-ui-option value="react" label="React"></web-ui-option>
      <web-ui-option value="svelte" label="Svelte"></web-ui-option>
    </web-ui-select>
    <div class="flex items-center gap-3">
      <web-ui-button @click="framework = ''">清除</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">当前值：{{ framework || '（空）' }}</output>
    </div>
    <web-ui-select placeholder="禁用状态" disabled>
      <web-ui-option value="a" label="不可选"></web-ui-option>
    </web-ui-select>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const framework = ref('vue')
</script>
```

### Option 装饰

`prefix` / `suffix` 插槽在标签两侧放图标与说明。`disabled` 的项留在列表里，但无法选中，键盘导航也会跳过它。

```tsx
import { lucideFileText, lucideFilm, lucideImage } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-select placeholder="选择附件类型">
      <web-ui-option value="doc" label="文档">
        <web-ui-icon slot="prefix" icon={lucideFileText} size={14}></web-ui-icon>
        <span slot="suffix" className="text-xs text-(--wui-color-text-secondary)">
          PDF
        </span>
      </web-ui-option>
      <web-ui-option value="image" label="图片">
        <web-ui-icon slot="prefix" icon={lucideImage} size={14}></web-ui-icon>
        <span slot="suffix" className="text-xs text-(--wui-color-text-secondary)">
          PNG
        </span>
      </web-ui-option>
      <web-ui-option value="video" label="视频（暂不可用）" disabled>
        <web-ui-icon slot="prefix" icon={lucideFilm} size={14}></web-ui-icon>
        <span slot="suffix" className="text-xs text-(--wui-color-text-secondary)">
          MP4
        </span>
      </web-ui-option>
    </web-ui-select>
  )
}
```

```vue
<template>
  <web-ui-select placeholder="选择附件类型">
    <web-ui-option value="doc" label="文档">
      <web-ui-icon slot="prefix" :icon="lucideFileText" :size="14"></web-ui-icon>
      <span slot="suffix" class="text-xs text-(--wui-color-text-secondary)">PDF</span>
    </web-ui-option>
    <web-ui-option value="image" label="图片">
      <web-ui-icon slot="prefix" :icon="lucideImage" :size="14"></web-ui-icon>
      <span slot="suffix" class="text-xs text-(--wui-color-text-secondary)">PNG</span>
    </web-ui-option>
    <web-ui-option value="video" label="视频（暂不可用）" disabled>
      <web-ui-icon slot="prefix" :icon="lucideFilm" :size="14"></web-ui-icon>
      <span slot="suffix" class="text-xs text-(--wui-color-text-secondary)">MP4</span>
    </web-ui-option>
  </web-ui-select>
</template>

<script setup lang="ts">
import { lucideFileText, lucideFilm, lucideImage } from '@greypan/web-ui/icons'
</script>
```

### 自定义 trigger slot

`trigger` 插槽替换默认的标签文本；箭头与开合行为仍由组件提供。组件不会改写插槽内容的字体、颜色或尺寸。插槽内容由页面状态驱动，所以会跟着选择变化。

```tsx
import { lucideGlobe } from '@greypan/web-ui/icons'
import { useState } from 'react'

const LABELS: Record<string, string> = { zh: '中文', en: 'English', ja: '日本語' }

export default function Demo() {
  const [lang, setLang] = useState('en')

  return (
    <web-ui-select value={lang} onChange={event => setLang(event.currentTarget.value)}>
      <div slot="trigger" className="flex items-center gap-1.5">
        <web-ui-icon icon={lucideGlobe}></web-ui-icon>
        <span className="text-sm">{LABELS[lang] ?? '选择语言'}</span>
      </div>
      <web-ui-option value="zh" label="中文"></web-ui-option>
      <web-ui-option value="en" label="English"></web-ui-option>
      <web-ui-option value="ja" label="日本語"></web-ui-option>
    </web-ui-select>
  )
}
```

```vue
<template>
  <web-ui-select :value="lang" @change="lang = $event.currentTarget.value">
    <div slot="trigger" class="flex items-center gap-1.5">
      <web-ui-icon :icon="lucideGlobe"></web-ui-icon>
      <span class="text-sm">{{ LABELS[lang] ?? '选择语言' }}</span>
    </div>
    <web-ui-option value="zh" label="中文"></web-ui-option>
    <web-ui-option value="en" label="English"></web-ui-option>
    <web-ui-option value="ja" label="日本語"></web-ui-option>
  </web-ui-select>
</template>

<script setup lang="ts">
import { lucideGlobe } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const LABELS: Record<string, string> = { zh: '中文', en: 'English', ja: '日本語' }
const lang = ref('en')
</script>
```

### 触发方式

`trigger` 是手势集合，用空格或逗号分隔，可写 `click`、`hover`、`focus`、`none`，默认 `click`。`hover` 由指针进出开合，`focus` 在键盘聚焦（`:focus-visible`）时展开；手势可以并排写。

`none` 不接受任何手势，也不参与点外面关闭和 Escape；关闭态下的方向键、Space、Enter 与 typeahead 也不再自动展开，只能由 `open` 属性或 `show()` / `hide()` 控制。`none` 与手势互斥：同时写时按 `none` 处理，并在开发期打印 warning。

`show-delay` / `hide-delay` 只作用于 hover 来源的开合；点击、焦点与程序式调用都立即生效。

```tsx
import type { WebUiSelect } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const picker = useRef<WebUiSelect>(null)
  const [last, setLast] = useState('—')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-select
        ref={picker}
        trigger="none"
        placeholder="none 模式"
        aria-label="none 模式"
        onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
      >
        <web-ui-option value="a" label="选项 A"></web-ui-option>
        <web-ui-option value="b" label="选项 B"></web-ui-option>
      </web-ui-select>
      <div className="flex flex-wrap items-center gap-2">
        <web-ui-button size="28" variant="secondary" onClick={() => picker.current?.show()}>
          show()
        </web-ui-button>
        <web-ui-button size="28" variant="secondary" onClick={() => picker.current?.hide()}>
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
  <div class="flex flex-col items-start gap-3">
    <web-ui-select
      ref="picker"
      trigger="none"
      placeholder="none 模式"
      aria-label="none 模式"
      @open-change="last = $event.detail.open ? 'true' : 'false'"
    >
      <web-ui-option value="a" label="选项 A"></web-ui-option>
      <web-ui-option value="b" label="选项 B"></web-ui-option>
    </web-ui-select>
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button size="28" variant="secondary" @click="picker?.show()">show()</web-ui-button>
      <web-ui-button size="28" variant="secondary" @click="picker?.hide()">hide()</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">最近一次 detail.open = {{ last }}</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiSelect } from '@greypan/web-ui'
import { ref, useTemplateRef } from 'vue'

const picker = useTemplateRef<WebUiSelect>('picker')
const last = ref('—')
</script>
```

### open-change 通知

`open-change` 只做通知，`detail.open` 是当前状态。手势和 `show()` / `hide()` 会派发它；直接写 `open` 是静默的，适合页面单方面控制面板。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('-')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-select
        placeholder="打开或关闭面板"
        onopen-change={event => {
          setCount(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <web-ui-option value="a" label="选项 A"></web-ui-option>
        <web-ui-option value="b" label="选项 B"></web-ui-option>
      </web-ui-select>
      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change：{count} 次 · 最后一次 detail.open = {last}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-select placeholder="打开或关闭面板" @open-change="onOpenChange">
      <web-ui-option value="a" label="选项 A"></web-ui-option>
      <web-ui-option value="b" label="选项 B"></web-ui-option>
    </web-ui-select>
    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change：{{ count }} 次 · 最后一次 detail.open = {{ last }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiSelect } from '@greypan/web-ui'
import { ref } from 'vue'

const count = ref(0)
const last = ref('-')

function onOpenChange(event: WebUiEvent<WebUiSelect, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### 图标变体

`variant="icon"` 保留右侧箭头，只把左侧内容换成图标，图标可以跟随选中值变化。触发器本身没有文本，所以需要给 select 写 `aria-label`。

```tsx
import { lucideLayoutGrid, lucideList, lucideSettings } from '@greypan/web-ui/icons'
import { useState } from 'react'

const ICONS = { grid: lucideLayoutGrid, list: lucideList, settings: lucideSettings } as const
type ViewMode = keyof typeof ICONS

export default function Demo() {
  const [view, setView] = useState<ViewMode>('grid')

  return (
    <web-ui-select
      variant="icon"
      aria-label="View mode"
      value={view}
      onChange={event => {
        const next = event.currentTarget.value
        if (next in ICONS) setView(next as ViewMode)
      }}
    >
      <web-ui-icon slot="trigger" icon={ICONS[view]} size={18}></web-ui-icon>
      <web-ui-option value="grid" label="Grid"></web-ui-option>
      <web-ui-option value="list" label="List"></web-ui-option>
      <web-ui-option value="settings" label="Settings"></web-ui-option>
    </web-ui-select>
  )
}
```

```vue
<template>
  <web-ui-select variant="icon" aria-label="View mode" :value="view" @change="pick($event.currentTarget.value)">
    <web-ui-icon slot="trigger" :icon="ICONS[view]" :size="18"></web-ui-icon>
    <web-ui-option value="grid" label="Grid"></web-ui-option>
    <web-ui-option value="list" label="List"></web-ui-option>
    <web-ui-option value="settings" label="Settings"></web-ui-option>
  </web-ui-select>
</template>

<script setup lang="ts">
import { lucideLayoutGrid, lucideList, lucideSettings } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const ICONS = { grid: lucideLayoutGrid, list: lucideList, settings: lucideSettings }
type ViewMode = keyof typeof ICONS

const view = ref<ViewMode>('grid')

function pick(value: string) {
  if (value in ICONS) view.value = value as ViewMode
}
</script>
```

### 表单值

`name` 让选中值以该字段名进入 `FormData`。值为空时，`required` 上报 `valueMissing`，原生提交会被拦下。`form.reset()` 把值退回挂载时的初值，触发器也随之回到 `placeholder`。

```tsx
import { useRef, useState } from 'react'

export default function Demo() {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitted, setSubmitted] = useState('')

  return (
    <form
      ref={formRef}
      className="flex flex-col items-start gap-3"
      onSubmit={event => {
        event.preventDefault()
        const framework = new FormData(event.currentTarget).get('framework')
        setSubmitted(typeof framework === 'string' ? framework : '')
      }}
    >
      <web-ui-select name="framework" required placeholder="请选择框架">
        <web-ui-option value="vue" label="Vue"></web-ui-option>
        <web-ui-option value="react" label="React"></web-ui-option>
        <web-ui-option value="svelte" label="Svelte"></web-ui-option>
      </web-ui-select>
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
          {submitted === '' ? '尚未提交' : `framework=${submitted}`}
        </output>
      </div>
    </form>
  )
}
```

```vue
<template>
  <form ref="form" class="flex flex-col items-start gap-3" @submit="onSubmit">
    <web-ui-select name="framework" required placeholder="请选择框架">
      <web-ui-option value="vue" label="Vue"></web-ui-option>
      <web-ui-option value="react" label="React"></web-ui-option>
      <web-ui-option value="svelte" label="Svelte"></web-ui-option>
    </web-ui-select>
    <div class="flex items-center gap-3">
      <web-ui-button type="submit">提交</web-ui-button>
      <web-ui-button @click="reset">重置</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">
        {{ submitted === '' ? '尚未提交' : `framework=${submitted}` }}
      </output>
    </div>
  </form>
</template>

<script setup lang="ts">
import { useTemplateRef, ref } from 'vue'

const submitted = ref('')
const form = useTemplateRef('form')

function onSubmit(event: Event) {
  event.preventDefault()
  const framework = new FormData(event.currentTarget as HTMLFormElement).get('framework')
  submitted.value = typeof framework === 'string' ? framework : ''
}

function reset() {
  form.value?.reset()
  submitted.value = ''
}
</script>
```

### Portal 渲染

默认情况下，祖先元素的 `overflow` 会裁掉面板。`portal` 把面板渲染到主题的 overlay 容器，容器就裁不到它。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex h-24 flex-col items-start gap-2 overflow-hidden rounded-lg border border-(--wui-color-border) p-3">
        <span className="text-xs text-(--wui-color-text-secondary)">默认：panel 被容器裁掉</span>
        <web-ui-select placeholder="默认">
          <web-ui-option value="a" label="选项 A"></web-ui-option>
          <web-ui-option value="b" label="选项 B"></web-ui-option>
        </web-ui-select>
      </div>
      <div className="flex h-24 flex-col items-start gap-2 overflow-hidden rounded-lg border border-(--wui-color-border) p-3">
        <span className="text-xs text-(--wui-color-text-secondary)">portal：panel 完整显示</span>
        <web-ui-select portal placeholder="portal">
          <web-ui-option value="a" label="选项 A"></web-ui-option>
          <web-ui-option value="b" label="选项 B"></web-ui-option>
        </web-ui-select>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-start gap-4">
    <div class="flex h-24 flex-col items-start gap-2 overflow-hidden rounded-lg border border-(--wui-color-border) p-3">
      <span class="text-xs text-(--wui-color-text-secondary)">默认：panel 被容器裁掉</span>
      <web-ui-select placeholder="默认">
        <web-ui-option value="a" label="选项 A"></web-ui-option>
        <web-ui-option value="b" label="选项 B"></web-ui-option>
      </web-ui-select>
    </div>
    <div class="flex h-24 flex-col items-start gap-2 overflow-hidden rounded-lg border border-(--wui-color-border) p-3">
      <span class="text-xs text-(--wui-color-text-secondary)">portal：panel 完整显示</span>
      <web-ui-select portal placeholder="portal">
        <web-ui-option value="a" label="选项 A"></web-ui-option>
        <web-ui-option value="b" label="选项 B"></web-ui-option>
      </web-ui-select>
    </div>
  </div>
</template>
```

## API

### 属性

| 名称               | 说明                                                                                      | 类型                | 默认值           |
| ------------------ | ----------------------------------------------------------------------------------------- | ------------------- | ---------------- |
| `placeholder`      | 未选中时显示的占位文本。                                                                  | `string`            | `''`             |
| `variant`          | 触发器外观：`label` 保留选中文本与箭头，`icon` 保留箭头并把 `trigger` 插槽作为左侧图标。  | `'label' \| 'icon'` | `'label'`        |
| `trigger`          | 触发手势集合，空格或逗号分隔：`click`、`hover`、`focus`、`none`；读回为逗号分隔的规范串。 | `string`            | `'click'`        |
| `show-delay`       | 悬停打开的延迟（毫秒）；只影响 hover 来源。                                               | `number`            | `200`            |
| `hide-delay`       | 悬停收起的延迟（毫秒）；只影响 hover 来源。                                               | `number`            | `100`            |
| `disabled`         | 禁用状态。                                                                                | `boolean`           | `false`          |
| `required`         | 必填校验。                                                                                | `boolean`           | `false`          |
| `portal`           | 在主题的 overlay 容器中渲染下拉面板。                                                     | `boolean`           | `false`          |
| `placement`        | 下拉面板位置，默认从触发器左下角向下展开。                                                | `Placement`         | `'bottom-start'` |
| `no-scroll-lock`   | 打开时不锁定页面滚动。                                                                    | `boolean`           | `false`          |
| `overlayContainer` | 显式指定面板挂载的 overlay 容器（property）。                                             | `OverlayContainer`  | —                |
| `name`             | 表单字段名。                                                                              | `string`            | `''`             |
| `aria-label`       | combobox 的可访问名称。                                                                   | `string \| null`    | `null`           |
| `value`            | 选中值。                                                                                  | `string`            | `''`             |
| `open`             | 声明式开关；直接写入静默，不派发 `open-change`。                                          | `boolean`           | `false`          |
| `isOpen`           | 当前是否打开（只读）。                                                                    | `boolean`           | —                |

### 事件

| 名称          | 说明                                                                                    |
| ------------- | --------------------------------------------------------------------------------------- |
| `input`       | 用户选中某项后触发，`value` 为新值。                                                    |
| `change`      | 与 `input` 成对派发，一次选择各一次。                                                   |
| `open-change` | 手势或 `show()` / `hide()` 改变开合时派发，`detail.open` 是当前状态；写 `open` 不派发。 |

### Slot

| 名称      | 说明                                                                                |
| --------- | ----------------------------------------------------------------------------------- |
| `trigger` | 自定义触发区域内容，替换默认标签；`variant="icon"` 下它是左侧图标区，箭头仍在右侧。 |
| `default` | 投影 `<web-ui-option>` 候选；其他节点同样算面板内容。                               |

### 方法

| 名称       | 说明                                                            |
| ---------- | --------------------------------------------------------------- |
| `show()`   | 打开面板并派发 `open-change`；`disabled` 或已打开时不产生效果。 |
| `hide()`   | 关闭面板并派发 `open-change`；已关闭时不产生效果。              |
| `toggle()` | 按当前 `open` 切换，并派发 `open-change`。                      |

### 行为说明

面板使用 `role="listbox"`，候选项使用 `role="option"`。当前非空 `value` 对应的选项设为 `aria-selected="true"`，`aria-disabled` 反映禁用状态。

非 Portal 模式下，键盘导航时 `aria-activedescendant` 指向当前选项；Portal 模式下不设置此属性。

面板能否打开看的是 `default` 插槽里还有没有内容可展示：没有内容时，点击、键盘手势与悬停都不展开。`show()` 与写 `open` 仍可空开；关闭态新增内容不会打开面板。面板打开期间最后一段内容消失时，立即收起，不播退场过渡。

关闭态的 Space / Enter / ArrowDown / ArrowUp 打开面板；`none` 下这些按键不再自动展开。展开态的 ArrowDown / ArrowUp、Home / End 与 typeahead 移动激活项，Enter / Space 选择并关闭，Escape 关闭。

`hover` 由指针进出开合；指针离开触发器与面板、启用 `focus` 时还需焦点离开，随后按 `hide-delay` 收起。`show-delay` / `hide-delay` 只作用于 hover 来源；点击、焦点与程序式调用都立即生效。外点仅关闭包含 `click` 的层，失焦仅关闭包含 `focus` 的层；Escape 关闭非 `none` 的层。

启用 `portal` 的面板在创建时读取宿主上的这些变量值；更新宿主后需重新打开面板才会生效。

### CSS 自定义属性

| 名称                      | 说明                 | 默认值                             |
| ------------------------- | -------------------- | ---------------------------------- |
| `--wui-select-max-width`  | 下拉框最大宽度       | `500px`                            |
| `--wui-select-max-height` | 下拉滚动区域最大高度 | `200px`                            |
| `--wui-overlay-min-width` | 下拉框最小宽度       | `200px`                            |
| `--wui-select-bg-hover`   | 触发器悬停背景       | `--wui-color-surface-glass-hover`  |
| `--wui-select-bg-active`  | 触发器按下/打开背景  | `--wui-color-surface-glass-active` |

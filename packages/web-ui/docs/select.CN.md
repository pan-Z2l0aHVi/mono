---
component: select
tag: web-ui-select
---

选择器下拉框：默认插槽投影 `<web-ui-option>` 候选，`trigger` 插槽可替换默认触发区域；支持键盘导航与 Portal。

## Samples

### Basic

`value` 由页面持有：选中后 `change` 把 `event.currentTarget.value` 交回来，写回 `value` 后 trigger 的文本跟着走；不写 `value` 时 trigger 显示 `placeholder`。

程序写入 `value` 不派发事件，所以「清除」只是换页面状态。

`disabled` 让整个控件退出交互。

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

### Option decoration

`prefix` / `suffix` 插槽在 label 两侧放 icon 与说明，一条 option 里的顺序是 check → prefix → label → suffix；`disabled` 的项留在列表里但选不中，键盘导航也会跳过它。

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

### Custom trigger

`trigger` 插槽替换默认的 label 文本，外壳、箭头与开合行为仍由组件提供。组件只提供承载 trigger 的 label 容器，不直接覆盖 slotted 节点的字体、颜色或尺寸；插槽内容用页面状态写文本，它就会跟着选择变。

```tsx
import { lucideGlobe } from '@greypan/web-ui/icons'
import { useState } from 'react'

const LABELS: Record<string, string> = { zh: '中文', en: 'English', ja: '日本語' }

export default function Demo() {
  const [lang, setLang] = useState('en')

  return (
    <web-ui-select value={lang} onChange={event => setLang(event.currentTarget.value)}>
      <div slot="trigger" className="flex items-center gap-1.5">
        <web-ui-icon icon={lucideGlobe} size={16}></web-ui-icon>
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
      <web-ui-icon :icon="lucideGlobe" :size="16"></web-ui-icon>
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

### Open-change notification

`open-change` 只通知：组件自己先把开合改到位，再用 `detail.open` 报告结果。select 的 `open` 是只读 getter，没有可回写的受控属性，页面跟着事件读数即可。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('—')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-select
        placeholder="打开或关闭 panel"
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
    <web-ui-select placeholder="打开或关闭 panel" @open-change="onOpenChange">
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
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiSelect, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### Form value

`name` 让选中值以该字段名进入 `FormData`；值为空时 `required` 上报 `valueMissing`，原生提交被拦下。`form.reset()` 把值退回挂载时的初值，trigger 随之回到 `placeholder`。

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

### Portal rendering

默认 panel 渲染在 select 自己的 shadow 树里、按 absolute 定位，祖先的 `overflow` 会把它裁掉；`portal` 把 panel 交给 theme-owned overlay root 并按 fixed 定位，容器裁不到它。

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

### Props

| 名称               | 说明                                           | 类型               | 默认值  |
| ------------------ | ---------------------------------------------- | ------------------ | ------- |
| `placeholder`      | 未选中时显示的占位文本。                       | `string`           | `''`    |
| `disabled`         | 禁用状态。                                     | `boolean`          | `false` |
| `required`         | 必填校验。                                     | `boolean`          | `false` |
| `portal`           | 在 theme-owned overlay root 中渲染下拉 panel。 | `boolean`          | `false` |
| `no-scroll-lock`   | 打开时不锁定页面滚动。                         | `boolean`          | `false` |
| `overlayContainer` | 显式 Portal 容器（property）。                 | `OverlayContainer` | —       |
| `name`             | 表单字段名。                                   | `string`           | `''`    |
| `aria-label`       | combobox 的 accessible name。                  | `string \| null`   | `null`  |
| `value`            | 选中值。                                       | `string`           | `''`    |

### Events

| 名称          | 说明                                        |
| ------------- | ------------------------------------------- |
| `input`       | 用户选中某项后触发，`value` 为新值。        |
| `change`      | 与 `input` 成对派发，一次选择各一次。       |
| `open-change` | 下拉 panel 开合，`detail.open` 为当前状态。 |

### Slots

| 名称      | 说明                                                   |
| --------- | ------------------------------------------------------ |
| `trigger` | 自定义触发区域内容，替换默认 label；箭头仍由组件渲染。 |
| `default` | 投影 `<web-ui-option>` 候选。                          |

### 行为说明

子 `<web-ui-option>` 通过 `option-register` / `option-unregister` 注册。

打开时，面板使用 `role="listbox"`，候选项使用 `role="option"`，当前非空 `value` 对应的 option 设为 `aria-selected="true"`，`aria-disabled` 反映禁用状态。

非 Portal 模式下，键盘导航时 `aria-activedescendant` 指向当前 option；Portal 模式因 option 与 combobox 位于不同的 Shadow DOM 树中，不设置此属性。

关闭态的 Space / Enter / ArrowDown / ArrowUp 打开 panel；展开态的 ArrowDown / ArrowUp、Home / End 与 typeahead 移动激活项，Enter / Space 选择并关闭，Escape 关闭。

Portal panel 创建时会镜像 host 上解析后的这些变量；更新 host 后需重新打开 Portal panel 才会生效。

### CSS Custom Properties

| 名称                      | 说明                  | 默认值                             |
| ------------------------- | --------------------- | ---------------------------------- |
| `--wui-select-max-width`  | 下拉框最大宽度        | `500px`                            |
| `--wui-select-max-height` | 下拉滚动区域最大高度  | `200px`                            |
| `--wui-overlay-min-width` | 下拉框最小宽度        | `200px`                            |
| `--wui-select-bg-hover`   | Trigger 悬停背景      | `--wui-color-surface-glass-hover`  |
| `--wui-select-bg-active`  | Trigger 按下/打开背景 | `--wui-color-surface-glass-active` |

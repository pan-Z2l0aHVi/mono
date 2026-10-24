---
component: editable-text
tag: web-ui-editable-text
---

行内纯文本编辑器：点击文字就地编辑，Enter 与 blur 提交，只有 Escape 取消；文本层与编辑层共用一个盒，进入编辑态不会移动像素。

## 示例

### 基础 {#basic}

点击文字进入编辑态，光标落在点击处；按 Tab 聚焦时光标落在文本末尾。字体、颜色与对齐全部继承外部上下文，所以编辑前它就是一段普通文字。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text value="点击就地编辑" aria-label="标题"></web-ui-editable-text>
      <web-ui-editable-text value="这一段把排版继承给编辑层" className="text-lg font-medium"></web-ui-editable-text>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text value="点击就地编辑" aria-label="标题"></web-ui-editable-text>
    <web-ui-editable-text value="这一段把排版继承给编辑层" class="text-lg font-medium"></web-ui-editable-text>
  </div>
</template>
```

### 受控值与提交 {#events}

`value` 是当前值，也是表单提交值；`input` 来自编辑层的原生输入，`change` 只在提交点派发一次——Enter 或失焦。要由页面持有这个值就接住 `change` 再写回。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [title, setTitle] = useState('季度复盘')
  const [draft, setDraft] = useState('')
  const [committed, setCommitted] = useState('')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text
        value={title}
        aria-label="标题"
        placeholder="未命名"
        onInput={event => setDraft(event.currentTarget.value)}
        onChange={event => {
          setTitle(event.currentTarget.value)
          setCommitted(event.currentTarget.value)
        }}
      ></web-ui-editable-text>
      <output className="text-sm text-(--wui-color-text-secondary)">
        input 草稿：{draft || '(还没有输入)'} · change 提交：{committed || '(未提交)'}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text
      :value="title"
      aria-label="标题"
      placeholder="未命名"
      @input="onInput"
      @change="onChange"
    ></web-ui-editable-text>
    <output class="text-sm text-(--wui-color-text-secondary)">
      input 草稿：{{ draft || '(还没有输入)' }} · change 提交：{{ committed || '(未提交)' }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEditableText, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const title = ref('季度复盘')
const draft = ref('')
const committed = ref('')

function onInput(event: WebUiEvent<WebUiEditableText, 'input'>) {
  draft.value = event.currentTarget.value
}

function onChange(event: WebUiEvent<WebUiEditableText, 'change'>) {
  const value = event.currentTarget.value
  title.value = value
  committed.value = value
}
</script>
```

### Escape 取消 {#cancel}

只有 Escape 走取消：值回到进入编辑时的状态，派发 `cancel` 而不派发 `change`，焦点交还宿主，这次按键也由编辑层消费掉，外层 overlay（drawer、menu）不会因为同一次按键关闭。`cancel` 不冒泡也不组合，一律挂在组件本身监听——React 没有对应的合成事件，只能挂原生监听。

```tsx
import type { WebUiEditableText } from '@greypan/web-ui'
import { useEffect, useRef, useState } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiEditableText>(null)
  const [last, setLast] = useState('还没有操作')

  useEffect(() => {
    const element = fieldRef.current
    if (!element) return
    const onCancel = () => setLast('cancel：Escape 已把值恢复成进入编辑时的状态')
    element.addEventListener('cancel', onCancel)
    return () => element.removeEventListener('cancel', onCancel)
  }, [])

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text ref={fieldRef} value="改几个字，然后按 Escape"></web-ui-editable-text>
      <output className="text-sm text-(--wui-color-text-secondary)">{last}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text value="改几个字，然后按 Escape" @cancel="onCancel"></web-ui-editable-text>
    <output class="text-sm text-(--wui-color-text-secondary)">{{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const last = ref('还没有操作')

function onCancel() {
  last.value = 'cancel：Escape 已把值恢复成进入编辑时的状态'
}
</script>
```

### 空值与占位 {#placeholder}

`placeholder` 只在值为空时显示，取二级文本色；提交空值也算一次提交，值变空之后文字层回落到占位。空值又没写 `placeholder` 时组件留一个零宽字符，保住行盒与点击进入编辑的地方。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text placeholder="未命名项目" aria-label="空值"></web-ui-editable-text>
      <web-ui-editable-text value="有值时不显示占位" placeholder="未命名项目" aria-label="有值"></web-ui-editable-text>
      <web-ui-editable-text aria-label="清空之后"></web-ui-editable-text>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text placeholder="未命名项目" aria-label="空值"></web-ui-editable-text>
    <web-ui-editable-text value="有值时不显示占位" placeholder="未命名项目" aria-label="有值"></web-ui-editable-text>
    <web-ui-editable-text aria-label="清空之后"></web-ui-editable-text>
  </div>
</template>
```

### 多行 {#multiline}

值里已有的换行照常成行（`white-space` 默认 `pre-wrap`），第二行文字在盒宽处自然断行；Enter 属于提交，不插入换行，所以多行文案靠值本身带 `\n`。文字层与编辑层同盒同排版，进入编辑不会顶偏像素。

```tsx
export default function Demo() {
  return (
    <web-ui-editable-text
      className="w-80"
      value={'第一行按值里的换行成行\n第二行的长文案会在盒宽处折行，文字态与编辑态共用同一个盒'}
      placeholder="多行占位"
      aria-label="多行"
    ></web-ui-editable-text>
  )
}
```

```vue
<template>
  <web-ui-editable-text class="w-80" :value="multiline" placeholder="多行占位" aria-label="多行"></web-ui-editable-text>
</template>

<script setup lang="ts">
const multiline = '第一行按值里的换行成行\n第二行的长文案会在盒宽处折行，文字态与编辑态共用同一个盒'
</script>
```

### 禁用与只读 {#states}

`disabled` 把宿主移出 tab 序列，指针与键盘都进不了编辑，只换 `not-allowed` 光标、不做视觉置灰；`readonly` 仍可聚焦与全选，输入被拒绝，退出编辑态也不派发 `change`。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text value="禁用：点不动，也不在 tab 序列里" disabled aria-label="禁用"></web-ui-editable-text>
      <web-ui-editable-text placeholder="禁用且空值：仍显示占位" disabled aria-label="禁用空值"></web-ui-editable-text>
      <web-ui-editable-text value="只读：能选中复制，改不动" readonly aria-label="只读"></web-ui-editable-text>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text value="禁用：点不动，也不在 tab 序列里" disabled aria-label="禁用"></web-ui-editable-text>
    <web-ui-editable-text placeholder="禁用且空值：仍显示占位" disabled aria-label="禁用空值"></web-ui-editable-text>
    <web-ui-editable-text value="只读：能选中复制，改不动" readonly aria-label="只读"></web-ui-editable-text>
  </div>
</template>
```

### 表单值 {#form}

`name` 是字段名，提交值就是当前值，空值也照常以空字符串进入 `FormData`。组件没有 `required`，也不转发校验判定，必填请由外层承担；`form.reset()` 回填挂载时的初值。

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
          if (typeof value === 'string') fields.push(`${name}=${value.replace(/\n/g, '\\n') || '(空)'}`)
        }
        setSubmitted(fields.join(' · ') || '(没有字段)')
      }}
    >
      <div className="flex flex-col items-start gap-1">
        <span className="text-sm text-(--wui-color-text-secondary)">标题</span>
        <web-ui-editable-text name="title" value="初始标题" aria-label="标题"></web-ui-editable-text>
      </div>
      <div className="flex flex-col items-start gap-1">
        <span className="text-sm text-(--wui-color-text-secondary)">摘要：可留空</span>
        <web-ui-editable-text
          name="bio"
          className="w-80"
          placeholder="写一句摘要"
          aria-label="摘要"
        ></web-ui-editable-text>
      </div>
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
    <div class="flex flex-col items-start gap-1">
      <span class="text-sm text-(--wui-color-text-secondary)">标题</span>
      <web-ui-editable-text name="title" value="初始标题" aria-label="标题"></web-ui-editable-text>
    </div>
    <div class="flex flex-col items-start gap-1">
      <span class="text-sm text-(--wui-color-text-secondary)">摘要：可留空</span>
      <web-ui-editable-text name="bio" class="w-80" placeholder="写一句摘要" aria-label="摘要"></web-ui-editable-text>
    </div>
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
    if (typeof value === 'string') fields.push(`${name}=${value.replace(/\n/g, '\\n') || '(空)'}`)
  }
  submitted.value = fields.join(' · ') || '(没有字段)'
}

function reset() {
  form.value?.reset()
  submitted.value = ''
}
</script>
```

### 卸载时保住草稿 {#unmount}

编辑到一半的元素被从 DOM 移除时，Chromium 会派发 `blur` 并按提交语义收尾，WebKit 什么都不派发、草稿随组件丢弃——`commit-on-unmount` 就是为后者存在的。

开启之后卸载复用同一条提交路径：草稿成为新值、恰好派发一次 `change`，且只在草稿确实与进入编辑时的值不同时才提交。

移除由组件自己的渲染驱动时 `change` 走不到框架的事件委托根，所以这里挂原生监听从元素上读值，再用微任务把结果交给组件树之外的状态。

```tsx
import type { WebUiEditableText } from '@greypan/web-ui'
import { useEffect, useRef, useState } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiEditableText>(null)
  const [mounted, setMounted] = useState(true)
  const [saved, setSaved] = useState('')

  // 卸载由这次 render 驱动，change 到不了 React 的委托根：挂原生监听，从元素上读值
  useEffect(() => {
    const element = fieldRef.current
    if (!element) return
    const onChange = () => {
      const value = element.value
      queueMicrotask(() => setSaved(value))
    }
    element.addEventListener('change', onChange)
    return () => element.removeEventListener('change', onChange)
  }, [mounted])

  return (
    <div className="flex flex-col items-start gap-3">
      {mounted ? (
        <web-ui-editable-text
          ref={fieldRef}
          commit-on-unmount
          value="改几个字，再按下面的卸载按钮"
          aria-label="可卸载"
        ></web-ui-editable-text>
      ) : (
        <span className="text-sm text-(--wui-color-text-secondary)">这一行已经从 DOM 移除</span>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button onClick={() => setMounted(false)}>卸载这一行</web-ui-button>
        <web-ui-button onClick={() => setMounted(true)}>重新挂载</web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">卸载保住：{saved || '(还没有)'}</output>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text
      v-if="mounted"
      commit-on-unmount
      value="改几个字，再按下面的卸载按钮"
      aria-label="可卸载"
      @change="saveDraft"
    ></web-ui-editable-text>
    <span v-else class="text-sm text-(--wui-color-text-secondary)">这一行已经从 DOM 移除</span>
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button @click="mounted = false">卸载这一行</web-ui-button>
      <web-ui-button @click="mounted = true">重新挂载</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">卸载保住：{{ saved || '(还没有)' }}</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEditableText, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const mounted = ref(true)
const saved = ref('')

// 卸载由这次渲染驱动：change 到达时元素正在离开文档，先把值取出来再交给状态
function saveDraft(event: WebUiEvent<WebUiEditableText, 'change'>) {
  const value = event.currentTarget.value
  queueMicrotask(() => (saved.value = value))
}
</script>
```

### 聚焦与全选 {#methods}

宿主本身可聚焦（非禁用态带 `tabindex="0"`），`focus()` 聚焦宿主并进入编辑态，`select()` 进入编辑态并全选内容——已在编辑态时只重新全选。两者在 `disabled` 下都不产生效果。

```tsx
import type { WebUiEditableText } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiEditableText>(null)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text ref={fieldRef} value="全选之后可以直接输入替换" aria-label="替换"></web-ui-editable-text>
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button onClick={() => fieldRef.current?.focus()}>聚焦</web-ui-button>
        <web-ui-button onClick={() => fieldRef.current?.select()}>全选</web-ui-button>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text ref="field" value="全选之后可以直接输入替换" aria-label="替换"></web-ui-editable-text>
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button @click="field?.focus()">聚焦</web-ui-button>
      <web-ui-button @click="field?.select()">全选</web-ui-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEditableText } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const field = useTemplateRef<WebUiEditableText>('field')
</script>
```

### CSS 变量 {#sizing}

两层共用同一组空白与断词变量，覆盖时仍保持一致；光标颜色走共享的 `--wui-color-accent`，自定义属性能穿透 shadow 边界继承，所以在宿主或任意祖先上设都有效。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text value="AAAABBBBCCCCDDDDEEEE" className="w-32" aria-label="长串断词"></web-ui-editable-text>
      <web-ui-editable-text
        value={'空白按原样保留\n默认就是 pre-wrap'}
        className="w-40 [--wui-editable-text-white-space:pre]"
        aria-label="保留空白"
      ></web-ui-editable-text>
      <web-ui-editable-text
        value="光标色改到这个 accent"
        className="[--wui-color-accent:#7c3aed]"
      ></web-ui-editable-text>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text value="AAAABBBBCCCCDDDDEEEE" class="w-32" aria-label="长串断词"></web-ui-editable-text>
    <web-ui-editable-text
      :value="spacing"
      class="w-40 [--wui-editable-text-white-space:pre]"
      aria-label="保留空白"
    ></web-ui-editable-text>
    <web-ui-editable-text value="光标色改到这个 accent" class="[--wui-color-accent:#7c3aed]"></web-ui-editable-text>
  </div>
</template>

<script setup lang="ts">
const spacing = '空白按原样保留\n默认就是 pre-wrap'
</script>
```

## API

### Props

| 名称                | 说明                                                                 | 类型             | 默认值  |
| ------------------- | -------------------------------------------------------------------- | ---------------- | ------- |
| `name`              | 表单字段名。                                                         | `string`         | `''`    |
| `placeholder`       | 值为空时显示的占位文本。                                             | `string`         | `''`    |
| `disabled`          | 禁用状态，只影响行为不做视觉置灰。                                   | `boolean`        | `false` |
| `readonly`          | 只读状态：仍可聚焦全选，但不能编辑或提交。                           | `boolean`        | `false` |
| `commit-on-unmount` | 卸载时按提交语义结束编辑态；WebKit 下没有 blur，只有它才能保住草稿。 | `boolean`        | `false` |
| `aria-label`        | 无障碍名称。                                                         | `string \| null` | `null`  |
| `value`             | 当前值，也是表单提交值。                                             | `string`         | `''`    |

### Events

| 名称     | 说明                                                    |
| -------- | ------------------------------------------------------- |
| `input`  | 每次输入时触发，来自编辑层原生 `input` 的冒泡。         |
| `change` | 提交草稿时触发（Enter 或 blur），一次提交恰好一条。     |
| `cancel` | Escape 取消时触发，不冒泡不组合：监听一律挂在组件本身。 |

### Methods

| 名称       | 说明                                                                                                                                                                                                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `focus()`  | 组件没有重写它，走原生宿主聚焦：宿主有 tab 位（`tabindex="0"`），聚焦被宿主的 `focus` 监听接住并进入编辑态，光标落在文本末尾；`disabled` 时宿主没有 tab 位，调用不产生效果。                                                                                                                         |
| `blur()`   | 组件没有重写它，走原生失焦：编辑态下焦点在 shadow 的编辑层上，对宿主调 `blur()` 仍会把焦点从编辑层移走，于是走的就是编辑层自己那条 `blur` 提交路径——草稿成为新值并恰好派发一次 `change`（`readonly` 时只退出编辑、不派发）。不在编辑态时它是空操作；把焦点移往组件之外是同一条路径的另一种触发方式。 |
| `select()` | 进入编辑态并全选内容；已在编辑态时只重新全选。`disabled` 时不进入编辑。                                                                                                                                                                                                                              |

### 行为说明

点击时光标落在点击处；键盘聚焦时落在文本末尾。

`Enter` 与 `blur` 均提交草稿并恰好派发一次 `change`：`Enter` 不插入换行，并把焦点交还宿主；`blur` 不干预焦点，焦点留在用户移往的位置。

只有 `Escape` 取消：值回到进入编辑时的状态，派发 `cancel` 而不派发 `change`，焦点交还宿主，且按键由编辑层消费，外层 overlay（drawer、menu）不会因同一次按键关闭。

`cancel` 不冒泡也不组合，只在组件本身派发：组件被投映在 overlay shadow 内时（如 drawer 标题），它不会触达 overlay 的原生 `cancel` 关闭管线，监听一律挂在组件本身。

值里已有的换行仍按多行渲染，只是不能再靠输入 `Enter` 增加换行。空值继续显示 placeholder；编辑层始终按自身内容撑高，因此空草稿或纯空格草稿在宿主自身塌缩的场合（flex 项 `min-width: 0`、表格单元格）也仍有承接光标的位置。

编辑态由宿主上的 `editing` 属性表达，`disabled` 时属性不会挂上。

`select()` 进入编辑态并全选内容；已在编辑态时只重新全选。`disabled` 时与 `focus()` 一样不产生效果。

`readonly` 时仍可聚焦和全选，但输入被拒绝，退出编辑态也不派发 `change`。

共用盒子带来两个约束：`line-height` 需不小于 `1`，更紧凑时原生编辑层内容会高出自身盒子，文字被顶偏 1px；`nowrap` 加固定宽度时，超出盒宽的文案在文字态溢出显示、在编辑态于盒内滚动。

### 编辑到一半被卸载

正在编辑的元素被从 DOM 移除时会发生什么，取决于引擎，这个差异正是本属性存在的理由：

- **Chromium** 会在编辑层上派发 `blur`，因此纯粹的 `value` 提交今天就已经发生，默认 `false` 不改变这一点。`blur` 与它触发的 `change` 都在卸载回调跑完**之后**同步派发，也就是说提交落在「消费方针对这次移除已经更新完状态」之后。
- **WebKit（Safari、iOS）** 完全不派发 `blur`。默认 `false` 下什么都不提交，草稿随元素一起丢弃。
- **Gecko（Firefox）未验证**：实测所用机器上没有任何 Firefox 能启动，因此这里不做任何断言。把 Gecko 当作未知，而不是默认它与上面两列之一相同；需要靠卸载提交来保住草稿时，请开启本属性。

如果你的代码依赖「行被回收时草稿不丢」，请**开启 `commit-on-unmount`**：在 Safari 与 iOS 上它是唯一能保住草稿的手段，在 Chromium 上它把提交提前到移除自带的 `blur` 之前。

两个引擎下，卸载都按提交语义收尾一段开着的编辑会话——草稿成为新值、退出编辑、恰好派发一次 `change`，走的是与 `Enter`、`blur` 同一份实现。

结论在 Chromium 与 WebKit 上实测过；浏览器测试套件只跑 Chromium，WebKit 的结果来自一次一次性跨引擎取证、不在 CI 里，Gecko 则完全没有测。

`Enter` 与 `blur` 由用户动作触发，一律算提交意图；卸载没有这种意图。因此只有草稿与进入编辑时的值确实不同时才提交——什么都没改的会话不会产生空提交。

不在编辑态时没有可提交的内容；`disabled` 或 `readonly` 时与 `blur` 路径一致，都不派发提交事件。但两者对「已经有草稿」的处置不同：`disabled` 下草稿留在组件上，`readonly` 下草稿是真的丢掉。

`readonly` 阻止不了先前输入的字，而卸载时已没有 blur 可以兜底提交——WebKit 上连 blur 都没有。可达路径是：可编辑态进入 → 起草稿 → 期间翻 readonly → 卸载。

这里不按取消处理——取消的契约是恢复进入编辑时的值，而卸载既没有焦点要交也没有宿主接收结果；用户看到的是「我打的字没了」，既没有 `change` 也没有 `cancel`。

提交发生在卸载回调里，`change` 仍沿组合路径向上派发，因此挂在组件自身或任一祖先上的监听都会执行，**包括自身也正在被卸载的祖先**：派发不要求祖先此刻还在文档里。因此监听器不能假定组件仍在文档中；结果需要活过这次移除时，用 `queueMicrotask` 之类的方式显式转交给宿主树之外的状态。

注意这条可达性对「由 React 自身 render 驱动的卸载」并不成立：那种移除走不到 React 的事件委托根，`onChange` 不会触发，只能改为从元素上读值——与上文 `cancel` 的告示同源。

在祖先上设 `display: none` 不算移除——两个引擎下组件都仍在文档中、不派发任何事件，那种场合需要消费方主动结束编辑。

宿主是行内级盒子：未设宽度时随内容伸缩，折行后高度按行数增长。字体、颜色、文本对齐与空白处理全部继承外部上下文，因此编辑前它就是一段普通文字。

光标颜色默认跟随共享语义 token `--wui-color-accent`；在宿主或任意祖先上设置该 token 即可整体改色。两层对长无空格串（连续字母数字）按同一组断行点折行：超出盒宽的长串在盒内断开，文字态不再溢出宿主盒。

### CSS Custom Properties

| 名称                                | 说明                                                             | 默认值     |
| ----------------------------------- | ---------------------------------------------------------------- | ---------- |
| `--wui-editable-text-white-space`   | 两层的空白处理方式                                               | `pre-wrap` |
| `--wui-editable-text-overflow-wrap` | 两层的断词处理方式；默认让长无空格串在盒内断开，与原生编辑层一致 | `anywhere` |

### 交互变更

`blur` 恢复提交：`Enter` 与 `blur` 均提交草稿，只有 `Escape` 取消，值回到进入编辑时的状态。`Enter` 仍不插入换行。

`cancel` 事件不再冒泡：此前冒泡的自定义 `cancel` 会经 slot 进入外层 overlay shadow 内的 `<dialog>`（`composed` 与否都会），被当成关闭请求一并关掉（issue #159）；监听请挂在组件本身。

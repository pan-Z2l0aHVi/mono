# Context Menu

右键打开的上下文 menu。默认插槽的第一个子元素是触发区域，其余子元素是 menu item（`<web-ui-dropdown-item>` 等）。打开期间 menu 是模态的，点空白只会关掉 menu。

## Samples

### Basic

默认插槽的第一个元素是触发区域，其余子元素是 menu item。在触发区内右键，menu 从光标位置展开。`prefix` / `suffix` 插槽放 icon 与快捷键提示；`disabled` 的项留在 menu 里但无法选中。

`open-change` 报告开合，`detail.open` 是当时状态。点空白、按 Escape 或激活某一项都会关掉 menu，并再派发一次。

```tsx
import { lucideClipboardPaste, lucideCopy, lucideTrash2 } from '@greypan/web-ui/icons'
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <web-ui-context-menu
        className="w-full"
        onopen-change={event => {
          setCount(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <div className="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-state-layer-hover) text-sm text-(--wui-color-text)">
          在此区域右键点击
        </div>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" size={14} icon={lucideCopy}></web-ui-icon>复制
          <span slot="suffix" className="opacity-40">
            ⌘C
          </span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" size={14} icon={lucideClipboardPaste}></web-ui-icon>粘贴
          <span slot="suffix" className="opacity-40">
            ⌘V
          </span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-divider></web-ui-dropdown-divider>
        <web-ui-dropdown-item disabled>
          <web-ui-icon slot="prefix" size={14} icon={lucideTrash2}></web-ui-icon>删除
          <span slot="suffix" className="opacity-40">
            ⌫
          </span>
        </web-ui-dropdown-item>
      </web-ui-context-menu>
      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change：{count} 次 · 最后一次 detail.open = {last}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col items-start gap-3">
    <web-ui-context-menu class="w-full" @open-change="onOpenChange">
      <div
        class="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-state-layer-hover) text-sm text-(--wui-color-text)"
      >
        在此区域右键点击
      </div>
      <web-ui-dropdown-item>
        <web-ui-icon slot="prefix" :size="14" :icon="lucideCopy"></web-ui-icon>复制
        <span slot="suffix" class="opacity-40">⌘C</span>
      </web-ui-dropdown-item>
      <web-ui-dropdown-item>
        <web-ui-icon slot="prefix" :size="14" :icon="lucideClipboardPaste"></web-ui-icon>粘贴
        <span slot="suffix" class="opacity-40">⌘V</span>
      </web-ui-dropdown-item>
      <web-ui-dropdown-divider></web-ui-dropdown-divider>
      <web-ui-dropdown-item disabled>
        <web-ui-icon slot="prefix" :size="14" :icon="lucideTrash2"></web-ui-icon>删除
        <span slot="suffix" class="opacity-40">⌫</span>
      </web-ui-dropdown-item>
    </web-ui-context-menu>
    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change：{{ count }} 次 · 最后一次 detail.open = {{ last }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiContextMenu, WebUiEvent } from '@greypan/web-ui'
import { lucideClipboardPaste, lucideCopy, lucideTrash2 } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const count = ref(0)
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiContextMenu, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### Touch long press

`long-press` 是触屏的可选行为：按住 `long-press-delay`（这里 600 ms）后打开 menu，menu 从按点向下展开；按住期间滚动会取消。它只响应触屏，鼠标右键仍然使用原生 `contextmenu`。长按打开后，浏览器为同一次触摸补发的 `contextmenu` 与 `click` 会被忽略，因此 menu 不会重复打开，也不会立刻关掉刚打开的 menu。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <web-ui-context-menu
        className="w-full"
        long-press
        long-press-delay={600}
        onopen-change={event => {
          setCount(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <div className="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-state-layer-hover) text-sm text-(--wui-color-text)">
          在此区域按住 600 ms（触屏）
        </div>
        <web-ui-dropdown-item>重命名</web-ui-dropdown-item>
        <web-ui-dropdown-item>移动</web-ui-dropdown-item>
      </web-ui-context-menu>
      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change：{count} 次 · 最后一次 detail.open = {last}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col items-start gap-3">
    <web-ui-context-menu class="w-full" long-press :long-press-delay="600" @open-change="onOpenChange">
      <div
        class="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-state-layer-hover) text-sm text-(--wui-color-text)"
      >
        在此区域按住 600 ms（触屏）
      </div>
      <web-ui-dropdown-item>重命名</web-ui-dropdown-item>
      <web-ui-dropdown-item>移动</web-ui-dropdown-item>
    </web-ui-context-menu>
    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change：{{ count }} 次 · 最后一次 detail.open = {{ last }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiContextMenu, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const count = ref(0)
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiContextMenu, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### Disabled

`disabled` 只抑制 menu：右键不打开，触发区本身不置灰，颜色也不变。禁用 context menu 不等于禁用触发区，视觉上的禁用态请在你自己的内容里表达。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [disabled, setDisabled] = useState(false)
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <web-ui-context-menu
        className="w-full"
        disabled={disabled}
        onopen-change={event => {
          setCount(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <div className="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-state-layer-hover) text-sm text-(--wui-color-text)">
          {disabled ? 'menu 已禁用：右键不打开' : '在此区域右键点击'}
        </div>
        <web-ui-dropdown-item>编辑</web-ui-dropdown-item>
        <web-ui-dropdown-item>复制</web-ui-dropdown-item>
      </web-ui-context-menu>
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="secondary" onClick={() => setDisabled(value => !value)}>
          {disabled ? '启用 menu' : '禁用 menu'}
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">
          disabled = {String(disabled)} · open-change：{count} 次 · 最后一次 detail.open = {last}
        </output>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col items-start gap-3">
    <web-ui-context-menu class="w-full" :disabled="disabled" @open-change="onOpenChange">
      <div
        class="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-state-layer-hover) text-sm text-(--wui-color-text)"
      >
        {{ disabled ? 'menu 已禁用：右键不打开' : '在此区域右键点击' }}
      </div>
      <web-ui-dropdown-item>编辑</web-ui-dropdown-item>
      <web-ui-dropdown-item>复制</web-ui-dropdown-item>
    </web-ui-context-menu>
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button variant="secondary" @click="disabled = !disabled">
        {{ disabled ? '启用 menu' : '禁用 menu' }}
      </web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">
        disabled = {{ disabled }} · open-change：{{ count }} 次 · 最后一次 detail.open = {{ last }}
      </output>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiContextMenu, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const disabled = ref(false)
const count = ref(0)
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiContextMenu, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

## API

### Props

| 名称               | 说明                                                      | 类型      | 默认值  |
| ------------------ | --------------------------------------------------------- | --------- | ------- |
| `disabled`         | 右键与 `openAt()` 都不打开 menu，不做视觉置灰。           | `boolean` | `false` |
| `no-scroll-lock`   | 打开时允许背景滚动。                                      | `boolean` | `false` |
| `long-press`       | 触屏长按打开 menu（opt-in；鼠标始终使用 `contextmenu`）。 | `boolean` | `false` |
| `long-press-delay` | 长按触发前需按住的时长（ms）。                            | `number`  | `500`   |

### Events

| 名称          | 说明                                  |
| ------------- | ------------------------------------- |
| `open-change` | menu 开合，`detail.open` 为当前状态。 |

### Slots

| 名称      | 说明                                         |
| --------- | -------------------------------------------- |
| `default` | 第一个元素是触发区域，其余元素是 menu item。 |

### Methods

| 名称           | 说明                                                              |
| -------------- | ----------------------------------------------------------------- |
| `openAt(x, y)` | 在视口坐标 `(x, y)` 处打开 menu；命令式打开不派发 `open-change`。 |
| `close()`      | 关闭 menu；命令式关闭不派发 `open-change`。                       |

### CSS Custom Properties

| 名称                                  | 说明                           | 默认值                             |
| ------------------------------------- | ------------------------------ | ---------------------------------- |
| `--wui-context-menu-safe-area-bottom` | 触屏 menu 需要避开的底部 inset | `env(safe-area-inset-bottom, 0px)` |

### 行为说明

menu item：`web-ui-dropdown-item`、`web-ui-dropdown-divider`、`web-ui-dropdown-header`。支持键盘导航和 submenu hover。

menu 打开期间是模态的：下层页面收不到任何指针事件，所以点外面只会关掉 menu，不会顺带激活下面的那一行、checkbox 或链接。menu item 激活后有一段约 160ms 的退场过渡，这期间下层页面重新可点。

`long-press` 是可选行为，且只针对触屏：按住 `long-press-delay`（默认 `500` ms）后打开 menu，打开方式与右键相同。按住期间滚动会取消，不会误开。浏览器为同一次按住补发的 `contextmenu` 与 `click` 会被忽略，因此 menu 不会重复打开，也不会立刻关掉刚打开的 menu。

`long-press` 打开的 menu 从按点向下展开，并在水平方向居中于按点。下方空间不够时，menu 翻到按点上方，同时被夹回视口内，并避开 `--wui-context-menu-safe-area-bottom` 预留的底部区域，避免最下面一项落进 home indicator。

区分依据是输入方式，不是视口宽度：窄窗口里的鼠标右键仍然贴着光标左上角展开。

`disabled` 只抑制 menu 行为：右键与 `openAt()` 都不打开 menu。它也不会给默认插槽里的内容置灰或改色。禁用 context menu 不等于禁用触发区，需要视觉上的禁用态请在你自己的内容里表达。

menu 打开期间，可以安全地用条件渲染（如 Vue `v-if`）切换、移动或删除 menu item，不必把它们重新插回宿主元素。

关闭时，焦点回到 menu 打开前持有焦点的元素。menu item 激活是唯一会提前交还焦点的路径：点击那一刻就交还，之后不再干预。因此如果回调把焦点移到别处（例如就地进入编辑态），焦点会留在那里。关闭过程也不会把焦点从新的焦点目标上移开，所以按 blur 提交的组件不会因此提交一次没有改过的编辑。

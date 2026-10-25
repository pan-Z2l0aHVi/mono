---
component: context-menu
tag: web-ui-context-menu
---

右键上下文 menu：第一个子元素是触发区域，其余子元素是 menu item（`<web-ui-dropdown-item>` 等）。打开期间 menu 是模态的，点空白只会关掉 menu。

## Samples

### 基础 {#basic}

default slot 的第一个元素是触发区域，其余子元素是 menu item：在触发区内右键，menu 从光标位置展开。

`prefix` / `suffix` 插槽放 icon 与快捷键提示，`disabled` 的项留在 menu 里但选不中。

`open-change` 报告开合，`detail.open` 是当时状态；点空白、按 Escape 或激活某一项都会关掉 menu 并再报一次。

下面那行读数是事件计数与最后一次 `detail.open`。

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
        <div className="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-sm text-(--wui-color-text-secondary)">
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
        class="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-sm text-(--wui-color-text-secondary)"
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

### 触屏长按 {#long-press}

`long-press` 是触屏 opt-in：按住 `long-press-delay`（这里 600 ms）后打开 menu，从按点向下展开；按住期间位移超过 10px 视为滚动并取消。

它只响应 `pointerType === 'touch'`，鼠标右键仍走原生 `contextmenu`、不受 `long-press` 影响。

长按打开后浏览器为同一次触摸补发的 `contextmenu` 与 `click` 会被吸收，既不会重复打开，也不会把刚打开的 menu 立刻关掉。

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
        <div className="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-sm text-(--wui-color-text-secondary)">
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
        class="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-sm text-(--wui-color-text-secondary)"
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

### 禁用 {#disabled}

`disabled` 只抑制 menu：右键不打开，触发区本身不置灰、颜色也不变——组件不渲染 menu 面，没有可置灰的对象，禁用 context menu 也不等于禁用触发区。

下面那个 button 切换 `disabled`，区域文案跟着状态走；读数记录 `open-change`，禁用期间右键不计数，重新启用后照常打开。

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
        <div className="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-sm text-(--wui-color-text-secondary)">
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
        class="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-sm text-(--wui-color-text-secondary)"
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

| 名称               | 说明                                                    | 类型      | 默认值  |
| ------------------ | ------------------------------------------------------- | --------- | ------- |
| `disabled`         | 右键与 `openAt()` 都不打开 menu，不做视觉置灰。         | `boolean` | `false` |
| `no-scroll-lock`   | 打开时允许背景滚动。                                    | `boolean` | `false` |
| `long-press`       | 触屏长按打开 menu（opt-in；鼠标始终走 `contextmenu`）。 | `boolean` | `false` |
| `long-press-delay` | 长按触发前需按住的时长（ms）。                          | `number`  | `500`   |

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
| `--wui-context-menu-safe-area-bottom` | 触屏 menu 需要让开的底部 inset | `env(safe-area-inset-bottom, 0px)` |

### 行为说明

通过 `contextmenu` 事件打开。menu item：`web-ui-dropdown-item`、`web-ui-dropdown-divider`、`web-ui-dropdown-header`。支持键盘导航和 submenu hover。

menu 打开期间是模态的：它渲染进浏览器 top layer 里一个透明的 `<dialog>`，下层页面拿不到任何命中测试。因此「点外面」只会关掉 menu，不会顺带把下面那一行、那个 checkbox、那个链接一起激活。

scrim 刻意保持完全透明——它的职责是吃掉这次命中，不是给页面加一层 scrim。

另有一处需要知道的代价：menu item 激活后约 160ms 的退场过渡里，scrim 已经提前出了 top layer，下层页面在这段时间重新可点，menu 的层级也退回普通流。

`long-press` 是 opt-in 且只针对触屏：指针按住 `long-press-delay`（默认 `500` ms，与平台原生长按一致）后打开 menu，走与右键完全相同的路径。

它只响应 `pointerType === 'touch'`；按住期间位移超过 10px 即取消，因此滚动不会误开 menu。

由于浏览器会把同一次按住也识别为原生手势，长按打开后引擎补发的 `contextmenu` 与 `click` 会被吸收，既不会重复打开，也不会把刚打开的 menu 立刻 light-dismiss 掉。

`long-press` 打开的 menu 从按点**向下**展开：上缘对齐按点 `y`、水平居中于按点 `x`，与 iOS / Android 原生长按 menu 的形态一致。

下方空间不够时 panel 翻转到按点上方而不是跑出屏幕，两轴都会被夹回视口内，并让开 `--wui-context-menu-safe-area-bottom`，避免最下面一项落进 home indicator。

分流依据是**输入方式**而非视口宽度：窄窗口里的鼠标右键仍然贴着光标左上角展开。两者只有水平对齐量不同 —— 定位走的是同一趟 `computePosition`，因此不会各自漂移。

`disabled` 只抑制 menu 行为：右键与 `openAt()` 都不打开 menu。

它不会给 default slot 里的内容置灰或改色——组件自身根本不渲染 menu 面，没有可置灰的对象；禁用 context menu 也不等于禁用触发区。

需要让禁用态在视觉上可读时，请在自己的内容上表达。

menu 打开期间，Consumer可以安全地使用条件渲染（如 Vue `v-if`）切换、移动或删除 menu item，无需重新插入到宿主元素；portal 内的变更会自动 reconcile，关闭时框架锚点随元素迁回宿主，保证后续框架更新正常。

关闭时，焦点会归还给 menu 打开前持焦的元素。这条是浏览器模态 dialog 自带的行为，而不是组件自己实现的——也正因如此，它只在 menu 还在 top layer 时才生效。

menu item 激活是唯一会提前交还焦点的路径：在点击那一刻就还，退场过渡之后不再过问，于是 menu item 回调若把焦点移到别处（例如就地进入编辑态），焦点就留在那里了。

关闭过程不会再把焦点从新的焦点目标上拽走，因此按 blur 提交的那类组件也不会因此提交一次没改过的编辑。

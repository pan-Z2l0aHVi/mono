# Dialog

模态 dialog，带内置标题栏和 footer，也可以用 `headless` 完全自绘。

## Samples

### Basic

`open` 由页面持有。点击 button 把它设为 `true`；Escape 和 backdrop 点击由组件发起关闭，组件再通过 `open-change` 把结果交回页面，页面按 `detail.open` 回写。

footer 里的 button 直接修改 `open`。这属于程序式更新，不会再派发一次事件。

`header` 槽为空时，标题由 `heading` 提供。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [changes, setChanges] = useState(0)
  const [last, setLast] = useState('-')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>打开 dialog</web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change：{changes} 次 · 最后一次 detail.open = {last}
      </output>
      <web-ui-dialog
        open={open}
        heading="确认操作"
        onopen-change={event => {
          setChanges(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
          setOpen(event.detail.open)
        }}
      >
        <p className="m-0">删除后无法恢复，确定继续吗？</p>
        <web-ui-button slot="footer" full variant="secondary" onClick={() => setOpen(false)}>
          取消
        </web-ui-button>
        <web-ui-button slot="footer" full variant="danger" onClick={() => setOpen(false)}>
          删除
        </web-ui-button>
      </web-ui-dialog>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">打开 dialog</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change：{{ changes }} 次 · 最后一次 detail.open = {{ last }}
    </output>
    <web-ui-dialog :open="open" heading="确认操作" @open-change="onOpenChange">
      <p class="m-0">删除后无法恢复，确定继续吗？</p>
      <web-ui-button slot="footer" full variant="secondary" @click="open = false">取消</web-ui-button>
      <web-ui-button slot="footer" full variant="danger" @click="open = false">删除</web-ui-button>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import type { WebUiDialog, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const open = ref(false)
const changes = ref(0)
const last = ref('-')

function onOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  changes.value += 1
  last.value = event.detail.open ? 'true' : 'false'
  open.value = event.detail.open
}
</script>
```

### Horizontal footer

`footer-orientation="horizontal"` 让 footer 的操作按钮排在一行。两个按钮都设置 `full` 时，它们等分操作区的可用宽度。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>打开 dialog</web-ui-button>
      <web-ui-dialog
        open={open}
        footerOrientation="horizontal"
        heading="保存这条消息？"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p className="m-0">这条消息尚未发送，并且包含未保存的更改。你可以先将它保存为草稿，稍后继续编辑。</p>
        <web-ui-button slot="footer" full variant="secondary" onClick={() => setOpen(false)}>
          放弃
        </web-ui-button>
        <web-ui-button slot="footer" full variant="primary" onClick={() => setOpen(false)}>
          保存草稿
        </web-ui-button>
      </web-ui-dialog>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">打开 dialog</web-ui-button>
    <web-ui-dialog
      :open="open"
      footer-orientation="horizontal"
      heading="保存这条消息？"
      @open-change="open = $event.detail.open"
    >
      <p class="m-0">这条消息尚未发送，并且包含未保存的更改。你可以先将它保存为草稿，稍后继续编辑。</p>
      <web-ui-button slot="footer" full variant="secondary" @click="open = false">放弃</web-ui-button>
      <web-ui-button slot="footer" full variant="primary" @click="open = false">保存草稿</web-ui-button>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### No backdrop close

`no-backdrop-close` 只拦截 backdrop 点击。footer button 和 Escape 仍能关闭 dialog。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>打开 dialog</web-ui-button>
      <web-ui-dialog
        open={open}
        noBackdropClose
        heading="点击背景不会关闭"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p className="m-0">点击卡片外的区域不会关闭。请使用下方 button 或 Escape 关闭。</p>
        <web-ui-button slot="footer" full variant="secondary" onClick={() => setOpen(false)}>
          关闭
        </web-ui-button>
      </web-ui-dialog>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">打开 dialog</web-ui-button>
    <web-ui-dialog :open="open" no-backdrop-close heading="点击背景不会关闭" @open-change="open = $event.detail.open">
      <p class="m-0">点击卡片外的区域不会关闭。请使用下方 button 或 Escape 关闭。</p>
      <web-ui-button slot="footer" full variant="secondary" @click="open = false">关闭</web-ui-button>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### Closable without footer

`closable` 在卡片右上角显示内置关闭 button。没有 `footer` 时，它是组件提供的唯一操作入口。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>打开 dialog</web-ui-button>
      <web-ui-dialog open={open} closable heading="只有关闭按钮" onopen-change={event => setOpen(event.detail.open)}>
        <p className="m-0">没有 footer，可以用右上角的关闭 button、Escape 或 backdrop 关闭。</p>
      </web-ui-dialog>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">打开 dialog</web-ui-button>
    <web-ui-dialog :open="open" closable heading="只有关闭按钮" @open-change="open = $event.detail.open">
      <p class="m-0">没有 footer，可以用右上角的关闭 button、Escape 或 backdrop 关闭。</p>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### Controlled closing

`controlled` 把关闭的决定权交给页面。Escape 和 backdrop 点击都不修改 `open`，只派发 `open-change` 请求关闭。

页面不回写时 dialog 保持打开。footer 的「放弃更改」直接写入 `false`，这属于程序式关闭，`controlled` 不拦截。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [requests, setRequests] = useState(0)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>打开 dialog</web-ui-button>
      <web-ui-dialog
        open={open}
        controlled
        heading="未保存的更改"
        onopen-change={event => {
          if (!event.detail.open) setRequests(count => count + 1)
        }}
      >
        <p className="m-0">Escape 与 backdrop 只请求关闭；页面不写回，dialog 保持打开。</p>
        <output className="block text-sm text-(--wui-color-text-secondary)">已拦截关闭请求 · {requests} 次</output>
        <web-ui-button slot="footer" full variant="secondary" onClick={() => setOpen(false)}>
          放弃更改
        </web-ui-button>
      </web-ui-dialog>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">打开 dialog</web-ui-button>
    <web-ui-dialog :open="open" controlled heading="未保存的更改" @open-change="onOpenChange">
      <p class="m-0">Escape 与 backdrop 只请求关闭；页面不写回，dialog 保持打开。</p>
      <output class="block text-sm text-(--wui-color-text-secondary)">已拦截关闭请求 · {{ requests }} 次</output>
      <web-ui-button slot="footer" full variant="secondary" @click="open = false">放弃更改</web-ui-button>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import type { WebUiDialog, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const open = ref(false)
const requests = ref(0)

function onOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (!event.detail.open) requests.value += 1
}
</script>
```

### Headless

`headless` 只保留 backdrop、进出场动画、滚动锁这些 overlay 行为。内置标题栏、内容区和 footer 都不渲染，默认插槽直接成为卡片内的滚动层。

此时没有可自动关联的内置标题，页面必须提供 `aria-dialog-label`，卡片外观和关闭 button 也由页面自绘。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>打开图片详情</web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">
        headless dialog：{open ? '已打开' : '已关闭'}
      </output>
      <web-ui-dialog
        open={open}
        headless
        aria-dialog-label="图片详情"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="m-0 text-base font-semibold">山间清晨</h2>
              <span className="text-xs text-(--wui-color-text-secondary)">3840 × 2160 · JPEG</span>
            </div>
            <web-ui-button variant="secondary" onClick={() => setOpen(false)}>
              关闭
            </web-ui-button>
          </div>
          <div className="flex h-32 items-center justify-center rounded-lg bg-(--wui-color-surface-glass) text-sm text-(--wui-color-text-secondary)">
            预览区域由页面自绘
          </div>
          <web-ui-button variant="primary" onClick={() => setOpen(false)}>
            完成
          </web-ui-button>
        </div>
      </web-ui-dialog>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">打开图片详情</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">
      headless dialog：{{ open ? '已打开' : '已关闭' }}
    </output>
    <web-ui-dialog :open="open" headless aria-dialog-label="图片详情" @open-change="open = $event.detail.open">
      <div class="flex flex-col gap-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex flex-col gap-1">
            <h2 class="m-0 text-base font-semibold">山间清晨</h2>
            <span class="text-xs text-(--wui-color-text-secondary)">3840 × 2160 · JPEG</span>
          </div>
          <web-ui-button variant="secondary" @click="open = false">关闭</web-ui-button>
        </div>
        <div
          class="flex h-32 items-center justify-center rounded-lg bg-(--wui-color-surface-glass) text-sm text-(--wui-color-text-secondary)"
        >
          预览区域由页面自绘
        </div>
        <web-ui-button variant="primary" @click="open = false">完成</web-ui-button>
      </div>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

## API

### Props

| 名称                 | 说明                                                                | 类型                         | 默认值       |
| -------------------- | ------------------------------------------------------------------- | ---------------------------- | ------------ |
| `open`               | dialog 是否可见。                                                   | `boolean`                    | `false`      |
| `closable`           | 显示内置关闭 button。                                               | `boolean`                    | `false`      |
| `footer-orientation` | footer 操作区的排列方向。                                           | `'vertical' \| 'horizontal'` | `'vertical'` |
| `no-scroll-lock`     | 打开时不锁定页面滚动。                                              | `boolean`                    | `false`      |
| `no-backdrop-close`  | 禁止点击 backdrop 关闭。                                            | `boolean`                    | `false`      |
| `no-escape-close`    | 禁止按 Escape 关闭。                                                | `boolean`                    | `false`      |
| `controlled`         | Escape 与 backdrop 只请求 `open=false`，由调用方回写。              | `boolean`                    | `false`      |
| `heading`            | 标题文字，`header` 插槽为空时的回退（`headless` 下忽略）。          | `string`                     | `''`         |
| `headless`           | 只保留 overlay 行为，不渲染内置标题栏、内容区与 footer。            | `boolean`                    | `false`      |
| `aria-dialog-label`  | dialog 的可访问名称；`headless` 下必填。`dialog-label` 也可用。     | `string`                     | `''`         |
| `aria-close-label`   | 内置关闭 button 的无障碍名称；未设置时回退内置英文文案（`Close`）。 | `string`                     | `''`         |

### Events

| 名称          | 说明                                              |
| ------------- | ------------------------------------------------- |
| `open-change` | `open` 状态变化，`detail.open` 是请求的目标状态。 |

### Slots

| 名称      | 说明                                           |
| --------- | ---------------------------------------------- |
| `default` | 正文内容。                                     |
| `header`  | 卡片顶部的标题栏区域，有内容时接管 `heading`。 |
| `footer`  | 底部操作区。                                   |

### Methods

| 名称          | 说明                                        |
| ------------- | ------------------------------------------- |
| `showModal()` | 打开 dialog，等同于把 `open` 设为 `true`。  |
| `close()`     | 关闭 dialog，等同于把 `open` 设为 `false`。 |

### 行为说明

`header` 槽渲染卡片顶部的标题栏。它不参与滚动，自带水平内边距（`--wui-dialog-inline-padding`），内容不会贴到卡片内沿。

`heading` 属性是它的回退：槽里一旦有内容，标题栏就完全由槽接管；两者都为空时，整个标题栏隐藏。

`default` 槽在两种模式下都承载正文。默认模式下，它位于标题栏和 footer 之间的内容区。

`footer` 只负责方向、间距、对齐和内边距，不改动子元素的样式。默认纵向排列，按钮仍按自身内容宽度渲染，并在行内居中。需要占满操作区的 button，由调用方显式设置 `full`。设置 `footer-orientation="horizontal"` 后，按钮排成一行，间距固定取全局 `--wui-space-3`，整行默认居中。

`headless` 下整张卡片就是一个滚动层。`header`、内容区和 `footer` 都不渲染，`heading` 一并失效。

未设置 `no-escape-close` 时，Escape 会关闭 dialog；未设置 `no-backdrop-close` 时，点击 backdrop 会关闭。启用 `controlled` 后，两者都只派发关闭请求，不会自行关闭。

启用 `closable` 后，默认模式和 `headless` 模式都会渲染内置关闭 button。它和 Escape、backdrop 点击使用同一条关闭路径（`controlled` 对它同样生效）。

关闭 button 位于卡片右上角，距上沿和右沿的偏移由 `--wui-dialog-close-top` / `--wui-dialog-close-right` 控制（默认都是 `20px`）。

默认模式下，标题栏会为 button 留出空间，长内容不会延伸到 button 下方。

不启用 `closable` 时不会渲染关闭 button。

> Escape 归属：一次按键只关闭最内层的已打开 overlay（popover、select、autocomplete、dropdown、context-menu、drawer、dialog、image-preview 都参与）。例如在一个 drawer 里打开 select，第一次 Escape 只关 select，第二次才关 drawer。互不嵌套的并列 overlay 按打开顺序关闭最上层。正在播退场动画的 panel 仍会处理 Escape，但只要还有别的 overlay 开着，这次按键仍归那一层。

> 高度语义：`--wui-dialog-max-height` 限制的是内容区，不是整张卡片。标题栏和 footer 仍由内容撑开，超出部分在内容区内滚动，宿主不必自己算这个高度。要给整张卡片定上限的宿主，需要自行量出标题栏、footer 和内边距的高度，再从该值里减掉。
>
> `headless` 模式不适用这个 token：卡片在内容装得下时贴合内容，装不下时回退到视口高度，滚动发生在内容区。内置关闭 button 在内容滚动时保持 `--wui-dialog-close-top` / `--wui-dialog-close-right` 给出的位置。

### 可访问名称

设置了 `aria-dialog-label` 时，它就是 dialog 的可访问名称。未设置时，如果处于默认模式且标题栏可见，名称来自标题栏。

`headless` 没有可指向的内置标题，所以名字必须由调用方提供：`aria-dialog-label`，或一个自绘且可关联的标题元素。

### CSS Custom Properties

| 名称                              | 说明                                                                                                                                                                                                                                                                                                                                                                    | 默认值                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `--wui-dialog-width`              | dialog 宽度                                                                                                                                                                                                                                                                                                                                                             | `360px`                                 |
| `--wui-dialog-max-height`         | 内容区的最大高度，不是整张卡片的高度。整卡换算见高度语义说明                                                                                                                                                                                                                                                                                                            | `90vh` / `min(90vh, 90dvh)`（dvh 引擎） |
| `--wui-dialog-close-top`          | `closable` button 距卡片顶部的偏移                                                                                                                                                                                                                                                                                                                                      | `20px`                                  |
| `--wui-dialog-close-right`        | `closable` button 距卡片右沿的偏移                                                                                                                                                                                                                                                                                                                                      | `20px`                                  |
| `--wui-dialog-overlay-bg`         | backdrop 背景色                                                                                                                                                                                                                                                                                                                                                         | `var(--wui-color-backdrop)`             |
| `--wui-dialog-bg`                 | 玻璃卡片背景色，回退到 `rgb(248 248 248 / 0.92)`                                                                                                                                                                                                                                                                                                                        | `var(--wui-color-surface-overlay)`      |
| `--wui-dialog-padding`            | 卡片的块轴内边距。卡片本身没有行内内边距，水平内边距由标题栏、内容区和 footer 各自提供，见 `--wui-dialog-inline-padding`                                                                                                                                                                                                                                                | `20px 24px 24px`                        |
| `--wui-dialog-inline-padding`     | 标题栏、内容区与 footer 的水平内边距。卡片自身没有行内内边距，所以内容区的滚动区域（它的 border box）与卡片内沿重合，scrollbar 贴边，而内容仍保留这段内缩。默认取自 `--wui-space-6`                                                                                                                                                                                     | `24px`                                  |
| `--wui-dialog-title-gap`          | 标题下方间距                                                                                                                                                                                                                                                                                                                                                            | `16px`                                  |
| `--wui-dialog-desc-gap`           | 正文内容下方间距                                                                                                                                                                                                                                                                                                                                                        | `24px`                                  |
| `--wui-dialog-desc-focus-padding` | 内容区在块轴方向预留的 focus ring 余量。内容区既是滚动容器，又因为有一条轴必须不是 `visible` 而成为裁剪盒，所以紧贴其上下沿的控件，ring 会被 padding box 裁掉；这段余量覆盖 `5px` 的 ring（`offset: 2` + `width: 3`）。横向的 ring 余量由 `--wui-dialog-inline-padding` 提供（24px ≫ 5px），所以本 token 只作用于块轴。成对的负 margin 让标题栏和 footer 的高度保持不变 | `6px`                                   |
| `--wui-dialog-footer-gap`         | footer 按钮纵向堆叠时的间距；`footer-orientation="horizontal"` 时本 token 不生效，横排间距固定取全局 `--wui-space-3`。                                                                                                                                                                                                                                                  | `10px`                                  |
| `--wui-dialog-footer-justify`     | footer 的 `justify-content`。横向模式下会覆盖默认值，可用这个 token 调整对齐                                                                                                                                                                                                                                                                                            | `flex-end`（默认）/ `center`（横向）    |
| `--wui-dialog-scale-enter`        | 进场缩放的起点：从 `1.1` 收缩到 `1`，退场时反向                                                                                                                                                                                                                                                                                                                         | `1.1`                                   |

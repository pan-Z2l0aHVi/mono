---
component: dialog
tag: web-ui-dialog
---

模态 dialog，基于原生 `<dialog>` 的 `showModal()`；支持内置标题带、footer 与完全自绘的 `headless` 模式。

## Samples

### Basic

`open` 由页面持有：button 把它置真；Escape、backdrop 点击与内置关闭 button（`closable`）由组件自己关到位，再用 `open-change` 把结果交回来，页面按 `detail.open` 回写。

footer 里的 button 是页面直接改状态，属于程序式更新，不会再派发一次事件——读数因此只在用户从组件侧关闭时增长。

`heading` 是 `header` 槽为空时的标题回落。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [changes, setChanges] = useState(0)
  const [last, setLast] = useState('—')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>打开 dialog</web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change：{changes} 次 · 最后一次 detail.open = {last}
      </output>
      <web-ui-dialog
        open={open}
        heading="确认操作"
        closable
        onopen-change={event => {
          setChanges(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
          setOpen(event.detail.open)
        }}
      >
        <p className="m-0">删除后无法恢复，确定继续吗？</p>
        <web-ui-button slot="footer" variant="secondary" onClick={() => setOpen(false)}>
          取消
        </web-ui-button>
        <web-ui-button slot="footer" variant="danger" onClick={() => setOpen(false)}>
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
    <web-ui-dialog :open="open" heading="确认操作" closable @open-change="onOpenChange">
      <p class="m-0">删除后无法恢复，确定继续吗？</p>
      <web-ui-button slot="footer" variant="secondary" @click="open = false">取消</web-ui-button>
      <web-ui-button slot="footer" variant="danger" @click="open = false">删除</web-ui-button>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import type { WebUiDialog, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const open = ref(false)
const changes = ref(0)
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  changes.value += 1
  last.value = event.detail.open ? 'true' : 'false'
  open.value = event.detail.open
}
</script>
```

### Controlled closing

`controlled` 把关闭的决定权交给页面：Escape、backdrop 点击与 closable button 都不改 `open`，只派发 `open-change` 请求关闭。

页面不回写就保持打开，`<output>` 累加被拦截的请求数；footer 的「放弃更改」直接写 `false`，那是程序式关闭，`controlled` 不拦。

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
        closable
        heading="未保存的更改"
        onopen-change={event => {
          if (!event.detail.open) setRequests(count => count + 1)
        }}
      >
        <p className="m-0">Escape 与 backdrop 只请求关闭；页面不写回，dialog 保持打开。</p>
        <output className="block text-sm text-(--wui-color-text-secondary)">已拦截关闭请求 · {requests} 次</output>
        <web-ui-button slot="footer" variant="secondary" onClick={() => setOpen(false)}>
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
    <web-ui-dialog :open="open" controlled closable heading="未保存的更改" @open-change="onOpenChange">
      <p class="m-0">Escape 与 backdrop 只请求关闭；页面不写回，dialog 保持打开。</p>
      <output class="block text-sm text-(--wui-color-text-secondary)">已拦截关闭请求 · {{ requests }} 次</output>
      <web-ui-button slot="footer" variant="secondary" @click="open = false">放弃更改</web-ui-button>
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

`headless` 只保留 overlay 基础设施——backdrop、进出场动画、滚动锁与原生 `<dialog>` 语义；内置 chrome 带、正文区与 footer 一概不渲染，默认插槽直接落进卡片内的滚动层。

此时没有可自动关联的内置标题，`dialog-label` 必须由页面提供，卡片外观与关闭 button 也全部自绘。

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
      <web-ui-dialog open={open} headless dialog-label="图片详情" onopen-change={event => setOpen(event.detail.open)}>
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
    <web-ui-dialog :open="open" headless dialog-label="图片详情" @open-change="open = $event.detail.open">
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

| 名称                | 说明                                                         | 类型      | 默认值  |
| ------------------- | ------------------------------------------------------------ | --------- | ------- |
| `open`              | dialog 可见性。                                              | `boolean` | `false` |
| `closable`          | 显示内置关闭 button。                                        | `boolean` | `false` |
| `horizontal`        | Footer 操作按钮横向排列。                                    | `boolean` | `false` |
| `no-scroll-lock`    | 打开时不锁定页面滚动。                                       | `boolean` | `false` |
| `no-backdrop-close` | 禁止点击 backdrop 关闭。                                     | `boolean` | `false` |
| `no-escape-close`   | 禁止按 Escape 关闭。                                         | `boolean` | `false` |
| `controlled`        | Escape 与 backdrop 仅请求 `open=false`，由消费方回写。       | `boolean` | `false` |
| `heading`           | 标题文字，`header` 插槽为空时的回落（`headless` 下忽略）。   | `string`  | `''`    |
| `headless`          | 只保留 overlay 行为，不渲染内置 header 带、内容区与 footer。 | `boolean` | `false` |
| `dialog-label`      | 内部原生 dialog 的 accessible name；`headless` 下必填。      | `string`  | `''`    |

### Events

| 名称          | 说明                                            |
| ------------- | ----------------------------------------------- |
| `open-change` | open 状态变化，`detail.open` 为请求的目标状态。 |

### Slots

| 名称      | 说明                                           |
| --------- | ---------------------------------------------- |
| `default` | 正文内容。                                     |
| `header`  | 卡片顶部的 chrome 带，有内容时接管 `heading`。 |
| `footer`  | 底部操作区。                                   |

### Methods

| 名称          | 说明                                        |
| ------------- | ------------------------------------------- |
| `showModal()` | 打开 dialog，等价于把 `open` 置为 `true`。  |
| `close()`     | 关闭 dialog，等价于把 `open` 置为 `false`。 |

### 行为说明

`header` 槽是卡片的 chrome 带：不参与滚动，自带水平 padding（`--wui-dialog-inline-padding`），内容不会贴到卡片内沿。

`heading` 属性是它的 fallback——槽一旦有分配元素就整条接管，否则非空的 `heading` 渲染出 `.wui-dialog-heading`；两者都为空时整条带隐藏。

`default` 槽在两种模式下都承载正文。默认模式下它渲染进 `.desc`（卡片的内容区），与 `header` 带、`footer` 并列。

`headless` 下整张卡片变成一个滚动层：`default` 槽渲染进 `.wui-dialog-content`，`header` 带、`.desc` 与 `footer` 一概不渲染，`heading` 一并失效。

`headless` 与 `<web-ui-drawer>` 是同一套机制——显式布尔属性，不是「往某个插槽里塞东西」的 toggle。

使用原生 `<dialog>`，`@cancel` 阻止默认关闭行为。除非存在 `no-escape-close`，否则 Escape 调用 `close()`；除非存在 `no-backdrop-close`，否则点击 backdrop 关闭。启用 `controlled` 后，两者都只派发关闭请求而不自关闭。

启用 `closable` 后，默认模式与 `headless` 模式都会渲染内置关闭 button，且与 Escape、backdrop 点击走同一条关闭路径（`controlled` 对它同样生效）。

两种模式的位置已统一：button 都绝对定位到卡片右上角，距卡片两沿的偏移由 `--wui-dialog-close-top` / `--wui-dialog-close-right` 控制（默认都是 `20px`；drawer 关闭 button 仍为 `16px`）。

只有 `headless` 会把整卡换掉；默认模式下 `header` 带会为 button 留出避让，长内容不会钻到 button 下面。

icon 与 drawer 关闭 button 同为 `ooui:close`。

不启用 `closable` 时什么都不渲染——既没有 button，也没有多余的包裹层。

> **Escape 归属**：Escape 由共享仲裁者统一判定，一次按键只关闭**最内层**的已打开 overlay（popover、select、autocomplete、dropdown、context-menu、drawer、dialog 都参与）。例如在 drawer 内打开 select，第一次 Escape 只关 select，第二次才关 drawer。互不嵌套的并列 overlay 按打开顺序关闭最上层。正在播退场过渡的 panel 仍在场上，也仍由它接住 Escape——但只要还有别的 overlay 开着，那一次按键仍然归该层，「一次按键关一层」不因此改变。`image-preview` 同样参与：它的原生 `<dialog>` 会登记进同一个仲裁者，Escape 按层级判定；组件的 `cancel` handler 只是拦掉原生的瞬时关闭，把 top layer 保留到退场过渡结束。

> **高度语义**：本 token 限制的是内容区，不是整卡。`header` 带与 footer 仍由内容撑开，超出上限的部分在 `.desc` 内部滚动；整卡本身只由字面量 `100vh` / `100dvh` 兜底，接住「视口太矮、chrome 加内容区上限也放不下」的情况。要给**整卡**定上限的宿主仍需自行量出 chrome（卡片 block 内边距 + header 带 + 间距 + footer）并从 token 里减掉——Interweave 前端三个 dialog 分别减 142、142、158。不需要这个数的是「让内容区滚起来」：`.desc` 自带上限与 `overflow`，滚动发生在它内部，宿主不必自己算这个高度。
>
> **`headless` 模式没有 `.desc`**，所以该 token 在这一档不生效。`headless` 下的 `default` 插槽被包进 `.wui-dialog-content`，滚动发生在这一层；卡片在内容装得下时仍贴合内容，装不下时由同一条字面量 `100vh` / `100dvh` 兜底。内置关闭 button 在内容滚动时保持 `--wui-dialog-close-top` / `--wui-dialog-close-right` 给出的位置不变。

### accessible name

设置了 `dialog-label` 时，内部原生 `<dialog>` 直接取它的 `aria-label`；否则在默认模式且 `header` 带可见时，取指向该带的 `aria-labelledby="wui-dialog-heading"`。

`headless` 没有可指向的内置标题，所以**名字必须由 Consumer 提供**——`dialog-label`，或自绘的可关联标题元素。

### CSS Custom Properties

| 名称                              | 说明                                                                                                                                                                                                                                                                                                                                                               | 默认值                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `--wui-dialog-width`              | dialog 宽度                                                                                                                                                                                                                                                                                                                                                        | `360px`                                    |
| `--wui-dialog-max-height`         | 内容区（`.desc`）的最大高度，不是整卡高度。两套 fallback：基础规则 `90vh`，`@supports (height: 100dvh)` 内 `min(90vh, 90dvh)`——不支持 dvh 的引擎只拿到 `90vh`。整卡换算见下方说明                                                                                                                                                                                  | `90vh` / `min(90vh, 90dvh)`（dvh 引擎）    |
| `--wui-dialog-close-top`          | `closable` button 距卡片顶部的偏移                                                                                                                                                                                                                                                                                                                                 | `20px`                                     |
| `--wui-dialog-close-right`        | `closable` button 距卡片右沿的偏移                                                                                                                                                                                                                                                                                                                                 | `20px`                                     |
| `--wui-dialog-overlay-bg`         | backdrop 背景色                                                                                                                                                                                                                                                                                                                                                    | `var(--wui-color-backdrop)`                |
| `--wui-dialog-bg`                 | 玻璃卡片背景色，回退到 `rgb(248 248 248 / 0.92)`                                                                                                                                                                                                                                                                                                                   | `var(--wui-color-surface-overlay)`         |
| `--wui-dialog-padding`            | 卡片的 block 内边距。卡片没有 inline 分量：水平内边距由各分区提供（`.header` / `.desc` / `.wui-dialog-footer`），见 `--wui-dialog-inline-padding`                                                                                                                                                                                                                  | `20px 24px 24px`                           |
| `--wui-dialog-inline-padding`     | `header` 带、内容区（`.desc`）与 footer 的水平内边距。卡片自身没有 inline padding，内容区的滚动口（其 border box）因此与卡片内沿重合——scrollbar 贴边——而内容仍保留这个内缩。默认取自 `--wui-space-6`                                                                                                                                                               | `24px`                                     |
| `--wui-dialog-title-gap`          | 标题下方间距                                                                                                                                                                                                                                                                                                                                                       | `16px`                                     |
| `--wui-dialog-desc-gap`           | 正文内容下方间距                                                                                                                                                                                                                                                                                                                                                   | `24px`                                     |
| `--wui-dialog-desc-focus-padding` | 内容区**block 轴**预留的 focus-ring 余量。`.desc` 既是滚动容器，又因为有一条轴必须非 `visible` 而成了裁剪盒，所以紧贴其上下沿的控件，ring 会被 padding box 裁掉；这个余量覆盖 `5px` 的 ring（`offset: 2` + `width: 3`）。横向的 ring 余量由 `--wui-dialog-inline-padding` 提供（24px ≫ 5px），所以本 token 只作用于 block 轴。成对负 margin 使 chrome 高度保持不变 | `6px`                                      |
| `--wui-dialog-footer-gap`         | Footer button 间距                                                                                                                                                                                                                                                                                                                                                 | `10px` / horizontal `12px`                 |
| `--wui-dialog-footer-justify`     | Footer `justify-content`；horizontal 模式下覆盖为 `flex-end` 可右对齐                                                                                                                                                                                                                                                                                              | `flex-end`（默认）/ `center`（horizontal） |
| `--wui-dialog-scale-enter`        | 进场缩放起点：由 `1.1` 收缩到 `1`，退场反向                                                                                                                                                                                                                                                                                                                        | `1.1`                                      |

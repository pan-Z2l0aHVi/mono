---
component: collapse
tag: web-ui-collapse
---

collapse panel 把 trigger 与内容装在同一个元素里：trigger 走 default slot，要收起的内容走 `content` slot。

用户点 trigger 时组件自己把 `open` 改到位，再派发一次 `open-change` 通知；消费方把 `detail.open` 回写进页面状态，页面上的读数才和面板一致。

## Samples

### Basic

`open` 是唯一状态源，`content` slot 放要收起的内容，default slot 放 trigger。

点 trigger 时组件先把 `open` 落到新值再派发 `open-change`，所以 handler 只要把 `detail.open` 回写进页面状态。

下面那行读数是回写后的值，组件内部没有第二份状态。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-collapse open={open} onopen-change={event => setOpen(event.detail.open)}>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          展开详情
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            <p className="m-0">content slot 支持任意节点：文字、表单、图片，甚至另一条 collapse。</p>
          </div>
        </div>
      </web-ui-collapse>
      <output className="text-sm text-(--wui-color-text-secondary)">回写后的 open：{String(open)}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-collapse :open="open" @open-change="open = $event.detail.open">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        展开详情
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p class="m-0">content slot 支持任意节点：文字、表单、图片，甚至另一条 collapse。</p>
        </div>
      </div>
    </web-ui-collapse>
    <output class="text-sm text-(--wui-color-text-secondary)">回写后的 open：{{ open }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### Without binding open

组件自己会切 `open`，所以完全不绑定也能用：只给 default slot 与 `content` slot 就行。第二条静态写 `open`，表示初始就展开——初始即为 `open` 时直接落展开稳态，不播进入动画。静态写法只在挂载时生效一次，之后组件继续自己切这个属性，页面不再参与。

```tsx
export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-collapse>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          初始收起
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            <p className="m-0">没有绑定 open：点 trigger 由组件自己把属性写到位。</p>
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse open>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          初始展开
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            <p className="m-0">挂载时就带 open，直接落展开稳态；再点一次才走收起动画。</p>
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-collapse>
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        初始收起
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p class="m-0">没有绑定 open：点 trigger 由组件自己把属性写到位。</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse :open="true">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        初始展开
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p class="m-0">挂载时就带 open，直接落展开稳态；再点一次才走收起动画。</p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>
```

### Trigger types

交互语义来自 default slot 里那个元素本身：原生 `<button>` 与 `<web-ui-button>` 自带 Enter / Space 激活和焦点，组件把 `aria-expanded` 回写到 default slot 里第一个被指派的元素，并在 `disabled` 时给该元素加上 `disabled`。

不回写 `aria-controls`：内容 track 在组件 shadow root 内，IDREF 不能跨 shadow root 解析，写出去在可访问性树里等同悬空引用。展开关系由 `aria-expanded` 表达，`<web-ui-button>` 会把它同步到内部原生 button；禁用态则靠 `disabled` 属性穿透 shadow 边界。

整个 default slot 都落在点击代理范围内，点其中任何一处都算一次开合，所以说明文字别塞进来。

最后一条放的是纯文本 trigger：点得动，但不可聚焦、没有键盘激活，只用来演示反面写法。

```tsx
import { lucideChevronDown } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-collapse>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          原生 button
        </button>
        <div slot="content">
          <div className="p-3 text-sm">Enter / Space 与焦点都由这个原生 button 自己提供。</div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse>
        <web-ui-button variant="secondary" full>
          web-ui-button
        </web-ui-button>
        <div slot="content">
          <div className="p-3 text-sm">
            自定义元素也能当 trigger；展开状态会同步到它内部原生 button，供辅助技术读取。
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse>
        <web-ui-button variant="secondary" full>
          <web-ui-icon slot="prefix" icon={lucideChevronDown} size={14}></web-ui-icon>带 prefix icon 的 trigger
        </web-ui-button>
        <div slot="content">
          <div className="p-3 text-sm">被指派的第一件东西仍然是那个 button；展开状态会同步到它内部原生 button。</div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse>
        纯文本 trigger
        <div slot="content">
          <div className="p-3 text-sm">反面写法：鼠标点得动，但不可聚焦、没有键盘激活。</div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-collapse>
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        原生 button
      </button>
      <div slot="content">
        <div class="p-3 text-sm">Enter / Space 与焦点都由这个原生 button 自己提供。</div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse>
      <web-ui-button variant="secondary" full>web-ui-button</web-ui-button>
      <div slot="content">
        <div class="p-3 text-sm">自定义元素也能当 trigger；展开状态会同步到它内部原生 button，供辅助技术读取。</div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse>
      <web-ui-button variant="secondary" full>
        <web-ui-icon slot="prefix" :icon="lucideChevronDown" :size="14"></web-ui-icon>
        带 prefix icon 的 trigger
      </web-ui-button>
      <div slot="content">
        <div class="p-3 text-sm">被指派的第一件东西仍然是那个 button；展开状态会同步到它内部原生 button。</div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse>
      纯文本 trigger
      <div slot="content">
        <div class="p-3 text-sm">反面写法：鼠标点得动，但不可聚焦、没有键盘激活。</div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
import { lucideChevronDown } from '@greypan/web-ui/icons'
</script>
```

### Disabled

`disabled` 让点击被忽略，并给 trigger 元素加上 `disabled`；取消禁用时移除该 attribute，回到 trigger 原本的禁用状态。它不改变已经展开的面板：第二条同时写 `open` 与 `disabled`，内容保持可见——禁用管的是触发，不是当前状态。

下面那个 checkbox 在运行时切换第一条的 `disabled`，可以对照 trigger 上 `disabled` 的写入与移除。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [disabled, setDisabled] = useState(true)

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <web-ui-checkbox checked={disabled} onChange={event => setDisabled(event.currentTarget.checked)}>
        禁用第一条的 trigger
      </web-ui-checkbox>

      <web-ui-collapse disabled={disabled}>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          随开关禁用
        </button>
        <div slot="content">
          <div className="p-3 text-sm">取消勾选就能展开；勾选后点它不动，但这条的内容本来就没展开。</div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse open disabled>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          已展开且禁用
        </button>
        <div slot="content">
          <div className="p-3 text-sm">禁用不会把已展开的内容收掉：这条一直可见，点 trigger 无效。</div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <web-ui-checkbox :checked="disabled" @change="disabled = $event.target.checked">
      禁用第一条的 trigger
    </web-ui-checkbox>

    <web-ui-collapse :disabled="disabled">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        随开关禁用
      </button>
      <div slot="content">
        <div class="p-3 text-sm">取消勾选就能展开；勾选后点它不动，但这条的内容本来就没展开。</div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse :open="true" disabled>
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        已展开且禁用
      </button>
      <div slot="content">
        <div class="p-3 text-sm">禁用不会把已展开的内容收掉：这条一直可见，点 trigger 无效。</div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const disabled = ref(true)
</script>
```

### Events and methods

读数是挂在这条 collapse 宿主上的 `open-change` 计数与最后一次 `detail.open`。点 trigger 会让计数加一：`open-change` 只在用户手势后派发，`detail.open` 是组件已经落到的状态。

右边三个按钮走元素实例的 `show()` / `close()` / `toggle()`，它们改同一个 `open`、动画照播，却不派发事件——程序式入口必须静默，否则消费方的回写会和通知形成回环。

```tsx
import type { WebUiCollapse } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const panel = useRef<WebUiCollapse>(null)
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('还没有派发')

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <web-ui-button variant="secondary" onClick={() => panel.current?.show()}>
          show()
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={() => panel.current?.close()}>
          close()
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={() => panel.current?.toggle()}>
          toggle()
        </web-ui-button>
      </div>

      <web-ui-collapse
        ref={panel}
        onopen-change={event => {
          setCount(current => current + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          点击 trigger 开合
        </button>
        <div slot="content">
          <div className="p-3 text-sm">上面三个按钮能让面板开合，却不产生计数。</div>
        </div>
      </web-ui-collapse>

      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change：{count} 次 · 最后一次 detail.open = {last}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button variant="secondary" @click="panel?.show()">show()</web-ui-button>
      <web-ui-button variant="secondary" @click="panel?.close()">close()</web-ui-button>
      <web-ui-button variant="secondary" @click="panel?.toggle()">toggle()</web-ui-button>
    </div>

    <web-ui-collapse ref="panel" @open-change="onOpenChange">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        点击 trigger 开合
      </button>
      <div slot="content">
        <div class="p-3 text-sm">上面三个按钮能让面板开合，却不产生计数。</div>
      </div>
    </web-ui-collapse>

    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change：{{ count }} 次 · 最后一次 detail.open = {{ last }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiCollapse, WebUiEvent } from '@greypan/web-ui'
import { ref, useTemplateRef } from 'vue'

const panel = useTemplateRef<WebUiCollapse>('panel')
const count = ref(0)
const last = ref('还没有派发')

function onOpenChange(event: WebUiEvent<WebUiCollapse, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### Closed resting state and scroll position

两条都停在关闭稳态，可见高度都是 0，差别在内容怎么退出。

左边是默认：shadow 内的内容容器 `hidden`（`display: none`），内部滚动位置随之丢掉。右边 `keep-mounted`：内容留在 `0fr` track 里并整段 `inert`，滚动位置保住、尺寸仍可测量，代价是关闭态仍留在渲染树里。

`keep-mounted` 不是「关闭态占一层高度」。做法：把右边滚到中段，收起再展开，位置还在；左边同样操作则回到顶部。

```tsx
export default function Demo() {
  const rows = Array.from({ length: 20 }, (_, index) => `列表项 ${index + 1}`)

  return (
    <div className="flex w-full flex-col items-start gap-4 sm:flex-row">
      <web-ui-collapse className="w-full sm:max-w-xs">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          默认关闭稳态
        </button>
        <div slot="content">
          <div className="max-h-32 overflow-y-auto p-3 text-sm">
            {rows.map(row => (
              <p key={row} className="m-0">
                {row}
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse keepMounted className="w-full sm:max-w-xs">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          keep-mounted 关闭稳态
        </button>
        <div slot="content">
          <div className="max-h-32 overflow-y-auto p-3 text-sm">
            {rows.map(row => (
              <p key={row} className="m-0">
                {row}
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col items-start gap-4 sm:flex-row">
    <web-ui-collapse class="w-full sm:max-w-xs">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        默认关闭稳态
      </button>
      <div slot="content">
        <div class="max-h-32 overflow-y-auto p-3 text-sm">
          <p v-for="row in rows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse keep-mounted class="w-full sm:max-w-xs">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        keep-mounted 关闭稳态
      </button>
      <div slot="content">
        <div class="max-h-32 overflow-y-auto p-3 text-sm">
          <p v-for="row in rows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
const rows = Array.from({ length: 20 }, (_, index) => `列表项 ${index + 1}`)
</script>
```

### Peek preview band

`peek` 让关闭稳态收到固定长度而不是 0，露出的那一段用来提示下面还有内容。它的关闭稳态语义等同 `keep-mounted`：整段 inner 都在 `inert` 子树里，所以露出的部分同样点不动、Tab 也进不去，要交互得先展开。

第二条的内容比 `peek` 短，收起高度就等于内容高度，不留空白。

`peek` 取任何 CSS 长度，写 `rem` 时跟随根字号缩放。

```tsx
export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <web-ui-collapse peek="80px">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          peek 80px（内容比它长）
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 8 }, (_, index) => (
              <p key={index} className="m-0">
                段落 {index + 1}：关闭时只露出前 80px，露出的这一截也点不动。
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse peek="200px">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          peek 200px（内容比它短）
        </button>
        <div slot="content">
          <div className="p-3 text-sm">内容不足 200px：收起高度取内容实际高度，不会被撑到 200px。</div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <web-ui-collapse peek="80px">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        peek 80px（内容比它长）
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in longRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse peek="200px">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        peek 200px（内容比它短）
      </button>
      <div slot="content">
        <div class="p-3 text-sm">内容不足 200px：收起高度取内容实际高度，不会被撑到 200px。</div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
const longRows = Array.from(
  { length: 8 },
  (_, index) => `段落 ${index + 1}：关闭时只露出前 80px，露出的这一截也点不动。`
)
</script>
```

### Edge fade

露出区域的裁剪边缘自带一段 alpha 渐隐，同一条带上还叠一层背景模糊，长度由 `peek` 推导：默认比例 0.4，并夹在 `--wui-collapse-peek-edge-max`（`112px`）以内。

第一条 `peek="200px"` 得到 80px 的带子；第二条把 `--wui-collapse-peek-edge-ratio` 提到 0.7，算出的 140px 被上限夹成 112px。

这条量的是带子长度与它的推导来源，和示例卡片下方代码区那条折叠各用各的 `peek` 与比例：预览不在代码区的折叠里，两段不会互相遮挡。

```tsx
export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <web-ui-collapse peek="200px">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          peek 200px · 默认比例 0.4
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 6 }, (_, index) => (
              <p key={index} className="m-0">
                段落 {index + 1}：末端那 80px（200px × 0.4）是渐隐加模糊的带子。
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse peek="200px" className="[--wui-collapse-peek-edge-ratio:0.7]">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          peek 200px · 比例 0.7，被上限夹住
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 6 }, (_, index) => (
              <p key={index} className="m-0">
                段落 {index + 1}：200px × 0.7 = 140px，实际按 112px 上限画。
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <web-ui-collapse peek="200px">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        peek 200px · 默认比例 0.4
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in derivedRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse peek="200px" class="[--wui-collapse-peek-edge-ratio:0.7]">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        peek 200px · 比例 0.7，被上限夹住
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in cappedRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
const derivedRows = Array.from(
  { length: 6 },
  (_, index) => `段落 ${index + 1}：末端那 80px（200px × 0.4）是渐隐加模糊的带子。`
)
const cappedRows = Array.from(
  { length: 6 },
  (_, index) => `段落 ${index + 1}：200px × 0.7 = 140px，实际按 112px 上限画。`
)
</script>
```

### CSS variables

`--wui-collapse-peek-edge` 显式指定渐变长度，优先于推导值；`--wui-collapse-peek-edge-blur` 是同一条带上背景模糊的半径；`--wui-collapse-peek-edge-color` 是裁剪边缘处的渐变起点色（默认页面底色），向内容方向淡到全透明。

`peek` 写成百分比时推导结果不是长度、无法被注册的 `<length>` 属性插值，会静默回落成无渐隐——那种写法想要带子就只能走 `--wui-collapse-peek-edge`。

两条都停在关闭稳态，第一条的模糊半径被拉到 10px，第二条把边缘色指向共享的 `--wui-color-border`，带子因此与默认的页面色区分得开。

```tsx
import type { CSSProperties } from 'react'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <web-ui-collapse
        peek="160px"
        style={
          {
            '--wui-collapse-peek-edge': '28px',
            '--wui-collapse-peek-edge-blur': '10px'
          } as CSSProperties
        }
      >
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          显式长度 28px · 模糊 10px
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 5 }, (_, index) => (
              <p key={index} className="m-0">
                段落 {index + 1}：带子长度不听 peek 的 0.4 推导，模糊半径也从 4px 提到 10px。
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse
        peek="160px"
        style={{ '--wui-collapse-peek-edge-color': 'var(--wui-color-border)' } as CSSProperties}
      >
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          边缘颜色取共享 border 色
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 5 }, (_, index) => (
              <p key={index} className="m-0">
                段落 {index + 1}：裁剪边缘的底色换成 border 色，带子从边缘向内淡出。
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <web-ui-collapse
      peek="160px"
      :style="{
        '--wui-collapse-peek-edge': '28px',
        '--wui-collapse-peek-edge-blur': '10px'
      }"
    >
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        显式长度 28px · 模糊 10px
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in blurRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse peek="160px" :style="{ '--wui-collapse-peek-edge-color': 'var(--wui-color-border)' }">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        边缘颜色取共享 border 色
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in edgeColorRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
const blurRows = Array.from(
  { length: 5 },
  (_, index) => `段落 ${index + 1}：带子长度不听 peek 的 0.4 推导，模糊半径也从 4px 提到 10px。`
)
const edgeColorRows = Array.from(
  { length: 5 },
  (_, index) => `段落 ${index + 1}：裁剪边缘的底色换成 border 色，带子从边缘向内淡出。`
)
</script>
```

### Horizontal

`horizontal` 把动画轴从高度换成宽度，内容沿宽度展开，trigger 与内容排在同一行——宿主自己只是 block 盒，要成行就在宿主上加 flex（这两条都写了 `flex items-center gap-2`）。

换了动画轴之后 `peek` 也变成宽度，第二条就是 `horizontal` 配 `peek="120px"`，渐隐带落在右边缘。

代价是动画期间内容随宽度变化 reflow。

```tsx
import { radixIconsPanelLeftMinimized } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col items-start gap-4">
      <web-ui-collapse horizontal className="flex items-center gap-2">
        <button
          type="button"
          className="flex-none cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2"
        >
          <web-ui-icon className="align-[-2px]" icon={radixIconsPanelLeftMinimized} size={14}></web-ui-icon>
          展开侧栏
        </button>
        <div slot="content">
          <div className="w-64 whitespace-nowrap p-3 text-sm">内容区沿宽度展开，trigger 留在同一行。</div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse horizontal peek="120px" className="flex items-center gap-2">
        <button
          type="button"
          className="flex-none cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2"
        >
          水平 peek
        </button>
        <div slot="content">
          <div className="w-64 whitespace-nowrap p-3 text-sm">关闭时沿宽度露出 120px，渐隐带在右边缘。</div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-4">
    <web-ui-collapse horizontal class="flex items-center gap-2">
      <button type="button" class="flex-none cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2">
        <web-ui-icon class="align-[-2px]" :icon="radixIconsPanelLeftMinimized" :size="14"></web-ui-icon>
        展开侧栏
      </button>
      <div slot="content">
        <div class="w-64 whitespace-nowrap p-3 text-sm">内容区沿宽度展开，trigger 留在同一行。</div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse horizontal peek="120px" class="flex items-center gap-2">
      <button type="button" class="flex-none cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2">
        水平 peek
      </button>
      <div slot="content">
        <div class="w-64 whitespace-nowrap p-3 text-sm">关闭时沿宽度露出 120px，渐隐带在右边缘。</div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
import { radixIconsPanelLeftMinimized } from '@greypan/web-ui/icons'
</script>
```

### Nested

内层 collapse 放在外层的 `content` slot 里。展开内层时外层跟着长：展开稳态的 track 停在 `1fr`，高度由内容决定，组件不需要测量内层。

两条折叠互不干扰——点击代理只认自己 trigger wrapper 的冒泡路径，点内层 trigger 不会顺带开合外层。

但 `open-change` 是 `bubbles` 且 `composed` 的，内层那次通知会经过外层宿主，所以外层绑 handler 时按 `event.target === event.currentTarget` 过滤，否则内层开合会被读成外层开合。

这条只有两层、内容都短，不会和示例卡片的代码区叠出两段长折叠。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [outer, setOuter] = useState(false)
  const [inner, setInner] = useState(false)

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-collapse
        open={outer}
        onopen-change={event => {
          // 内层的 open-change 会冒泡经过外层宿主：只认派发给自己这一条的。
          if (event.target === event.currentTarget) setOuter(event.detail.open)
        }}
      >
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          外层 collapse
        </button>
        <div slot="content">
          <div className="p-3">
            <p className="m-0 mb-2 text-sm">外层内容，里面再套一条。</p>
            <web-ui-collapse open={inner} onopen-change={event => setInner(event.detail.open)}>
              <button
                type="button"
                className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-raised) px-3 py-2 text-left"
              >
                内层 collapse
              </button>
              <div slot="content">
                <div className="p-3 text-sm">内层展开后外层随之变高，两层各自持有 open。</div>
              </div>
            </web-ui-collapse>
          </div>
        </div>
      </web-ui-collapse>

      <output className="text-sm text-(--wui-color-text-secondary)">
        外层 {String(outer)} · 内层 {String(inner)}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-collapse :open="outer" @open-change="onOuterChange">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        外层 collapse
      </button>
      <div slot="content">
        <div class="p-3">
          <p class="m-0 mb-2 text-sm">外层内容，里面再套一条。</p>
          <web-ui-collapse :open="inner" @open-change="inner = $event.detail.open">
            <button
              type="button"
              class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-raised) px-3 py-2 text-left"
            >
              内层 collapse
            </button>
            <div slot="content">
              <div class="p-3 text-sm">内层展开后外层随之变高，两层各自持有 open。</div>
            </div>
          </web-ui-collapse>
        </div>
      </div>
    </web-ui-collapse>

    <output class="text-sm text-(--wui-color-text-secondary)">外层 {{ outer }} · 内层 {{ inner }}</output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiCollapse, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const outer = ref(false)
const inner = ref(false)

function onOuterChange(event: WebUiEvent<WebUiCollapse, 'open-change'>) {
  // 内层的 open-change 会冒泡经过外层宿主：只认派发给自己这一条的。
  if (event.target === event.currentTarget) outer.value = event.detail.open
}
</script>
```

### Multiple instances

三条面板各自持有 `open`，页面用一个数组当状态源：每条的 `open` 写成「它在不在数组里」，回写走 `open-change` 的 `detail.open`。勾选「同时只留一条」后由页面保证互斥——collapse 没有组契约，互斥是消费方的状态管理，不是组件属性。

同页多实例各自持有 `open` 与各自的 ARIA 回写，互不干扰；展开关系只靠 `aria-expanded` 表达，不存在需要跨实例对齐的 IDREF。

```tsx
import { useState } from 'react'

const sections = [
  { title: '发货', body: '工作日 18:00 前下单当天发出。' },
  { title: '退换', body: '签收后 7 天内可申请退换。' },
  { title: '发票', body: '下单时勾选发票，电子票 3 个工作日内开出。' }
]

export default function Demo() {
  const [open, setOpen] = useState(['发货'])
  const [exclusive, setExclusive] = useState(true)

  function setAt(title: string, value: boolean) {
    setOpen(current => {
      if (!value) return current.filter(item => item !== title)
      return exclusive ? [title] : [...current, title]
    })
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-checkbox checked={exclusive} onChange={event => setExclusive(event.currentTarget.checked)}>
        同时只留一条
      </web-ui-checkbox>

      {sections.map(item => (
        <web-ui-collapse
          key={item.title}
          open={open.includes(item.title)}
          onopen-change={event => setAt(item.title, event.detail.open)}
        >
          <button
            type="button"
            className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
          >
            {item.title}
          </button>
          <div slot="content">
            <div className="p-3 text-sm">{item.body}</div>
          </div>
        </web-ui-collapse>
      ))}

      <output className="text-sm text-(--wui-color-text-secondary)">展开中：{open.join('、') || '一条都没有'}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-checkbox :checked="exclusive" @change="exclusive = $event.target.checked">同时只留一条</web-ui-checkbox>

    <web-ui-collapse
      v-for="item in sections"
      :key="item.title"
      :open="open.includes(item.title)"
      @open-change="setAt(item.title, $event.detail.open)"
    >
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        {{ item.title }}
      </button>
      <div slot="content">
        <div class="p-3 text-sm">{{ item.body }}</div>
      </div>
    </web-ui-collapse>

    <output class="text-sm text-(--wui-color-text-secondary)">展开中：{{ open.join('、') || '一条都没有' }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const sections = [
  { title: '发货', body: '工作日 18:00 前下单当天发出。' },
  { title: '退换', body: '签收后 7 天内可申请退换。' },
  { title: '发票', body: '下单时勾选发票，电子票 3 个工作日内开出。' }
]

const open = ref(['发货'])
const exclusive = ref(true)

function setAt(title: string, value: boolean) {
  if (!value) {
    open.value = open.value.filter(item => item !== title)
    return
  }
  open.value = exclusive.value ? [title] : [...open.value, title]
}
</script>
```

### Content height changes

展开稳态的 track 停在 `1fr`，高度由内容决定：内容自己在面板里变高变矮都不需要组件重新测量，加一行、删一行，面板跟着长缩。只有 `peek` 与展开之间那段「固定长度 ↔ 内容高度」的过渡才要读像素（见 peek 预览带）。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(true)
  const [rows, setRows] = useState(['第 1 行'])

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <web-ui-button
          variant="secondary"
          onClick={() => setRows(current => [...current, `第 ${current.length + 1} 行`])}
        >
          加一行
        </web-ui-button>
        <web-ui-button
          variant="secondary"
          disabled={rows.length === 1}
          onClick={() => setRows(current => current.slice(0, -1))}
        >
          删一行
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">行数：{rows.length}</output>
      </div>

      <web-ui-collapse open={open} onopen-change={event => setOpen(event.detail.open)}>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          展开着改内容
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {rows.map(row => (
              <p key={row} className="m-0">
                {row}
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button variant="secondary" @click="addRow">加一行</web-ui-button>
      <web-ui-button variant="secondary" :disabled="rows.length === 1" @click="removeRow">删一行</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">行数：{{ rows.length }}</output>
    </div>

    <web-ui-collapse :open="open" @open-change="open = $event.detail.open">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        展开着改内容
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in rows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(true)
const rows = ref(['第 1 行'])

function addRow() {
  rows.value = [...rows.value, `第 ${rows.value.length + 1} 行`]
}

function removeRow() {
  if (rows.value.length > 1) rows.value = rows.value.slice(0, -1)
}
</script>
```

## API

### Props

| 名称           | 说明                                                                                                          | 类型             | 默认值  |
| -------------- | ------------------------------------------------------------------------------------------------------------- | ---------------- | ------- |
| `open`         | 展开状态，唯一状态源。用户点 trigger 时组件自己把它改到位，再派发 `open-change`；静态写在模板里只决定初始值。 | `boolean`        | `false` |
| `disabled`     | 禁用触发：点击忽略，给 trigger 元素加上 `disabled`；已展开内容保持现状。                                      | `boolean`        | `false` |
| `horizontal`   | 水平方向：沿宽度展开，默认沿高度。                                                                            | `boolean`        | `false` |
| `keep-mounted` | 关闭稳态保持内容 `inert` 而非 `hidden`，保留滚动位置与可测量性。                                              | `boolean`        | `false` |
| `peek`         | 关闭稳态露出的尺寸（CSS 长度，如 `120px`、`6rem`）。设置后语义等同 `keep-mounted`。                           | `string \| null` | `null`  |

### Events

| 名称          | 说明                                                                                                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `open-change` | 用户手势开合后的通知：`detail.open` 是组件已经落到的状态，消费方回写 `open` 让页面状态与实际一致。`show()` / `close()` / `toggle()` 与直接写 `open` 都不派发。事件 `bubbles` 且 `composed`，会经过祖先宿主，绑在祖先上要按 `event.target` 过滤。 |

### Slots

| 名称      | 说明                                                                                                                                                                                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default` | trigger。整个 slot 都在点击代理里，点任何一处都算一次开合；`aria-expanded` 回写到其中第一个被指派的元素，`disabled` 时给该元素加上 `disabled`。`<web-ui-button>` 会把两者落到内部原生 button，所以放可交互元素。 |
| `content` | collapse content。关闭态按 `keep-mounted` / `peek` 决定是 `hidden` 还是 `inert`。                                                                                                                                |

### Methods

| 名称       | 说明                                                           |
| ---------- | -------------------------------------------------------------- |
| `show()`   | 展开：把 `open` 置为 `true`；程序式变更不派发 `open-change`。  |
| `close()`  | 收起：把 `open` 置为 `false`；程序式变更不派发 `open-change`。 |
| `toggle()` | 按当前 `open` 切换展开 / 收起。                                |

### 行为说明

初始即带 `open` attribute 时直接落展开稳态，不播进入动画；之后的变化才走过渡。动画沿块轴（默认高度，`horizontal` 时宽度）由 shadow 内 `0fr ↔ 1fr` 的 grid track 驱动，展开稳态的高度始终由内容决定，内容自己在展开态里变高变矮不需要组件重新测量。

时长取 `--wui-duration-collapse-enter` / `--wui-duration-collapse-exit`（200ms / 160ms，由 `<web-ui-theme>` 定义）；主题 `motion="reduced"` 或系统 `prefers-reduced-motion` 下两者归零，此时组件跳过测量直接落稳态。

`open-change` 是通知而不是请求：用户点 trigger 时组件先把 `open` 写到新值，再派发事件（`bubbles` 且 `composed`）；`show()` / `close()` / `toggle()` 与直接写 `open` 都静默，否则消费方的回写会和通知形成回环。

不回写不会被弹回，但页面的状态就和面板不一致了。

嵌套时点击互不干扰：点击代理只认自己 trigger wrapper 的冒泡路径，内层 trigger 的点击不会顺带开合外层；内层的 `open-change` 却会经过外层宿主，所以外层绑监听要按 `event.target === event.currentTarget` 过滤。

### trigger 语义

交互语义完全来自 default slot 放入的元素——原生 `<button>`、`<web-ui-button>` 或其他可交互元素原生提供 Enter / Space 激活与焦点。

collapse 把 `aria-expanded` 回写到 trigger slot 的首个 assigned element，`disabled` 时给该元素加上 `disabled`；`<web-ui-button>` 会把两者落到内部原生 button（`disabled` 走属性，天然穿透 shadow 边界）。

不回写 `aria-controls`：内容 track 位于 collapse shadow root 内，跨 shadow root 的 IDREF 无法解析，写出去在可访问性树里等同悬空引用。展开关系由 `aria-expanded` 表达。

trigger 请使用可交互元素：纯 `<span>` 可点击但没有键盘 / 焦点语义。

default slot 的全部内容都被包进 trigger wrapper，因而都在点击代理里：往 default slot 放说明文字，那段文字点下去同样算一次开合。组件只回写第一个被指派的元素，所以可交互元素要放在最前面。

### 关闭稳态语义

消费方的 light DOM 永不移动或卸载，关闭稳态由 shadow 内部三选一落地：默认在内容容器上设 `hidden`（`display: none`，脱离渲染与可访问性树）；`keep-mounted` 时 inner 标 `inert`，留在 `0fr` track 内可测量、滚动位置不丢；`peek` 时同样 `inert`，track 停在裁剪窗口。

三态的可见高度都是轨道给的量——`keep-mounted` 不会让关闭态占一层高度，它留在渲染树里的代价是保持挂载与可测量。

开合动画进行中也走 `inert`，落稳态时才按属性决定。

### peek 预览带

设置 `peek` 后关闭稳态不再收拢到 0，而是沿动画轴露出内容的头部 `peek` 长度（`horizontal` 时改为宽度）：track 保持在内容高度，裁剪长度落在内部容器上。

其语义等同 `keep-mounted`——内容保留挂载，但整个 inner 被 `inert` 阻断，露出的那一段也一样不可聚焦、不可点击，被裁掉的部分更不用提。

内容本身不足 `peek` 时按内容实际尺寸收起，不留空白。

由于固定长度与自适应高度无法由 CSS 插值，`peek` ↔ 展开这两个方向改为读出像素后以显式长度驱动（每次开合测量一次）；其余动画路径仍是零测量的 grid `fr` 过渡。

```html
<web-ui-collapse peek="120px">
  <button type="button">点击切换</button>
  <div slot="content">很长的内容——关闭时只露出前 120px</div>
</web-ui-collapse>
```

### 边缘渐隐

露出区域的裁剪边缘自带一段 alpha 渐变（`horizontal` 时改为右边），让被裁掉的部分柔和过渡到背景而不是硬切。渐变长度由 `peek` 推导，不需要也没有第二个属性可调——需要时用 CSS 变量微调：

渐变带由两层组成，直接复用公共 `.wui-glow`（与 layout header 的晕染同一份样式，见 `@greypan/web-ui/classes.css`）：上面那条 alpha 渐隐之外，同一条带上再叠一层真实的 `backdrop-filter` 模糊，被裁掉的内容因此是被**糊掉**的，而不只是被调成半透明。

组件内把两层提升到内容之上（默认 `.wui-glow` 位于内容之下）。模糊强度由本盒自己的 `mask-image` 调制——从带子起点为 0 升到后半段满强度、再在裁剪边缘前回到 0：起点不为 0 会在「突然开始模糊」处留一条接缝，末端不为 0 则会一路糊到裁剪边界。

展开态活动长度为 0，各色标塌缩到 100% 而末位色标是全透明，于是这一层什么都不画。

比例设为 `0` 即关闭渐隐。推导是纯 CSS 的 `calc(peek * ratio)`：`peek` 用 rem 时渐变长度自动跟随根字号缩放，JS 侧不需要做任何单位解析。

已知限制：`peek` 取百分比时推导结果不是长度、无法被注册属性插值，会静默回落为「无渐隐」，此时请用 `--wui-collapse-peek-edge` 显式指定长度。

内容那条 alpha 渐隐是四段「先陡后缓」而非线性：主体全黑延伸到渐变带起点后，前 30% 距离就降到 60% alpha，65% 处 26%，末端全透明。线性渐变的 alpha 在带子前 40% 几乎贴着 1.0，人眼感知到的虚化远短于声明长度——把下降前置后，带子从起点就明显发虚，同样长度的感知长度接近翻倍。

渐变带位置用百分比声明、相对容器的**当前渲染高度**（即 `max-height` 动画的那个高度），因此收起动画期间渐变带逐帧跟随裁剪边缘移动，`mask-image` 字符串本身无需插值。渐变带长度由注册的 `<length>` 自定义属性驱动，随开合动画平滑淡入淡出，而不是等收起动画落稳态才突然出现。

```html
<!-- 调强渐隐：比例 0.5 → 120px peek 配 60px 渐隐 -->
<web-ui-collapse peek="120px" style="--wui-collapse-peek-edge-ratio: 0.5">
  <button type="button">点击切换</button>
  <div slot="content">很长的内容——120px 露出区域的底部渐隐更强</div>
</web-ui-collapse>
```

### CSS Custom Properties

| 名称                             | 说明                                     | 默认值                        |
| -------------------------------- | ---------------------------------------- | ----------------------------- |
| `--wui-collapse-peek-edge-ratio` | 渐变长度占 `peek` 的比例                 | `0.4`                         |
| `--wui-collapse-peek-edge-max`   | 长度上限，避免大 `peek` 算出过长的虚化带 | `112px`                       |
| `--wui-collapse-peek-edge`       | 显式指定长度，优先于推导值               | —                             |
| `--wui-collapse-peek-edge-color` | 裁剪边缘处的渐变起点色                   | `var(--wui-color-page, #fff)` |
| `--wui-collapse-peek-edge-blur`  | 同一条渐变带上背景模糊的半径             | `4px`                         |

### 已知限制

`horizontal` 动画期间内容随宽度变化 reflow。

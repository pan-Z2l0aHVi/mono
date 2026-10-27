---
component: drawer
tag: web-ui-drawer
---

侧边 drawer，基于原生 `<dialog>`，自带滑入 / 滑出动画，并可从四周内缘拖拽关闭。适合承载与当前页面相关、但不需要离开上下文的次级任务。

## Samples

### Basic

`placement` 决定滑入方向，`heading` 在没有 `header` 插槽时作为标题回落。点击遮罩或按 Escape 关闭。

```tsx
import { useState } from 'react'

type Placement = 'right' | 'left' | 'top' | 'bottom'

const placements: { label: string; value: Placement }[] = [
  { label: '右侧', value: 'right' },
  { label: '左侧', value: 'left' },
  { label: '顶部', value: 'top' },
  { label: '底部', value: 'bottom' }
]

const labels: Record<Placement, string> = {
  right: '右侧',
  left: '左侧',
  top: '顶部',
  bottom: '底部'
}

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<Placement>('right')

  function openFrom(next: Placement) {
    setPlacement(next)
    setOpen(true)
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {placements.map(item => (
          <web-ui-button key={item.value} onClick={() => openFrom(item.value)}>
            {item.label}
          </web-ui-button>
        ))}
      </div>

      <web-ui-drawer
        open={open}
        placement={placement}
        heading="设置"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>从{labels[placement]}滑入。按 Escape 或点击遮罩关闭。</p>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap gap-3">
    <web-ui-button v-for="item in placements" :key="item.value" @click="openFrom(item.value)">
      {{ item.label }}
    </web-ui-button>
  </div>

  <web-ui-drawer :open="open" :placement="placement" heading="设置" @open-change="open = $event.detail.open">
    <p>从{{ labels[placement] }}滑入。按 Escape 或点击遮罩关闭。</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

type Placement = 'right' | 'left' | 'top' | 'bottom'

const placements: { label: string; value: Placement }[] = [
  { label: '右侧', value: 'right' },
  { label: '左侧', value: 'left' },
  { label: '顶部', value: 'top' },
  { label: '底部', value: 'bottom' }
]

const labels: Record<Placement, string> = {
  right: '右侧',
  left: '左侧',
  top: '顶部',
  bottom: '底部'
}

const open = ref(false)
const placement = ref<Placement>('right')

function openFrom(next: Placement) {
  placement.value = next
  open.value = true
}
</script>
```

### Imperative

不绑定 `open`，通过元素实例的 `show()` / `close()` 控制。适合由命令式流程触发的场景；程序式开合不派发 `open-change`。

```tsx
import type { WebUiDrawer } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const drawer = useRef<WebUiDrawer>(null)

  return (
    <>
      <web-ui-button onClick={() => drawer.current?.show()}>打开 drawer</web-ui-button>

      <web-ui-drawer ref={drawer} heading="命令式 drawer" closable>
        <p>由 show() 打开；右上角关闭按钮、Escape 与遮罩都会关闭它。</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => drawer.current?.close()}>
          调用 close()
        </web-ui-button>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="drawer?.show()">打开 drawer</web-ui-button>

  <web-ui-drawer ref="drawer" heading="命令式 drawer" closable>
    <p>由 show() 打开；右上角关闭按钮、Escape 与遮罩都会关闭它。</p>
    <web-ui-button slot="footer" variant="secondary" full @click="drawer?.close()">调用 close()</web-ui-button>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import type { WebUiDrawer } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const drawer = useTemplateRef<WebUiDrawer>('drawer')
</script>
```

### Custom size

左右方向的尺寸由 `--wui-drawer-width` 控制，上下方向由 `--wui-drawer-height` 控制。

```tsx
import type { CSSProperties } from 'react'
import { useState } from 'react'

type Placement = 'right' | 'left' | 'top' | 'bottom'

const sizes: { label: string; placement: Placement; size: string }[] = [
  { label: '右侧 400px', placement: 'right', size: '400px' },
  { label: '左侧 260px', placement: 'left', size: '260px' },
  { label: '顶部 400px', placement: 'top', size: '400px' },
  { label: '底部 160px', placement: 'bottom', size: '160px' }
]

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(sizes[0])

  const vertical = current.placement === 'top' || current.placement === 'bottom'

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {sizes.map(item => (
          <web-ui-button
            key={item.label}
            onClick={() => {
              setCurrent(item)
              setOpen(true)
            }}
          >
            {item.label}
          </web-ui-button>
        ))}
      </div>

      <web-ui-drawer
        open={open}
        placement={current.placement}
        heading={current.label}
        onopen-change={event => setOpen(event.detail.open)}
        style={
          {
            '--wui-drawer-width': vertical ? undefined : current.size,
            '--wui-drawer-height': vertical ? current.size : undefined
          } as CSSProperties
        }
      >
        <p>当前尺寸：{current.size}</p>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap gap-3">
    <web-ui-button v-for="item in sizes" :key="item.label" @click="openWith(item)">
      {{ item.label }}
    </web-ui-button>
  </div>

  <web-ui-drawer
    :open="open"
    :placement="current.placement"
    :heading="current.label"
    :style="{
      '--wui-drawer-width': vertical ? undefined : current.size,
      '--wui-drawer-height': vertical ? current.size : undefined
    }"
    @open-change="open = $event.detail.open"
  >
    <p>当前尺寸：{{ current.size }}</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type Placement = 'right' | 'left' | 'top' | 'bottom'

const sizes: { label: string; placement: Placement; size: string }[] = [
  { label: '右侧 400px', placement: 'right', size: '400px' },
  { label: '左侧 260px', placement: 'left', size: '260px' },
  { label: '顶部 400px', placement: 'top', size: '400px' },
  { label: '底部 160px', placement: 'bottom', size: '160px' }
]

const open = ref(false)
const current = ref(sizes[0])
const vertical = computed(() => current.value.placement === 'top' || current.value.placement === 'bottom')

function openWith(item: (typeof sizes)[number]) {
  current.value = item
  open.value = true
}
</script>
```

### Header

`header` 插槽完全替换内置标题区；既没有 `heading` 也没有 `header` 时，标题区整体不渲染。`closable` 的关闭按钮独立于 header 内容，固定在右上角。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [customHeader, setCustomHeader] = useState(false)
  const [noHeader, setNoHeader] = useState(false)

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <web-ui-button onClick={() => setCustomHeader(true)}>自定义 header</web-ui-button>
        <web-ui-button onClick={() => setNoHeader(true)}>不渲染 header</web-ui-button>
      </div>

      <web-ui-drawer open={customHeader} closable onopen-change={event => setCustomHeader(event.detail.open)}>
        <div slot="header" className="flex items-baseline gap-2 px-5 py-4">
          <strong className="text-lg">账户设置</strong>
          <span className="text-xs text-(--wui-color-text-secondary)">已保存</span>
        </div>
        <p>header 插槽的内容完全由消费方决定，关闭按钮仍由组件提供。</p>
      </web-ui-drawer>

      <web-ui-drawer open={noHeader} onopen-change={event => setNoHeader(event.detail.open)}>
        <p>没有 heading，也没有 header 插槽，标题区不会占位。</p>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap gap-3">
    <web-ui-button @click="customHeader = true">自定义 header</web-ui-button>
    <web-ui-button @click="noHeader = true">不渲染 header</web-ui-button>
  </div>

  <web-ui-drawer :open="customHeader" closable @open-change="customHeader = $event.detail.open">
    <div slot="header" class="flex items-baseline gap-2 px-5 py-4">
      <strong class="text-lg">账户设置</strong>
      <span class="text-xs text-(--wui-color-text-secondary)">已保存</span>
    </div>
    <p>header 插槽的内容完全由消费方决定，关闭按钮仍由组件提供。</p>
  </web-ui-drawer>

  <web-ui-drawer :open="noHeader" @open-change="noHeader = $event.detail.open">
    <p>没有 heading，也没有 header 插槽，标题区不会占位。</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const customHeader = ref(false)
const noHeader = ref(false)
</script>
```

### Close button

`closable` 显示内置关闭按钮。按钮固定在 header 右上角，不随正文滚动。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [closable, setClosable] = useState(true)

  return (
    <>
      <div className="flex items-center gap-3">
        <web-ui-button onClick={() => setOpen(true)}>打开 drawer</web-ui-button>
        <web-ui-checkbox checked={closable} onChange={event => setClosable(event.currentTarget.checked)}>
          显示关闭按钮
        </web-ui-checkbox>
      </div>

      <web-ui-drawer
        open={open}
        heading="关闭按钮"
        closable={closable}
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>关闭按钮由 closable 控制；关闭后可以重新勾选再打开对比。</p>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <div class="flex items-center gap-3">
    <web-ui-button @click="open = true">打开 drawer</web-ui-button>
    <web-ui-checkbox :checked="closable" @change="closable = $event.target.checked"> 显示关闭按钮 </web-ui-checkbox>
  </div>

  <web-ui-drawer :open="open" heading="关闭按钮" :closable="closable" @open-change="open = $event.detail.open">
    <p>关闭按钮由 closable 控制；关闭后可以重新勾选再打开对比。</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const closable = ref(true)
</script>
```

### Footer actions

`footer` 插槽固定在 drawer 底部，正文滚动时保持可见。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>编辑资料</web-ui-button>

      <web-ui-drawer open={open} heading="编辑资料" onopen-change={event => setOpen(event.detail.open)}>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 12 }, (_, index) => (
            <p key={index} className="m-0">
              第 {index + 1} 行内容，用来演示正文滚动。
            </p>
          ))}
        </div>

        <div slot="footer" className="flex gap-3">
          <web-ui-button variant="secondary" full onClick={() => setOpen(false)}>
            取消
          </web-ui-button>
          <web-ui-button full onClick={() => setOpen(false)}>
            保存
          </web-ui-button>
        </div>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="open = true">编辑资料</web-ui-button>

  <web-ui-drawer :open="open" heading="编辑资料" @open-change="open = $event.detail.open">
    <div class="flex flex-col gap-3">
      <p v-for="index in 12" :key="index" class="m-0">第 {{ index }} 行内容，用来演示正文滚动。</p>
    </div>

    <div slot="footer" class="flex gap-3">
      <web-ui-button variant="secondary" full @click="open = false">取消</web-ui-button>
      <web-ui-button full @click="open = false">保存</web-ui-button>
    </div>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### Scroll lock

drawer 默认在打开期间锁定页面滚动；`no-scroll-lock` 保留背景滚动。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>打开（不锁定滚动）</web-ui-button>

      <web-ui-drawer
        open={open}
        noScrollLock
        heading="背景仍可滚动"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>打开后试着滚动背景页面：no-scroll-lock 不会改写页面滚动。</p>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="open = true">打开（不锁定滚动）</web-ui-button>

  <web-ui-drawer :open="open" no-scroll-lock heading="背景仍可滚动" @open-change="open = $event.detail.open">
    <p>打开后试着滚动背景页面：no-scroll-lock 不会改写页面滚动。</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### Backdrop click

默认点击遮罩关闭；`no-backdrop-close` 后只能通过关闭按钮、footer 操作或 Escape 退出。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>打开（点遮罩不关闭）</web-ui-button>

      <web-ui-drawer
        open={open}
        noBackdropClose
        heading="点遮罩不关闭"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>点击遮罩不会关闭；用底部按钮或 Escape 退出。</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setOpen(false)}>
          关闭
        </web-ui-button>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="open = true">打开（点遮罩不关闭）</web-ui-button>

  <web-ui-drawer :open="open" no-backdrop-close heading="点遮罩不关闭" @open-change="open = $event.detail.open">
    <p>点击遮罩不会关闭；用底部按钮或 Escape 退出。</p>
    <web-ui-button slot="footer" variant="secondary" full @click="open = false">关闭</web-ui-button>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### Controlled closing

`controlled` 下，Escape、遮罩与关闭按钮只派发 `open-change(false)`；消费方回写 `open` 后才真正关闭。示例拒绝第一次关闭请求，必须点 footer 的确认按钮。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [rejected, setRejected] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>打开受控 drawer</web-ui-button>

      <web-ui-drawer
        open={open}
        controlled
        heading="受控关闭"
        onopen-change={event => {
          if (event.detail.open) {
            setRejected(false)
            setOpen(true)
            return
          }
          // 不回写 open：drawer 会弹回打开位，消费方因此可以拒绝这次关闭。
          setRejected(true)
        }}
      >
        <p>按 Escape、点遮罩或关闭按钮只会发出关闭请求。</p>
        {rejected ? <p className="text-(--wui-color-danger)">已拒绝关闭请求；请先确认。</p> : null}
        <web-ui-button
          slot="footer"
          variant="secondary"
          full
          onClick={() => {
            setRejected(false)
            setOpen(false)
          }}
        >
          确认关闭
        </web-ui-button>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="open = true">打开受控 drawer</web-ui-button>

  <web-ui-drawer :open="open" controlled heading="受控关闭" @open-change="onOpenChange">
    <p>按 Escape、点遮罩或关闭按钮只会发出关闭请求。</p>
    <p v-if="rejected" class="text-(--wui-color-danger)">已拒绝关闭请求；请先确认。</p>
    <web-ui-button slot="footer" variant="secondary" full @click="close">确认关闭</web-ui-button>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const rejected = ref(false)

function onOpenChange(event: CustomEvent<{ open: boolean }>) {
  if (event.detail.open) {
    rejected.value = false
    open.value = true
    return
  }
  // 不回写 open：drawer 会弹回打开位，消费方因此可以拒绝这次关闭。
  rejected.value = true
}

function close() {
  rejected.value = false
  open.value = false
}
</script>
```

### Headless

`headless` 只保留原生 dialog、遮罩、动画、滚动锁定与 Escape / 遮罩关闭，不渲染内置 header、关闭按钮或 footer。消费方负责默认插槽内容的完整样式，并必须提供 `dialog-label`。示例同时开启 `draggable`，headless 也支持拖拽关闭。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>打开 headless drawer</web-ui-button>

      <web-ui-drawer
        open={open}
        placement="left"
        headless
        draggable
        dialog-label="自定义面板"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <div className="box-border h-full w-[min(320px,100vw)] rounded-r-2xl bg-(--wui-color-surface-overlay) p-6 text-(--wui-color-text)">
          <h2 className="m-0 mb-2 text-xl">自定义面板</h2>
          <p className="m-0 text-(--wui-color-text-secondary)">
            headless 只提供 overlay 行为；内容、背景与圆角都由这里决定。
          </p>
        </div>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="open = true">打开 headless drawer</web-ui-button>

  <web-ui-drawer
    :open="open"
    placement="left"
    headless
    draggable
    dialog-label="自定义面板"
    @open-change="open = $event.detail.open"
  >
    <div
      class="box-border h-full w-[min(320px,100vw)] rounded-r-2xl bg-(--wui-color-surface-overlay) p-6 text-(--wui-color-text)"
    >
      <h2 class="m-0 mb-2 text-xl">自定义面板</h2>
      <p class="m-0 text-(--wui-color-text-secondary)">headless 只提供 overlay 行为；内容、背景与圆角都由这里决定。</p>
    </div>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### Drag to close

开启 `draggable` 后，drawer 内缘出现灰色胶囊 drag bar。向关闭方向拖过自身尺寸的一半，或快速甩动后松手即关闭；未达阈值则回弹。方向随 `placement` 适配。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [rightOpen, setRightOpen] = useState(false)
  const [bottomOpen, setBottomOpen] = useState(false)

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <web-ui-button onClick={() => setRightOpen(true)}>右侧拖拽关闭</web-ui-button>
        <web-ui-button onClick={() => setBottomOpen(true)}>底部拖拽关闭</web-ui-button>
      </div>

      <web-ui-drawer
        open={rightOpen}
        draggable
        heading="向右拖拽关闭"
        onopen-change={event => setRightOpen(event.detail.open)}
      >
        <p>按住左缘的灰色胶囊，向右拖过半或快速甩动即可关闭。</p>
      </web-ui-drawer>

      <web-ui-drawer
        open={bottomOpen}
        placement="bottom"
        draggable
        heading="向下拖拽关闭"
        onopen-change={event => setBottomOpen(event.detail.open)}
      >
        <p>按住上缘的灰色胶囊，向下拖过半或快速甩动即可关闭。</p>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap gap-3">
    <web-ui-button @click="rightOpen = true">右侧拖拽关闭</web-ui-button>
    <web-ui-button @click="bottomOpen = true">底部拖拽关闭</web-ui-button>
  </div>

  <web-ui-drawer :open="rightOpen" draggable heading="向右拖拽关闭" @open-change="rightOpen = $event.detail.open">
    <p>按住左缘的灰色胶囊，向右拖过半或快速甩动即可关闭。</p>
  </web-ui-drawer>

  <web-ui-drawer
    :open="bottomOpen"
    placement="bottom"
    draggable
    heading="向下拖拽关闭"
    @open-change="bottomOpen = $event.detail.open"
  >
    <p>按住上缘的灰色胶囊，向下拖过半或快速甩动即可关闭。</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const rightOpen = ref(false)
const bottomOpen = ref(false)
</script>
```

### Nested stacking

同组件声明式嵌套即自动堆叠：后打开的位于顶层全尺寸，下层按 `0.95^n` 缩放并向内偏移，露边宽度按 `A·ln(n)` 分配。层宽不同或乱序时，组件会按上方最大宽度补偿，保证每层左缘都可见；Escape 与遮罩点击只作用于最顶层。

```tsx
import type { CSSProperties } from 'react'
import { useState } from 'react'

const titles = ['概览', '详情', '设置', '确认']
const widths = ['300px', '280px', '240px', '320px']

export default function Demo() {
  const [levels, setLevels] = useState([false, false, false, false])

  function openLevel(index: number) {
    setLevels(current => current.map((value, i) => (i < index ? value : i === index)))
  }

  function closeLevel(index: number) {
    setLevels(current => current.map((value, i) => (i < index ? value : false)))
  }

  return (
    <>
      <web-ui-button onClick={() => openLevel(0)}>打开四层嵌套</web-ui-button>

      <web-ui-drawer
        open={levels[0]}
        heading={`${titles[0]} (300px)`}
        closable
        style={{ '--wui-drawer-width': widths[0] } as CSSProperties}
        onopen-change={event => {
          if (event.target === event.currentTarget && !event.detail.open) closeLevel(0)
        }}
      >
        <p>第 1 层。打开下一层后，这一层会缩放并向左让出边缘。</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => openLevel(1)}>
          打开第 2 层
        </web-ui-button>

        <web-ui-drawer
          open={levels[1]}
          heading={`${titles[1]} (280px)`}
          closable
          style={{ '--wui-drawer-width': widths[1] } as CSSProperties}
          onopen-change={event => {
            if (event.target === event.currentTarget && !event.detail.open) closeLevel(1)
          }}
        >
          <p>第 2 层。层宽与上层不同，堆叠位置会自动补偿。</p>
          <web-ui-button slot="footer" variant="secondary" full onClick={() => openLevel(2)}>
            打开第 3 层
          </web-ui-button>

          <web-ui-drawer
            open={levels[2]}
            heading={`${titles[2]} (240px)`}
            closable
            style={{ '--wui-drawer-width': widths[2] } as CSSProperties}
            onopen-change={event => {
              if (event.target === event.currentTarget && !event.detail.open) closeLevel(2)
            }}
          >
            <p>第 3 层。窄层上面再叠宽层时，左缘仍保持可见。</p>
            <web-ui-button slot="footer" variant="secondary" full onClick={() => openLevel(3)}>
              打开第 4 层
            </web-ui-button>

            <web-ui-drawer
              open={levels[3]}
              heading={`${titles[3]} (320px, 顶层)`}
              closable
              style={{ '--wui-drawer-width': widths[3] } as CSSProperties}
              onopen-change={event => {
                if (event.target === event.currentTarget && !event.detail.open) closeLevel(3)
              }}
            >
              <p>第 4 层，顶层。关闭后逐层恢复原尺寸。</p>
            </web-ui-drawer>
          </web-ui-drawer>
        </web-ui-drawer>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="openLevel(0)">打开四层嵌套</web-ui-button>

  <web-ui-drawer
    :open="levels[0]"
    :heading="`${titles[0]} (300px)`"
    closable
    :style="{ '--wui-drawer-width': widths[0] }"
    @open-change="event => event.target === event.currentTarget && !event.detail.open && closeLevel(0)"
  >
    <p>第 1 层。打开下一层后，这一层会缩放并向左让出边缘。</p>
    <web-ui-button slot="footer" variant="secondary" full @click="openLevel(1)">打开第 2 层</web-ui-button>

    <web-ui-drawer
      :open="levels[1]"
      :heading="`${titles[1]} (280px)`"
      closable
      :style="{ '--wui-drawer-width': widths[1] }"
      @open-change="event => event.target === event.currentTarget && !event.detail.open && closeLevel(1)"
    >
      <p>第 2 层。层宽与上层不同，堆叠位置会自动补偿。</p>
      <web-ui-button slot="footer" variant="secondary" full @click="openLevel(2)">打开第 3 层</web-ui-button>

      <web-ui-drawer
        :open="levels[2]"
        :heading="`${titles[2]} (240px)`"
        closable
        :style="{ '--wui-drawer-width': widths[2] }"
        @open-change="event => event.target === event.currentTarget && !event.detail.open && closeLevel(2)"
      >
        <p>第 3 层。窄层上面再叠宽层时，左缘仍保持可见。</p>
        <web-ui-button slot="footer" variant="secondary" full @click="openLevel(3)">打开第 4 层</web-ui-button>

        <web-ui-drawer
          :open="levels[3]"
          :heading="`${titles[3]} (320px, 顶层)`"
          closable
          :style="{ '--wui-drawer-width': widths[3] }"
          @open-change="event => event.target === event.currentTarget && !event.detail.open && closeLevel(3)"
        >
          <p>第 4 层，顶层。关闭后逐层恢复原尺寸。</p>
        </web-ui-drawer>
      </web-ui-drawer>
    </web-ui-drawer>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const titles = ['概览', '详情', '设置', '确认']
const widths = ['300px', '280px', '240px', '320px']

const levels = ref([false, false, false, false])

function openLevel(index: number) {
  levels.value = levels.value.map((value, i) => (i < index ? value : i === index))
}

function closeLevel(index: number) {
  levels.value = levels.value.map((value, i) => (i < index ? value : false))
}
</script>
```

### Sibling stacking

三个 drawer 作为同级节点挂载。先点页面按钮打开 drawer 1，再从当前 drawer 的 footer 打开下一层。层序由组件自动管理：先打开的缩放并偏移，后打开的在顶层；按任意顺序关闭，剩余层级会重新排列。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState([false, false, false])

  function setAt(index: number, value: boolean) {
    setOpen(current => current.map((item, i) => (i === index ? value : item)))
  }

  return (
    <>
      <web-ui-button onClick={() => setAt(0, true)}>打开 drawer 1</web-ui-button>

      {open.map((value, index) => (
        <web-ui-drawer
          key={index}
          open={value}
          heading={`同级 drawer ${index + 1}`}
          closable
          onopen-change={event => setAt(index, event.detail.open)}
        >
          <p>
            第 {index + 1} 个同级 drawer。
            {index < open.length - 1 ? '从 footer 打开下一层。' : '关闭后观察剩余层级重新排列。'}
          </p>
          {index < open.length - 1 && (
            <web-ui-button slot="footer" variant="secondary" full onClick={() => setAt(index + 1, true)}>
              打开 drawer {index + 2}
            </web-ui-button>
          )}
        </web-ui-drawer>
      ))}
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="open[0] = true">打开 drawer 1</web-ui-button>

  <web-ui-drawer
    v-for="(value, index) in open"
    :key="index"
    :open="value"
    :heading="`同级 drawer ${index + 1}`"
    closable
    @open-change="open[index] = $event.detail.open"
  >
    <p>
      第 {{ index + 1 }} 个同级 drawer。{{
        index < open.length - 1 ? '从 footer 打开下一层。' : '关闭后观察剩余层级重新排列。'
      }}
    </p>
    <web-ui-button
      v-if="index < open.length - 1"
      slot="footer"
      variant="secondary"
      full
      @click="open[index + 1] = true"
    >
      打开 drawer {{ index + 2 }}
    </web-ui-button>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref([false, false, false])
</script>
```

### CSS variables

背景、圆角与视口留边分别由 `--wui-drawer-bg`、`--wui-drawer-radius`、`--wui-drawer-inset` 控制；置 `--wui-drawer-inset: 0` 得到贴边几何。白底示例还将 `--wui-color-text` 设为深色、将 `--wui-color-surface-control` 设为浅色，保证深浅主题下的标题和关闭按钮都清晰可读。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>打开贴边白色 drawer</web-ui-button>

      <web-ui-drawer
        open={open}
        heading="贴边白色 drawer"
        closable
        className="[--wui-drawer-bg:#fff] [--wui-drawer-radius:0] [--wui-drawer-inset:0] [--wui-color-text:#262626] [--wui-color-surface-control:#e5e5e5]"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p className="text-neutral-800">背景、圆角与视口留边都由 CSS 变量控制。</p>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="open = true">打开贴边白色 drawer</web-ui-button>

  <web-ui-drawer
    :open="open"
    heading="贴边白色 drawer"
    closable
    class="[--wui-drawer-bg:#fff] [--wui-drawer-radius:0] [--wui-drawer-inset:0] [--wui-color-text:#262626] [--wui-color-surface-control:#e5e5e5]"
    @open-change="open = $event.detail.open"
  >
    <p class="text-neutral-800">背景、圆角与视口留边都由 CSS 变量控制。</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

## API

### Props

| 名称                | 说明                                                                    | 类型              | 默认值    |
| ------------------- | ----------------------------------------------------------------------- | ----------------- | --------- |
| `open`              | drawer 可见性。                                                         | `boolean`         | `false`   |
| `no-scroll-lock`    | 打开时不锁定页面滚动。                                                  | `boolean`         | `false`   |
| `no-backdrop-close` | 禁止点击 backdrop 关闭。                                                | `boolean`         | `false`   |
| `controlled`        | 用户关闭仅请求 `open=false`，由消费方回写。                             | `boolean`         | `false`   |
| `placement`         | 滑入方向：`right`（默认）、`left`、`top`、`bottom`。                    | `DrawerPlacement` | `'right'` |
| `heading`           | 标题文字，`header` 插槽为空时的回落。                                   | `string`          | `''`      |
| `closable`          | 显示内置关闭按钮。                                                      | `boolean`         | `false`   |
| `headless`          | 仅保留 overlay 行为，默认插槽不渲染内置 drawer UI。                     | `boolean`         | `false`   |
| `dialog-label`      | 内部原生 dialog 的可访问名称；`headless` 下必须提供。                   | `string`          | `''`      |
| `close-label`       | 内置关闭 button 的无障碍名称；默认跟随最近的 `lang`（中文为「关闭」）。 | `string`          | `''`      |
| `draggable`         | 在 drawer 内缘显示 drag bar，支持拖拽关闭手势。                         | `boolean`         | `false`   |

### Events

| 名称          | 说明                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| `open-change` | 用户请求开合；`detail.open` 为目标状态。受控模式下由消费方回写 `open`。 |

### Slots

| 名称      | 说明         |
| --------- | ------------ |
| `default` | 正文内容。   |
| `header`  | 顶部标题区。 |
| `footer`  | 底部操作区。 |

### Methods

| 名称      | 说明                            |
| --------- | ------------------------------- |
| `show()`  | 打开 drawer；已打开时为 no-op。 |
| `close()` | 关闭 drawer；已关闭时为 no-op。 |

### 行为说明

`headless` 保留原生 dialog、backdrop、placement 动画、Escape/backdrop 关闭行为和滚动锁定，但不渲染内置 glass 主体、header、关闭按钮或 footer；消费方负责完整定义默认插槽内容的样式，并且必须提供 `dialog-label`，确保原生 dialog 具有可访问名称。

关闭时保留原生 dialog 的 top layer，待退出过渡完成后调用 `dialog.close()`。Escape 始终走此关闭路径；`no-backdrop-close` 仅控制 backdrop 点击。

启用 `closable` 时，内置关闭按钮固定在 header 右上角（默认顶部 `16px`、右侧 `16px`），不会再拉伸到 drawer 中间。

顶部 `16px` 经 `--wui-space-4` 解析，因此与 drawer 的 header padding 同源；右侧 `16px` 是按钮自身到 panel 右边沿的偏移，它并不等于 header 的水平内边距（`20px`），因此保持字面量。

`--wui-drawer-nested-peek-base` 不需要消费方声明：默认值 `43.2px` 是组件用 `CSS.registerProperty` 注册该属性时的 `initialValue`（`components/drawer/index.ts`）。

窄视口的 `28.8px` 基准来自 `components/drawer/style.css` 的 `@media (width <= 640px)` 规则——这两处就是内置基准的所在地。

在宿主或任意祖先上设置该 token 可同时覆盖两者，在任何视口宽度下都生效。

按内置基准，四层 `320px` 等宽堆叠逐层露边在桌面端为 `29.94px` / `17.52px` / `12.43px`、窄视口为 `19.96px` / `11.68px` / `8.29px`，对应总堆叠宽度 `59.89px` 与 `39.93px`。

单层始终不动，因为 `ln(1)` 为 `0`。

### 拖拽关闭

启用 `draggable` 后，打开的 drawer 在内缘显示灰色胶囊 drag bar（默认 4×56px，视觉中线距内缘 10px；`right` 在左缘、`left` 在右缘、`top` 在下缘、`bottom` 在上缘）：

中线跟随 `--wui-drawer-content-padding` 的半值，并以「半个胶囊厚度 + 4px 呼吸间距」兜底：把该 padding 归零、让内容贴边铺满时，胶囊仍留可见内缩，既不会越出 panel 内缘，也不会贴死 panel 边缘。

胶囊是纯视觉件：`pointer-events: none`，本身不吃任何一次按下。真正被按下的是命中层。

左右 placement 只有 drag zone；上下 placement 有三层——拖拽 drag zone、沿可抓取边缘的一条端头 drag edge（宽度与胶囊等宽，厚度不小于 `--wui-drawer-drag-edge-size`），以及整块的 header（`placement=bottom`）或 footer（`placement=top`）。

drag edge 的高度取「胶囊外沿」与该 token 的较大者，按构造覆盖胶囊所在的带，所以在四个 placement 上，按住胶囊能开始拖拽、悬停胶囊会点亮它。

让开 header（`placement=bottom`）或 footer（`placement=top`）的是 drag zone 本身，因此那一节不会把胶囊推离 panel 边缘；而那一节改由**自己**接拖拽，不再整块按不动：在它里面任意一点起手都能开始拖拽，标题文字同样在内。

控件的让开是**逐个控件、在事件层**做的，不是把命中面几何切开。

按下路径上只要出现可点元素，这一次按下就交给控件、不起拖拽。可点元素包括：

- 原生 `button` / `input` / `select` / `textarea` / `label` / `a[href]` / `summary`
- 任何 `contenteditable`
- 交互语义 `role`（`button`、`checkbox`、`switch`、`tab`、`menuitem`、`option`、`slider` 等）
- 任何显式 `tabindex` 且不为 `-1`

自绘控件若本身不是原生可交互元素，需要带上其中之一才会被认出来；补 `role` 或 `tabindex` 就是入口，而它本身也是无障碍上该做的事。

几何切割是被有意否掉的：它必须测量每个控件的位置，控件一动就失效，而且只是把 A6 那条缺陷换了个位置。

代价是明说的：内置关闭按钮贴着 panel 右缘、在胶囊跨度之外，仍可点击；落在胶囊水平跨度内的控件，其顶部到 drag edge 高度之间仍被拖拽面盖住。

「drag bar 占位」自带一条推论：落在这条跨度内、顶边又落在 drag edge 高度（`--wui-drawer-drag-edge-size`，默认 20px；胶囊外沿更厚时以胶囊为准）之内的控件，上部会被拖拽面盖住——drag bar 就画在那里，起手必须从 drag bar 所在的位置开始。

抬 `z-index` 没用（Chromium 里 drag edge 始终压在 slotted 内容之上），量得着的杠杆是 `--wui-drawer-drag-bar-length`（同时决定胶囊长度与 drag edge 宽度）与 `--wui-drawer-drag-edge-size`（drag edge 厚度）。

- 拖拽实时跟手，backdrop 透明度按比例淡出。
- backdrop 点击关闭只认**轻点链路**：按下起点在 backdrop 上、且按-放位移在轻点量级内的 click 才关闭。浏览器对「按下 → 拖动 → 松手」生成的 click 落在起点与松手点的共同祖先（dialog）上——从 panel 内容或 backdrop 上开始拖拽、松手落在 backdrop 时，click 的 target 同样是 dialog；组件在 `pointerdown` 记录起点与坐标做回溯校验，这类拖拽松手一律弹回。`detail` 为 0 的 click（键盘/程序化来源）不消费指针记录。
- 松手时自抓取瞬间起的**净位移**超过 drawer 尺寸的一半（下限 10px）或快速甩动即关闭，否则弹回打开位；方向随 placement 适配。判定的每一环都与 Base UI `useSwipeDismiss` 对齐：
  - 位移零点与判定时钟都在**首个 `pointermove`** 处重置，用来吸收「按下 → 首个 move」之间的空隙；该次 move 的整程位移被整体丢弃，因此一次手势至少要两个 move 才可能累积出位移。
  - 甩动看的是**整段手势**的平均速度（净位移 ÷ 手势时长，分母下限 50ms）**达到** 500px/s，不是释放瞬间的瞬时速度。滑窗只描述最后一小段轨迹；在整段平均速度下，「先往边缘拖出、再快速扫回」不再能凑成甩动。时长为 0 时速度取 0 而不是按 50ms 兜底，因此测不到时长的手势永远不会被读成甩动。
  - 净位移没有朝闭合方向的松手一律弹回打开位。
  - 距离判据同样用净位移：从弹回途中抓取后不再拖动就松手，不会被当成「已经拖过一半」。
  - 自「方向确认点」起反向回撤满 10px 即取消本次甩动，因此拖出后回扫不会关闭。位移重新越过距离阈值会清除该标记，所以「已经拖过一半」不受小幅回撤影响。上游有同一个守卫（`cancelledSwipe`），但在 drawer 这条路径上永远走不到——`DrawerViewport.onRelease` 必然返回一个决定。
  - 朝打开方向的拖拽按平方根压缩（`sign(d) · |d| ** 0.5`），对齐 `applyDirectionalDamping`。阻尼作用于本次手势的**增量**、叠加在抓取瞬间的位移之上，因此自限幅而不需要固定的位移上限。
- 释放速度只决定收尾过渡的时长（180–420ms）；收尾本身是一次交还 CSS 的 `transform` 过渡，不再创建 WAAPI 动画。
- 启用 `controlled` 后，超过阈值松手仅派发 `open-change(false)`；drawer 在闭合位短暂等待（120ms 回写窗口），消费方拒绝或超时未回写时弹回打开位。
- 不支持拖拽打开——关闭态的 drawer 在原生 dialog 之外没有任何渲染物。
- `prefers-reduced-motion` 下松手即时到位，不播放收尾过渡。

### CSS Custom Properties

| 名称                              | 说明                                                                                                                                                                      | 默认值                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `--wui-drawer-width`              | drawer 宽度                                                                                                                                                               | `320px`                            |
| `--wui-drawer-height`             | drawer 高度（上/下）                                                                                                                                                      | `300px`                            |
| `--wui-drawer-bg`                 | drawer 背景色                                                                                                                                                             | `var(--wui-color-surface-overlay)` |
| `--wui-drawer-radius`             | 浮动卡片圆角（非 headless）                                                                                                                                               | `var(--wui-radius-overlay, 28px)`  |
| `--wui-drawer-inset`              | 浮动卡片视口留边（非 headless）；置 `0` 为贴边几何                                                                                                                        | `8px`                              |
| `--wui-drawer-nested-peek-base`   | 嵌套堆叠露边基准 `A`（`width <= 640px` 时为 `28.8px`）；堆叠总宽按 `A · ln(n)` 增长，单层因此完全不动，每多一层新增的露边递减。置 `0` 关闭露边。详见下方说明              | `43.2px`                           |
| `--wui-drawer-overlay-bg`         | backdrop 背景色                                                                                                                                                           | `rgb(0 0 0 / 0.12)`                |
| `--wui-drawer-drag-zone-size`     | Drag-to-close 命中 drag zone 厚度（draggable）                                                                                                                            | `20px`                             |
| `--wui-drawer-drag-zone-inset`    | 拖拽 drag zone 与它避让的那一节（`placement=bottom` 的 header / `placement=top` 的 footer）之间的呼吸间距；该节不存在时为 0                                               | `var(--wui-space-1, 4px)`          |
| `--wui-drawer-drag-bar-thickness` | Drag bar 胶囊厚度（短轴）                                                                                                                                                 | `4px`                              |
| `--wui-drawer-drag-bar-length`    | Drag bar 胶囊长度（沿 drawer 边缘）                                                                                                                                       | `56px`                             |
| `--wui-drawer-drag-edge-size`     | 胶囊命中带沿可抓取边缘的厚度（仅上下 placement）。以胶囊外沿兜底，胶囊所在的带恒被覆盖；默认值与 `--wui-drawer-drag-zone-size` 同值，于是 drag bar 不会比旁边的带子更难按 | `20px`                             |
| `--wui-drawer-header-padding`     | Header 区域 padding                                                                                                                                                       | `16px 20px`                        |
| `--wui-drawer-close-top`          | 内置关闭按钮相对 header 顶部的偏移                                                                                                                                        | `16px`                             |
| `--wui-drawer-close-right`        | 内置关闭按钮相对 drawer 右缘的偏移                                                                                                                                        | `16px`                             |
| `--wui-drawer-content-padding`    | 内容区 padding；同时驱动 drag bar 视觉中线（取半值，不低于半个胶囊厚度 + 4px）                                                                                            | `20px`                             |
| `--wui-drawer-footer-padding`     | Footer 区域 padding                                                                                                                                                       | `16px 20px`                        |

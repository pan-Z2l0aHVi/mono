# Drawer

侧边抽屉，基于原生 `<dialog>`，打开和关闭都有滑动动画，也可以从四周内缘拖拽关闭。用于展示与当前页面相关、又不需要离开当前页面的次级内容。

## Samples

### Basic

`placement` 决定滑入方向，`heading` 在没有 `header` 插槽时作为标题显示。点击遮罩或按 Escape 关闭。

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

`header` 插槽完全替换内置标题区；既没有 `heading` 也没有 `header` 时，标题区整体不渲染。`closable` 的关闭按钮独立于头部内容，固定在右上角。

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
        <p>header 插槽的内容完全由调用方决定，关闭按钮仍由组件提供。</p>
      </web-ui-drawer>

      <web-ui-drawer open={noHeader} onopen-change={event => setNoHeader(event.detail.open)}>
        <p>没有 heading，也没有标题栏插槽，标题区不会占位。</p>
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
    <p>header 插槽的内容完全由调用方决定，关闭按钮仍由组件提供。</p>
  </web-ui-drawer>

  <web-ui-drawer :open="noHeader" @open-change="noHeader = $event.detail.open">
    <p>没有 heading，也没有标题栏插槽，标题区不会占位。</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const customHeader = ref(false)
const noHeader = ref(false)
</script>
```

### Close button

`closable` 显示内置关闭按钮。按钮固定在头部右上角，不随正文滚动。

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

`footer` 插槽固定在抽屉底部，正文滚动时保持可见。

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

抽屉默认在打开期间锁定页面滚动；`no-scroll-lock` 保留背景滚动。

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

### Page shift

`page-shift` 在抽屉打开时把背景页面朝抽屉的进场方向移动一段距离。右侧抽屉从右侧滑入，页面整体左移，右侧空出抽屉的位置；左侧抽屉让页面右移；上下方向分别让出顶部或底部。偏移距离按视口尺寸计算，没有 CSS 变量可以调整。

多层同时打开时，偏移量按打开顺序决定。先打开的最多，之后每层递减，嵌套层和同级层规则相同。关闭任意一层后，其余层重新计算，页面回到新的总距离。页面只在 `open` 变化时移动，拖拽面板时保持不动。视口尺寸变化时偏移距离自动更新，不需要重新打开抽屉。

`prefers-reduced-motion`（或所在 `web-ui-theme` 的 `motion="reduced"`）下整套不生效。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>打开（页面偏移）</web-ui-button>

      <web-ui-drawer
        open={open}
        pageShift
        heading="页面随 drawer 偏移"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>打开时背景整页偏移一段距离，关闭后回到原位；拖拽这块面板时页面停在原地。</p>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="open = true">打开（页面偏移）</web-ui-button>

  <web-ui-drawer :open="open" page-shift heading="页面随 drawer 偏移" @open-change="open = $event.detail.open">
    <p>打开时背景整页偏移一段距离，关闭后回到原位；拖拽这块面板时页面停在原地。</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### Nested page shift

四层嵌套都开启 `page-shift` 时，每打开一层，页面就在当前偏移的基础上继续移动；关闭中间某一层，它后面的层重新计算，页面回到新的总距离。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [openLayers, setOpenLayers] = useState([false, false, false, false])
  const setLayer = (index: number, open: boolean) =>
    setOpenLayers(previous => previous.map((value, i) => (i === index ? open : value)))

  return (
    <>
      <web-ui-button onClick={() => setLayer(0, true)}>打开第 1 层</web-ui-button>

      <web-ui-drawer
        open={openLayers[0]}
        pageShift
        heading="第 1 层"
        onopen-change={event => {
          if (event.target === event.currentTarget) setLayer(0, event.detail.open)
        }}
      >
        <p>第 1 层偏移最多，后面每层递减。</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setLayer(1, true)}>
          打开第 2 层
        </web-ui-button>

        <web-ui-drawer
          open={openLayers[1]}
          pageShift
          heading="第 2 层"
          onopen-change={event => {
            if (event.target === event.currentTarget) setLayer(1, event.detail.open)
          }}
        >
          <p>每层各贡献一段偏移量，关闭中间层后它后面的层重新排名。</p>
          <web-ui-button slot="footer" variant="secondary" full onClick={() => setLayer(2, true)}>
            打开第 3 层
          </web-ui-button>

          <web-ui-drawer
            open={openLayers[2]}
            pageShift
            heading="第 3 层"
            onopen-change={event => {
              if (event.target === event.currentTarget) setLayer(2, event.detail.open)
            }}
          >
            <p>第 3 层偏移的距离更小；层数再多，页面外移也会很快趋于稳定。</p>
            <web-ui-button slot="footer" variant="secondary" full onClick={() => setLayer(3, true)}>
              打开第 4 层
            </web-ui-button>

            <web-ui-drawer
              open={openLayers[3]}
              pageShift
              heading="第 4 层"
              onopen-change={event => {
                if (event.target === event.currentTarget) setLayer(3, event.detail.open)
              }}
            >
              <p>第 4 层偏移的距离最小。</p>
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
  <web-ui-button @click="setLayer(0, true)">打开第 1 层</web-ui-button>

  <web-ui-drawer
    :open="openLayers[0]"
    page-shift
    heading="第 1 层"
    @open-change="event => event.target === event.currentTarget && setLayer(0, event.detail.open)"
  >
    <p>第 1 层偏移最多，后面每层递减。</p>
    <web-ui-button slot="footer" variant="secondary" full @click="setLayer(1, true)">打开第 2 层</web-ui-button>

    <web-ui-drawer
      :open="openLayers[1]"
      page-shift
      heading="第 2 层"
      @open-change="event => event.target === event.currentTarget && setLayer(1, event.detail.open)"
    >
      <p>每层各贡献一段偏移量，关闭中间层后它后面的层重新排名。</p>
      <web-ui-button slot="footer" variant="secondary" full @click="setLayer(2, true)">打开第 3 层</web-ui-button>

      <web-ui-drawer
        :open="openLayers[2]"
        page-shift
        heading="第 3 层"
        @open-change="event => event.target === event.currentTarget && setLayer(2, event.detail.open)"
      >
        <p>第 3 层偏移的距离更小；层数再多，页面外移也会很快趋于稳定。</p>
        <web-ui-button slot="footer" variant="secondary" full @click="setLayer(3, true)">打开第 4 层</web-ui-button>

        <web-ui-drawer
          :open="openLayers[3]"
          page-shift
          heading="第 4 层"
          @open-change="event => event.target === event.currentTarget && setLayer(3, event.detail.open)"
        >
          <p>第 4 层偏移的距离最小。</p>
        </web-ui-drawer>
      </web-ui-drawer>
    </web-ui-drawer>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const openLayers = ref([false, false, false, false])
const setLayer = (index: number, open: boolean) => {
  openLayers.value[index] = open
}
</script>
```

### Sibling page shift

两个抽屉在 DOM 中是兄弟节点，没有嵌套关系，但组件仍按打开顺序管理层级：后打开的叠在前一个之上，前一个缩小并后退，看起来仍是一层套一层。`page-shift` 使用同一份打开顺序：先打开的最多，后打开的较少；关闭后页面回到前一层的偏移。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [first, setFirst] = useState(false)
  const [second, setSecond] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setFirst(true)}>打开第 1 层</web-ui-button>

      <web-ui-drawer open={first} pageShift heading="第 1 层" onopen-change={event => setFirst(event.detail.open)}>
        <p>同级 drawer 也按打开先后自动嵌套：先打开的偏移最多，后打开的偏移更少。</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setSecond(true)}>
          打开同级第 2 层
        </web-ui-button>
      </web-ui-drawer>

      <web-ui-drawer open={second} pageShift heading="第 2 层" onopen-change={event => setSecond(event.detail.open)}>
        <p>这一层与上一层是兄弟节点，视觉上仍退后一层、页面继续偏移；关闭它，页面回落到前一层的位置。</p>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="first = true">打开第 1 层</web-ui-button>

  <web-ui-drawer :open="first" page-shift heading="第 1 层" @open-change="first = $event.detail.open">
    <p>同级 drawer 也按打开先后自动嵌套：先打开的偏移最多，后打开的偏移更少。</p>
    <web-ui-button slot="footer" variant="secondary" full @click="second = true">打开同级第 2 层</web-ui-button>
  </web-ui-drawer>

  <web-ui-drawer :open="second" page-shift heading="第 2 层" @open-change="second = $event.detail.open">
    <p>这一层与上一层是兄弟节点，视觉上仍退后一层、页面继续偏移；关闭它，页面回落到前一层的位置。</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const first = ref(false)
const second = ref(false)
</script>
```

### Backdrop click

默认点击遮罩关闭；`no-backdrop-close` 后只能通过关闭按钮、页脚操作或 Escape 退出。

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

`controlled` 下，Escape、遮罩与关闭按钮只派发 `open-change(false)`。调用方回写 `open` 后才真正关闭。

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
          // 不回写 open：drawer 会弹回打开位，调用方因此可以拒绝这次关闭。
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
  // 不回写 open：drawer 会弹回打开位，调用方因此可以拒绝这次关闭。
  rejected.value = true
}

function close() {
  rejected.value = false
  open.value = false
}
</script>
```

### Headless

`headless` 只保留原生 dialog、遮罩、动画、滚动锁定与 Escape / 遮罩关闭，不渲染内置头部、关闭按钮或页脚。调用方负责默认插槽内容的完整样式，并必须提供 `aria-dialog-label`；`headless` 同样支持 `draggable` 拖拽关闭。

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
        aria-dialog-label="自定义面板"
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
    aria-dialog-label="自定义面板"
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

开启 `draggable` 后，抽屉内缘显示灰色胶囊拖拽条。朝关闭方向拖动超过自身尺寸的一半，或快速拖动后松开，抽屉就会关闭；没到阈值则回到打开位置。拖动方向随 `placement` 改变。

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

声明式嵌套的抽屉会自动堆叠：后打开的位于顶层并保持全尺寸，下层缩小并向内偏移，每层左侧露出可见的边缘。层宽不同或打开顺序变化时也会自动调整。Escape 和遮罩点击只作用于最顶层。

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

三个抽屉作为同级节点挂载。先从页面按钮打开抽屉 1，再从它的页脚打开下一层。组件自动管理层级：先打开的缩小并偏移，后打开的位于顶层；按任意顺序关闭后，其余层重新排列。

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
            {index < open.length - 1 ? '从页脚打开下一层。' : '关闭后观察剩余层级重新排列。'}
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
        index < open.length - 1 ? '从页脚打开下一层。' : '关闭后观察剩余层级重新排列。'
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

背景、圆角与视口留边分别由 `--wui-drawer-bg`、`--wui-drawer-radius`、`--wui-drawer-inset` 控制；把 `--wui-drawer-inset` 设为 `0` 可以让抽屉贴住视口边缘。把背景改成白色时，一并覆盖 `--wui-color-text` 与 `--wui-color-surface-control`，标题和关闭按钮在深浅主题下才清晰可读。

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

| 名称                | 说明                                                                                                                                     | 类型              | 默认值    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | --------- |
| `open`              | 抽屉可见性。                                                                                                                             | `boolean`         | `false`   |
| `no-scroll-lock`    | 打开时不锁定页面滚动。                                                                                                                   | `boolean`         | `false`   |
| `no-backdrop-close` | 禁止点击遮罩关闭。                                                                                                                       | `boolean`         | `false`   |
| `controlled`        | 用户关闭仅请求 `open=false`，由调用方回写。                                                                                              | `boolean`         | `false`   |
| `placement`         | 滑入方向：`right`（默认）、`left`、`top`、`bottom`。                                                                                     | `DrawerPlacement` | `'right'` |
| `heading`           | 标题文字，`header` 插槽为空时作为标题显示。                                                                                              | `string`          | `''`      |
| `closable`          | 显示内置关闭按钮。                                                                                                                       | `boolean`         | `false`   |
| `headless`          | 仅保留 overlay 行为，默认插槽不渲染内置抽屉界面。                                                                                        | `boolean`         | `false`   |
| `aria-dialog-label` | 原生 dialog 的可访问名称；`headless` 下必须提供。`dialog-label` 也可用。                                                                 | `string`          | `''`      |
| `aria-close-label`  | 内置关闭按钮的无障碍名称；未设置时回退内置英文文案（`Close`）。                                                                          | `string`          | `''`      |
| `draggable`         | 在抽屉内缘显示拖拽条，支持拖拽关闭手势。                                                                                                 | `boolean`         | `false`   |
| `page-shift`        | 打开时背景页面朝抽屉的进场方向移动。按打开顺序决定层级和偏移，嵌套层与同级层规则相同；关闭任意层后其余层重新计算。减少动效模式下不生效。 | `boolean`         | `false`   |

### Events

| 名称          | 说明                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| `open-change` | 用户请求开合；`detail.open` 为目标状态。受控模式下由调用方回写 `open`。 |

### Slots

| 名称      | 说明         |
| --------- | ------------ |
| `default` | 正文内容。   |
| `header`  | 顶部标题区。 |
| `footer`  | 底部操作区。 |

### Methods

| 名称      | 说明                           |
| --------- | ------------------------------ |
| `show()`  | 打开抽屉；已打开时不产生效果。 |
| `close()` | 关闭抽屉；已关闭时不产生效果。 |

### 行为说明

`headless` 保留原生 dialog、遮罩、placement 动画、Escape/遮罩关闭行为和滚动锁定，但不渲染内置 glass 主体、头部、关闭按钮或页脚。调用方负责完整定义默认插槽内容的样式，并且必须提供 `aria-dialog-label`，确保原生 dialog 有可访问名称。

关闭时等待退场过渡播放完。Escape 始终可以关闭；`no-backdrop-close` 仅控制遮罩点击。

启用 `closable` 时，内置关闭按钮固定在头部右上角，默认距顶部和右侧各 `16px`，不会随内容拉伸。

顶部偏移使用 `--wui-space-4`，默认 `16px`，与头部的内边距一致；右侧偏移固定 `16px`，表示按钮到面板右边缘的距离，和头部的水平内边距（`20px`）不同。

`--wui-drawer-nested-peek-base` 是嵌套堆叠时每层露出的基准距离：桌面端默认 `43.2px`，窄视口默认 `28.8px`。在宿主或任意祖先上覆盖它即可同时改变两者，在任何视口宽度下都生效。

`page-shift` 会移动整个页面。页面里 `position: fixed` 的内容一起移动；已经打开的其他 dialog 或抽屉不受影响。

为页面设置与内容一致的背景色，避免偏移后露出的区域颜色不一致。使用 `web-ui-theme` 时，可在全局样式中设置：

```css
html {
  background: var(--wui-color-page, #fff);
}
```

多层同时打开时按打开顺序叠加，嵌套层和同级层规则相同；关闭任意一层后，其余层重新计算。

页面偏移不会覆盖调用方写在页面上的 `transform`，也可以和 `shake()` 同时使用。

### 拖拽关闭

启用 `draggable` 后，打开的抽屉在内缘显示灰色胶囊拖拽条；按住拖拽条或直接拖动面板都可以，松开时位移超过阈值或快速拖动就会关闭，否则回到打开位置。拖拽不会移动页面，`page-shift` 开启时页面保持不动。

左右 placement 只有拖拽区；上下 placement 还可以从端头拖拽边缘或整个头部 / 页脚开始拖动。按下位置只要遇到可交互控件，这次按下就交给控件，不启动拖拽；自绘控件需要带 `role` 或 `tabindex` 才会被识别。与拖拽条区域重叠的控件，上半部分会被拖拽区域覆盖，可以调整 `--wui-drawer-drag-bar-length` 和 `--wui-drawer-drag-edge-size`。

点击遮罩关闭只响应轻点：从面板或遮罩按下、在别处松开的手势不会关闭。

`controlled` 模式下，超过阈值后松开只派发 `open-change(false)`；抽屉会在闭合位置等待 120ms，调用方拒绝回写或超时后回到打开位置。

不支持拖拽打开，关闭状态的抽屉没有可拖拽的内容。`prefers-reduced-motion` 下松开后立即到位，不播放收尾动画。

### CSS Custom Properties

| 名称                              | 说明                                                                                                                                                                | 默认值                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `--wui-drawer-width`              | 抽屉宽度                                                                                                                                                            | `320px`                                        |
| `--wui-drawer-height`             | 抽屉高度（上/下）                                                                                                                                                   | `300px`                                        |
| `--wui-drawer-bg`                 | 抽屉背景色                                                                                                                                                          | `var(--wui-color-surface-overlay)`             |
| `--wui-drawer-radius`             | 浮动卡片圆角（非 headless）                                                                                                                                         | `var(--wui-radius-overlay, 28px)`              |
| `--wui-drawer-inset`              | 浮动卡片视口留边（非 headless）；置 `0` 为贴边几何                                                                                                                  | `8px`                                          |
| `--wui-drawer-nested-peek-base`   | 嵌套堆叠露边基准 `A`（`width <= 640px` 时为 `28.8px`）；堆叠总宽按 `A · ln(n)` 增长，单层因此完全不动，每多一层新增的露边递减。置 `0` 关闭露边。详见下方说明        | `43.2px`                                       |
| `--wui-drawer-overlay-bg`         | 遮罩背景色，取 `--wui-color-backdrop`                                                                                                                               | 浅 `rgb(0 0 0 / 0.12)`，深 `rgb(0 0 0 / 0.48)` |
| `--wui-drawer-drag-zone-size`     | 拖拽关闭（`draggable`）时命中区的厚度                                                                                                                               | `20px`                                         |
| `--wui-drawer-drag-zone-inset`    | 拖拽区与它避让的那一节（`placement=bottom` 的头部 / `placement=top` 的页脚）之间的呼吸间距；该节不存在时为 0                                                        | `var(--wui-space-1, 4px)`                      |
| `--wui-drawer-drag-bar-thickness` | 拖拽条胶囊厚度（短轴）                                                                                                                                              | `4px`                                          |
| `--wui-drawer-drag-bar-length`    | 拖拽条胶囊长度（沿抽屉边缘）                                                                                                                                        | `56px`                                         |
| `--wui-drawer-drag-edge-size`     | 可抓取边缘的厚度（仅上下 placement）。命中范围包含胶囊外沿，拖拽区域始终覆盖胶囊；默认值与 `--wui-drawer-drag-zone-size` 相同，因此拖拽条不会比旁边的拖拽区域更难按 | `20px`                                         |
| `--wui-drawer-header-padding`     | 头部区域内边距                                                                                                                                                      | `16px 20px`                                    |
| `--wui-drawer-close-top`          | 内置关闭按钮相对头部顶部的偏移                                                                                                                                      | `16px`                                         |
| `--wui-drawer-close-right`        | 内置关闭按钮相对抽屉右缘的偏移                                                                                                                                      | `16px`                                         |
| `--wui-drawer-content-padding`    | 内容区内边距；同时驱动拖拽条视觉中线（取半值，不低于半个胶囊厚度 + 4px）                                                                                            | `20px`                                         |
| `--wui-drawer-footer-padding`     | 页脚区域内边距                                                                                                                                                      | `16px 20px`                                    |

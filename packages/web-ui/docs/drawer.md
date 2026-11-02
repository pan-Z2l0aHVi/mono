# Drawer

A side drawer built on the native `<dialog>`, with built-in slide-in / slide-out animations and drag-to-close from the inner edge on any side. It suits secondary tasks that relate to the current page but do not require leaving context.

## Samples

### Basic

`placement` decides the slide-in direction, and `heading` serves as the title fallback when there is no `header` slot. Click the backdrop or press Escape to close.

```tsx
import { useState } from 'react'

type Placement = 'right' | 'left' | 'top' | 'bottom'

const placements: { label: string; value: Placement }[] = [
  { label: 'Right', value: 'right' },
  { label: 'Left', value: 'left' },
  { label: 'Top', value: 'top' },
  { label: 'Bottom', value: 'bottom' }
]

const labels: Record<Placement, string> = {
  right: 'right',
  left: 'left',
  top: 'top',
  bottom: 'bottom'
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
        heading="Settings"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>Slides in from the {labels[placement]}. Press Escape or click the backdrop to close.</p>
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

  <web-ui-drawer :open="open" :placement="placement" heading="Settings" @open-change="open = $event.detail.open">
    <p>Slides in from the {{ labels[placement] }}. Press Escape or click the backdrop to close.</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

type Placement = 'right' | 'left' | 'top' | 'bottom'

const placements: { label: string; value: Placement }[] = [
  { label: 'Right', value: 'right' },
  { label: 'Left', value: 'left' },
  { label: 'Top', value: 'top' },
  { label: 'Bottom', value: 'bottom' }
]

const labels: Record<Placement, string> = {
  right: 'right',
  left: 'left',
  top: 'top',
  bottom: 'bottom'
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

Without binding `open`, control it through the element instance's `show()` / `close()`. This suits scenes triggered by imperative flows; programmatic opening and closing dispatches no `open-change`.

```tsx
import type { WebUiDrawer } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const drawer = useRef<WebUiDrawer>(null)

  return (
    <>
      <web-ui-button onClick={() => drawer.current?.show()}>Open drawer</web-ui-button>

      <web-ui-drawer ref={drawer} heading="Imperative drawer" closable>
        <p>Opened by show(); the close button in the top-right corner, Escape, and the backdrop all close it.</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => drawer.current?.close()}>
          Call close()
        </web-ui-button>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="drawer?.show()">Open drawer</web-ui-button>

  <web-ui-drawer ref="drawer" heading="Imperative drawer" closable>
    <p>Opened by show(); the close button in the top-right corner, Escape, and the backdrop all close it.</p>
    <web-ui-button slot="footer" variant="secondary" full @click="drawer?.close()">Call close()</web-ui-button>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import type { WebUiDrawer } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const drawer = useTemplateRef<WebUiDrawer>('drawer')
</script>
```

### Custom size

The size along the left / right directions is controlled by `--wui-drawer-width`, and along the top / bottom directions by `--wui-drawer-height`.

```tsx
import type { CSSProperties } from 'react'
import { useState } from 'react'

type Placement = 'right' | 'left' | 'top' | 'bottom'

const sizes: { label: string; placement: Placement; size: string }[] = [
  { label: 'Right 400px', placement: 'right', size: '400px' },
  { label: 'Left 260px', placement: 'left', size: '260px' },
  { label: 'Top 400px', placement: 'top', size: '400px' },
  { label: 'Bottom 160px', placement: 'bottom', size: '160px' }
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
        <p>Current size: {current.size}</p>
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
    <p>Current size: {{ current.size }}</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type Placement = 'right' | 'left' | 'top' | 'bottom'

const sizes: { label: string; placement: Placement; size: string }[] = [
  { label: 'Right 400px', placement: 'right', size: '400px' },
  { label: 'Left 260px', placement: 'left', size: '260px' },
  { label: 'Top 400px', placement: 'top', size: '400px' },
  { label: 'Bottom 160px', placement: 'bottom', size: '160px' }
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

The `header` slot completely replaces the built-in title area; when there is neither `heading` nor `header`, the title area is not rendered at all. The `closable` close button is independent of the header content and is fixed in the top-right corner.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [customHeader, setCustomHeader] = useState(false)
  const [noHeader, setNoHeader] = useState(false)

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <web-ui-button onClick={() => setCustomHeader(true)}>Custom header</web-ui-button>
        <web-ui-button onClick={() => setNoHeader(true)}>No header</web-ui-button>
      </div>

      <web-ui-drawer open={customHeader} closable onopen-change={event => setCustomHeader(event.detail.open)}>
        <div slot="header" className="flex items-baseline gap-2 px-5 py-4">
          <strong className="text-lg">Account settings</strong>
          <span className="text-xs text-(--wui-color-text-secondary)">Saved</span>
        </div>
        <p>
          The content of the header slot is entirely up to the consumer; the close button is still provided by the
          component.
        </p>
      </web-ui-drawer>

      <web-ui-drawer open={noHeader} onopen-change={event => setNoHeader(event.detail.open)}>
        <p>With no heading and no header slot, the title area takes no space.</p>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap gap-3">
    <web-ui-button @click="customHeader = true">Custom header</web-ui-button>
    <web-ui-button @click="noHeader = true">No header</web-ui-button>
  </div>

  <web-ui-drawer :open="customHeader" closable @open-change="customHeader = $event.detail.open">
    <div slot="header" class="flex items-baseline gap-2 px-5 py-4">
      <strong class="text-lg">Account settings</strong>
      <span class="text-xs text-(--wui-color-text-secondary)">Saved</span>
    </div>
    <p>
      The content of the header slot is entirely up to the consumer; the close button is still provided by the
      component.
    </p>
  </web-ui-drawer>

  <web-ui-drawer :open="noHeader" @open-change="noHeader = $event.detail.open">
    <p>With no heading and no header slot, the title area takes no space.</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const customHeader = ref(false)
const noHeader = ref(false)
</script>
```

### Close button

`closable` shows the built-in close button. The button is fixed in the top-right corner of the header and does not scroll with the body.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [closable, setClosable] = useState(true)

  return (
    <>
      <div className="flex items-center gap-3">
        <web-ui-button onClick={() => setOpen(true)}>Open drawer</web-ui-button>
        <web-ui-checkbox checked={closable} onChange={event => setClosable(event.currentTarget.checked)}>
          Show close button
        </web-ui-checkbox>
      </div>

      <web-ui-drawer
        open={open}
        heading="Close button"
        closable={closable}
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>The close button is controlled by closable; after closing, you can check it again and reopen to compare.</p>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <div class="flex items-center gap-3">
    <web-ui-button @click="open = true">Open drawer</web-ui-button>
    <web-ui-checkbox :checked="closable" @change="closable = $event.target.checked">
      Show close button
    </web-ui-checkbox>
  </div>

  <web-ui-drawer :open="open" heading="Close button" :closable="closable" @open-change="open = $event.detail.open">
    <p>The close button is controlled by closable; after closing, you can check it again and reopen to compare.</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const closable = ref(true)
</script>
```

### Footer actions

The `footer` slot is fixed to the bottom of the drawer and stays visible while the body scrolls.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>Edit profile</web-ui-button>

      <web-ui-drawer open={open} heading="Edit profile" onopen-change={event => setOpen(event.detail.open)}>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 12 }, (_, index) => (
            <p key={index} className="m-0">
              Line {index + 1}, used to demonstrate body scrolling.
            </p>
          ))}
        </div>

        <div slot="footer" className="flex gap-3">
          <web-ui-button variant="secondary" full onClick={() => setOpen(false)}>
            Cancel
          </web-ui-button>
          <web-ui-button full onClick={() => setOpen(false)}>
            Save
          </web-ui-button>
        </div>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="open = true">Edit profile</web-ui-button>

  <web-ui-drawer :open="open" heading="Edit profile" @open-change="open = $event.detail.open">
    <div class="flex flex-col gap-3">
      <p v-for="index in 12" :key="index" class="m-0">Line {{ index }}, used to demonstrate body scrolling.</p>
    </div>

    <div slot="footer" class="flex gap-3">
      <web-ui-button variant="secondary" full @click="open = false">Cancel</web-ui-button>
      <web-ui-button full @click="open = false">Save</web-ui-button>
    </div>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### Scroll lock

By default the drawer locks page scrolling while open; `no-scroll-lock` keeps the background scrollable.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>Open (no scroll lock)</web-ui-button>

      <web-ui-drawer
        open={open}
        noScrollLock
        heading="Background still scrolls"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>After opening, try scrolling the background page: no-scroll-lock does not rewrite page scrolling.</p>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="open = true">Open (no scroll lock)</web-ui-button>

  <web-ui-drawer
    :open="open"
    no-scroll-lock
    heading="Background still scrolls"
    @open-change="open = $event.detail.open"
  >
    <p>After opening, try scrolling the background page: no-scroll-lock does not rewrite page scrolling.</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### Backdrop click

A backdrop click closes the drawer by default; with `no-backdrop-close`, exit only through the close button, footer actions, or Escape.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>Open (backdrop does not close)</web-ui-button>

      <web-ui-drawer
        open={open}
        noBackdropClose
        heading="Backdrop does not close"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>Clicking the backdrop does not close it; exit with the footer button or Escape.</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setOpen(false)}>
          Close
        </web-ui-button>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="open = true">Open (backdrop does not close)</web-ui-button>

  <web-ui-drawer
    :open="open"
    no-backdrop-close
    heading="Backdrop does not close"
    @open-change="open = $event.detail.open"
  >
    <p>Clicking the backdrop does not close it; exit with the footer button or Escape.</p>
    <web-ui-button slot="footer" variant="secondary" full @click="open = false">Close</web-ui-button>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### Controlled closing

With `controlled`, Escape, the backdrop, and the close button only dispatch `open-change(false)`; the drawer really closes only after the consumer writes `open` back. The sample rejects the first close request, so the confirm button in the footer must be clicked.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [rejected, setRejected] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>Open controlled drawer</web-ui-button>

      <web-ui-drawer
        open={open}
        controlled
        heading="Controlled closing"
        onopen-change={event => {
          if (event.detail.open) {
            setRejected(false)
            setOpen(true)
            return
          }
          // Not writing open back: the drawer springs back to the open position, so the consumer can reject this close.
          setRejected(true)
        }}
      >
        <p>Pressing Escape, clicking the backdrop, or using the close button only emits a close request.</p>
        {rejected ? <p className="text-(--wui-color-danger)">Close request rejected; confirm first.</p> : null}
        <web-ui-button
          slot="footer"
          variant="secondary"
          full
          onClick={() => {
            setRejected(false)
            setOpen(false)
          }}
        >
          Confirm close
        </web-ui-button>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="open = true">Open controlled drawer</web-ui-button>

  <web-ui-drawer :open="open" controlled heading="Controlled closing" @open-change="onOpenChange">
    <p>Pressing Escape, clicking the backdrop, or using the close button only emits a close request.</p>
    <p v-if="rejected" class="text-(--wui-color-danger)">Close request rejected; confirm first.</p>
    <web-ui-button slot="footer" variant="secondary" full @click="close">Confirm close</web-ui-button>
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
  // Not writing open back: the drawer springs back to the open position, so the consumer can reject this close.
  rejected.value = true
}

function close() {
  rejected.value = false
  open.value = false
}
</script>
```

### Headless

`headless` keeps only the native dialog, backdrop, animations, scroll lock, and Escape / backdrop closing, rendering no built-in header, close button, or footer. The consumer is responsible for the full styling of the default slot content and must provide `aria-dialog-label`. The sample also enables `draggable`, and headless supports drag-to-close too.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>Open headless drawer</web-ui-button>

      <web-ui-drawer
        open={open}
        placement="left"
        headless
        draggable
        aria-dialog-label="Custom panel"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <div className="box-border h-full w-[min(320px,100vw)] rounded-r-2xl bg-(--wui-color-surface-overlay) p-6 text-(--wui-color-text)">
          <h2 className="m-0 mb-2 text-xl">Custom panel</h2>
          <p className="m-0 text-(--wui-color-text-secondary)">
            headless provides only overlay behavior; the content, background, and radius are all decided here.
          </p>
        </div>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="open = true">Open headless drawer</web-ui-button>

  <web-ui-drawer
    :open="open"
    placement="left"
    headless
    draggable
    aria-dialog-label="Custom panel"
    @open-change="open = $event.detail.open"
  >
    <div
      class="box-border h-full w-[min(320px,100vw)] rounded-r-2xl bg-(--wui-color-surface-overlay) p-6 text-(--wui-color-text)"
    >
      <h2 class="m-0 mb-2 text-xl">Custom panel</h2>
      <p class="m-0 text-(--wui-color-text-secondary)">
        headless provides only overlay behavior; the content, background, and radius are all decided here.
      </p>
    </div>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### Drag to close

With `draggable` enabled, a gray pill-shaped drag bar appears on the inner edge of the drawer. Drag past half of its own size toward the closing direction, or fling it quickly and release, to close; below the threshold it springs back. The direction adapts to `placement`.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [rightOpen, setRightOpen] = useState(false)
  const [bottomOpen, setBottomOpen] = useState(false)

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <web-ui-button onClick={() => setRightOpen(true)}>Drag-close on the right</web-ui-button>
        <web-ui-button onClick={() => setBottomOpen(true)}>Drag-close at the bottom</web-ui-button>
      </div>

      <web-ui-drawer
        open={rightOpen}
        draggable
        heading="Drag right to close"
        onopen-change={event => setRightOpen(event.detail.open)}
      >
        <p>Hold the gray pill on the left edge and drag it more than half way to the right, or fling it, to close.</p>
      </web-ui-drawer>

      <web-ui-drawer
        open={bottomOpen}
        placement="bottom"
        draggable
        heading="Drag down to close"
        onopen-change={event => setBottomOpen(event.detail.open)}
      >
        <p>Hold the gray pill on the top edge and drag it more than half way down, or fling it, to close.</p>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap gap-3">
    <web-ui-button @click="rightOpen = true">Drag-close on the right</web-ui-button>
    <web-ui-button @click="bottomOpen = true">Drag-close at the bottom</web-ui-button>
  </div>

  <web-ui-drawer
    :open="rightOpen"
    draggable
    heading="Drag right to close"
    @open-change="rightOpen = $event.detail.open"
  >
    <p>Hold the gray pill on the left edge and drag it more than half way to the right, or fling it, to close.</p>
  </web-ui-drawer>

  <web-ui-drawer
    :open="bottomOpen"
    placement="bottom"
    draggable
    heading="Drag down to close"
    @open-change="bottomOpen = $event.detail.open"
  >
    <p>Hold the gray pill on the top edge and drag it more than half way down, or fling it, to close.</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const rightOpen = ref(false)
const bottomOpen = ref(false)
</script>
```

### Nested stacking

Declaratively nesting the same component stacks it automatically: the later-opened one sits on top at full size, lower layers scale by `0.95^n` and shift inward, and the exposed edge width is allocated by `A·ln(n)`. When layer widths differ or are out of order, the component compensates by the widest layer above so that the left edge of every layer stays visible; Escape and backdrop clicks act only on the topmost layer.

```tsx
import type { CSSProperties } from 'react'
import { useState } from 'react'

const titles = ['Overview', 'Details', 'Settings', 'Confirm']
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
      <web-ui-button onClick={() => openLevel(0)}>Open four nested layers</web-ui-button>

      <web-ui-drawer
        open={levels[0]}
        heading={`${titles[0]} (300px)`}
        closable
        style={{ '--wui-drawer-width': widths[0] } as CSSProperties}
        onopen-change={event => {
          if (event.target === event.currentTarget && !event.detail.open) closeLevel(0)
        }}
      >
        <p>Layer 1. After the next layer opens, this layer scales down and exposes its left edge.</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => openLevel(1)}>
          Open layer 2
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
          <p>Layer 2. This layer is wider than the one above, so the stacking position compensates automatically.</p>
          <web-ui-button slot="footer" variant="secondary" full onClick={() => openLevel(2)}>
            Open layer 3
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
            <p>Layer 3. When a wider layer stacks on a narrower one, the left edge stays visible.</p>
            <web-ui-button slot="footer" variant="secondary" full onClick={() => openLevel(3)}>
              Open layer 4
            </web-ui-button>

            <web-ui-drawer
              open={levels[3]}
              heading={`${titles[3]} (320px, top layer)`}
              closable
              style={{ '--wui-drawer-width': widths[3] } as CSSProperties}
              onopen-change={event => {
                if (event.target === event.currentTarget && !event.detail.open) closeLevel(3)
              }}
            >
              <p>Layer 4, the topmost. Closing it restores each layer to its original size.</p>
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
  <web-ui-button @click="openLevel(0)">Open four nested layers</web-ui-button>

  <web-ui-drawer
    :open="levels[0]"
    :heading="`${titles[0]} (300px)`"
    closable
    :style="{ '--wui-drawer-width': widths[0] }"
    @open-change="event => event.target === event.currentTarget && !event.detail.open && closeLevel(0)"
  >
    <p>Layer 1. After the next layer opens, this layer scales down and exposes its left edge.</p>
    <web-ui-button slot="footer" variant="secondary" full @click="openLevel(1)">Open layer 2</web-ui-button>

    <web-ui-drawer
      :open="levels[1]"
      :heading="`${titles[1]} (280px)`"
      closable
      :style="{ '--wui-drawer-width': widths[1] }"
      @open-change="event => event.target === event.currentTarget && !event.detail.open && closeLevel(1)"
    >
      <p>Layer 2. This layer is wider than the one above, so the stacking position compensates automatically.</p>
      <web-ui-button slot="footer" variant="secondary" full @click="openLevel(2)">Open layer 3</web-ui-button>

      <web-ui-drawer
        :open="levels[2]"
        :heading="`${titles[2]} (240px)`"
        closable
        :style="{ '--wui-drawer-width': widths[2] }"
        @open-change="event => event.target === event.currentTarget && !event.detail.open && closeLevel(2)"
      >
        <p>Layer 3. When a wider layer stacks on a narrower one, the left edge stays visible.</p>
        <web-ui-button slot="footer" variant="secondary" full @click="openLevel(3)">Open layer 4</web-ui-button>

        <web-ui-drawer
          :open="levels[3]"
          :heading="`${titles[3]} (320px, top layer)`"
          closable
          :style="{ '--wui-drawer-width': widths[3] }"
          @open-change="event => event.target === event.currentTarget && !event.detail.open && closeLevel(3)"
        >
          <p>Layer 4, the topmost. Closing it restores each layer to its original size.</p>
        </web-ui-drawer>
      </web-ui-drawer>
    </web-ui-drawer>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const titles = ['Overview', 'Details', 'Settings', 'Confirm']
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

Three drawers are mounted as sibling nodes. Open drawer 1 with the page button, then open the next layer from the current drawer's footer. The component manages order automatically: earlier drawers scale and shift while later ones sit on top; close them in any order and the remaining layers rearrange.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState([false, false, false])

  function setAt(index: number, value: boolean) {
    setOpen(current => current.map((item, i) => (i === index ? value : item)))
  }

  return (
    <>
      <web-ui-button onClick={() => setAt(0, true)}>Open drawer 1</web-ui-button>

      {open.map((value, index) => (
        <web-ui-drawer
          key={index}
          open={value}
          heading={`Sibling drawer ${index + 1}`}
          closable
          onopen-change={event => setAt(index, event.detail.open)}
        >
          <p>
            Sibling drawer {index + 1}.
            {index < open.length - 1
              ? ' Open the next drawer from the footer.'
              : ' Close to see the remaining layers rearrange.'}
          </p>
          {index < open.length - 1 && (
            <web-ui-button slot="footer" variant="secondary" full onClick={() => setAt(index + 1, true)}>
              Open drawer {index + 2}
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
  <web-ui-button @click="open[0] = true">Open drawer 1</web-ui-button>

  <web-ui-drawer
    v-for="(value, index) in open"
    :key="index"
    :open="value"
    :heading="`Sibling drawer ${index + 1}`"
    closable
    @open-change="open[index] = $event.detail.open"
  >
    <p>
      Sibling drawer {{ index + 1 }}.
      {{
        index < open.length - 1
          ? 'Open the next drawer from the footer.'
          : 'Close to see the remaining layers rearrange.'
      }}
    </p>
    <web-ui-button
      v-if="index < open.length - 1"
      slot="footer"
      variant="secondary"
      full
      @click="open[index + 1] = true"
    >
      Open drawer {{ index + 2 }}
    </web-ui-button>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref([false, false, false])
</script>
```

### CSS variables

The background, radius, and viewport inset are controlled by `--wui-drawer-bg`, `--wui-drawer-radius`, and `--wui-drawer-inset` respectively; setting `--wui-drawer-inset: 0` gives edge-to-edge geometry. The white-background example also sets `--wui-color-text` to a dark color and `--wui-color-surface-control` to a light color so the heading and close button stay readable in both themes.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>Open edge-to-edge white drawer</web-ui-button>

      <web-ui-drawer
        open={open}
        heading="Edge-to-edge white drawer"
        closable
        className="[--wui-drawer-bg:#fff] [--wui-drawer-radius:0] [--wui-drawer-inset:0] [--wui-color-text:#262626] [--wui-color-surface-control:#e5e5e5]"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p className="text-neutral-800">
          The background, radius, and viewport inset are all controlled by CSS variables.
        </p>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="open = true">Open edge-to-edge white drawer</web-ui-button>

  <web-ui-drawer
    :open="open"
    heading="Edge-to-edge white drawer"
    closable
    class="[--wui-drawer-bg:#fff] [--wui-drawer-radius:0] [--wui-drawer-inset:0] [--wui-color-text:#262626] [--wui-color-surface-control:#e5e5e5]"
    @open-change="open = $event.detail.open"
  >
    <p class="text-neutral-800">The background, radius, and viewport inset are all controlled by CSS variables.</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

## API

### Props

| Name                | Description                                                                                                                                                                                | Type              | Default   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | --------- |
| `open`              | Drawer visibility.                                                                                                                                                                         | `boolean`         | `false`   |
| `no-scroll-lock`    | Does not lock page scrolling while open.                                                                                                                                                   | `boolean`         | `false`   |
| `no-backdrop-close` | Prevents closing on a backdrop click.                                                                                                                                                      | `boolean`         | `false`   |
| `controlled`        | User-initiated closing only requests `open=false`, written back by the consumer.                                                                                                           | `boolean`         | `false`   |
| `placement`         | Slide-in direction: `right` (default), `left`, `top`, `bottom`.                                                                                                                            | `DrawerPlacement` | `'right'` |
| `heading`           | Heading text, the fallback when the `header` slot is empty.                                                                                                                                | `string`          | `''`      |
| `closable`          | Shows the built-in close button.                                                                                                                                                           | `boolean`         | `false`   |
| `headless`          | Keeps only overlay behavior; the default slot renders no built-in drawer UI.                                                                                                               | `boolean`         | `false`   |
| `aria-dialog-label` | Accessible name of the inner native dialog; required under `headless`. The legacy name `dialog-label` is deprecated and kept only for compatibility; it will be removed in the next major. | `string`          | `''`      |
| `aria-close-label`  | Accessible name of the built-in close button; falls back to the built-in English copy (`Close`).                                                                                           | `string`          | `''`      |
| `draggable`         | Shows a drag bar on the inner edge of the drawer and enables the drag-to-close gesture.                                                                                                    | `boolean`         | `false`   |

### Events

| Name          | Description                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `open-change` | User requests opening or closing; `detail.open` is the target state. In controlled mode the consumer writes `open` back. |

### Slots

| Name      | Description         |
| --------- | ------------------- |
| `default` | Body content.       |
| `header`  | Top title area.     |
| `footer`  | Bottom action area. |

### Methods

| Name      | Description                                     |
| --------- | ----------------------------------------------- |
| `show()`  | Opens the drawer; a no-op when already open.    |
| `close()` | Closes the drawer; a no-op when already closed. |

### Behavior

`headless` keeps the native dialog, backdrop, placement animation, Escape / backdrop closing behavior, and scroll lock, but renders no built-in glass surface, header, close button, or footer; the consumer is responsible for fully defining the styles of the default slot content and must provide `aria-dialog-label` so that the native dialog has an accessible name.

When closing, the native dialog stays in the top layer, and `dialog.close()` is called after the exit transition finishes. Escape always takes this closing path; `no-backdrop-close` only controls backdrop clicks.

With `closable` enabled, the built-in close button is fixed in the top-right corner of the header (`16px` from the top and `16px` from the right by default) and never stretches into the middle of the drawer.

The top `16px` resolves through `--wui-space-4`, so it shares its source with the drawer's header padding; the right `16px` is the offset from the button itself to the right edge of the panel, which does not equal the header's horizontal padding (`20px`), so it stays a literal value.

`--wui-drawer-nested-peek-base` does not need to be declared by the consumer: its default `43.2px` is the `initialValue` used when the component registers the property with `CSS.registerProperty` (`components/drawer/index.ts`).

The `28.8px` base for narrow viewports comes from the `@media (width <= 640px)` rule in `components/drawer/style.css`—these two places are where the built-in bases live.

Setting this token on the host or any ancestor overrides both at once and applies at any viewport width.

With the built-in bases, the per-layer exposed edges of a four-layer `320px` equal-width stack are `29.94px` / `17.52px` / `12.43px` on desktop and `19.96px` / `11.68px` / `8.29px` on narrow viewports, for total stack widths of `59.89px` and `39.93px`.

A single layer never moves, because `ln(1)` is `0`.

### Drag to close

With `draggable` enabled, an open drawer shows a gray pill-shaped drag bar on its inner edge (4×56px by default, with the visual center line 10px from the inner edge; `right` puts it on the left edge, `left` on the right edge, `top` on the bottom edge, and `bottom` on the top edge):

The center line follows half of `--wui-drawer-content-padding`, with a floor of “half the pill thickness + a 4px gap”: when that padding is zeroed and the content fills edge to edge, the pill still keeps a visible inset, so it neither crosses the inner edge of the panel nor sticks to the panel edge.

The pill is purely visual: `pointer-events: none`, so it never receives a press itself. What is actually pressed is the hit layer.

Left / right placements have only the drag zone; top / bottom placements have three layers—the drag zone, an end drag edge along the grabbable edge (as wide as the pill, no thinner than `--wui-drawer-drag-edge-size`), and the whole header (`placement=bottom`) or footer (`placement=top`).

The drag edge height takes the larger of the pill's outer edge and that token, and by construction covers the band where the pill sits, so in all four placements pressing the pill starts a drag and hovering the pill highlights it.

It is the drag zone itself that makes way for the header (`placement=bottom`) or footer (`placement=top`), so that section does not push the pill away from the panel edge; that section handles dragging **itself** and is not inert: a drag can start anywhere inside it, including on the title text.

Making way for controls is done **per control, at the event layer**, not by geometrically cutting the hit surface.

If any clickable element appears on the press path, that press is handed to the control and no drag starts. Clickable elements include:

- Native `button` / `input` / `select` / `textarea` / `label` / `a[href]` / `summary`
- Any `contenteditable`
- An interactive semantic `role` (`button`, `checkbox`, `switch`, `tab`, `menuitem`, `option`, `slider`, and so on)
- Any explicit `tabindex` other than `-1`

If a custom-drawn control is not itself a native interactive element, it needs one of these to be recognized; adding `role` or `tabindex` is the entry point, and it is also what accessibility requires anyway.

Geometric cutting was intentionally rejected: it would have to measure the position of every control, breaks as soon as a control moves, and merely relocates the A6 defect.

The cost is stated plainly: the built-in close button sits against the right edge of the panel, outside the pill's span, and remains clickable; controls that fall within the pill's horizontal span are still covered by the drag surface between their top and the drag edge height.

“Drag bar occupancy” comes with a corollary: controls that fall within this span and whose top edge lies within the drag edge height (`--wui-drawer-drag-edge-size`, 20px by default; the pill wins when its outer edge is thicker) are covered by the drag surface on their upper part—the drag bar is drawn right there, and a gesture must start from where the drag bar is.

Raising `z-index` does not help (in Chromium the drag edge always sits above slotted content); the levers that do measure are `--wui-drawer-drag-bar-length` (which decides both the pill length and the drag edge width) and `--wui-drawer-drag-edge-size` (the drag edge thickness).

- Dragging tracks the pointer in real time, and the backdrop fades proportionally.
- A backdrop click only closes on the **tap path**: only a click whose press started on the backdrop and whose press-release displacement stays within tap magnitude closes. For a “press → drag → release” sequence, the browser puts the click on the common ancestor of the press and release points (the dialog)—when a drag starts on the panel content or the backdrop and is released over the backdrop, the click target is likewise the dialog; the component records the press point and coordinates on `pointerdown` and validates them retroactively, so releasing such a drag always springs back. Clicks with `detail` of 0 (keyboard or programmatic sources) do not consume the pointer record.
- On release, the drawer closes if the **net displacement** since the moment it was grabbed exceeds half of its size (minimum 10px) or if it was flung quickly; otherwise it springs back to the open position. The direction adapts to placement. Every step of the decision matches Base UI's `useSwipeDismiss`:
  - The displacement origin and the decision clock are both reset at the **first `pointermove`**, which absorbs the gap between “press → first move”; the whole displacement of that move is discarded, so a gesture needs at least two moves before any displacement can accumulate.
  - A fling is judged by the **whole-gesture** average velocity (net displacement ÷ gesture duration, with a 50ms floor on the denominator) **reaching** 500px/s, not by the instantaneous velocity at release. A sliding window only describes the last short stretch of the trajectory; with whole-gesture average velocity, “drag out toward the edge, then sweep quickly back” does not add up to a fling. When the duration is 0 the velocity is taken as 0 rather than defaulting to 50ms, so a gesture whose duration cannot be measured is never read as a fling.
  - A release whose net displacement does not point toward the closing direction always springs back to the open position.
  - The distance criterion also uses net displacement: grabbing during the spring-back and releasing without further dragging is not treated as “already dragged past half”.
  - Retracting 10px or more in the opposite direction from the “direction confirmation point” cancels the fling, so sweeping back after dragging out does not close. Displacement crossing the distance threshold again clears that flag, so “already dragged past half” is unaffected by a small retraction. Upstream has the same guard (`cancelledSwipe`), but it is never reached on the drawer path—`DrawerViewport.onRelease` always returns a decision.
  - Dragging toward the open direction is compressed by a square root (`sign(d) · |d| ** 0.5`), matching `applyDirectionalDamping`. Damping applies to the **increment** of the current gesture and is added on top of the displacement at the moment of grabbing, so it self-limits and needs no fixed displacement cap.
- The release velocity only decides the duration of the settling transition (180–420ms); the settling itself is a `transform` transition handed back to CSS and creates no WAAPI animation.
- With `controlled` enabled, releasing past the threshold only dispatches `open-change(false)`; the drawer waits briefly at the closed position (a 120ms write-back window) and springs back to the open position if the consumer rejects or does not write back in time.
- Drag-to-open is not supported—a closed drawer renders nothing outside the native dialog.
- Under `prefers-reduced-motion`, release snaps into place immediately without playing the settling transition.

### CSS Custom Properties

| Name                              | Description                                                                                                                                                                                                                                                                                              | Default                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `--wui-drawer-width`              | Drawer width                                                                                                                                                                                                                                                                                             | `320px`                            |
| `--wui-drawer-height`             | Drawer height (top / bottom)                                                                                                                                                                                                                                                                             | `300px`                            |
| `--wui-drawer-bg`                 | Drawer background color                                                                                                                                                                                                                                                                                  | `var(--wui-color-surface-overlay)` |
| `--wui-drawer-radius`             | Floating card radius (non-headless)                                                                                                                                                                                                                                                                      | `var(--wui-radius-overlay, 28px)`  |
| `--wui-drawer-inset`              | Floating card viewport inset (non-headless); set to `0` for edge-to-edge geometry                                                                                                                                                                                                                        | `8px`                              |
| `--wui-drawer-nested-peek-base`   | Exposed-edge base `A` for nested stacking (`28.8px` when `width <= 640px`); the total stack width grows as `A · ln(n)`, so a single layer never moves and each additional layer adds a smaller exposed edge. Set to `0` to disable the exposed edge. See the notes above                                 | `43.2px`                           |
| `--wui-drawer-overlay-bg`         | Backdrop background color                                                                                                                                                                                                                                                                                | `rgb(0 0 0 / 0.12)`                |
| `--wui-drawer-drag-zone-size`     | Thickness of the drag zone that hit-tests drag-to-close (draggable)                                                                                                                                                                                                                                      | `20px`                             |
| `--wui-drawer-drag-zone-inset`    | Gap between the drag zone and the section it makes way for (the header when `placement=bottom` / the footer when `placement=top`); 0 when that section does not exist                                                                                                                                    | `var(--wui-space-1, 4px)`          |
| `--wui-drawer-drag-bar-thickness` | Drag bar pill thickness (short axis)                                                                                                                                                                                                                                                                     | `4px`                              |
| `--wui-drawer-drag-bar-length`    | Drag bar pill length (along the drawer edge)                                                                                                                                                                                                                                                             | `56px`                             |
| `--wui-drawer-drag-edge-size`     | Thickness of the pill's hit band along the grabbable edge (top / bottom placements only). It falls back to the pill's outer edge, so the band where the pill sits is always covered; the default matches `--wui-drawer-drag-zone-size`, so the drag bar is never harder to press than the band beside it | `20px`                             |
| `--wui-drawer-header-padding`     | Header area padding                                                                                                                                                                                                                                                                                      | `16px 20px`                        |
| `--wui-drawer-close-top`          | Offset of the built-in close button from the top of the header                                                                                                                                                                                                                                           | `16px`                             |
| `--wui-drawer-close-right`        | Offset of the built-in close button from the right edge of the drawer                                                                                                                                                                                                                                    | `16px`                             |
| `--wui-drawer-content-padding`    | Content area padding; also drives the drag bar's visual center line (half the value, no less than half the pill thickness + 4px)                                                                                                                                                                         | `20px`                             |
| `--wui-drawer-footer-padding`     | Footer area padding                                                                                                                                                                                                                                                                                      | `16px 20px`                        |

# Drawer

English | [简体中文](./drawer.CN.md)

A side drawer built on the native `<dialog>`, with slide-in and slide-out animations and drag-to-close from the inner edge on any side. Use it for secondary content that relates to the current page but does not require leaving the page.

## Samples

### Basic

`placement` decides the slide-in direction, and `heading` is the title fallback when there is no `header` slot. Click the backdrop or press Escape to close.

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
          The content of the header slot is entirely up to your app; the close button is still provided by the
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
      The content of the header slot is entirely up to your app; the close button is still provided by the component.
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

### Page shift

`page-shift` moves the background page toward the drawer's entering direction while the drawer is open. A right drawer enters from the right, so the page moves left and the right side of the viewport makes room for it. A left drawer moves the page right, and top or bottom drawers make room at the top or bottom edge. The offset follows the viewport size, and there is no CSS variable to adjust it.

When several layers are open, the opening order decides the offset: the first layer moves the most, and each later layer moves less. Nested and sibling layers follow the same rule. Closing any layer recalculates the rest, and the page returns to the new total. The page moves only when `open` changes. Dragging the panel leaves the page in place. When the viewport changes size, the offset updates without reopening the drawer.

The whole feature is disabled under `prefers-reduced-motion` (or `motion="reduced"` on the enclosing `web-ui-theme`).

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>Open (page shifts)</web-ui-button>

      <web-ui-drawer
        open={open}
        pageShift
        heading="The page shifts for the drawer"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>
          Opening shifts the background page by a distance and it returns when the drawer closes; dragging this panel
          leaves the page in place.
        </p>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="open = true">Open (page shifts)</web-ui-button>

  <web-ui-drawer
    :open="open"
    page-shift
    heading="The page shifts for the drawer"
    @open-change="open = $event.detail.open"
  >
    <p>
      Opening shifts the background page by a distance and it returns when the drawer closes; dragging this panel leaves
      the page in place.
    </p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### Nested page shift

With four nested layers enabling `page-shift`, each layer moves the page further from its current offset; closing a middle layer recalculates the layers behind it, and the page returns to the new total.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [openLayers, setOpenLayers] = useState([false, false, false, false])
  const setLayer = (index: number, open: boolean) =>
    setOpenLayers(previous => previous.map((value, i) => (i === index ? open : value)))

  return (
    <>
      <web-ui-button onClick={() => setLayer(0, true)}>Open layer 1</web-ui-button>

      <web-ui-drawer
        open={openLayers[0]}
        pageShift
        heading="Layer 1"
        onopen-change={event => {
          if (event.target === event.currentTarget) setLayer(0, event.detail.open)
        }}
      >
        <p>Layer 1 shifts the most, and each layer after it shifts less.</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setLayer(1, true)}>
          Open layer 2
        </web-ui-button>

        <web-ui-drawer
          open={openLayers[1]}
          pageShift
          heading="Layer 2"
          onopen-change={event => {
            if (event.target === event.currentTarget) setLayer(1, event.detail.open)
          }}
        >
          <p>Each layer adds its own offset; closing a middle layer recalculates the layers behind it.</p>
          <web-ui-button slot="footer" variant="secondary" full onClick={() => setLayer(2, true)}>
            Open layer 3
          </web-ui-button>

          <web-ui-drawer
            open={openLayers[2]}
            pageShift
            heading="Layer 3"
            onopen-change={event => {
              if (event.target === event.currentTarget) setLayer(2, event.detail.open)
            }}
          >
            <p>Layer 3 shifts less; with more layers the total quickly levels off.</p>
            <web-ui-button slot="footer" variant="secondary" full onClick={() => setLayer(3, true)}>
              Open layer 4
            </web-ui-button>

            <web-ui-drawer
              open={openLayers[3]}
              pageShift
              heading="Layer 4"
              onopen-change={event => {
                if (event.target === event.currentTarget) setLayer(3, event.detail.open)
              }}
            >
              <p>Layer 4 shifts the least.</p>
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
  <web-ui-button @click="setLayer(0, true)">Open layer 1</web-ui-button>

  <web-ui-drawer
    :open="openLayers[0]"
    page-shift
    heading="Layer 1"
    @open-change="event => event.target === event.currentTarget && setLayer(0, event.detail.open)"
  >
    <p>Layer 1 shifts the most, and each layer after it shifts less.</p>
    <web-ui-button slot="footer" variant="secondary" full @click="setLayer(1, true)">Open layer 2</web-ui-button>

    <web-ui-drawer
      :open="openLayers[1]"
      page-shift
      heading="Layer 2"
      @open-change="event => event.target === event.currentTarget && setLayer(1, event.detail.open)"
    >
      <p>Each layer adds its own offset; closing a middle layer recalculates the layers behind it.</p>
      <web-ui-button slot="footer" variant="secondary" full @click="setLayer(2, true)">Open layer 3</web-ui-button>

      <web-ui-drawer
        :open="openLayers[2]"
        page-shift
        heading="Layer 3"
        @open-change="event => event.target === event.currentTarget && setLayer(2, event.detail.open)"
      >
        <p>Layer 3 shifts less; with more layers the total quickly levels off.</p>
        <web-ui-button slot="footer" variant="secondary" full @click="setLayer(3, true)">Open layer 4</web-ui-button>

        <web-ui-drawer
          :open="openLayers[3]"
          page-shift
          heading="Layer 4"
          @open-change="event => event.target === event.currentTarget && setLayer(3, event.detail.open)"
        >
          <p>Layer 4 shifts the least.</p>
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

Two drawers that are DOM siblings have no parent-child relation, but the component still manages layer order by opening time: the drawer opened later stacks on top of the earlier one, which shrinks and moves back, so it still looks like one layer inside another. `page-shift` uses the same opening order: the first layer moves the most and a later sibling moves less; closing returns the page to the previous layer's offset.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [first, setFirst] = useState(false)
  const [second, setSecond] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setFirst(true)}>Open layer 1</web-ui-button>

      <web-ui-drawer open={first} pageShift heading="Layer 1" onopen-change={event => setFirst(event.detail.open)}>
        <p>Sibling drawers auto-nest by opening order: the first shifts the most and the next one shifts less.</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setSecond(true)}>
          Open sibling layer 2
        </web-ui-button>
      </web-ui-drawer>

      <web-ui-drawer open={second} pageShift heading="Layer 2" onopen-change={event => setSecond(event.detail.open)}>
        <p>
          This layer is a sibling of the previous one, yet it nests behind it visually and adds another offset; closing
          it falls back to the previous layer's position.
        </p>
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="first = true">Open layer 1</web-ui-button>

  <web-ui-drawer :open="first" page-shift heading="Layer 1" @open-change="first = $event.detail.open">
    <p>Sibling drawers auto-nest by opening order: the first shifts the most and the next one shifts less.</p>
    <web-ui-button slot="footer" variant="secondary" full @click="second = true">Open sibling layer 2</web-ui-button>
  </web-ui-drawer>

  <web-ui-drawer :open="second" page-shift heading="Layer 2" @open-change="second = $event.detail.open">
    <p>
      This layer is a sibling of the previous one, yet it nests behind it visually and adds another offset; closing it
      falls back to the previous layer's position.
    </p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const first = ref(false)
const second = ref(false)
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

With `controlled`, Escape, the backdrop, and the close button only dispatch `open-change(false)`; the drawer really closes only after your app writes `open` back.

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
          // Not writing open back: the drawer springs back to the open position, so your app can reject this close.
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
  // Not writing open back: the drawer springs back to the open position, so your app can reject this close.
  rejected.value = true
}

function close() {
  rejected.value = false
  open.value = false
}
</script>
```

### Headless

`headless` keeps only the native dialog, backdrop, animations, scroll lock, and Escape / backdrop closing, rendering no built-in header, close button, or footer. Your app is responsible for the full styling of the default slot content and must provide `aria-dialog-label`. `headless` supports `draggable` drag-to-close as well.

The React example sets the `ariaDialogLabel` property through a ref so React does not validate the component-specific name as a standard ARIA attribute.

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
        ref={element => {
          if (element) element.ariaDialogLabel = 'Custom panel'
        }}
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

With `draggable` enabled, a gray pill-shaped drag bar appears on the inner edge of the drawer. Drag past half of its own size toward the closing direction, or drag quickly and release, to close; below the threshold the drawer returns to its open position. The direction follows `placement`.

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

Declaratively nesting the same component stacks it automatically: the later-opened drawer sits on top at full size, lower layers shrink and shift inward, and every layer shows a visible left edge. When layer widths differ or the opening order changes, the component adjusts automatically. Escape and backdrop clicks act only on the topmost layer.

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

Three drawers are mounted as sibling nodes. Open drawer 1 with the page button, then open the next layer from its footer. The component manages layer order automatically: earlier drawers shrink and shift, later ones sit on top; close them in any order and the remaining layers rearrange.

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

The background, radius, and viewport inset are controlled by `--wui-drawer-bg`, `--wui-drawer-radius`, and `--wui-drawer-inset` respectively; setting `--wui-drawer-inset: 0` gives edge-to-edge geometry. When switching the background to white, also override `--wui-color-text` and `--wui-color-surface-control` so the heading and close button stay readable in both themes.

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

### Custom close button size

Set the close button size with `--wui-drawer-close-size` (default 26px); its icon scales proportionally.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>Open</web-ui-button>
      <web-ui-drawer
        closable
        open={open}
        heading="Example"
        style={{ '--wui-drawer-close-size': '34px' }}
        onopen-change={event => setOpen(event.detail.open)}
      >
        Example
      </web-ui-drawer>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="open = true">Open</web-ui-button>
  <web-ui-drawer
    closable
    :open="open"
    heading="Example"
    style="--wui-drawer-close-size: 34px"
    @open-change="open = $event.detail.open"
  >
    Example
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const open = ref(false)
</script>
```

## API

### Props

| Name                | Description                                                                                                                                                                                                                                         | Type              | Default   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | --------- |
| `open`              | Drawer visibility.                                                                                                                                                                                                                                  | `boolean`         | `false`   |
| `no-scroll-lock`    | Does not lock page scrolling while open.                                                                                                                                                                                                            | `boolean`         | `false`   |
| `no-backdrop-close` | Prevents closing on a backdrop click.                                                                                                                                                                                                               | `boolean`         | `false`   |
| `controlled`        | User-initiated closing only requests `open=false`, written back by your app.                                                                                                                                                                        | `boolean`         | `false`   |
| `placement`         | Slide-in direction: `right` (default), `left`, `top`, `bottom`.                                                                                                                                                                                     | `DrawerPlacement` | `'right'` |
| `heading`           | Heading text, the fallback when the `header` slot is empty.                                                                                                                                                                                         | `string`          | `''`      |
| `closable`          | Shows the built-in close button.                                                                                                                                                                                                                    | `boolean`         | `false`   |
| `headless`          | Keeps only overlay behavior; the default slot renders no built-in drawer UI.                                                                                                                                                                        | `boolean`         | `false`   |
| `aria-dialog-label` | Accessible name of the native dialog; required under `headless`. `dialog-label` also works.                                                                                                                                                         | `string`          | `''`      |
| `aria-close-label`  | Accessible name of the built-in close button; falls back to the built-in English copy (`Close`).                                                                                                                                                    | `string`          | `''`      |
| `draggable`         | Shows a drag bar on the inner edge of the drawer and enables the drag-to-close gesture.                                                                                                                                                             | `boolean`         | `false`   |
| `page-shift`        | While open, the background page moves toward the drawer's entering direction. The opening order sets layer order and offset, with the same rule for nested and sibling layers; closing any layer recalculates the rest. Inert under reduced motion. | `boolean`         | `false`   |

### Events

| Name          | Description                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `open-change` | User requests opening or closing; `detail.open` is the target state. In controlled mode your app writes `open` back. |

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

`headless` keeps the native dialog, backdrop, placement animation, Escape / backdrop closing behavior, and scroll lock, but renders no built-in glass surface, header, close button, or footer. Your app is responsible for fully defining the styles of the default slot content and must provide `aria-dialog-label` so that the native dialog has an accessible name.

Closing waits for the exit transition to finish. Escape always closes; `no-backdrop-close` only controls backdrop clicks.

With `closable` enabled, the built-in close button sits in the top-right corner of the header, `16px` from the top and `16px` from the right by default, and does not stretch with the content.

The top offset uses `--wui-space-4` and defaults to `16px`, matching the header padding. The right offset is fixed at `16px` and measures the distance from the button to the panel's right edge, which differs from the header's horizontal padding (`20px`).

`--wui-drawer-nested-peek-base` is the base distance each layer exposes when stacked: `43.2px` on desktop and `28.8px` on narrow viewports by default. Setting it on the host or any ancestor changes both at once and applies at any viewport width.

`page-shift` moves the whole page. `position: fixed` content in the page moves with it. Other open dialogs or drawers are not affected.

Set a page background that matches your content so the area exposed by the shift has the same color. With `web-ui-theme`, add this to your global styles:

```css
html {
  background: var(--wui-color-page, #fff);
}
```

With several layers open, the offsets stack by opening order, and nested and sibling layers follow the same rule; closing any layer recalculates the rest.

The page offset does not overwrite a `transform` your app sets on the page, and it can run at the same time as `shake()`.

### Drag to close

With `draggable` enabled, an open drawer shows a gray pill-shaped drag bar on its inner edge. Hold the drag bar or drag the panel directly, then release. Past the distance threshold or after a quick drag the drawer closes; otherwise it returns to the open position. Dragging does not move the page, and with `page-shift` the page stays in place.

Left and right placements have only the drag zone; top and bottom placements can also start from an end drag edge or the whole header / footer. If a press lands on an interactive control, that control receives the press and no drag starts; custom controls need `role` or `tabindex` to be recognized. The upper part of a control that overlaps the drag bar area is covered by the drag area; adjust `--wui-drawer-drag-bar-length` and `--wui-drawer-drag-edge-size` to change it.

A backdrop click closes only on a tap: a gesture that starts on the panel or the backdrop and releases elsewhere does not close.

With `controlled` enabled, releasing past the threshold only dispatches `open-change(false)`; the drawer waits 120ms at the closed position and returns to the open position if your app rejects it or does not write back in time.

Drag-to-open is not supported; a closed drawer has no draggable content. Under `prefers-reduced-motion`, release snaps into place immediately without the closing animation.

### CSS Custom Properties

| Name                              | Description                                                                                                                                                                                                                                                                      | Default                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `--wui-drawer-width`              | Drawer width                                                                                                                                                                                                                                                                     | `320px`                                             |
| `--wui-drawer-height`             | Drawer height (top / bottom)                                                                                                                                                                                                                                                     | `300px`                                             |
| `--wui-drawer-bg`                 | Drawer background color                                                                                                                                                                                                                                                          | `var(--wui-color-surface-overlay)`                  |
| `--wui-drawer-radius`             | Floating card radius (non-headless)                                                                                                                                                                                                                                              | `var(--wui-radius-overlay, 28px)`                   |
| `--wui-drawer-inset`              | Floating card viewport inset (non-headless); set to `0` for edge-to-edge geometry                                                                                                                                                                                                | `8px`                                               |
| `--wui-drawer-inset-top`          | Top inset of a left floating drawer                                                                                                                                                                                                                                              | `--wui-drawer-inset`                                |
| `--wui-drawer-inset-left`         | Left inset of a left floating drawer                                                                                                                                                                                                                                             | `--wui-drawer-inset`                                |
| `--wui-drawer-inset-bottom`       | Bottom inset of a left floating drawer                                                                                                                                                                                                                                           | `--wui-drawer-inset`                                |
| `--wui-drawer-nested-peek-base`   | Exposed-edge base `A` for nested stacking (`28.8px` when `width <= 640px`); the total stack width grows as `A · ln(n)`, so a single layer never moves and each additional layer adds a smaller exposed edge. Set to `0` to disable the exposed edge. See the notes above         | `43.2px`                                            |
| `--wui-drawer-overlay-bg`         | Backdrop background color, taken from `--wui-color-backdrop`                                                                                                                                                                                                                     | `rgb(0 0 0 / 0.12)` light, `rgb(0 0 0 / 0.48)` dark |
| `--wui-drawer-drag-zone-size`     | Thickness of the drag zone that hit-tests drag-to-close (draggable)                                                                                                                                                                                                              | `20px`                                              |
| `--wui-drawer-drag-zone-inset`    | Gap between the drag zone and the section it makes way for (the header when `placement=bottom` / the footer when `placement=top`); 0 when that section does not exist                                                                                                            | `var(--wui-space-1, 4px)`                           |
| `--wui-drawer-drag-bar-thickness` | Drag bar pill thickness (short axis)                                                                                                                                                                                                                                             | `4px`                                               |
| `--wui-drawer-drag-bar-length`    | Drag bar pill length (along the drawer edge)                                                                                                                                                                                                                                     | `56px`                                              |
| `--wui-drawer-drag-edge-size`     | Thickness of the grabbable edge (top and bottom placements only). The hit area includes the pill's outer edge, so the drag area always covers the pill; the default matches `--wui-drawer-drag-zone-size`, so the drag bar is never harder to press than the drag area beside it | `20px`                                              |
| `--wui-drawer-header-padding`     | Header area padding                                                                                                                                                                                                                                                              | `16px 20px`                                         |
| `--wui-drawer-close-top`          | Offset of the built-in close button from the top of the header                                                                                                                                                                                                                   | `16px`                                              |
| `--wui-drawer-close-right`        | Offset of the built-in close button from the right edge of the drawer                                                                                                                                                                                                            | `16px`                                              |
| `--wui-drawer-content-padding`    | Content area padding; the drag bar position is independent of content padding                                                                                                                                                                                                    | `20px`                                              |
| `--wui-drawer-footer-padding`     | Footer area padding                                                                                                                                                                                                                                                              | `16px 20px`                                         |

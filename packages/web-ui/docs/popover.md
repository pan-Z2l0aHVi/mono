---
component: popover
tag: web-ui-popover
---

A popover anchored to a trigger element. It supports three trigger modes, click / hover / manual; the `trigger` slot holds the trigger and the default slot holds the panel content.

## Samples

### Basic

In click mode a click on the trigger toggles the panel, and clicking outside the panel or pressing Escape closes it. Put an interactive element in the trigger (`web-ui-button` or a native `button`); the open state is written back to its `aria-expanded` / `aria-controls`.

`open-change` is dispatched only after user-originated open and close actions, and writing `open` programmatically does not dispatch it; the readout below is the value of the latest notification.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <web-ui-popover
        onopen-change={event => {
          setCount(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <web-ui-button slot="trigger" variant="secondary">
          Show details
        </web-ui-button>
        <div className="flex max-w-xs flex-col gap-1 text-sm">
          <span className="font-semibold">Release details</span>
          <span>The panel accepts any node; click the trigger to toggle, click outside or press Escape to close.</span>
        </div>
      </web-ui-popover>
      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change: {count} times · last detail.open = {last}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <web-ui-popover @open-change="onOpenChange">
      <web-ui-button slot="trigger" variant="secondary">Show details</web-ui-button>
      <div class="flex max-w-xs flex-col gap-1 text-sm">
        <span class="font-semibold">Release details</span>
        <span>The panel accepts any node; click the trigger to toggle, click outside or press Escape to close.</span>
      </div>
    </web-ui-popover>
    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change: {{ count }} times · last detail.open = {{ last }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiPopover } from '@greypan/web-ui'
import { ref } from 'vue'

const count = ref(0)
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiPopover, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### Hover trigger

`trigger="hover"` opens and closes on `pointerenter` / `pointerleave` with a 100ms delay; moving the pointer from the trigger into the panel does not collapse it. Neither click nor focus triggers in this mode, and the readout likewise follows only user-originated `open-change`.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <web-ui-popover
        trigger="hover"
        placement="top"
        onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
      >
        <web-ui-button slot="trigger" variant="secondary">
          Hover me
        </web-ui-button>
        <div className="max-w-xs text-sm">
          A panel shown on hover; it stays open when the pointer moves into it and closes 100ms after leaving.
        </div>
      </web-ui-popover>
      <output className="text-sm text-(--wui-color-text-secondary)">last detail.open = {last}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <web-ui-popover trigger="hover" placement="top" @open-change="last = $event.detail.open ? 'true' : 'false'">
      <web-ui-button slot="trigger" variant="secondary">Hover me</web-ui-button>
      <div class="max-w-xs text-sm">
        A panel shown on hover; it stays open when the pointer moves into it and closes 100ms after leaving.
      </div>
    </web-ui-popover>
    <output class="text-sm text-(--wui-color-text-secondary)">last detail.open = {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const last = ref('—')
</script>
```

### Controlled open state

`trigger="manual"` does not respond to hover, and neither clicking outside the panel nor Escape closes it; the open state is changed by external buttons calling `show()` / `close()`, or by clicking the trigger itself.

`open` is owned by the page state: programmatic calls do not dispatch `open-change`, so the buttons sync the state themselves after calling; when the user clicks the trigger the component toggles and dispatches `open-change`, and the handler writes `detail.open` back into the same state.

The readout below is the `open` held by the page.

```tsx
import type { WebUiPopover } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const panel = useRef<WebUiPopover>(null)
  const [open, setOpen] = useState(false)

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <web-ui-popover ref={panel} trigger="manual" open={open} onopen-change={event => setOpen(event.detail.open)}>
        <web-ui-button slot="trigger" variant="secondary">
          Manual toggle
        </web-ui-button>
        <div className="flex max-w-xs flex-col gap-1 text-sm">
          <span className="font-semibold">manual mode</span>
          <span>
            Does not respond to hover; clicking outside the panel or pressing Escape does not close it either.
          </span>
        </div>
      </web-ui-popover>
      <div className="flex flex-wrap items-center gap-2">
        <web-ui-button
          size="28"
          variant="secondary"
          onClick={() => {
            panel.current?.show()
            setOpen(true)
          }}
        >
          show()
        </web-ui-button>
        <web-ui-button
          size="28"
          variant="secondary"
          onClick={() => {
            panel.current?.close()
            setOpen(false)
          }}
        >
          close()
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">open = {String(open)}</output>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <web-ui-popover ref="panel" trigger="manual" :open="open" @open-change="open = $event.detail.open">
      <web-ui-button slot="trigger" variant="secondary">Manual toggle</web-ui-button>
      <div class="flex max-w-xs flex-col gap-1 text-sm">
        <span class="font-semibold">manual mode</span>
        <span>Does not respond to hover; clicking outside the panel or pressing Escape does not close it either.</span>
      </div>
    </web-ui-popover>
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button size="28" variant="secondary" @click="show">show()</web-ui-button>
      <web-ui-button size="28" variant="secondary" @click="close">close()</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">open = {{ open }}</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiPopover } from '@greypan/web-ui'
import { ref, useTemplateRef } from 'vue'

const panel = useTemplateRef<WebUiPopover>('panel')
const open = ref(false)

function show() {
  panel.value?.show()
  open.value = true
}

function close() {
  panel.value?.close()
  open.value = false
}
</script>
```

## API

### Props

| Name               | Description                                         | Type                             | Default    |
| ------------------ | --------------------------------------------------- | -------------------------------- | ---------- |
| `open`             | Popover visibility.                                 | `boolean`                        | `false`    |
| `disabled`         | Disabled state.                                     | `boolean`                        | `false`    |
| `placement`        | Floating UI placement.                              | `Placement`                      | `'bottom'` |
| `offset`           | Distance from the anchor (px).                      | `number`                         | `8`        |
| `trigger`          | Trigger mode: `click` (default), `hover`, `manual`. | `'click' \| 'hover' \| 'manual'` | `'click'`  |
| `portal`           | Renders in the theme-owned overlay root.            | `boolean`                        | `false`    |
| `overlayContainer` | Explicit Portal container (property).               | `OverlayContainer`               | —          |

### Events

| Name          | Description                                                      |
| ------------- | ---------------------------------------------------------------- |
| `open-change` | The popover opens or closes; `detail.open` is the current state. |

### Slots

| Name      | Description                                   |
| --------- | --------------------------------------------- |
| `trigger` | The trigger; put an interactive element here. |
| `default` | Popover content.                              |

### Methods

| Name       | Description                                                   |
| ---------- | ------------------------------------------------------------- |
| `show()`   | Opens the popover; no effect when `disabled` or already open. |
| `close()`  | Closes the popover; no effect when already closed.            |
| `toggle()` | Toggles according to the current `open`.                      |

### Behavior

Hover mode uses `pointerenter`/`pointerleave` with a delay.

Click mode toggles on click. Manual mode does not respond to hover, and neither clicking outside the panel nor Escape closes it; trigger clicks and `show()` / `close()` all change `open`, and programmatic calls do not dispatch `open-change`.

### trigger ARIA

The open state is written back to the trigger element: `aria-expanded` and `aria-controls` (pointing at the panel) are set on the first assigned element of the `trigger` slot (attributes of the same name on the wrapper are kept for compatibility).

Put an interactive element in the trigger slot (a native button, `web-ui-button`).

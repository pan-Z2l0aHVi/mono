# Popover

A popover anchored to a trigger element. `trigger` declares which gestures can open and close it, as a space-separated set of `click`, `hover`, `focus`, and `manual`. The `trigger` slot holds the trigger and the default slot holds the panel content.

## Samples

### Basic

In click mode, clicking the trigger toggles the panel, and clicking outside the panel or pressing Escape closes it. Put an interactive element in the trigger (`web-ui-button` or a native `button`); the open state is written back to its `aria-expanded` / `aria-controls`.

`open-change` is dispatched only after user-originated open and close actions. Writing `open` programmatically does not dispatch it.

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

`trigger="hover"` opens and closes as the pointer enters and leaves, with a short delay. Moving the pointer from the trigger into the panel does not collapse it. In this value neither click nor focus triggers it; to accept both the pointer and the keyboard, write the gestures side by side: `trigger="hover focus"`.

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

### Focus trigger

`trigger="focus"` opens on keyboard focus: the check matches the browser's own focus ring (`:focus-visible`), so focusing with a mouse click does not count. It closes once focus leaves the trigger and the panel.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-popover trigger="focus" onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}>
          <web-ui-button slot="trigger" variant="secondary">
            Keyboard focus
          </web-ui-button>
          <div className="max-w-xs text-sm">
            Opens when Tab reaches this button and closes once focus leaves; clicking it does not open.
          </div>
        </web-ui-popover>
        <web-ui-popover trigger="click focus" placement="top">
          <web-ui-button slot="trigger" variant="secondary">
            Click or focus
          </web-ui-button>
          <div className="max-w-xs text-sm">Click toggles it, keyboard focus opens it directly.</div>
        </web-ui-popover>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">Keyboard focus last detail.open = {last}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-popover trigger="focus" @open-change="last = $event.detail.open ? 'true' : 'false'">
        <web-ui-button slot="trigger" variant="secondary">Keyboard focus</web-ui-button>
        <div class="max-w-xs text-sm">
          Opens when Tab reaches this button and closes once focus leaves; clicking it does not open.
        </div>
      </web-ui-popover>
      <web-ui-popover trigger="click focus" placement="top">
        <web-ui-button slot="trigger" variant="secondary">Click or focus</web-ui-button>
        <div class="max-w-xs text-sm">Click toggles it, keyboard focus opens it directly.</div>
      </web-ui-popover>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">Keyboard focus last detail.open = {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const last = ref('—')
</script>
```

### Controlled open state

`trigger="manual"` does not respond to hover, and neither clicking outside the panel nor Escape closes it. The open state changes through `show()` / `close()` or by clicking the trigger. Programmatic calls do not dispatch `open-change`, so the caller syncs `open` itself; user-originated changes are written back through `open-change`.

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

| Name               | Description                                                                                                                                                  | Type               | Default    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ---------- |
| `open`             | Popover visibility.                                                                                                                                          | `boolean`          | `false`    |
| `disabled`         | Disabled state.                                                                                                                                              | `boolean`          | `false`    |
| `placement`        | Panel placement; defaults to `bottom`.                                                                                                                       | `Placement`        | `'bottom'` |
| `offset`           | Distance from the anchor (px).                                                                                                                               | `number`           | `8`        |
| `trigger`          | Trigger gesture set, space separated: `click`, `hover`, `focus`, `manual`; the property channel also accepts an array, and it always reads back as a string. | `string`           | `'click'`  |
| `portal`           | Renders in the theme overlay container.                                                                                                                      | `boolean`          | `false`    |
| `overlayContainer` | Explicit Portal container (property).                                                                                                                        | `OverlayContainer` | —          |

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

Each gesture in `trigger` wires up its own events, and the gestures combine freely:

- `click`: clicking the trigger toggles the panel; it closes when you click outside the panel, or once focus leaves the trigger and the panel.
- `hover`: the pointer entering the trigger opens it after a 100ms delay; leaving the trigger and the panel closes it after 100ms. Touch pointers do not count.
- `focus`: keyboard focus (`:focus-visible`) opens it immediately; it closes once focus leaves the trigger and the panel.
- `manual`: nothing closes it automatically — clicking outside, losing focus, and Escape all leave it open.

Escape is arbitrated by the overlay stack: every value except `manual` closes on it, and `manual` swallows the key so it does not reach an outer overlay. Both the trigger click and `show()` / `close()` change `open`; programmatic calls do not dispatch `open-change`.

When `manual` appears in `trigger` the whole value acts as `manual` alone; when it names no known gesture it falls back to the default `click`.

### trigger ARIA

The open state is written back to the trigger element: `aria-expanded` and `aria-controls` (pointing at the panel) are set on the first element in the `trigger` slot.

Put an interactive element in the trigger slot (a native button, `web-ui-button`).

# Popover

A popover anchored to a trigger element. `trigger` declares which gestures can open and close it, as a set of `click`, `hover`, `focus`, and `none`. The `trigger` slot holds the trigger and the default slot holds the panel content.

## Samples

### Basic

In click mode, clicking the trigger toggles the panel, and clicking outside the panel or pressing Escape closes it. Put an interactive element in the trigger (`web-ui-button` or a native `button`); the open state is written back to its `aria-expanded` / `aria-controls`.

`open-change` is dispatched after gestures or `show()` / `hide()` change the open state. Writing `open` directly is silent.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('-')

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
const last = ref('-')

function onOpenChange(event: WebUiEvent<WebUiPopover, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### Hover trigger

`trigger="hover"` opens and closes as the pointer enters and leaves, with delays: entering the trigger opens after `show-delay`, and once the pointer leaves both the trigger and the panel it closes after `hide-delay`. Moving the pointer from the trigger into the panel does not collapse it. In this value neither click nor focus triggers it; to accept both the pointer and the keyboard, write the gestures side by side: `trigger="hover focus"`.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('-')

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

const last = ref('-')
</script>
```

### Focus trigger

`trigger="focus"` opens on keyboard focus: the check matches the browser's own focus ring (`:focus-visible`), so focusing with a mouse click does not count. It closes once focus leaves the trigger and the panel.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('-')

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

const last = ref('-')
</script>
```

### Controlled open state

`trigger="none"` accepts no gesture and takes no part in outside-click closing or Escape. The open state changes only through `show()` / `hide()` or a declarative `open` property. `show()` / `hide()` dispatch `open-change`, so the value can be written back to `open` as below; assigning `open` directly is silent.

```tsx
import type { WebUiPopover } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const panel = useRef<WebUiPopover>(null)
  const [open, setOpen] = useState(false)

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <web-ui-popover ref={panel} trigger="none" open={open} onopen-change={event => setOpen(event.detail.open)}>
        <web-ui-button slot="trigger" variant="secondary">
          Manual toggle
        </web-ui-button>
        <div className="flex max-w-xs flex-col gap-1 text-sm">
          <span className="font-semibold">none mode</span>
          <span>
            Does not respond to gestures; clicking outside the panel or pressing Escape does not close it either.
          </span>
        </div>
      </web-ui-popover>
      <div className="flex flex-wrap items-center gap-2">
        <web-ui-button size="28" variant="secondary" onClick={() => panel.current?.show()}>
          show()
        </web-ui-button>
        <web-ui-button size="28" variant="secondary" onClick={() => panel.current?.hide()}>
          hide()
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
    <web-ui-popover ref="panel" trigger="none" :open="open" @open-change="open = $event.detail.open">
      <web-ui-button slot="trigger" variant="secondary">Manual toggle</web-ui-button>
      <div class="flex max-w-xs flex-col gap-1 text-sm">
        <span class="font-semibold">none mode</span>
        <span
          >Does not respond to gestures; clicking outside the panel or pressing Escape does not close it either.</span
        >
      </div>
    </web-ui-popover>
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button size="28" variant="secondary" @click="panel?.show()">show()</web-ui-button>
      <web-ui-button size="28" variant="secondary" @click="panel?.hide()">hide()</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">open = {{ open }}</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiPopover } from '@greypan/web-ui'
import { ref, useTemplateRef } from 'vue'

const panel = useTemplateRef<WebUiPopover>('panel')
const open = ref(false)
</script>
```

## API

### Props

| Name               | Description                                                                                                                              | Type               | Default    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------- |
| `open`             | Popover visibility.                                                                                                                      | `boolean`          | `false`    |
| `isOpen`           | Whether the panel is currently open (read-only).                                                                                         | `boolean`          | —          |
| `disabled`         | Disabled state.                                                                                                                          | `boolean`          | `false`    |
| `placement`        | Panel placement; defaults to `bottom`.                                                                                                   | `Placement`        | `'bottom'` |
| `offset`           | Distance from the anchor (px).                                                                                                           | `number`           | `8`        |
| `trigger`          | Trigger gesture set, separated by spaces or commas: `click`, `hover`, `focus`, `none`; reads back as a comma-separated canonical string. | `string`           | `'click'`  |
| `show-delay`       | Hover-open delay (milliseconds); only hover-originated opens use it.                                                                     | `number`           | `200`      |
| `hide-delay`       | Hover-close delay (milliseconds); only hover-originated closes use it.                                                                   | `number`           | `100`      |
| `portal`           | Renders in the theme overlay container.                                                                                                  | `boolean`          | `false`    |
| `overlayContainer` | Explicit Portal container (property).                                                                                                    | `OverlayContainer` | —          |

### Events

| Name          | Description                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `open-change` | Dispatched when gestures or `show()` / `hide()` change the open state; `detail.open` is the current state. Writing `open` does not dispatch. |

### Slots

| Name      | Description                                   |
| --------- | --------------------------------------------- |
| `trigger` | The trigger; put an interactive element here. |
| `default` | Popover content.                              |

### Methods

| Name       | Description                                                                                |
| ---------- | ------------------------------------------------------------------------------------------ |
| `show()`   | Opens the popover and dispatches `open-change`; no effect when `disabled` or already open. |
| `hide()`   | Closes the popover and dispatches `open-change`; no effect when already closed.            |
| `toggle()` | Toggles according to the current `open` and dispatches `open-change`.                      |

### Behavior

Each gesture in `trigger` wires up its own events, and the gestures combine freely. Unknown values are dropped; when no known gesture remains it falls back to the default `click`.

- `click`: clicking the trigger toggles the panel; clicking outside the panel closes it. Keyboard activation (Enter / Space) is treated like a click.
- `hover`: pointer entry opens after `show-delay`; once the pointer leaves both the trigger and the panel, it closes after `hide-delay`; focus keeps it open only when `focus` is enabled. Touch pointers do not count.
- `focus`: keyboard focus (`:focus-visible`) opens it immediately; it closes once focus leaves the trigger and the panel.
- `none`: no gesture moves it, and neither outside clicks nor Escape close it; only the `open` property or `show()` / `hide()` does.

`show-delay` / `hide-delay` only apply to hover-originated opens and closes; clicks, focus and programmatic calls act immediately.

Opening requires content in the `default` slot; the `trigger` slot does not count. With nothing to show, gestures do nothing, while `show()` and writing `open` still open an empty panel. Content added while closed does not open it; clearing the content while open collapses the panel immediately without an exit transition.

Outside clicks close layers with `click`; focus loss closes layers with `focus`. Escape is arbitrated by the overlay stack: every value except `none` closes on it, and `none` neither responds to nor intercepts the key, so it continues to an outer overlay.

`open` is a self-managed state. Gestures and `show()` / `hide()` update it, and assigning the property directly also opens or closes the panel, but that write is silent and does not dispatch `open-change`.

### trigger ARIA

The open state is written back to the trigger element: `aria-expanded` and `aria-controls` (pointing at the panel) are set on the first element in the `trigger` slot.

Put an interactive element in the trigger slot (a native button, `web-ui-button`).

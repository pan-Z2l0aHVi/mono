# Dialog

English | [简体中文](./dialog.CN.md)

A modal dialog with a built-in heading bar and a footer, plus a `headless` mode you draw entirely yourself.

## Samples

### Basic

The page owns `open`. A button sets it to true. Escape and backdrop clicks close it from the component side, and the component hands the result back through `open-change`; the page writes it back from `detail.open`.

The footer buttons change `open` directly. That is a programmatic update, so no further event is dispatched.

When the `header` slot is empty, the title comes from `heading`.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [changes, setChanges] = useState(0)
  const [last, setLast] = useState('-')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>Open dialog</web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change: {changes} times · last detail.open = {last}
      </output>
      <web-ui-dialog
        open={open}
        heading="Confirm action"
        onopen-change={event => {
          setChanges(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
          setOpen(event.detail.open)
        }}
      >
        <p className="m-0">This cannot be undone. Continue anyway?</p>
        <web-ui-button slot="footer" full variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </web-ui-button>
        <web-ui-button slot="footer" full variant="danger" onClick={() => setOpen(false)}>
          Delete
        </web-ui-button>
      </web-ui-dialog>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">Open dialog</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change: {{ changes }} times · last detail.open = {{ last }}
    </output>
    <web-ui-dialog :open="open" heading="Confirm action" @open-change="onOpenChange">
      <p class="m-0">This cannot be undone. Continue anyway?</p>
      <web-ui-button slot="footer" full variant="secondary" @click="open = false">Cancel</web-ui-button>
      <web-ui-button slot="footer" full variant="danger" @click="open = false">Delete</web-ui-button>
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

`footer-orientation="horizontal"` lays the footer actions out in one row. When both buttons set `full`, they share the action area's width evenly.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>Open dialog</web-ui-button>
      <web-ui-dialog
        open={open}
        footerOrientation="horizontal"
        heading="Save this message?"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p className="m-0">
          This message has not been sent and contains unsaved changes. Save it as a draft to work on later.
        </p>
        <web-ui-button slot="footer" full variant="secondary" onClick={() => setOpen(false)}>
          Discard
        </web-ui-button>
        <web-ui-button slot="footer" full variant="primary" onClick={() => setOpen(false)}>
          Save draft
        </web-ui-button>
      </web-ui-dialog>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">Open dialog</web-ui-button>
    <web-ui-dialog
      :open="open"
      footer-orientation="horizontal"
      heading="Save this message?"
      @open-change="open = $event.detail.open"
    >
      <p class="m-0">
        This message has not been sent and contains unsaved changes. Save it as a draft to work on later.
      </p>
      <web-ui-button slot="footer" full variant="secondary" @click="open = false">Discard</web-ui-button>
      <web-ui-button slot="footer" full variant="primary" @click="open = false">Save draft</web-ui-button>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### No backdrop close

`no-backdrop-close` only blocks the backdrop click; the footer button and Escape still close the dialog.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>Open dialog</web-ui-button>
      <web-ui-dialog
        open={open}
        noBackdropClose
        heading="The backdrop will not close this"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p className="m-0">Clicking outside the card does nothing. Use the button below or Escape to close it.</p>
        <web-ui-button slot="footer" full variant="secondary" onClick={() => setOpen(false)}>
          Close
        </web-ui-button>
      </web-ui-dialog>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">Open dialog</web-ui-button>
    <web-ui-dialog
      :open="open"
      no-backdrop-close
      heading="The backdrop will not close this"
      @open-change="open = $event.detail.open"
    >
      <p class="m-0">Clicking outside the card does nothing. Use the button below or Escape to close it.</p>
      <web-ui-button slot="footer" full variant="secondary" @click="open = false">Close</web-ui-button>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### Closable without footer

`closable` renders the built-in close button in the card's top-right corner; without a `footer`, that button is the only action supplied by the component.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>Open dialog</web-ui-button>
      <web-ui-dialog
        open={open}
        closable
        heading="Close button only"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p className="m-0">This dialog has no footer. Close it with the top-right button, Escape, or the backdrop.</p>
      </web-ui-dialog>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">Open dialog</web-ui-button>
    <web-ui-dialog :open="open" closable heading="Close button only" @open-change="open = $event.detail.open">
      <p class="m-0">This dialog has no footer. Close it with the top-right button, Escape, or the backdrop.</p>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### Controlled closing

`controlled` hands the closing decision to the page. Escape and backdrop clicks do not change `open`; they only dispatch `open-change` to request closing.

If the page does not write back, the dialog stays open. "Discard changes" in the footer writes `false` directly. That is a programmatic close, and `controlled` does not intercept it.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [requests, setRequests] = useState(0)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>Open dialog</web-ui-button>
      <web-ui-dialog
        open={open}
        controlled
        heading="Unsaved changes"
        onopen-change={event => {
          if (!event.detail.open) setRequests(count => count + 1)
        }}
      >
        <p className="m-0">Escape and the backdrop only request closing; without write-back it stays open.</p>
        <output className="block text-sm text-(--wui-color-text-secondary)">Close requests blocked: {requests}</output>
        <web-ui-button slot="footer" full variant="secondary" onClick={() => setOpen(false)}>
          Discard changes
        </web-ui-button>
      </web-ui-dialog>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">Open dialog</web-ui-button>
    <web-ui-dialog :open="open" controlled heading="Unsaved changes" @open-change="onOpenChange">
      <p class="m-0">Escape and the backdrop only request closing; without write-back it stays open.</p>
      <output class="block text-sm text-(--wui-color-text-secondary)">Close requests blocked · {{ requests }}</output>
      <web-ui-button slot="footer" full variant="secondary" @click="open = false">Discard changes</web-ui-button>
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

`headless` keeps only the overlay behavior: backdrop, enter and exit animations, and scroll lock. The built-in heading bar, content area, and footer are not rendered, and the default slot becomes the scrolling layer inside the card.

There is no built-in heading to associate automatically, so the page must provide `aria-dialog-label`, and it also draws the card appearance and the close button itself.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>Open image details</web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">headless dialog: {open ? 'open' : 'closed'}</output>
      <web-ui-dialog
        open={open}
        headless
        aria-dialog-label="Image details"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="m-0 text-base font-semibold">Morning in the mountains</h2>
              <span className="text-xs text-(--wui-color-text-secondary)">3840 × 2160 · JPEG</span>
            </div>
            <web-ui-button variant="secondary" onClick={() => setOpen(false)}>
              Close
            </web-ui-button>
          </div>
          <div className="flex h-32 items-center justify-center rounded-lg bg-(--wui-color-surface-glass) text-sm text-(--wui-color-text-secondary)">
            Preview area drawn by the page
          </div>
          <web-ui-button variant="primary" onClick={() => setOpen(false)}>
            Done
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
    <web-ui-button @click="open = true">Open image details</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)"> headless dialog: {{ open ? 'open' : 'closed' }} </output>
    <web-ui-dialog :open="open" headless aria-dialog-label="Image details" @open-change="open = $event.detail.open">
      <div class="flex flex-col gap-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex flex-col gap-1">
            <h2 class="m-0 text-base font-semibold">Morning in the mountains</h2>
            <span class="text-xs text-(--wui-color-text-secondary)">3840 × 2160 · JPEG</span>
          </div>
          <web-ui-button variant="secondary" @click="open = false">Close</web-ui-button>
        </div>
        <div
          class="flex h-32 items-center justify-center rounded-lg bg-(--wui-color-surface-glass) text-sm text-(--wui-color-text-secondary)"
        >
          Preview area drawn by the page
        </div>
        <web-ui-button variant="primary" @click="open = false">Done</web-ui-button>
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

| Name                 | Description                                                                                           | Type                         | Default      |
| -------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------- | ------------ |
| `open`               | Dialog visibility.                                                                                    | `boolean`                    | `false`      |
| `closable`           | Shows the built-in close button.                                                                      | `boolean`                    | `false`      |
| `footer-orientation` | Footer action orientation.                                                                            | `'vertical' \| 'horizontal'` | `'vertical'` |
| `no-scroll-lock`     | Does not lock page scrolling while open.                                                              | `boolean`                    | `false`      |
| `no-backdrop-close`  | Prevents closing by clicking the backdrop.                                                            | `boolean`                    | `false`      |
| `no-escape-close`    | Prevents closing with the Escape key.                                                                 | `boolean`                    | `false`      |
| `controlled`         | Escape and the backdrop only request `open=false`, which your app writes back.                        | `boolean`                    | `false`      |
| `heading`            | Title text, the fallback when the `header` slot is empty (ignored under `headless`).                  | `string`                     | `''`         |
| `headless`           | Keeps only the overlay behavior; the built-in heading bar, content area, and footer are not rendered. | `boolean`                    | `false`      |
| `aria-dialog-label`  | Accessible name of the dialog; required under `headless`. `dialog-label` also works.                  | `string`                     | `''`         |
| `aria-close-label`   | Accessible name of the built-in close button; falls back to the built-in English copy (`Close`).      | `string`                     | `''`         |

### Events

| Name          | Description                                                          |
| ------------- | -------------------------------------------------------------------- |
| `open-change` | The open state changed; `detail.open` is the requested target state. |

### Slots

| Name      | Description                                                                           |
| --------- | ------------------------------------------------------------------------------------- |
| `default` | Body content.                                                                         |
| `header`  | Heading bar at the top of the card; when it has content it takes over from `heading`. |
| `footer`  | Action area at the bottom.                                                            |

### Methods

| Name          | Description                                                 |
| ------------- | ----------------------------------------------------------- |
| `showModal()` | Opens the dialog, equivalent to setting `open` to `true`.   |
| `close()`     | Closes the dialog, equivalent to setting `open` to `false`. |

### Behavior

The `header` slot renders the heading bar at the top of the card. It does not scroll, carries its own horizontal padding (`--wui-dialog-inline-padding`), and content never touches the card's inner edge.

The `heading` property is its fallback. Once the slot has content it takes over entirely; when both are empty the whole bar is hidden.

The `default` slot carries the body in both modes. In default mode it sits in the content area between the heading bar and the footer.

The `footer` only owns direction, gap, alignment, and padding; it does not override child styles. It stacks vertically by default, each button still sized by its own content and centered within the row. A button that should fill the action area opts in with `full`. With `footer-orientation="horizontal"`, actions share one row, the gap is fixed to the global `--wui-space-3`, and the row is centered by default.

Under `headless` the whole card is one scrolling layer. The `header`, content area, and `footer` are not rendered, and `heading` stops applying.

Unless `no-escape-close` is set, Escape closes the dialog; unless `no-backdrop-close` is set, clicking the backdrop closes it. With `controlled` enabled, both only dispatch a close request and do not close by themselves.

With `closable` enabled, both the default and `headless` modes render the built-in close button. It uses the same closing path as Escape and backdrop clicks (`controlled` applies to it too).

The close button sits in the card's top-right corner, and the offsets to the top and right edges are controlled by `--wui-dialog-close-top` / `--wui-dialog-close-right` (both `20px` by default).

In default mode the heading bar leaves room for the button, so long content does not run under it.

With `closable` off no close button is rendered.

> Escape ownership: one key press closes only the innermost open overlay (popover, select, autocomplete, dropdown, context-menu, drawer, dialog, and image-preview all participate). For example, with a select open inside a drawer, the first Escape closes only the select and the second closes the drawer. Sibling overlays that do not nest close topmost by open order. A panel that is playing its exit animation still handles Escape, but as long as another overlay is open, that key press belongs to that layer.

> Height semantics: `--wui-dialog-max-height` limits the content area, not the whole card. The heading bar and footer are still sized by their content, the excess scrolls inside the content area, and the host does not have to compute that height. A host that wants to cap the whole card has to measure the heading bar, the footer, and the padding itself and subtract them from that value.
>
> `headless` mode does not use this token: the card hugs its content when it fits and falls back to the viewport height when it does not, with scrolling inside the content area. The built-in close button keeps the position given by `--wui-dialog-close-top` / `--wui-dialog-close-right` while the content scrolls.

### Accessible name

When `aria-dialog-label` is set, it is the accessible name of the dialog. Otherwise, in default mode with a visible heading bar, the name comes from that bar.

`headless` has no built-in heading to point at, so the name must come from your app: `aria-dialog-label`, or a self-drawn heading element that can be associated.

### CSS Custom Properties

| Name                              | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Default                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `--wui-dialog-width`              | Dialog width                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `360px`                                      |
| `--wui-dialog-max-height`         | Maximum height of the content area, not of the whole card. See the height semantics note for the whole-card conversion                                                                                                                                                                                                                                                                                                                                                                                                                         | `90vh` / `min(90vh, 90dvh)` (dvh engines)    |
| `--wui-dialog-close-top`          | Offset of the `closable` button from the top of the card                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `20px`                                       |
| `--wui-dialog-close-right`        | Offset of the `closable` button from the right edge of the card                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `20px`                                       |
| `--wui-dialog-overlay-bg`         | Backdrop background color                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `var(--wui-color-backdrop)`                  |
| `--wui-dialog-bg`                 | Glass card background color, falling back to `rgb(248 248 248 / 0.92)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `var(--wui-color-surface-overlay)`           |
| `--wui-dialog-padding`            | Block-axis padding of the card. The card itself has no inline padding: the heading bar, content area, and footer each carry their own horizontal padding, see `--wui-dialog-inline-padding`                                                                                                                                                                                                                                                                                                                                                    | `20px 24px 24px`                             |
| `--wui-dialog-inline-padding`     | Horizontal padding of the heading bar, the content area, and the footer. The card itself has no inline padding, so the content area's scrollport (its border box) coincides with the card's inner edge and the scrollbar sits flush, while the content keeps this inset. Defaults to `--wui-space-6`                                                                                                                                                                                                                                           | `24px`                                       |
| `--wui-dialog-title-gap`          | Space below the title                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `16px`                                       |
| `--wui-dialog-desc-gap`           | Space below the body content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `24px`                                       |
| `--wui-dialog-desc-focus-padding` | Focus ring allowance reserved on the content area's block axis. The content area is both a scroll container and, because one axis must not be `visible`, a clipping box, so the ring of a control flush with its top or bottom edge is clipped by the padding box; this allowance covers the `5px` ring (`offset: 2` + `width: 3`). Horizontal ring allowance comes from `--wui-dialog-inline-padding` (24px ≫ 5px), so this token only applies to the block axis. A paired negative margin keeps the heading bar and footer heights unchanged | `6px`                                        |
| `--wui-dialog-footer-gap`         | Gap between footer buttons when stacked vertically. The token does not apply when `footer-orientation="horizontal"`, where the gap is fixed to the global `--wui-space-3`.                                                                                                                                                                                                                                                                                                                                                                     | `10px`                                       |
| `--wui-dialog-footer-justify`     | The footer's `justify-content`. The horizontal mode supplies a different default; this token can adjust the alignment                                                                                                                                                                                                                                                                                                                                                                                                                          | `flex-end` (default) / `center` (horizontal) |
| `--wui-dialog-scale-enter`        | Enter scale start point: the card shrinks from `1.1` to `1`, reversed on exit                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `1.1`                                        |

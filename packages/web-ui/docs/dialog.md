---
component: dialog
tag: web-ui-dialog
---

Modal dialog based on the native `<dialog>`'s `showModal()`; supports a built-in heading bar, a footer, and a fully self-drawn `headless` mode.

## Samples

### Basic

`open` is held by the page: a button sets it to true; Escape, backdrop click, and the built-in close button (`closable`) close it from the component side, which then hands the result back through `open-change`, and the page writes it back from `detail.open`.

The buttons in the footer change state directly from the page, which is a programmatic update and does not dispatch another event—so the readout only grows when the user closes from the component side.

`heading` is the title fallback when the `header` slot is empty.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [changes, setChanges] = useState(0)
  const [last, setLast] = useState('—')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>Open dialog</web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change: {changes} times · last detail.open = {last}
      </output>
      <web-ui-dialog
        open={open}
        heading="Confirm action"
        closable
        onopen-change={event => {
          setChanges(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
          setOpen(event.detail.open)
        }}
      >
        <p className="m-0">This cannot be undone. Continue anyway?</p>
        <web-ui-button slot="footer" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </web-ui-button>
        <web-ui-button slot="footer" variant="danger" onClick={() => setOpen(false)}>
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
    <web-ui-dialog :open="open" heading="Confirm action" closable @open-change="onOpenChange">
      <p class="m-0">This cannot be undone. Continue anyway?</p>
      <web-ui-button slot="footer" variant="secondary" @click="open = false">Cancel</web-ui-button>
      <web-ui-button slot="footer" variant="danger" @click="open = false">Delete</web-ui-button>
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

`controlled` hands the closing decision to the page: Escape, backdrop click, and the closable button no longer change `open`; they only dispatch `open-change` to request closing.

If the page does not write back, the dialog stays open, and the `<output>` accumulates the number of blocked requests; "Discard changes" in the footer writes `false` directly, which is a programmatic close that `controlled` does not intercept.

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
        closable
        heading="Unsaved changes"
        onopen-change={event => {
          if (!event.detail.open) setRequests(count => count + 1)
        }}
      >
        <p className="m-0">Escape and the backdrop only request closing; without write-back it stays open.</p>
        <output className="block text-sm text-(--wui-color-text-secondary)">Close requests blocked: {requests}</output>
        <web-ui-button slot="footer" variant="secondary" onClick={() => setOpen(false)}>
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
    <web-ui-dialog :open="open" controlled closable heading="Unsaved changes" @open-change="onOpenChange">
      <p class="m-0">Escape and the backdrop only request closing; without write-back it stays open.</p>
      <output class="block text-sm text-(--wui-color-text-secondary)">Close requests blocked · {{ requests }}</output>
      <web-ui-button slot="footer" variant="secondary" @click="open = false">Discard changes</web-ui-button>
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

`headless` keeps only the overlay infrastructure—backdrop, enter/exit animations, scroll lock, and native `<dialog>` semantics; the built-in chrome bar, content area, and footer are not rendered at all, and the default slot lands directly in the scrolling layer inside the card.

With no built-in heading to associate automatically, `aria-dialog-label` must be provided by the page, and the card appearance and close button are fully self-drawn as well.

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

| Name                | Description                                                                                          | Type      | Default |
| ------------------- | ---------------------------------------------------------------------------------------------------- | --------- | ------- |
| `open`              | Dialog visibility.                                                                                   | `boolean` | `false` |
| `closable`          | Shows the built-in close button.                                                                     | `boolean` | `false` |
| `horizontal`        | Lays the footer action buttons out horizontally.                                                     | `boolean` | `false` |
| `no-scroll-lock`    | Does not lock page scrolling while open.                                                             | `boolean` | `false` |
| `no-backdrop-close` | Prevents closing by clicking the backdrop.                                                           | `boolean` | `false` |
| `no-escape-close`   | Prevents closing with the Escape key.                                                                | `boolean` | `false` |
| `controlled`        | Escape and the backdrop only request `open=false`, which the consumer writes back.                   | `boolean` | `false` |
| `heading`           | Title text, the fallback when the `header` slot is empty (ignored under `headless`).                 | `string`  | `''`    |
| `headless`          | Keeps only the overlay behavior; no longer renders the built-in header bar, content area, or footer. | `boolean` | `false` |
| `aria-dialog-label` | Accessible name of the inner native dialog; required under `headless`.                               | `string`  | `''`    |
| `aria-close-label`  | Accessible name of the built-in close button; falls back to the built-in English copy (`Close`).     | `string`  | `''`    |

### Events

| Name          | Description                                                          |
| ------------- | -------------------------------------------------------------------- |
| `open-change` | The open state changed; `detail.open` is the requested target state. |

### Slots

| Name      | Description                                                                          |
| --------- | ------------------------------------------------------------------------------------ |
| `default` | Body content.                                                                        |
| `header`  | Chrome bar at the top of the card; when it has content it takes over from `heading`. |
| `footer`  | Action area at the bottom.                                                           |

### Methods

| Name          | Description                                                 |
| ------------- | ----------------------------------------------------------- |
| `showModal()` | Opens the dialog, equivalent to setting `open` to `true`.   |
| `close()`     | Closes the dialog, equivalent to setting `open` to `false`. |

### Behavior

The `header` slot is the card's chrome bar: it does not scroll, carries its own horizontal padding (`--wui-dialog-inline-padding`), and content never touches the card's inner edge.

The `heading` property is its fallback—once the slot has assigned elements it takes over entirely, otherwise a non-empty `heading` renders `.wui-dialog-heading`; when both are empty the whole bar is hidden.

The `default` slot carries the body in both modes. In default mode it renders into `.desc` (the card's content area), alongside the `header` bar and `footer`.

Under `headless` the whole card becomes one scrolling layer: the `default` slot renders into `.wui-dialog-content`, the `header` bar, `.desc`, and `footer` are not rendered at all, and `heading` stops applying.

`headless` and `<web-ui-drawer>` share the same mechanism—an explicit boolean property, not a toggle that "puts something into a slot".

It uses the native `<dialog>` and calls `preventDefault` on `@cancel`. Unless `no-escape-close` is present, Escape calls `close()`; unless `no-backdrop-close` is present, clicking the backdrop closes. With `controlled` enabled, both only dispatch a close request without closing themselves.

With `closable` enabled, both the default and `headless` modes render the built-in close button, and it goes through the same closing path as Escape and backdrop click (`controlled` applies to it too).

The position is unified across both modes: the button is absolutely positioned at the card's top-right corner, and the offsets to the two card edges are controlled by `--wui-dialog-close-top` / `--wui-dialog-close-right` (both `20px` by default; the drawer close button is still `16px`).

Only `headless` replaces the whole card; in default mode the `header` bar leaves room for the button, so long content does not run under it.

The icon is the same `ooui:close` as the drawer close button.

With `closable` off nothing is rendered—no button and no extra wrapper.

> **Escape ownership**: Escape is decided by the shared arbiter, and one key press closes only the **innermost** open overlay (popover, select, autocomplete, dropdown, context-menu, drawer, and dialog all participate). For example, with a select open inside a drawer, the first Escape closes only the select and the second closes the drawer. Sibling overlays that do not nest close topmost by open order. A panel that is playing its exit transition is still on stage and still catches Escape—but as long as another overlay is open, that key press still belongs to that layer, so "one key press closes one layer" is unchanged. `image-preview` participates too: its native `<dialog>` registers with the same arbiter and Escape is decided by layer; the component's `cancel` handler only blocks the native instant close, keeping the top layer until the exit transition ends.

> **Height semantics**: This token limits the content area, not the whole card. The `header` bar and footer are still sized by their content, and the excess scrolls inside `.desc`; the card itself is only backed up by the literal `100vh` / `100dvh`, catching the case where "the viewport is too short and even the chrome plus the content-area cap does not fit". A host that wants to cap the **whole card** still has to measure the chrome itself (card block padding + header bar + gaps + footer) and subtract it from the token—the three dialogs in the Interweave frontend subtract 142, 142, and 158. What no longer needs that number is "making the content area scroll": before the change, `.desc` had neither a cap nor `overflow`, and the only thing that could scroll was the inner box the host itself grew, so the host had to compute this height to make it scroll.
>
> **`headless` mode has no `.desc`**, so the token does not take effect in that mode. Under `headless` the `default` slot is wrapped in `.wui-dialog-content` and scrolling happens in that layer; the card still hugs its content when the content fits and is backed up by the same literal `100vh` / `100dvh` when it does not. The built-in close button keeps the position given by `--wui-dialog-close-top` / `--wui-dialog-close-right` while the content scrolls.

### Accessible name

When `aria-dialog-label` is set, the inner native `<dialog>` takes its `aria-label` directly; otherwise, in default mode with a visible `header` bar, it takes `aria-labelledby="wui-dialog-heading"` pointing at that bar.

`headless` has no built-in heading to point at, so **the name must be provided by the consumer**—`aria-dialog-label`, or a self-drawn heading element that can be associated.

### CSS Custom Properties

| Name                              | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Default                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `--wui-dialog-width`              | Dialog width                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `360px`                                      |
| `--wui-dialog-max-height`         | Maximum height of the content area (`.desc`), not of the whole card. Two fallbacks: `90vh` in the base rule, `min(90vh, 90dvh)` inside `@supports (height: 100dvh)`—engines without dvh support only get `90vh`. See the note below for the whole-card conversion                                                                                                                                                                                                                                                                                                               | `90vh` / `min(90vh, 90dvh)` (dvh engines)    |
| `--wui-dialog-close-top`          | Offset of the `closable` button from the top of the card                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `20px`                                       |
| `--wui-dialog-close-right`        | Offset of the `closable` button from the right edge of the card                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `20px`                                       |
| `--wui-dialog-overlay-bg`         | Backdrop background color                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `var(--wui-color-backdrop)`                  |
| `--wui-dialog-bg`                 | Glass card background color, falling back to `rgb(248 248 248 / 0.92)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `var(--wui-color-surface-overlay)`           |
| `--wui-dialog-padding`            | Block padding of the card. The inline component no longer applies to the card: horizontal padding moved to the sections (`.header` / `.desc` / `.wui-dialog-footer`), see `--wui-dialog-inline-padding`                                                                                                                                                                                                                                                                                                                                                                         | `20px 24px 24px`                             |
| `--wui-dialog-inline-padding`     | Horizontal padding of the `header` bar, the content area (`.desc`), and the footer. The card itself has no inline padding, so the content area's scrollport (its border box) coincides with the card's inner edge—the scrollbar sits flush—while the content keeps this inset. Defaults to `--wui-space-6`                                                                                                                                                                                                                                                                      | `24px`                                       |
| `--wui-dialog-title-gap`          | Space below the title                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `16px`                                       |
| `--wui-dialog-desc-gap`           | Space below the body content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `24px`                                       |
| `--wui-dialog-desc-focus-padding` | Focus-ring allowance reserved on the content area's **block axis**. `.desc` is both a scroll container and, because one axis must not be `visible`, a clipping box, so the ring of a control flush with its top or bottom edge is clipped by the padding box; this allowance covers the `5px` ring (`offset: 2` + `width: 3`). Horizontal ring allowance now comes from `--wui-dialog-inline-padding` (24px ≫ 5px), so this token only applies to the block axis—the former inline component no longer takes effect. A paired negative margin keeps the chrome height unchanged | `6px`                                        |
| `--wui-dialog-footer-gap`         | Footer button gap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `10px` / horizontal `12px`                   |
| `--wui-dialog-footer-justify`     | Footer `justify-content`; overridden to `flex-end` in horizontal mode for right alignment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `flex-end` (default) / `center` (horizontal) |
| `--wui-dialog-scale-enter`        | Enter scale start point: shrinks from `1.1` to `1`, reversed on exit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `1.1`                                        |

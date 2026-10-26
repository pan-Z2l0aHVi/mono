---
component: context-menu
tag: web-ui-context-menu
---

Right-click context menu: the first child element is the trigger area and the remaining child elements are menu items (`<web-ui-dropdown-item>` and the like). While open the menu is modal, and clicking blank space only closes the menu.

## Samples

### Basic

The first element in the default slot is the trigger area and the remaining children are menu items: right-click inside the trigger area and the menu opens from the cursor position.

The `prefix` / `suffix` slots hold icons and shortcut hints, and a `disabled` item stays in the menu but cannot be selected.

`open-change` reports opening and closing, with `detail.open` the state at the time; clicking blank space, pressing Escape, or activating an item all close the menu and report once more.

The readout line below counts the events and shows the last `detail.open`.

```tsx
import { lucideClipboardPaste, lucideCopy, lucideTrash2 } from '@greypan/web-ui/icons'
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <web-ui-context-menu
        className="w-full"
        onopen-change={event => {
          setCount(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <div className="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-sm text-(--wui-color-text)">
          Right-click in this area
        </div>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" size={14} icon={lucideCopy}></web-ui-icon>Copy
          <span slot="suffix" className="opacity-40">
            ⌘C
          </span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" size={14} icon={lucideClipboardPaste}></web-ui-icon>Paste
          <span slot="suffix" className="opacity-40">
            ⌘V
          </span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-divider></web-ui-dropdown-divider>
        <web-ui-dropdown-item disabled>
          <web-ui-icon slot="prefix" size={14} icon={lucideTrash2}></web-ui-icon>Delete
          <span slot="suffix" className="opacity-40">
            ⌫
          </span>
        </web-ui-dropdown-item>
      </web-ui-context-menu>
      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change: {count} times · last detail.open = {last}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col items-start gap-3">
    <web-ui-context-menu class="w-full" @open-change="onOpenChange">
      <div
        class="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-sm text-(--wui-color-text)"
      >
        Right-click in this area
      </div>
      <web-ui-dropdown-item>
        <web-ui-icon slot="prefix" :size="14" :icon="lucideCopy"></web-ui-icon>Copy
        <span slot="suffix" class="opacity-40">⌘C</span>
      </web-ui-dropdown-item>
      <web-ui-dropdown-item>
        <web-ui-icon slot="prefix" :size="14" :icon="lucideClipboardPaste"></web-ui-icon>Paste
        <span slot="suffix" class="opacity-40">⌘V</span>
      </web-ui-dropdown-item>
      <web-ui-dropdown-divider></web-ui-dropdown-divider>
      <web-ui-dropdown-item disabled>
        <web-ui-icon slot="prefix" :size="14" :icon="lucideTrash2"></web-ui-icon>Delete
        <span slot="suffix" class="opacity-40">⌫</span>
      </web-ui-dropdown-item>
    </web-ui-context-menu>
    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change: {{ count }} times · last detail.open = {{ last }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiContextMenu, WebUiEvent } from '@greypan/web-ui'
import { lucideClipboardPaste, lucideCopy, lucideTrash2 } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const count = ref(0)
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiContextMenu, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### Touch long press

`long-press` is a touch opt-in: holding for `long-press-delay` (600 ms here) opens the menu, expanding downward from the press point; moving more than 10px during the hold is treated as scrolling and cancels it.

It only responds to `pointerType === 'touch'`; a mouse right-click still goes through the native `contextmenu` and is unaffected by `long-press`.

After a long-press open, the `contextmenu` and `click` that the browser re-dispatches for the same touch are absorbed, so it neither opens twice nor closes the menu that just opened.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <web-ui-context-menu
        className="w-full"
        long-press
        long-press-delay={600}
        onopen-change={event => {
          setCount(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <div className="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-sm text-(--wui-color-text)">
          Press and hold for 600 ms in this area (touch)
        </div>
        <web-ui-dropdown-item>Rename</web-ui-dropdown-item>
        <web-ui-dropdown-item>Move</web-ui-dropdown-item>
      </web-ui-context-menu>
      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change: {count} times · last detail.open = {last}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col items-start gap-3">
    <web-ui-context-menu class="w-full" long-press :long-press-delay="600" @open-change="onOpenChange">
      <div
        class="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-sm text-(--wui-color-text)"
      >
        Press and hold for 600 ms in this area (touch)
      </div>
      <web-ui-dropdown-item>Rename</web-ui-dropdown-item>
      <web-ui-dropdown-item>Move</web-ui-dropdown-item>
    </web-ui-context-menu>
    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change: {{ count }} times · last detail.open = {{ last }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiContextMenu, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const count = ref(0)
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiContextMenu, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### Disabled

`disabled` only suppresses the menu: a right-click does not open it, and the trigger area itself is neither greyed out nor recolored—the component renders no menu surface at all, so there is nothing to grey out, and disabling a context menu is not the same as disabling the trigger area.

The button below toggles `disabled`, and the area text follows the state; the readout records `open-change`, so right-clicks do not count while disabled, and opening works as usual once it is re-enabled.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [disabled, setDisabled] = useState(false)
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <web-ui-context-menu
        className="w-full"
        disabled={disabled}
        onopen-change={event => {
          setCount(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <div className="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-sm text-(--wui-color-text)">
          {disabled ? 'The menu is disabled: right-click does not open it' : 'Right-click in this area'}
        </div>
        <web-ui-dropdown-item>Edit</web-ui-dropdown-item>
        <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
      </web-ui-context-menu>
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="secondary" onClick={() => setDisabled(value => !value)}>
          {disabled ? 'Enable menu' : 'Disable menu'}
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">
          disabled = {String(disabled)} · open-change: {count} times · last detail.open = {last}
        </output>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col items-start gap-3">
    <web-ui-context-menu class="w-full" :disabled="disabled" @open-change="onOpenChange">
      <div
        class="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-sm text-(--wui-color-text)"
      >
        {{ disabled ? 'The menu is disabled: right-click does not open it' : 'Right-click in this area' }}
      </div>
      <web-ui-dropdown-item>Edit</web-ui-dropdown-item>
      <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
    </web-ui-context-menu>
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button variant="secondary" @click="disabled = !disabled">
        {{ disabled ? 'Enable menu' : 'Disable menu' }}
      </web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">
        disabled = {{ disabled }} · open-change: {{ count }} times · last detail.open = {{ last }}
      </output>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiContextMenu, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const disabled = ref(false)
const count = ref(0)
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiContextMenu, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

## API

### Props

| Name               | Description                                                                                 | Type      | Default |
| ------------------ | ------------------------------------------------------------------------------------------- | --------- | ------- |
| `disabled`         | Neither right-click nor `openAt()` opens the menu; no visual greying out.                   | `boolean` | `false` |
| `no-scroll-lock`   | Allows the background to scroll while open.                                                 | `boolean` | `false` |
| `long-press`       | Opens the menu on a touch long press (opt-in; the mouse always goes through `contextmenu`). | `boolean` | `false` |
| `long-press-delay` | How long the press must be held before the long press triggers (ms).                        | `number`  | `500`   |

### Events

| Name          | Description                                                   |
| ------------- | ------------------------------------------------------------- |
| `open-change` | The menu opens or closes; `detail.open` is the current state. |

### Slots

| Name      | Description                                                                      |
| --------- | -------------------------------------------------------------------------------- |
| `default` | The first element is the trigger area and the remaining elements are menu items. |

### Methods

| Name           | Description                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------ |
| `openAt(x, y)` | Opens the menu at viewport coordinates `(x, y)`; an imperative open dispatches no `open-change`. |
| `close()`      | Closes the menu; an imperative close dispatches no `open-change`.                                |

### CSS Custom Properties

| Name                                  | Description                                    | Default                            |
| ------------------------------------- | ---------------------------------------------- | ---------------------------------- |
| `--wui-context-menu-safe-area-bottom` | Bottom inset that a touch menu must leave free | `env(safe-area-inset-bottom, 0px)` |

### Behavior

Opens through the `contextmenu` event. Menu items: `web-ui-dropdown-item`, `web-ui-dropdown-divider`, `web-ui-dropdown-header`. Supports keyboard navigation and submenu hover.

While open the menu is modal: it renders into a transparent `<dialog>` in the browser's top layer, and the page underneath receives no hit testing. So "clicking outside" only closes the menu, and does not also activate the row, checkbox, or link below it.

The scrim is deliberately kept fully transparent—its job is to eat this hit, not to add a scrim layer to the page.

There is another cost worth knowing: during the roughly 160ms exit transition after a menu item is activated, the scrim has already left the top layer, so the page underneath becomes clickable again during that window, and the menu's stacking also falls back to normal flow.

`long-press` is opt-in and touch-only: after the pointer holds for `long-press-delay` (`500` ms by default, matching the platform's native long press) the menu opens, taking exactly the same path as a right-click.

It only responds to `pointerType === 'touch'`; moving more than 10px during the hold cancels it, so scrolling does not open the menu by mistake.

Because the browser also recognizes the same hold as a native gesture, after a long-press open the `contextmenu` and `click` that the engine re-dispatches are absorbed, so it neither opens twice nor immediately light-dismisses the menu that just opened.

A menu opened by `long-press` expands **downward** from the press point: its top edge aligns with the press point's `y` and it is horizontally centered on the press point's `x`, matching the native long-press menus of iOS / Android.

When there is not enough space below, the panel flips above the press point instead of running off screen; both axes are clamped back into the viewport, and `--wui-context-menu-safe-area-bottom` is kept free so the last item does not land in the home indicator.

The split is based on **input method** rather than viewport width: a mouse right-click in a narrow window still expands from the cursor's top-left corner. The two differ only in the amount of horizontal alignment—positioning goes through the same `computePosition` call, so they cannot drift apart.

`disabled` only suppresses menu behavior: neither right-click nor `openAt()` opens the menu.

It does not grey out or recolor the content in the default slot—the component itself renders no menu surface at all, so there is nothing to grey out; disabling a context menu is not the same as disabling the trigger area.

When the disabled state needs to be visually readable, express it on your own content.

While the menu is open, the consumer can safely use conditional rendering (such as Vue `v-if`) to switch, move, or remove menu items without re-inserting them into the host element; changes inside the portal are reconciled automatically, and on close the framework anchor migrates back to the host with the element, so subsequent framework updates keep working.

On close, focus returns to the element that held focus before the menu opened. This is behavior built into the browser's modal dialog rather than implemented by the component—which is also why it only applies while the menu is still in the top layer.

Menu item activation is the only path that returns focus early: it returns at the moment of the click and does not interfere after the exit transition, so if a menu item callback moves focus elsewhere (for example, entering inline edit mode), focus stays there.

The closing process no longer pulls focus away from the new focus target, so components that commit on blur will not submit an edit that was never changed.

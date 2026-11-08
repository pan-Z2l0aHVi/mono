# Context Menu

English | [简体中文](./context-menu.CN.md)

A context menu opened by right-click. The first child element in the default slot is the trigger area and the remaining child elements are menu items (`<web-ui-dropdown-item>` and the like). While open the menu is modal, and clicking blank space only closes the menu.

## Samples

### Basic

The first element in the default slot is the trigger area and the remaining children are menu items. Right-click inside the trigger area and the menu opens from the cursor position. The `prefix` / `suffix` slots hold icons and shortcut hints; a `disabled` item stays in the menu but cannot be selected.

`open-change` reports opening and closing, with `detail.open` holding the state at the time. Clicking blank space, pressing Escape, or activating an item closes the menu and dispatches once more.

```tsx
import { lucideClipboardPaste, lucideCopy, lucideTrash2 } from '@greypan/web-ui/icons'
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('-')

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <web-ui-context-menu
        className="w-full"
        onopen-change={event => {
          setCount(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <div className="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-state-layer-hover) text-sm text-(--wui-color-text)">
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
        class="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-state-layer-hover) text-sm text-(--wui-color-text)"
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
const last = ref('-')

function onOpenChange(event: WebUiEvent<WebUiContextMenu, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### Touch long press

`long-press` is a touch opt-in: holding for `long-press-delay` (600 ms here) opens the menu, which expands downward from the press point. Scrolling during the hold cancels it. It only responds to touch, so a mouse right-click still uses the native `contextmenu`. After a long press opens the menu, the `contextmenu` and `click` that the browser re-dispatches for the same touch are ignored, so the menu neither opens twice nor closes right after opening.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('-')

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
        <div className="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-state-layer-hover) text-sm text-(--wui-color-text)">
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
        class="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-state-layer-hover) text-sm text-(--wui-color-text)"
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
const last = ref('-')

function onOpenChange(event: WebUiEvent<WebUiContextMenu, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### Disabled

`disabled` only suppresses the menu: a right-click does not open it, and the trigger area itself is neither greyed out nor recolored. Disabling a context menu is not the same as disabling the trigger area, so express a visual disabled state on your own content.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [disabled, setDisabled] = useState(false)
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('-')

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
        <div className="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-state-layer-hover) text-sm text-(--wui-color-text)">
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
        class="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-state-layer-hover) text-sm text-(--wui-color-text)"
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
const last = ref('-')

function onOpenChange(event: WebUiEvent<WebUiContextMenu, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

## API

### Props

| Name               | Description                                                                         | Type      | Default |
| ------------------ | ----------------------------------------------------------------------------------- | --------- | ------- |
| `disabled`         | Neither right-click nor `openAt()` opens the menu; no visual greying out.           | `boolean` | `false` |
| `no-scroll-lock`   | Allows the background to scroll while open.                                         | `boolean` | `false` |
| `long-press`       | Opens the menu on a touch long press (opt-in; the mouse always uses `contextmenu`). | `boolean` | `false` |
| `long-press-delay` | How long the press must be held before the long press triggers (ms).                | `number`  | `500`   |

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

Menu items: `web-ui-dropdown-item`, `web-ui-dropdown-divider`, `web-ui-dropdown-header`. Supports keyboard navigation and submenu hover.

While open the menu is modal: the page underneath receives no pointer events, so clicking outside only closes the menu and does not also activate the row, checkbox, or link below it. After a menu item is activated there is a roughly 160ms exit transition, during which the page underneath becomes clickable again.

`long-press` is opt-in and touch-only: after holding for `long-press-delay` (`500` ms by default) the menu opens, the same way as a right-click. Scrolling during the hold cancels it, so the menu does not open by mistake. The `contextmenu` and `click` that the browser re-dispatches for the same touch are ignored, so the menu neither opens twice nor closes right after opening.

A menu opened by `long-press` expands downward from the press point and is centered horizontally on it. When there is not enough space below, it flips above the press point, is clamped back into the viewport, and stays clear of `--wui-context-menu-safe-area-bottom` so the last item does not land in the home indicator.

The split follows the input method, not the viewport width: a mouse right-click in a narrow window still expands from the cursor's top-left corner.

`disabled` only suppresses menu behavior: neither right-click nor `openAt()` opens the menu. It also does not grey out or recolor the content in the default slot. Disabling a context menu is not the same as disabling the trigger area, so express a visual disabled state on your own content.

While the menu is open you can safely use conditional rendering (such as Vue `v-if`) to switch, move, or remove menu items without re-inserting them into the host element.

On close, focus returns to the element that had focus before the menu opened. Menu item activation is the only path that returns focus early: it returns focus at the moment of the click and does not interfere afterwards. So if a callback moves focus elsewhere (for example, entering inline edit mode), focus stays there. Closing also does not move focus away from the new target, so components that commit on blur will not submit an edit that was never changed.

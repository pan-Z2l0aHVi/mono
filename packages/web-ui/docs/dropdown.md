# Dropdown

A dropdown menu. The `trigger` slot holds the trigger, and the remaining children render as menu items inside the overlay panel. Dividers, group headers, and multi-level submenus are supported.

## Samples

### Basic

Put an interactive element in `trigger`; the remaining children render as menu items inside the overlay panel. `divider` separates groups; `disabled` items stay in the list but cannot be selected.

```tsx
export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        Actions
      </web-ui-button>
      <web-ui-dropdown-item value="edit">Edit</web-ui-dropdown-item>
      <web-ui-dropdown-item value="copy">Copy</web-ui-dropdown-item>
      <web-ui-dropdown-item value="paste">Paste</web-ui-dropdown-item>
      <web-ui-dropdown-divider></web-ui-dropdown-divider>
      <web-ui-dropdown-item value="delete" disabled>
        Delete
      </web-ui-dropdown-item>
    </web-ui-dropdown>
  )
}
```

```vue
<template>
  <web-ui-dropdown>
    <web-ui-button slot="trigger" variant="secondary">Actions</web-ui-button>
    <web-ui-dropdown-item value="edit">Edit</web-ui-dropdown-item>
    <web-ui-dropdown-item value="copy">Copy</web-ui-dropdown-item>
    <web-ui-dropdown-item value="paste">Paste</web-ui-dropdown-item>
    <web-ui-dropdown-divider></web-ui-dropdown-divider>
    <web-ui-dropdown-item value="delete" disabled>Delete</web-ui-dropdown-item>
  </web-ui-dropdown>
</template>
```

### Icons and shortcuts

The `prefix` / `suffix` slots decorate both sides of a menu item, and `dropdown-header` adds a title to a group of items. Shortcuts are just text; the component does not parse keys.

```tsx
import { lucideCopy, lucideTrash2 } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        File
      </web-ui-button>
      <web-ui-dropdown-header>Edit</web-ui-dropdown-header>
      <web-ui-dropdown-item value="copy">
        <web-ui-icon slot="prefix" size={14} icon={lucideCopy}></web-ui-icon>Copy
        <span slot="suffix" className="opacity-40">
          ⌘C
        </span>
      </web-ui-dropdown-item>
      <web-ui-dropdown-item value="delete" disabled>
        <web-ui-icon slot="prefix" size={14} icon={lucideTrash2}></web-ui-icon>Delete
        <span slot="suffix" className="opacity-40">
          ⌘⌫
        </span>
      </web-ui-dropdown-item>
    </web-ui-dropdown>
  )
}
```

```vue
<template>
  <web-ui-dropdown>
    <web-ui-button slot="trigger" variant="secondary">File</web-ui-button>
    <web-ui-dropdown-header>Edit</web-ui-dropdown-header>
    <web-ui-dropdown-item value="copy">
      <web-ui-icon slot="prefix" :size="14" :icon="lucideCopy"></web-ui-icon>Copy
      <span slot="suffix" class="opacity-40">⌘C</span>
    </web-ui-dropdown-item>
    <web-ui-dropdown-item value="delete" disabled>
      <web-ui-icon slot="prefix" :size="14" :icon="lucideTrash2"></web-ui-icon>Delete
      <span slot="suffix" class="opacity-40">⌘⌫</span>
    </web-ui-dropdown-item>
  </web-ui-dropdown>
</template>

<script setup lang="ts">
import { lucideCopy, lucideTrash2 } from '@greypan/web-ui/icons'
</script>
```

### Multi-level submenu

Writing `submenu` on a menu item makes the items nested inside it the next level. Hovering or the arrow keys enter that level.

```tsx
export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        File
      </web-ui-button>
      <web-ui-dropdown-item submenu>
        New
        <web-ui-dropdown-item submenu>
          Office document
          <web-ui-dropdown-item value="word">Word document</web-ui-dropdown-item>
          <web-ui-dropdown-item value="excel">Excel spreadsheet</web-ui-dropdown-item>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item submenu>
          Code file
          <web-ui-dropdown-item value="typescript">TypeScript</web-ui-dropdown-item>
          <web-ui-dropdown-item value="python">Python</web-ui-dropdown-item>
        </web-ui-dropdown-item>
      </web-ui-dropdown-item>
      <web-ui-dropdown-item value="export">Export</web-ui-dropdown-item>
    </web-ui-dropdown>
  )
}
```

```vue
<template>
  <web-ui-dropdown>
    <web-ui-button slot="trigger" variant="secondary">File</web-ui-button>
    <web-ui-dropdown-item submenu>
      New
      <web-ui-dropdown-item submenu>
        Office document
        <web-ui-dropdown-item value="word">Word document</web-ui-dropdown-item>
        <web-ui-dropdown-item value="excel">Excel spreadsheet</web-ui-dropdown-item>
      </web-ui-dropdown-item>
      <web-ui-dropdown-item submenu>
        Code file
        <web-ui-dropdown-item value="typescript">TypeScript</web-ui-dropdown-item>
        <web-ui-dropdown-item value="python">Python</web-ui-dropdown-item>
      </web-ui-dropdown-item>
    </web-ui-dropdown-item>
    <web-ui-dropdown-item value="export">Export</web-ui-dropdown-item>
  </web-ui-dropdown>
</template>
```

### Trigger modes

`trigger` is a gesture set separated by spaces or commas: `click`, `hover`, `focus`, `none`. It defaults to `click`. `hover` opens and closes with pointer entry and exit, and moving the pointer from the trigger into the panel does not collapse it; `focus` opens on keyboard focus (`:focus-visible`); gestures can be written side by side.

`none` accepts no gesture and takes no part in outside-click closing, focus loss or Escape; only the `open` property or `show()` / `hide()` moves it. `none` and gestures are mutually exclusive: when both appear, `none` wins and a development warning is printed.

`show-delay` / `hide-delay` only apply to hover-originated opens and closes; clicks, focus and programmatic calls act immediately.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-dropdown onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}>
          <web-ui-button slot="trigger" variant="secondary">
            Click menu
          </web-ui-button>
          <web-ui-dropdown-item>Edit</web-ui-dropdown-item>
          <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
        </web-ui-dropdown>
        <web-ui-dropdown trigger="hover focus" onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}>
          <web-ui-button slot="trigger" variant="secondary">
            Hover or focus
          </web-ui-button>
          <web-ui-dropdown-item>Edit</web-ui-dropdown-item>
          <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
        </web-ui-dropdown>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">Last detail.open = {last}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-dropdown @open-change="last = $event.detail.open ? 'true' : 'false'">
        <web-ui-button slot="trigger" variant="secondary">Click menu</web-ui-button>
        <web-ui-dropdown-item>Edit</web-ui-dropdown-item>
        <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
      </web-ui-dropdown>
      <web-ui-dropdown trigger="hover focus" @open-change="last = $event.detail.open ? 'true' : 'false'">
        <web-ui-button slot="trigger" variant="secondary">Hover or focus</web-ui-button>
        <web-ui-dropdown-item>Edit</web-ui-dropdown-item>
        <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
      </web-ui-dropdown>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">Last detail.open = {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const last = ref('—')
</script>
```

### Controlled open state

`open` is held by the page. An external button changes it directly (writing `open` is silent); the trigger, Escape, and outside clicks write back through `open-change`. Clicking a menu item does not close the menu automatically, so write back in the item's native click.

```tsx
import type { WebUiDropdownItem } from '@greypan/web-ui'
import { useCallback, useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState('-')

  // Menu items move into the portal panel when opened, so React's onClick delegation at the root container never sees them; attach a native click here instead.
  const handleItemRef = useCallback((item: WebUiDropdownItem | null) => {
    if (!item) return
    const element = item
    const close = () => {
      setLast(element.textContent?.trim() || element.value)
      setOpen(false)
    }
    element.addEventListener('click', close)
    return () => element.removeEventListener('click', close)
  }, [])

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="secondary" onClick={() => setOpen(value => !value)}>
          {open ? 'Close menu' : 'Open menu'}
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">
          State: {open ? 'open' : 'closed'} · Last selection: {last}
        </output>
      </div>

      <web-ui-dropdown open={open} onopen-change={event => setOpen(event.detail.open)}>
        <web-ui-button slot="trigger" variant="secondary">
          Controlled menu
        </web-ui-button>
        <web-ui-dropdown-item ref={handleItemRef} value="edit">
          Edit
        </web-ui-dropdown-item>
        <web-ui-dropdown-item ref={handleItemRef} value="copy">
          Copy
        </web-ui-dropdown-item>
        <web-ui-dropdown-item ref={handleItemRef} value="archive">
          Archive
        </web-ui-dropdown-item>
      </web-ui-dropdown>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button variant="secondary" @click="open = !open">
        {{ open ? 'Close menu' : 'Open menu' }}
      </web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">
        State: {{ open ? 'open' : 'closed' }} · Last selection: {{ last }}
      </output>
    </div>

    <web-ui-dropdown :open="open" @open-change="open = $event.detail.open">
      <web-ui-button slot="trigger" variant="secondary">Controlled menu</web-ui-button>
      <web-ui-dropdown-item value="edit" @click="select('Edit')">Edit</web-ui-dropdown-item>
      <web-ui-dropdown-item value="copy" @click="select('Copy')">Copy</web-ui-dropdown-item>
      <web-ui-dropdown-item value="archive" @click="select('Archive')">Archive</web-ui-dropdown-item>
    </web-ui-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const last = ref('-')

function select(label: string) {
  last.value = label
  open.value = false
}
</script>
```

### Placement

`placement` defaults to `bottom-start`; when there is not enough space, the panel flips or shifts automatically.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <web-ui-dropdown placement="bottom-start">
        <web-ui-button slot="trigger" variant="secondary">
          bottom-start (default)
        </web-ui-button>
        <web-ui-dropdown-item>New</web-ui-dropdown-item>
        <web-ui-dropdown-item>Open</web-ui-dropdown-item>
      </web-ui-dropdown>

      <web-ui-dropdown placement="bottom-end">
        <web-ui-button slot="trigger" variant="secondary">
          bottom-end
        </web-ui-button>
        <web-ui-dropdown-item>New</web-ui-dropdown-item>
        <web-ui-dropdown-item>Open</web-ui-dropdown-item>
      </web-ui-dropdown>

      <web-ui-dropdown placement="top-start">
        <web-ui-button slot="trigger" variant="secondary">
          top-start
        </web-ui-button>
        <web-ui-dropdown-item>New</web-ui-dropdown-item>
        <web-ui-dropdown-item>Open</web-ui-dropdown-item>
      </web-ui-dropdown>

      <web-ui-dropdown placement="top-end">
        <web-ui-button slot="trigger" variant="secondary">
          top-end
        </web-ui-button>
        <web-ui-dropdown-item>New</web-ui-dropdown-item>
        <web-ui-dropdown-item>Open</web-ui-dropdown-item>
      </web-ui-dropdown>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-start gap-3">
    <web-ui-dropdown placement="bottom-start">
      <web-ui-button slot="trigger" variant="secondary">bottom-start (default)</web-ui-button>
      <web-ui-dropdown-item>New</web-ui-dropdown-item>
      <web-ui-dropdown-item>Open</web-ui-dropdown-item>
    </web-ui-dropdown>

    <web-ui-dropdown placement="bottom-end">
      <web-ui-button slot="trigger" variant="secondary">bottom-end</web-ui-button>
      <web-ui-dropdown-item>New</web-ui-dropdown-item>
      <web-ui-dropdown-item>Open</web-ui-dropdown-item>
    </web-ui-dropdown>

    <web-ui-dropdown placement="top-start">
      <web-ui-button slot="trigger" variant="secondary">top-start</web-ui-button>
      <web-ui-dropdown-item>New</web-ui-dropdown-item>
      <web-ui-dropdown-item>Open</web-ui-dropdown-item>
    </web-ui-dropdown>

    <web-ui-dropdown placement="top-end">
      <web-ui-button slot="trigger" variant="secondary">top-end</web-ui-button>
      <web-ui-dropdown-item>New</web-ui-dropdown-item>
      <web-ui-dropdown-item>Open</web-ui-dropdown-item>
    </web-ui-dropdown>
  </div>
</template>
```

### Imperative

`show()` opens the menu and `hide()` closes all levels. Both dispatch `open-change`. `disabled` blocks both trigger clicks and `show()`.

```tsx
import type { WebUiDropdown } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const menu = useRef<WebUiDropdown>(null)

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="secondary" onClick={() => menu.current?.show()}>
          Call show()
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={() => menu.current?.hide()}>
          Call hide()
        </web-ui-button>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <web-ui-dropdown ref={menu}>
          <web-ui-button slot="trigger" variant="secondary">
            Imperative menu
          </web-ui-button>
          <web-ui-dropdown-item value="edit">Edit</web-ui-dropdown-item>
          <web-ui-dropdown-item submenu>
            More
            <web-ui-dropdown-item value="archive">Archive</web-ui-dropdown-item>
          </web-ui-dropdown-item>
        </web-ui-dropdown>

        <web-ui-dropdown disabled>
          <web-ui-button slot="trigger" variant="secondary">
            Disabled menu
          </web-ui-button>
          <web-ui-dropdown-item>Cannot be opened</web-ui-dropdown-item>
        </web-ui-dropdown>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button variant="secondary" @click="menu?.show()">Call show()</web-ui-button>
      <web-ui-button variant="secondary" @click="menu?.hide()">Call hide()</web-ui-button>
    </div>

    <div class="flex flex-wrap items-start gap-3">
      <web-ui-dropdown ref="menu">
        <web-ui-button slot="trigger" variant="secondary">Imperative menu</web-ui-button>
        <web-ui-dropdown-item value="edit">Edit</web-ui-dropdown-item>
        <web-ui-dropdown-item submenu>
          More
          <web-ui-dropdown-item value="archive">Archive</web-ui-dropdown-item>
        </web-ui-dropdown-item>
      </web-ui-dropdown>

      <web-ui-dropdown disabled>
        <web-ui-button slot="trigger" variant="secondary">Disabled menu</web-ui-button>
        <web-ui-dropdown-item>Cannot be opened</web-ui-dropdown-item>
      </web-ui-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiDropdown } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const menu = useTemplateRef<WebUiDropdown>('menu')
</script>
```

## API

### Props

| Name             | Description                                                                                                                              | Type        | Default          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------- |
| `open`           | Menu visibility.                                                                                                                         | `boolean`   | `false`          |
| `disabled`       | Disabled state.                                                                                                                          | `boolean`   | `false`          |
| `match-width`    | Panel width matches the trigger width.                                                                                                   | `boolean`   | `false`          |
| `no-scroll-lock` | Does not lock page scrolling while open.                                                                                                 | `boolean`   | `false`          |
| `placement`      | Panel placement; defaults to `bottom-start`.                                                                                             | `Placement` | `'bottom-start'` |
| `offset`         | Distance from the trigger (px).                                                                                                          | `number`    | `4`              |
| `trigger`        | Trigger gesture set, separated by spaces or commas: `click`, `hover`, `focus`, `none`; reads back as a comma-separated canonical string. | `string`    | `'click'`        |
| `show-delay`     | Hover-open delay (milliseconds); only hover-originated opens use it.                                                                     | `number`    | `200`            |
| `hide-delay`     | Hover-close delay (milliseconds); only hover-originated closes use it.                                                                   | `number`    | `100`            |
| `isOpen`         | Whether the menu is currently open (read-only).                                                                                          | `boolean`   | —                |

### Events

| Name          | Description                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `open-change` | Dispatched when gestures or `show()` / `hide()` change the open state; `detail.open` is the current state. Writing `open` does not dispatch. |

### Slots

| Name      | Description                                |
| --------- | ------------------------------------------ |
| `trigger` | Trigger; put an interactive element in it. |

### Methods

| Name       | Description                                                                  |
| ---------- | ---------------------------------------------------------------------------- |
| `show()`   | Opens the menu and dispatches `open-change`; available under `none` as well. |
| `hide()`   | Closes all levels and dispatches `open-change`.                              |
| `toggle()` | Toggles according to the current `open` and dispatches `open-change`.        |

### Behavior

Menu items: `web-ui-dropdown-item`, `web-ui-dropdown-divider`, `web-ui-dropdown-header`. A submenu is enabled on `web-ui-dropdown-item` through the `submenu` attribute. Full keyboard navigation is supported.

Opening requires content: with no root-level menu item, divider or header (including ones inside framework wrappers), click, keyboard gestures and hover do nothing; `hidden` subtrees do not count. `show()` and writing `open` still open an empty menu, and content added while closed does not open it. If the last content disappears while the menu is open, it collapses immediately without an exit transition.

`hover` opens and closes with pointer entry and exit; moving the pointer from the trigger into the panel does not collapse it, and once the pointer leaves both the trigger and the panel it closes after `hide-delay` when focus is outside them if `focus` is enabled. `show-delay` / `hide-delay` only apply to hover-originated opens and closes; clicks, focus and programmatic calls act immediately. Outside clicks close menus with `click`, focus loss closes menus with `focus`, and Escape closes menus except those in `none`.

`open` can be assigned directly; that write is silent and does not dispatch `open-change`.

### Trigger ARIA

`aria-haspopup="menu"`, `aria-expanded`, and `aria-controls` (pointing at the root menu panel) are written back to the first element in the `trigger` slot. Put an interactive element in the trigger slot.

# Dropdown

dropdown menu: the `trigger` slot holds the trigger and the remaining children render as menu items inside the overlay panel, with support for dividers, group headers, and multi-level submenus.

## Samples

### Basic

`trigger` holds an interactive element, and the remaining children move into the overlay panel as menu items when opened; `divider` separates groups, and `disabled` items stay in the list but cannot be selected.

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

The `prefix` / `suffix` slots decorate both sides of a menu item, and `dropdown-header` adds a title to a group of items; shortcuts are just text and the component does not parse keys.

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

Writing `submenu` on a menu item makes the items nested inside it the next level; hover or the arrow keys enter it, and every level is its own panel.

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

### Controlled open state

`open` is held by the page: an external button changes it directly, while the trigger, Escape, and outside clicks write back through `open-change`; clicking a menu item does not close automatically, so the code writes back in the item's native click.

```tsx
import type { WebUiDropdownItem } from '@greypan/web-ui'
import { useCallback, useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState('—')

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
const last = ref('—')

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

`openMenu()` opens and `closeAll()` closes all levels; both are imperative entry points and do not dispatch `open-change`. `disabled` blocks both trigger clicks and `openMenu()`.

```tsx
import type { WebUiDropdown } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const menu = useRef<WebUiDropdown>(null)

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="secondary" onClick={() => menu.current?.openMenu()}>
          Call openMenu()
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={() => menu.current?.closeAll()}>
          Call closeAll()
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
      <web-ui-button variant="secondary" @click="menu?.openMenu()">Call openMenu()</web-ui-button>
      <web-ui-button variant="secondary" @click="menu?.closeAll()">Call closeAll()</web-ui-button>
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

| Name             | Description                                  | Type        | Default          |
| ---------------- | -------------------------------------------- | ----------- | ---------------- |
| `open`           | Menu visibility.                             | `boolean`   | `false`          |
| `disabled`       | Disabled state.                              | `boolean`   | `false`          |
| `match-width`    | Panel width matches the trigger width.       | `boolean`   | `false`          |
| `no-scroll-lock` | Does not lock page scrolling while open.     | `boolean`   | `false`          |
| `placement`      | Panel placement; defaults to `bottom-start`. | `Placement` | `'bottom-start'` |
| `offset`         | Distance from the trigger (px).              | `number`    | `4`              |

### Events

| Name          | Description                                                  |
| ------------- | ------------------------------------------------------------ |
| `open-change` | Menu open state changes; `detail.open` is the current state. |

### Slots

| Name      | Description                                |
| --------- | ------------------------------------------ |
| `trigger` | Trigger; put an interactive element in it. |

### Methods

| Name         | Description                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `openMenu()` | Opens the menu; an imperative open does not dispatch `open-change` and suppresses the accent highlight of the first item. |
| `closeAll()` | Closes all levels; an imperative close does not dispatch `open-change`.                                                   |

### Behavior

Menu items: `web-ui-dropdown-item`, `web-ui-dropdown-divider`, `web-ui-dropdown-header`. A submenu is enabled on `web-ui-dropdown-item` through the `submenu` attribute. Full keyboard navigation is supported.

### Trigger ARIA

`aria-haspopup="menu"`, `aria-expanded`, and `aria-controls` (pointing at the root menu panel) are written back to the first assigned element of the `trigger` slot. Put an interactive element in the trigger slot.

---
component: dropdown-item
tag: web-ui-dropdown-item
---

A menu item for `<web-ui-dropdown>` and `<web-ui-context-menu>`: `disabled` keeps it in the menu but unselectable, and both keyboard navigation and hover skip it; the `prefix` / `suffix` slots hold icons and shortcut hints at either end; `submenu` attaches a nested submenu at its next level.

It dispatches no events of its own, and `value` is not consumed by the menu—it is an identifier left for the consumer to read in the native `click`.

## Samples

### Basic menu

A menu item is a child of the host and is moved into the overlay panel when opened; a `disabled` item stays in the list but cannot be selected.

```tsx
export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        Actions
      </web-ui-button>
      <web-ui-dropdown-item value="edit">Edit</web-ui-dropdown-item>
      <web-ui-dropdown-item value="copy">Copy</web-ui-dropdown-item>
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
    <web-ui-dropdown-item value="delete" disabled>Delete</web-ui-dropdown-item>
  </web-ui-dropdown>
</template>
```

### Icons and shortcuts

`prefix` / `suffix` are the two decoration slots; `pl` writes the left padding onto the item itself, so that a plain text item lines up with an item carrying a 14px icon (8px padding + 14px icon + 8px gap).

```tsx
import { lucideCopy, lucideTrash2 } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        File
      </web-ui-button>
      <web-ui-dropdown-item>
        <web-ui-icon slot="prefix" size={14} icon={lucideCopy}></web-ui-icon>Copy
        <span slot="suffix" className="opacity-40">
          ⌘C
        </span>
      </web-ui-dropdown-item>
      <web-ui-dropdown-item disabled>
        <web-ui-icon slot="prefix" size={14} icon={lucideTrash2}></web-ui-icon>Delete
      </web-ui-dropdown-item>
      <web-ui-dropdown-item pl="30px">Rename</web-ui-dropdown-item>
    </web-ui-dropdown>
  )
}
```

```vue
<template>
  <web-ui-dropdown>
    <web-ui-button slot="trigger" variant="secondary">File</web-ui-button>
    <web-ui-dropdown-item>
      <web-ui-icon slot="prefix" :size="14" :icon="lucideCopy"></web-ui-icon>Copy
      <span slot="suffix" class="opacity-40">⌘C</span>
    </web-ui-dropdown-item>
    <web-ui-dropdown-item disabled>
      <web-ui-icon slot="prefix" :size="14" :icon="lucideTrash2"></web-ui-icon>Delete
    </web-ui-dropdown-item>
    <web-ui-dropdown-item pl="30px">Rename</web-ui-dropdown-item>
  </web-ui-dropdown>
</template>

<script setup lang="ts">
import { lucideCopy, lucideTrash2 } from '@greypan/web-ui/icons'
</script>
```

### Items with a submenu

`submenu` turns the item into an entry to the menu level below it: menu items nested inside it become the next level, an expand arrow grows on the right, and both hovering and the arrow keys enter it.

```tsx
export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        More
      </web-ui-button>
      <web-ui-dropdown-item value="undo">Undo</web-ui-dropdown-item>
      <web-ui-dropdown-item submenu>
        Export as
        <web-ui-dropdown-item value="pdf">PDF</web-ui-dropdown-item>
        <web-ui-dropdown-item value="png">PNG</web-ui-dropdown-item>
      </web-ui-dropdown-item>
    </web-ui-dropdown>
  )
}
```

```vue
<template>
  <web-ui-dropdown>
    <web-ui-button slot="trigger" variant="secondary">More</web-ui-button>
    <web-ui-dropdown-item value="undo">Undo</web-ui-dropdown-item>
    <web-ui-dropdown-item submenu>
      Export as
      <web-ui-dropdown-item value="pdf">PDF</web-ui-dropdown-item>
      <web-ui-dropdown-item value="png">PNG</web-ui-dropdown-item>
    </web-ui-dropdown-item>
  </web-ui-dropdown>
</template>
```

## API

### Props

| Name       | Description                                                                                                 | Type      | Default |
| ---------- | ----------------------------------------------------------------------------------------------------------- | --------- | ------- |
| `disabled` | Disabled item: stays in the menu but cannot be selected; keyboard navigation and hover skip it.             | `boolean` | `false` |
| `pl`       | Left padding of the item, written as a CSS length; used to align items with and without a `prefix` icon.    | `string`  | `''`    |
| `value`    | The item's identifier, read by the consumer in the native `click`; the menu itself does not consume it.     | `string`  | `''`    |
| `submenu`  | Acts as a submenu entry: nested menu items become the next level and an expand arrow is shown on the right. | `boolean` | `false` |

### Slots

| Name      | Description                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------- |
| `prefix`  | Icon or marker to the left of the text.                                                                                 |
| `default` | The item's text; also the host position of submenu items.                                                               |
| `suffix`  | Shortcut hints and the like to the right of the text; this position is taken by the expand arrow when `submenu` is set. |

### Methods

| Name          | Description                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `focusItem()` | Focuses the menu item through a visible element, so focus is not lost across a Shadow DOM boundary. |

### Behavior

Role: `menuitem`.

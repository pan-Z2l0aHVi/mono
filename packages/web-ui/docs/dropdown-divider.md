---
component: dropdown-divider
tag: web-ui-dropdown-divider
---

A divider inside a menu, used to separate groups of menu items.

It has no props, events, or slots and does not take part in keyboard navigation—the menu only stops focus on `<web-ui-dropdown-item>`, and the divider itself only declares `role="separator"`.

It appears among the children of `<web-ui-dropdown>` / `<web-ui-context-menu>`.

## Samples

### Group divider {#basic}

A divider sits between two groups of menu items, spans the full width of the menu panel, and leaves a little horizontal margin on both sides.

```tsx
export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        Actions
      </web-ui-button>
      <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
      <web-ui-dropdown-item>Paste</web-ui-dropdown-item>
      <web-ui-dropdown-divider></web-ui-dropdown-divider>
      <web-ui-dropdown-item disabled>Delete</web-ui-dropdown-item>
    </web-ui-dropdown>
  )
}
```

```vue
<template>
  <web-ui-dropdown>
    <web-ui-button slot="trigger" variant="secondary">Actions</web-ui-button>
    <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
    <web-ui-dropdown-item>Paste</web-ui-dropdown-item>
    <web-ui-dropdown-divider></web-ui-dropdown-divider>
    <web-ui-dropdown-item disabled>Delete</web-ui-dropdown-item>
  </web-ui-dropdown>
</template>
```

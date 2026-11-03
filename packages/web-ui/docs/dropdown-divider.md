# Dropdown Divider

A divider inside a menu that separates groups of menu items.

It has no props, events, or slots, and keyboard navigation does not stop on it. The menu only moves focus to `<web-ui-dropdown-item>`; the divider itself declares `role="separator"`.

Place it among the children of `<web-ui-dropdown>` / `<web-ui-context-menu>`.

## Samples

### Group divider

The divider sits between two groups of menu items and spans the full width of the menu panel.

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

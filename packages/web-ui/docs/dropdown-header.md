---
component: dropdown-header
tag: web-ui-dropdown-header
---

A group title inside a menu: a piece of small text that takes no part in interaction and names the menu items that follow it. It has no props or events and does not take part in keyboard navigation—the menu only stops focus on `<web-ui-dropdown-item>`. A group title is often used together with `<web-ui-dropdown-divider>`.

## Samples

### Group title {#basic}

The title gives a set of menu items a name; it is not focusable and not clickable, and the up / down arrow keys skip it.

```tsx
export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        More
      </web-ui-button>
      <web-ui-dropdown-header>Edit</web-ui-dropdown-header>
      <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
      <web-ui-dropdown-item>Paste</web-ui-dropdown-item>
      <web-ui-dropdown-divider></web-ui-dropdown-divider>
      <web-ui-dropdown-header>Dangerous actions</web-ui-dropdown-header>
      <web-ui-dropdown-item disabled>Delete</web-ui-dropdown-item>
    </web-ui-dropdown>
  )
}
```

```vue
<template>
  <web-ui-dropdown>
    <web-ui-button slot="trigger" variant="secondary">More</web-ui-button>
    <web-ui-dropdown-header>Edit</web-ui-dropdown-header>
    <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
    <web-ui-dropdown-item>Paste</web-ui-dropdown-item>
    <web-ui-dropdown-divider></web-ui-dropdown-divider>
    <web-ui-dropdown-header>Dangerous actions</web-ui-dropdown-header>
    <web-ui-dropdown-item disabled>Delete</web-ui-dropdown-item>
  </web-ui-dropdown>
</template>
```

## API

### Slots

| Name      | Description              |
| --------- | ------------------------ |
| `default` | Text of the group title. |

# Dropdown Header

A group title inside a menu. It is a piece of small text that plays no part in interaction and names the menu items that follow it. It has no props or events, and keyboard navigation does not stop on it. The menu only moves focus to `<web-ui-dropdown-item>`. Group titles are often used together with `<web-ui-dropdown-divider>`.

## Samples

### Group title

The title names a group of menu items. It is not focusable and not clickable, and the up / down arrow keys skip it.

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

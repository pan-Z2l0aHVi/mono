# Dropdown Divider

menu 里的 divider，用来分隔成组的 menu item。

它没有任何属性、事件与插槽，也不参与键盘导航。menu 只把焦点停在 `<web-ui-dropdown-item>` 上，divider 自身只声明 `role="separator"`。

它放在 `<web-ui-dropdown>` / `<web-ui-context-menu>` 的子元素里。

## Samples

### Group divider

divider 放在两组 menu item 之间，横跨整个 menu panel。

```tsx
export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        操作
      </web-ui-button>
      <web-ui-dropdown-item>复制</web-ui-dropdown-item>
      <web-ui-dropdown-item>粘贴</web-ui-dropdown-item>
      <web-ui-dropdown-divider></web-ui-dropdown-divider>
      <web-ui-dropdown-item disabled>删除</web-ui-dropdown-item>
    </web-ui-dropdown>
  )
}
```

```vue
<template>
  <web-ui-dropdown>
    <web-ui-button slot="trigger" variant="secondary">操作</web-ui-button>
    <web-ui-dropdown-item>复制</web-ui-dropdown-item>
    <web-ui-dropdown-item>粘贴</web-ui-dropdown-item>
    <web-ui-dropdown-divider></web-ui-dropdown-divider>
    <web-ui-dropdown-item disabled>删除</web-ui-dropdown-item>
  </web-ui-dropdown>
</template>
```

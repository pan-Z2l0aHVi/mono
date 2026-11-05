# Dropdown Divider

菜单里的分隔线，用来分隔成组的菜单项。

它没有任何属性、事件与插槽，也不参与键盘导航。菜单只把焦点停在 `<web-ui-dropdown-item>` 上，分隔线自身只声明 `role="separator"`。

它放在 `<web-ui-dropdown>` / `<web-ui-context-menu>` 的子元素里。

## Samples

### Group divider

分隔线放在两组菜单项之间，横跨整个菜单面板。

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

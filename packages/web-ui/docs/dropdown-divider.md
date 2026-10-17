---
component: dropdown-divider
tag: web-ui-dropdown-divider
---

菜单里的分隔线，用来切开成组的菜单项。它没有任何属性、事件与插槽，也不参与键盘导航——菜单只会把焦点停在 `<web-ui-dropdown-item>` 上，它自己只声明 `role="separator"`。它出现在 `<web-ui-dropdown>` / `<web-ui-context-menu>` 的子元素里。

## 示例

### 分组分隔线 {#basic}

分隔线插在两组菜单项之间，宽度撑满菜单面板，两侧各留一点水平外边距。

```react
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

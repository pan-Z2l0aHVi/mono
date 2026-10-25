---
component: dropdown-header
tag: web-ui-dropdown-header
---

menu 里的分组标题：一段不参与交互的小字，给紧随其后的几个 menu item 起名。它没有属性与事件，也不参与键盘导航——menu 只会把焦点停在 `<web-ui-dropdown-item>` 上。分组标题常与 `<web-ui-dropdown-divider>` 一起用。

## Samples

### 分组标题 {#basic}

标题让一组 menu item 有名字；它不可聚焦、不可点击，键盘上下键会直接跳过。

```tsx
export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        更多
      </web-ui-button>
      <web-ui-dropdown-header>编辑</web-ui-dropdown-header>
      <web-ui-dropdown-item>复制</web-ui-dropdown-item>
      <web-ui-dropdown-item>粘贴</web-ui-dropdown-item>
      <web-ui-dropdown-divider></web-ui-dropdown-divider>
      <web-ui-dropdown-header>危险操作</web-ui-dropdown-header>
      <web-ui-dropdown-item disabled>删除</web-ui-dropdown-item>
    </web-ui-dropdown>
  )
}
```

```vue
<template>
  <web-ui-dropdown>
    <web-ui-button slot="trigger" variant="secondary">更多</web-ui-button>
    <web-ui-dropdown-header>编辑</web-ui-dropdown-header>
    <web-ui-dropdown-item>复制</web-ui-dropdown-item>
    <web-ui-dropdown-item>粘贴</web-ui-dropdown-item>
    <web-ui-dropdown-divider></web-ui-dropdown-divider>
    <web-ui-dropdown-header>危险操作</web-ui-dropdown-header>
    <web-ui-dropdown-item disabled>删除</web-ui-dropdown-item>
  </web-ui-dropdown>
</template>
```

## API

### Slots

| 名称      | 说明             |
| --------- | ---------------- |
| `default` | 分组标题的文本。 |

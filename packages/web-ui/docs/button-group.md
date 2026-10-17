---
component: button-group
tag: web-ui-button-group
---

把若干个 `<web-ui-button>` 并成一组：组只负责成员之间的视觉连体（共享一块 glass 底、相邻按钮之间画分割线）与排列方向，不管选中态，也不改变成员各自的事件与表单行为。成员自己的 `size` 在组内被忽略。

## 示例

### 水平组 {#basic}

组把成员的圆角收成整组一贯的胶囊形状，并在相邻按钮之间补齐分割线。

```react
export default function Demo() {
  return (
    <web-ui-button-group>
      <web-ui-button variant="secondary">左</web-ui-button>
      <web-ui-button variant="secondary">中</web-ui-button>
      <web-ui-button variant="secondary">右</web-ui-button>
    </web-ui-button-group>
  )
}
```

```vue
<template>
  <web-ui-button-group>
    <web-ui-button variant="secondary">左</web-ui-button>
    <web-ui-button variant="secondary">中</web-ui-button>
    <web-ui-button variant="secondary">右</web-ui-button>
  </web-ui-button-group>
</template>
```

### 垂直组 {#vertical}

`direction` 决定横排还是竖排，默认 `horizontal`；分割线长度由 `--wui-button-group-divider-length` 控制。

```react
export default function Demo() {
  return (
    <web-ui-button-group direction="vertical">
      <web-ui-button variant="secondary">上</web-ui-button>
      <web-ui-button variant="secondary">中</web-ui-button>
      <web-ui-button variant="secondary">下</web-ui-button>
    </web-ui-button-group>
  )
}
```

```vue
<template>
  <web-ui-button-group direction="vertical">
    <web-ui-button variant="secondary">上</web-ui-button>
    <web-ui-button variant="secondary">中</web-ui-button>
    <web-ui-button variant="secondary">下</web-ui-button>
  </web-ui-button-group>
</template>
```

## API

### Props

| 名称        | 说明             | 类型                         | 默认值         |
| ----------- | ---------------- | ---------------------------- | -------------- |
| `direction` | 成员的排列方向。 | `'horizontal' \| 'vertical'` | `'horizontal'` |

### Slots

| 名称      | 说明                            |
| --------- | ------------------------------- |
| `default` | 组内的 `<web-ui-button>` 成员。 |

### 行为说明

以内部派生的视觉上下文控制按钮组方向，不改写子按钮属性。

在按钮组宿主上设置。该 token 控制两个方向上的长边：横排改的是分割线高度，竖排改的是宽度。

### CSS Custom Properties

| 名称                                | 说明                                                 | 默认值 |
| ----------------------------------- | ---------------------------------------------------- | ------ |
| `--wui-button-group-divider-length` | 相邻按钮之间分割线的长度；短边恒为 1px，不随该值变化 | `20px` |

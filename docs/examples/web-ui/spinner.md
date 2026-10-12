---
component: spinner
tag: web-ui-spinner
---

加载旋转器，声明式放在页面里，或用静态 `WebUiSpinner.show()` / `hide()` 做阻塞式加载。

## 示例

### 基础

`size` 是像素尺寸，宿主带 `role="status"` 与 `aria-label="加载中"`。

```react
<web-ui-spinner size={16}></web-ui-spinner>
<web-ui-spinner size={24}></web-ui-spinner>
<web-ui-spinner size={32}></web-ui-spinner>
```

```vue
<template>
  <web-ui-spinner :size="16"></web-ui-spinner>
  <web-ui-spinner :size="24"></web-ui-spinner>
  <web-ui-spinner :size="32"></web-ui-spinner>
</template>
```

### 描述文字

`description` 属性或 `description` 插槽在旋转器旁显示说明。

```react
<web-ui-spinner size={32} description="正在加载数据"></web-ui-spinner>
```

```vue
<template>
  <web-ui-spinner :size="32">
    <span slot="description">正在加载数据</span>
  </web-ui-spinner>
</template>
```

### 阻塞式加载

`WebUiSpinner.show()` 显示全屏加载，`duration` 到期自动关闭，`hide()` 立即隐藏。

```react
import { WebUiSpinner } from '@greypan/web-ui'

WebUiSpinner.show({ size: 64, description: '正在同步云端文件' })
WebUiSpinner.show({ duration: 2000 })
WebUiSpinner.hide()
```

```vue
<script setup lang="ts">
import { WebUiSpinner } from '@greypan/web-ui'

function sync() {
  WebUiSpinner.show({ size: 64, description: '正在同步云端文件', duration: 2000 })
}
</script>
```

## API

### Props

| 名称          | 说明         |
| ------------- | ------------ |
| `size`        | 尺寸（px）。 |
| `description` | 描述文字。   |

### Slots

| 名称          | 说明                                |
| ------------- | ----------------------------------- |
| `description` | 描述插槽，替代 `description` 属性。 |

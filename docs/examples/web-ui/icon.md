---
component: icon
tag: web-ui-icon
---

图标渲染组件，接受 Iconify 数据对象（`@greypan/web-ui/icons` 导出的即为此形态）；宿主默认 `aria-hidden="true"`。

## 示例

### 基础

`icon` 是 Lit 属性绑定（property），不是 attribute。

```react
<web-ui-icon icon={lucideSearch}></web-ui-icon>
```

```vue
<template>
  <web-ui-icon :icon="lucideSearch"></web-ui-icon>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### 尺寸与颜色

`size` 以像素为单位；`color` 不设置时继承文字颜色（`currentColor`）。

```react
<web-ui-icon icon={lucideSearch} size={16}></web-ui-icon>
<web-ui-icon icon={lucideSearch} size={24}></web-ui-icon>
<web-ui-icon icon={lucideSearch} size={32} color="#007aff"></web-ui-icon>
```

```vue
<template>
  <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
  <web-ui-icon :icon="lucideSearch" :size="24"></web-ui-icon>
  <web-ui-icon :icon="lucideSearch" :size="32" color="#007aff"></web-ui-icon>
</template>
```

### 旋转动画

`spin` 常用于加载态图标，`reduce` 动效偏好下放慢而不停。

```react
<web-ui-icon icon={lucideLoaderCircle} spin></web-ui-icon>
```

```vue
<template>
  <web-ui-icon :icon="lucideLoaderCircle" spin></web-ui-icon>
</template>

<script setup lang="ts">
import { lucideLoaderCircle } from '@greypan/web-ui/icons'
</script>
```

## API

### Props

| 名称    | 说明                           | 类型          | 默认值  |
| ------- | ------------------------------ | ------------- | ------- |
| `icon`  | Iconify 数据对象（property）。 | `IconifyIcon` | —       |
| `spin`  | 旋转动画。                     | `boolean`     | `false` |
| `size`  | 尺寸（px）。                   | `number`      | `18`    |
| `color` | 颜色。                         | `string`      | —       |

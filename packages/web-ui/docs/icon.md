---
component: icon
tag: web-ui-icon
---

icon 渲染组件，接受 Iconify 数据对象（`@greypan/web-ui/icons` 导出的即为此形态）；宿主默认 `aria-hidden="true"`。

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

`spin` 常用于加载态 icon，`reduce` 动效偏好下放慢而不停。

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

### 行为说明

内置 `aria-hidden="true"`。

### 画布

SVG 的 `viewBox` 取自 `icon.left`/`icon.top`/`icon.width`/`icon.height`，偏移缺省为 `0`，尺寸缺省为 Iconify 规范默认的 `16`。生成的资产都自带画布，因此尺寸兜底只在直接传入原始 `IconifyIcon` 对象时才会生效。

```js
import { lucideLoaderCircle } from '@greypan/web-ui/icons'
html`<web-ui-icon .icon=${lucideLoaderCircle} spin />`
```

### CSS Custom Properties

| 名称                  | 说明                                            | 默认值    |
| --------------------- | ----------------------------------------------- | --------- |
| `--wui-icon-color`    | icon 颜色                                       | `inherit` |
| `--wui-duration-spin` | `spin` 旋转周期；reduce 下放慢到 `1600ms`，不停 | `600ms`   |

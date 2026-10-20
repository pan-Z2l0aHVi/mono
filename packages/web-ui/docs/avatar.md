---
component: avatar
tag: web-ui-avatar
---

avatar，支持图片加载失败与无图片时回退到名称首字母，避免在图片缺位处留下空洞。

## 示例

### 基础

传入 `src` 时按图片渲染，`alt` 作为图片替代文本，`size` 决定 avatar 边长。

```react
<web-ui-avatar src="/avatars/grey.png" alt="Grey" size={48}></web-ui-avatar>
```

```vue
<template>
  <web-ui-avatar src="/avatars/grey.png" alt="Grey" :size="48"></web-ui-avatar>
</template>
```

### 首字母回退

没有 `src`、或图片加载失败时，组件从 `name` 取首字母渲染回退 avatar。

```react
<web-ui-avatar name="Grey Pan" size={40}></web-ui-avatar>
<web-ui-avatar name="Ada Lovelace" size={40}></web-ui-avatar>
```

```vue
<template>
  <web-ui-avatar name="Grey Pan" :size="40"></web-ui-avatar>
  <web-ui-avatar name="Ada Lovelace" :size="40"></web-ui-avatar>
</template>
```

### 形状与降级内容

`shape` 控制圆形与方形；`default` 插槽在图片加载失败时替代默认的首字母回退。

```react
<web-ui-avatar src="/broken.png" shape="square" size={48}>
  <web-ui-icon icon={lucideUser}></web-ui-icon>
</web-ui-avatar>
```

```vue
<template>
  <web-ui-avatar src="/broken.png" shape="square" :size="48">
    <web-ui-icon :icon="lucideUser"></web-ui-icon>
  </web-ui-avatar>
</template>

<script setup lang="ts">
import { lucideUser } from '@greypan/web-ui/icons'
</script>
```

## API

### Props

| 名称    | 说明                                | 类型                   | 默认值     |
| ------- | ----------------------------------- | ---------------------- | ---------- |
| `src`   | 图片 URL；留空或加载失败时回退。    | `string`               | `''`       |
| `alt`   | 图片替代文本。                      | `string`               | `''`       |
| `name`  | 展示名称，用于首字母回退。          | `string`               | `''`       |
| `size`  | avatar 边长（px）。                 | `number`               | `40`       |
| `shape` | 形状：`circle`（默认）或 `square`。 | `'circle' \| 'square'` | `'circle'` |

### Slots

| 名称      | 说明                                       |
| --------- | ------------------------------------------ |
| `default` | 图片加载失败时的降级内容，替代默认首字母。 |

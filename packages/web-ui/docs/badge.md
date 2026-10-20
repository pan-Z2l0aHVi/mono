---
component: badge
tag: web-ui-badge
---

badge / 通知计数：把 `count` 角标叠加在默认插槽内容的一角，`dot` 模式只显示一个圆点。

## 示例

### 基础

默认插槽是要装饰的内容，`count` 超过 `max` 时显示 `max+`。

```react
<web-ui-badge count={5}>
  <web-ui-icon icon={lucideBell} size={22}></web-ui-icon>
</web-ui-badge>
<web-ui-badge count={128} max={99}>
  <web-ui-icon icon={lucideBell} size={22}></web-ui-icon>
</web-ui-badge>
```

```vue
<template>
  <web-ui-badge :count="5">
    <web-ui-icon :icon="lucideBell" :size="22"></web-ui-icon>
  </web-ui-badge>
  <web-ui-badge :count="128" :max="99">
    <web-ui-icon :icon="lucideBell" :size="22"></web-ui-icon>
  </web-ui-badge>
</template>

<script setup lang="ts">
import { lucideBell } from '@greypan/web-ui/icons'
</script>
```

### 点模式与零值

`dot` 只显示圆点而不显示数字；`show-zero` 让 `count` 为 0 时也显示，`badge-hidden` 完全隐藏。

```react
<web-ui-badge dot>
  <web-ui-button variant="secondary">消息</web-ui-button>
</web-ui-badge>
<web-ui-badge count={0} show-zero>
  <web-ui-button variant="secondary">草稿</web-ui-button>
</web-ui-badge>
```

```vue
<template>
  <web-ui-badge dot>
    <web-ui-button variant="secondary">消息</web-ui-button>
  </web-ui-badge>
  <web-ui-badge :count="0" show-zero>
    <web-ui-button variant="secondary">草稿</web-ui-button>
  </web-ui-badge>
</template>
```

### 位置与偏移

`placement` 选择四个角，`offset-x` / `offset-y` 在此基础上做像素微调。

```react
<web-ui-badge count={3} placement="bottom-left" offset-x={-4} offset-y={4}>
  <web-ui-icon icon={lucideMail} size={22}></web-ui-icon>
</web-ui-badge>
```

```vue
<template>
  <web-ui-badge :count="3" placement="bottom-left" :offset-x="-4" :offset-y="4">
    <web-ui-icon :icon="lucideMail" :size="22"></web-ui-icon>
  </web-ui-badge>
</template>

<script setup lang="ts">
import { lucideMail } from '@greypan/web-ui/icons'
</script>
```

## API

### Props

| 名称           | 说明                                                                         | 类型                                                           | 默认值        |
| -------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------- |
| `count`        | 显示数字。                                                                   | `number`                                                       | `0`           |
| `max`          | 数字上限，超过时显示 `max+`。                                                | `number`                                                       | `99`          |
| `dot`          | 点模式，只显示圆点不显示数字。                                               | `boolean`                                                      | `false`       |
| `show-zero`    | `count` 为 0 时也显示。                                                      | `boolean`                                                      | `false`       |
| `badge-hidden` | 完全隐藏 badge。                                                             | `boolean`                                                      | `false`       |
| `offset-x`     | 水平偏移（px）。                                                             | `number`                                                       | `0`           |
| `offset-y`     | 垂直偏移（px）。                                                             | `number`                                                       | `0`           |
| `placement`    | badge 位置：`top-right`（默认）、`top-left`、`bottom-right`、`bottom-left`。 | `'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left'` | `'top-right'` |

### Slots

| 名称      | 说明                                 |
| --------- | ------------------------------------ |
| `default` | 被装饰的内容，badge 叠加在它的一角。 |

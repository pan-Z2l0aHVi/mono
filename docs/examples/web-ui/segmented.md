---
component: segmented
tag: web-ui-segmented
---

分段控制器（单选按钮组），子项是 `<web-ui-segmented-trigger>`；`value` 同步选中项，并与原生 `<form>` 集成。

## 示例

### 基础

默认插槽投影 segmented-trigger，选中由 `value` 决定。

```react
<web-ui-segmented value={view} onInput={event => setView(event.currentTarget.value)}>
  <web-ui-segmented-trigger value="day">日</web-ui-segmented-trigger>
  <web-ui-segmented-trigger value="week">周</web-ui-segmented-trigger>
  <web-ui-segmented-trigger value="month">月</web-ui-segmented-trigger>
</web-ui-segmented>
```

```vue
<template>
  <web-ui-segmented :value="view" @input="view = $event.currentTarget.value">
    <web-ui-segmented-trigger value="day">日</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="week">周</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="month">月</web-ui-segmented-trigger>
  </web-ui-segmented>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const view = ref('week')
</script>
```

### 变体

`variant` 选择轨道与指示器的材质：`inset`（默认，嵌入轨道）或 `raised`（经典浮起）。

```react
<web-ui-segmented variant="raised" value="list">
  <web-ui-segmented-trigger value="list">列表</web-ui-segmented-trigger>
  <web-ui-segmented-trigger value="grid">网格</web-ui-segmented-trigger>
</web-ui-segmented>
```

```vue
<template>
  <web-ui-segmented variant="raised" value="list">
    <web-ui-segmented-trigger value="list">列表</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="grid">网格</web-ui-segmented-trigger>
  </web-ui-segmented>
</template>
```

### 单项禁用

`disabled` 加在组上会禁用全部 trigger；只禁用某一项时加在该 trigger 上。

```react
<web-ui-segmented value="a">
  <web-ui-segmented-trigger value="a">可用</web-ui-segmented-trigger>
  <web-ui-segmented-trigger value="b" disabled>
    不可用
  </web-ui-segmented-trigger>
</web-ui-segmented>
```

```vue
<template>
  <web-ui-segmented value="a">
    <web-ui-segmented-trigger value="a">可用</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="b" disabled>不可用</web-ui-segmented-trigger>
  </web-ui-segmented>
</template>
```

## API

### Props

| 名称       | 说明                                   | 类型                  | 默认值    |
| ---------- | -------------------------------------- | --------------------- | --------- |
| `name`     | 表单字段名。                           | `string`              | `''`      |
| `variant`  | 材质变体：`inset`（默认）或 `raised`。 | `'inset' \| 'raised'` | `'inset'` |
| `disabled` | 禁用全部 trigger。                     | `boolean`             | `false`   |
| `required` | 必填校验。                             | `boolean`             | `false`   |
| `value`    | 当前选中值。                           | `string`              | `''`      |

### Events

| 名称     | 说明                 |
| -------- | -------------------- |
| `input`  | 选中值变化时触发。   |
| `change` | 用户切换选中时触发。 |

### Slots

| 名称      | 说明                                     |
| --------- | ---------------------------------------- |
| `default` | 投影 `<web-ui-segmented-trigger>` 子项。 |

---
component: switch
tag: web-ui-switch
---

switch 切换，声明 `role="switch"` 与 `aria-checked`；`loading` 期间阻断交互并显示待定状态。键盘焦点落在内层原生 checkbox 上，**空格与 Enter 都能切换**。

## 示例

### 基础

`checked` 是 switch 状态，`value` 是表单提交值。

```react
<web-ui-switch checked={enabled} onChange={event => setEnabled(event.currentTarget.checked)}>
  启用通知
</web-ui-switch>
```

```vue
<template>
  <web-ui-switch :checked="enabled" @change="enabled = !enabled">启用通知</web-ui-switch>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const enabled = ref(false)
</script>
```

### 加载与禁用

`loading` 阻断交互并显示加载态，`disabled` 直接禁用。

```react
<web-ui-switch loading>保存中</web-ui-switch>
<web-ui-switch disabled>不可更改</web-ui-switch>
```

```vue
<template>
  <web-ui-switch loading>保存中</web-ui-switch>
  <web-ui-switch disabled>不可更改</web-ui-switch>
</template>
```

### 表单值

switch 自身不渲染 label 盒之外的内容，`name` 与 `value` 让它在表单里以选中值参与提交。

```react
<form>
  <web-ui-switch name="newsletter" value="on" required>
    订阅邮件
  </web-ui-switch>
</form>
```

```vue
<template>
  <form>
    <web-ui-switch name="newsletter" value="on" required>订阅邮件</web-ui-switch>
  </form>
</template>
```

## API

### Props

| 名称       | 说明              | 类型      | 默认值  |
| ---------- | ----------------- | --------- | ------- |
| `checked`  | 打开 / 关闭状态。 | `boolean` | `false` |
| `name`     | 表单字段名。      | `string`  | `''`    |
| `value`    | 表单提交值。      | `string`  | `''`    |
| `disabled` | 禁用状态。        | `boolean` | `false` |
| `required` | 必填校验。        | `boolean` | `false` |
| `loading`  | 加载状态。        | `boolean` | `false` |

### Events

| 名称     | 说明                     |
| -------- | ------------------------ |
| `input`  | 状态变化时触发。         |
| `change` | 用户切换 switch 时触发。 |

### 行为说明

使用 `role="switch"` 和 `aria-checked`。Pointer 事件管理按下状态。

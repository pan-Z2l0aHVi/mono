---
component: switch
tag: web-ui-switch
---

switch 切换，声明 `role="switch"` 与 `aria-checked`；`loading` 期间阻断交互并显示待定状态。默认插槽的子文本会作为可见标签和默认 accessible name；也可以在 host 设置 `aria-label` 或 `aria-labelledby`。键盘焦点落在 host 上，**空格与 Enter 都能切换**。

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

可见标签同时命名 switch；`aria-label` 或 `aria-labelledby` 可覆盖默认名称。`name` 与 `value` 让 switch 在表单里以选中值参与提交。

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

### Slots

| 名称      | 说明                                                                   |
| --------- | ---------------------------------------------------------------------- |
| `default` | 可见标签文本，并作为 switch 的 accessible name；为空时不增加额外间距。 |

### 布局

track 固定为 `40px × 20px`，标签与 track 之间默认间距为 `8px`。default slot 没有可渲染宽度时（空槽位或只放了视觉隐藏的无障碍名），间距会收起，宿主宽度不会超过 track。没有可见标签时可通过 `aria-label` 或 `aria-labelledby` 提供 accessible name。

### accessible name

默认插槽内容会显示在 track 旁，并作为 switch 的 accessible name。需要引用外部 label 时，在 `web-ui-switch` host 设置 `aria-labelledby`；也可以直接设置 `aria-label`。

```html
<web-ui-switch aria-labelledby="notification-label"></web-ui-switch> <span id="notification-label">启用通知</span>
```

### Events

| 名称     | 说明                     |
| -------- | ------------------------ |
| `input`  | 状态变化时触发。         |
| `change` | 用户切换 switch 时触发。 |

### 行为说明

使用 host 上的 `role="switch"`、`aria-checked` 和 `aria-disabled`。host 接收键盘焦点；Space 与 Enter 切换状态。Pointer 事件管理轨道的按下状态。

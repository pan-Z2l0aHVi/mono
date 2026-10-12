---
component: checkbox
tag: web-ui-checkbox
---

单个复选框，声明 `role="checkbox"`，支持 Enter / Space 切换；与原生 `<form>` 集成，选中时把 `value` 提交进 `FormData`。

## 示例

### 基础

`checked` 是控件状态，默认插槽是标签文字。

```react
<web-ui-checkbox checked={agreed} onChange={event => setAgreed(event.currentTarget.checked)}>
  我已阅读并同意服务条款
</web-ui-checkbox>
```

```vue
<template>
  <web-ui-checkbox :checked="agreed" @change="agreed = !agreed">我已阅读并同意服务条款</web-ui-checkbox>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const agreed = ref(false)
</script>
```

### 表单值

`value` 是选中时提交的值，`name` 是字段名，`required` 让原生表单校验在未选中时拦截提交。

```react
<web-ui-checkbox name="plan" value="pro" required>
  专业版
</web-ui-checkbox>
```

```vue
<template>
  <web-ui-checkbox name="plan" value="pro" required>专业版</web-ui-checkbox>
</template>
```

### 复选框组

`<web-ui-checkbox-group>` 统一管理成员的选中与表单提交；`direction` 控制排列方向。

```react
<web-ui-checkbox-group name="fruits" value={selected} onInput={event => setSelected(event.currentTarget.value)}>
  <web-ui-checkbox value="apple">苹果</web-ui-checkbox>
  <web-ui-checkbox value="banana">香蕉</web-ui-checkbox>
  <web-ui-checkbox value="cherry" disabled>
    樱桃
  </web-ui-checkbox>
</web-ui-checkbox-group>
```

```vue
<template>
  <web-ui-checkbox-group name="fruits" :value="selected" @input="selected = $event.currentTarget.value">
    <web-ui-checkbox value="apple">苹果</web-ui-checkbox>
    <web-ui-checkbox value="banana">香蕉</web-ui-checkbox>
    <web-ui-checkbox value="cherry" disabled>樱桃</web-ui-checkbox>
  </web-ui-checkbox-group>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const selected = ref<string[]>([])
</script>
```

## API

### Props

| 名称       | 说明                 |
| ---------- | -------------------- |
| `checked`  | 选中状态。           |
| `value`    | 选中时提交的表单值。 |
| `name`     | 表单字段名。         |
| `disabled` | 禁用状态。           |
| `required` | 必填校验。           |

### Events

| 名称     | 说明                     |
| -------- | ------------------------ |
| `input`  | 选中状态变化时触发。     |
| `change` | 用户切换选中状态时触发。 |

### Slots

| 名称      | 说明                                         |
| --------- | -------------------------------------------- |
| `default` | 标签文本；为空时收掉指示器与标签之间的间距。 |

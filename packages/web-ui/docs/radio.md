---
component: radio
tag: web-ui-radio
---

单个单选 button，与 `<web-ui-checkbox>` 共用选择控件的盒契约；`<web-ui-radio-group>` 负责在一组 option 之间保持单选。

## 示例

### 基础

默认插槽是 label 文字。

```react
<web-ui-radio checked={plan === 'basic'} value="basic" onChange={() => setPlan('basic')}>
  基础版
</web-ui-radio>
```

```vue
<template>
  <web-ui-radio :checked="plan === 'basic'" value="basic" @change="plan = 'basic'">基础版</web-ui-radio>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const plan = ref('basic')
</script>
```

### 禁用与只读

`disabled` 关闭交互，`required` 让原生表单校验在未选中时拦截提交。

```react
<web-ui-radio name="plan" value="enterprise" disabled>
  企业版（暂不可用）
</web-ui-radio>
```

```vue
<template>
  <web-ui-radio name="plan" value="enterprise" disabled>企业版（暂不可用）</web-ui-radio>
</template>
```

### 单选组

`<web-ui-radio-group>` 同步子项的选中并统一提交表单值；`direction` 控制排列方向。

```react
<web-ui-radio-group name="size" value={size} direction="horizontal" onInput={event => setSize(event.currentTarget.value)}>
  <web-ui-radio value="s">小</web-ui-radio>
  <web-ui-radio value="m">中</web-ui-radio>
  <web-ui-radio value="l">大</web-ui-radio>
</web-ui-radio-group>
```

```vue
<template>
  <web-ui-radio-group name="size" :value="size" direction="horizontal" @input="size = $event.currentTarget.value">
    <web-ui-radio value="s">小</web-ui-radio>
    <web-ui-radio value="m">中</web-ui-radio>
    <web-ui-radio value="l">大</web-ui-radio>
  </web-ui-radio-group>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const size = ref('m')
</script>
```

## API

### Props

| 名称       | 说明                 | 类型      | 默认值  |
| ---------- | -------------------- | --------- | ------- |
| `checked`  | 选中状态。           | `boolean` | `false` |
| `value`    | 选中时提交的表单值。 | `string`  | `''`    |
| `name`     | 表单字段名。         | `string`  | `''`    |
| `disabled` | 禁用状态。           | `boolean` | `false` |
| `required` | 必填校验。           | `boolean` | `false` |

### Events

| 名称     | 说明                     |
| -------- | ------------------------ |
| `input`  | 选中状态变化时触发。     |
| `change` | 用户切换选中状态时触发。 |

### Slots

| 名称      | 说明                                                   |
| --------- | ------------------------------------------------------ |
| `default` | label 文本；为空时收掉 indicator 与 label 之间的间距。 |

### 布局

与 `<web-ui-checkbox>` 共用同一套选择控件盒契约，包括「label 没有画出东西时收起间距」这一条——宿主高度由内容撑开、不继承页面行高，indicator 宽高走 `--wui-selection-control-size`，与相邻文字按 `vertical-align: middle` 对齐。

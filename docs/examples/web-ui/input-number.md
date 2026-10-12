---
component: input-number
tag: web-ui-input-number
---

数字输入框，自带步进按钮与 ArrowUp / ArrowDown 键盘增减；空输入或 `-` 在提交时被忽略，值保持在最后一个有效数字。

## 示例

### 基础

`min` / `max` / `step` 约束取值范围与步进幅度。

```react
<web-ui-input-number min={0} max={100} step={5} value={20}></web-ui-input-number>
```

```vue
<template>
  <web-ui-input-number :min="0" :max="100" :step="5" :value="20"></web-ui-input-number>
</template>
```

### 精度

`precision` 决定小数位数，超出部分会被规整。

```react
<web-ui-input-number precision={2} step={0.01} value={9.99}></web-ui-input-number>
```

```vue
<template>
  <web-ui-input-number :precision="2" :step="0.01" :value="9.99"></web-ui-input-number>
</template>
```

### 受控

`value` 是当前值，`input` 在输入与步进中触发，`change` 在提交时触发。

```react
const [quantity, setQuantity] = useState(1)

return (
  <web-ui-input-number
    value={quantity}
    min={1}
    required
    onInput={event => setQuantity(event.currentTarget.value)}
  ></web-ui-input-number>
)
```

```vue
<template>
  <web-ui-input-number
    :value="quantity"
    :min="1"
    required
    @input="quantity = $event.currentTarget.value"
  ></web-ui-input-number>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const quantity = ref(1)
</script>
```

## API

### Props

| 名称          | 说明         |
| ------------- | ------------ |
| `placeholder` | 占位文本。   |
| `name`        | 表单字段名。 |
| `disabled`    | 禁用状态。   |
| `readonly`    | 只读状态。   |
| `required`    | 必填校验。   |
| `precision`   | 小数精度。   |
| `value`       | 当前值。     |
| `min`         | 最小值。     |
| `max`         | 最大值。     |
| `step`        | 步进值。     |

### Events

| 名称     | 说明           |
| -------- | -------------- |
| `input`  | 值变化时触发。 |
| `change` | 提交时触发。   |

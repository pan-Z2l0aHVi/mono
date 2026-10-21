---
component: input-number
tag: web-ui-input-number
---

input number，自带步进 button 与 ArrowUp / ArrowDown 键盘增减；空输入或 `-` 在提交时被忽略，值保持在最后一个有效数字。

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

`precision` 决定读取与提交时保留的小数位数；未显式设置时按 `step` 的小数位数推导，因此 `step=0.3` 在默认设置下每次增加 `0.3`。显式设置 `precision` 后则按该值规整，例如 `precision=0` 会将小数步进结果取整。赋值本身保留原始小数，因此 `precision` 与 `value` 的声明顺序不影响结果（`value="1.5" precision="2"` 与反序都得到 `1.5`）。

编辑中清空或输入非法内容不会破坏 `value`：失焦时显示会回填为已提交值，表单提交的始终是最后那个合法值。

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

| 名称          | 说明                                                               | 类型      | 默认值     |
| ------------- | ------------------------------------------------------------------ | --------- | ---------- |
| `placeholder` | 占位文本。                                                         | `string`  | `''`       |
| `name`        | 表单字段名。                                                       | `string`  | `''`       |
| `disabled`    | 禁用状态。                                                         | `boolean` | `false`    |
| `readonly`    | 只读状态。                                                         | `boolean` | `false`    |
| `required`    | 必填校验。                                                         | `boolean` | `false`    |
| `precision`   | 显式设置时，在读取与提交时规整小数位；未显式设置时按 `step` 推导。 | `number`  | `0`        |
| `value`       | 当前值。                                                           | `number`  | `0`        |
| `min`         | 最小值。                                                           | `number`  | `0`        |
| `max`         | 最大值。                                                           | `number`  | `Infinity` |
| `step`        | 步进值；未显式设置 `precision` 时，其小数位数也决定默认规整精度。  | `number`  | `1`        |

### Events

| 名称     | 说明           |
| -------- | -------------- |
| `input`  | 值变化时触发。 |
| `change` | 提交时触发。   |

### 行为说明

ArrowUp/ArrowDown 键增减数值。空输入或 `-` 在提交时被忽略，值保持在最后一个有效数字。

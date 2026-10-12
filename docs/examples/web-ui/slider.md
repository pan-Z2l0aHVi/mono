---
component: slider
tag: web-ui-slider
---

范围滑块，支持刻度标记与垂直方向；拖拽走 pointer capture，键盘支持方向键、Home / End 与 PageUp / PageDown。

## 示例

### 基础

`min` / `max` / `step` 约束取值范围与步进幅度。

```react
<web-ui-slider min={0} max={100} step={5} value={40}></web-ui-slider>
```

```vue
<template>
  <web-ui-slider :min="0" :max="100" :step="5" :value="40"></web-ui-slider>
</template>
```

### 刻度与垂直方向

`marks` 显示刻度标记，`vertical` 让滑块沿垂直方向排列。

```react
<web-ui-slider marks vertical min={0} max={10} value={3}></web-ui-slider>
```

```vue
<template>
  <web-ui-slider marks vertical :min="0" :max="10" :value="3"></web-ui-slider>
</template>
```

### 受控值

拖拽过程中 `input` 连续触发，松手或键盘确认时派发一次 `change`。

```react
const [volume, setVolume] = useState(30)

return (
  <web-ui-slider
    value={volume}
    min={0}
    max={100}
    onInput={event => setVolume(event.currentTarget.value)}
  ></web-ui-slider>
)
```

```vue
<template>
  <web-ui-slider :value="volume" :min="0" :max="100" @input="volume = $event.currentTarget.value"></web-ui-slider>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const volume = ref(30)
</script>
```

## API

### Props

| 名称       | 说明           |
| ---------- | -------------- |
| `disabled` | 禁用状态。     |
| `marks`    | 显示刻度标记。 |
| `vertical` | 垂直方向。     |
| `name`     | 表单字段名。   |
| `required` | 必填校验。     |
| `value`    | 当前值。       |
| `min`      | 最小值。       |
| `max`      | 最大值。       |
| `step`     | 步进值。       |

### Events

| 名称     | 说明                    |
| -------- | ----------------------- |
| `input`  | 拖拽 / 输入过程中触发。 |
| `change` | 松手或键盘确认时触发。  |

---
component: slider
tag: web-ui-slider
---

范围滑块，支持刻度标记与垂直方向；拖拽走 pointer capture，键盘支持方向键、Home / End 与 PageUp / PageDown。

## 示例

### 基础 {#basic}

`min` / `max` / `step` 约束取值范围与步进幅度。

```react
export default function Demo() {
  return <web-ui-slider min={0} max={100} step={5} value={40}></web-ui-slider>
}
```

```vue
<template>
  <web-ui-slider :min="0" :max="100" :step="5" :value="40"></web-ui-slider>
</template>
```

### 刻度与垂直方向 {#marks-vertical}

`marks` 显示刻度标记，`vertical` 让滑块沿垂直方向排列。

```react
export default function Demo() {
  return <web-ui-slider marks vertical min={0} max={10} value={3}></web-ui-slider>
}
```

```vue
<template>
  <web-ui-slider marks vertical :min="0" :max="10" :value="3"></web-ui-slider>
</template>
```

### 受控值 {#controlled}

拖拽过程中 `input` 连续触发，松手或键盘确认时派发一次 `change`。

```react
import { useState } from 'react'

export default function Demo() {
  const [volume, setVolume] = useState(30)

  return (
    <web-ui-slider
      value={volume}
      min={0}
      max={100}
      onInput={event => setVolume(event.currentTarget.value)}
    ></web-ui-slider>
  )
}
```

```vue
<template>
  <web-ui-slider :value="volume" :min="0" :max="100" @input="onInput"></web-ui-slider>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiSlider } from '@greypan/web-ui'
import { ref } from 'vue'

const volume = ref(30)

function onInput(event: WebUiEvent<WebUiSlider, 'input'>) {
  volume.value = event.currentTarget.value
}
</script>
```

## API

### Props

| 名称       | 说明           | 类型      | 默认值  |
| ---------- | -------------- | --------- | ------- |
| `disabled` | 禁用状态。     | `boolean` | `false` |
| `marks`    | 显示刻度标记。 | `boolean` | `false` |
| `vertical` | 垂直方向。     | `boolean` | `false` |
| `name`     | 表单字段名。   | `string`  | `''`    |
| `required` | 必填校验。     | `boolean` | `false` |
| `value`    | 当前值。       | `number`  | `0`     |
| `min`      | 最小值。       | `number`  | `0`     |
| `max`      | 最大值。       | `number`  | `100`   |
| `step`     | 步进值。       | `number`  | `1`     |

### Events

| 名称     | 说明                    |
| -------- | ----------------------- |
| `input`  | 拖拽 / 输入过程中触发。 |
| `change` | 松手或键盘确认时触发。  |

### Methods

| 名称      | 说明                              |
| --------- | --------------------------------- |
| `focus()` | 聚焦 `role="slider"` 的轨道元素。 |
| `blur()`  | 让轨道元素失焦。                  |

### 行为说明

支持 ArrowLeft/Right/Up/Down、Home/End、PageUp/PageDown 键盘导航。使用 pointer capture 处理鼠标、触控笔和触摸交互；组件 host 与触控轨道均声明 `touch-action: none`，拖拽激活期间同时阻止 `touchmove` 默认滚动，避免 iOS Safari 在横/纵拖拽过程中接管手势。

### CSS Custom Properties

| 名称                           | 说明         | 默认值                              |
| ------------------------------ | ------------ | ----------------------------------- |
| `--wui-slider-width`           | 滑块宽度     | `200px`                             |
| `--wui-slider-vertical-height` | 垂直滑块高度 | `200px`                             |
| `--wui-slider-height`          | 轨道厚度     | `var(--wui-slider-track-size, 6px)` |
| `--wui-slider-track-size`      | 轨道尺寸     | `6px`                               |
| `--wui-slider-thumb-width`     | 滑块宽度     | `24px`                              |
| `--wui-slider-thumb-height`    | 滑块高度     | `20px`                              |
| `--wui-slider-marks-inset`     | 刻度内缩     | `0`                                 |

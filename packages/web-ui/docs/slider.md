---
component: slider
tag: web-ui-slider
---

范围 slider，支持刻度标记与垂直方向；拖拽走 pointer capture，键盘支持方向键、Home / End 与 PageUp / PageDown。

## 示例

### 基础 {#basic}

不写属性时范围是 `0`–`100`、步进 `1`；`min` / `max` / `step` 约束取值范围与步进幅度，`disabled` 让 track 与 thumb 退出交互。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-6">
      <web-ui-slider></web-ui-slider>
      <web-ui-slider min={0} max={100} step={5} value={40}></web-ui-slider>
      <web-ui-slider min={0} max={100} step={5} value={65} disabled></web-ui-slider>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-6">
    <web-ui-slider></web-ui-slider>
    <web-ui-slider :min="0" :max="100" :step="5" :value="40"></web-ui-slider>
    <web-ui-slider :min="0" :max="100" :step="5" :value="65" disabled></web-ui-slider>
  </div>
</template>
```

### 刻度标记 {#marks}

`marks` 沿 track 画出刻度点，刻度间距取 `step`，所以刻度密度由步进决定；刻度最多画 100 段，`step` 相对 `min`–`max` 太密时只画前 100 段，不铺满 track。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-8">
      <web-ui-slider marks step={10} value={40}></web-ui-slider>
      <web-ui-slider marks step={25} value={50}></web-ui-slider>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-8">
    <web-ui-slider marks :step="10" :value="40"></web-ui-slider>
    <web-ui-slider marks :step="25" :value="50"></web-ui-slider>
  </div>
</template>
```

### 垂直方向 {#vertical}

`vertical` 让 track 竖起来，数值由下往上增长；`aria-orientation` 随之变成 `vertical`，方向键仍用上下键调节。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [brightness, setBrightness] = useState(60)
  const [volume, setVolume] = useState(30)

  return (
    <div className="flex items-start gap-10">
      <div className="flex flex-col items-center gap-3">
        <web-ui-slider
          vertical
          value={brightness}
          onInput={event => setBrightness(event.currentTarget.value)}
        ></web-ui-slider>
        <span className="text-xs text-(--wui-color-text-secondary)">{brightness}</span>
      </div>

      <div className="flex flex-col items-center gap-3">
        <web-ui-slider
          vertical
          marks
          step={10}
          value={volume}
          onInput={event => setVolume(event.currentTarget.value)}
        ></web-ui-slider>
        <span className="text-xs text-(--wui-color-text-secondary)">{volume}</span>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex items-start gap-10">
    <div class="flex flex-col items-center gap-3">
      <web-ui-slider vertical :value="brightness" @input="brightness = $event.currentTarget.value"></web-ui-slider>
      <span class="text-xs text-(--wui-color-text-secondary)">{{ brightness }}</span>
    </div>

    <div class="flex flex-col items-center gap-3">
      <web-ui-slider
        vertical
        marks
        :step="10"
        :value="volume"
        @input="volume = $event.currentTarget.value"
      ></web-ui-slider>
      <span class="text-xs text-(--wui-color-text-secondary)">{{ volume }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const brightness = ref(60)
const volume = ref(30)
</script>
```

### input 与 change {#events}

拖拽过程中 `input` 连续触发，松手时只在数值真的变过之后派发一次 `change`；键盘每按一次调节键，值变了就先 `input` 再 `change`。点击 track 的空白处也算一次取值变更。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [inputValue, setInputValue] = useState(40)
  const [changeValue, setChangeValue] = useState(40)

  return (
    <div className="flex flex-wrap items-center gap-5">
      <web-ui-slider
        marks
        step={5}
        min={10}
        max={90}
        value={inputValue}
        onInput={event => setInputValue(event.currentTarget.value)}
        onChange={event => setChangeValue(event.currentTarget.value)}
      ></web-ui-slider>
      <output className="text-sm text-(--wui-color-text-secondary)">
        input: {inputValue} / change: {changeValue}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-5">
    <web-ui-slider
      marks
      :step="5"
      :min="10"
      :max="90"
      :value="inputValue"
      @input="inputValue = $event.currentTarget.value"
      @change="changeValue = $event.currentTarget.value"
    ></web-ui-slider>
    <output class="text-sm text-(--wui-color-text-secondary)">
      input: {{ inputValue }} / change: {{ changeValue }}
    </output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const inputValue = ref(40)
const changeValue = ref(40)
</script>
```

### 表单取值 {#form}

`name` 让当前值以该字段名进入 `FormData`；组件通过 ElementInternals 接入宿主 `<form>`，所以 `form.reset()` 会把值退回初始值。

```tsx
import { useRef, useState } from 'react'

export default function Demo() {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitted, setSubmitted] = useState('')

  return (
    <form
      ref={formRef}
      className="flex flex-wrap items-center gap-4"
      onSubmit={event => {
        event.preventDefault()
        const volume = new FormData(event.currentTarget).get('volume')
        setSubmitted(typeof volume === 'string' ? volume : '')
      }}
    >
      <web-ui-slider name="volume" step={5} value={40}></web-ui-slider>
      <web-ui-button type="submit">提交</web-ui-button>
      <web-ui-button
        onClick={() => {
          formRef.current?.reset()
          setSubmitted('')
        }}
      >
        重置
      </web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">
        {submitted === '' ? '尚未提交' : `volume=${submitted}`}
      </output>
    </form>
  )
}
```

```vue
<template>
  <form ref="form" class="flex flex-wrap items-center gap-4" @submit="onSubmit">
    <web-ui-slider name="volume" :step="5" :value="40"></web-ui-slider>
    <web-ui-button type="submit">提交</web-ui-button>
    <web-ui-button @click="reset">重置</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">
      {{ submitted === '' ? '尚未提交' : `volume=${submitted}` }}
    </output>
  </form>
</template>

<script setup lang="ts">
import { useTemplateRef, ref } from 'vue'

const submitted = ref('')
const form = useTemplateRef('form')

function onSubmit(event: Event) {
  event.preventDefault()
  const volume = new FormData(event.currentTarget as HTMLFormElement).get('volume')
  submitted.value = typeof volume === 'string' ? volume : ''
}

function reset() {
  form.value?.reset()
  submitted.value = ''
}
</script>
```

### CSS 变量 {#sizing}

`--wui-slider-width` / `--wui-slider-vertical-height` 决定 host 的轴长，`--wui-slider-track-size` 是 track 厚度，thumb 的厚度与按压态长边各走一个变量。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-end gap-8">
      <web-ui-slider
        className="[--wui-slider-width:300px] [--wui-slider-track-size:10px] [--wui-slider-thumb-thickness:26px] [--wui-slider-thumb-length:38px]"
        value={35}
      ></web-ui-slider>

      <web-ui-slider
        className="[--wui-slider-width:160px] [--wui-slider-track-size:2px] [--wui-slider-thumb-thickness:12px]"
        value={72}
      ></web-ui-slider>

      <web-ui-slider
        vertical
        marks
        className="[--wui-slider-vertical-height:120px] [--wui-slider-track-size:8px] [--wui-slider-marks-inset:6px]"
        step={10}
        value={50}
      ></web-ui-slider>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-end gap-8">
    <web-ui-slider
      class="[--wui-slider-width:300px] [--wui-slider-track-size:10px] [--wui-slider-thumb-thickness:26px] [--wui-slider-thumb-length:38px]"
      :value="35"
    ></web-ui-slider>

    <web-ui-slider
      class="[--wui-slider-width:160px] [--wui-slider-track-size:2px] [--wui-slider-thumb-thickness:12px]"
      :value="72"
    ></web-ui-slider>

    <web-ui-slider
      vertical
      marks
      class="[--wui-slider-vertical-height:120px] [--wui-slider-track-size:8px] [--wui-slider-marks-inset:6px]"
      :step="10"
      :value="50"
    ></web-ui-slider>
  </div>
</template>
```

## API

### Props

| 名称       | 说明                     | 类型      | 默认值  |
| ---------- | ------------------------ | --------- | ------- |
| `disabled` | 禁用状态。               | `boolean` | `false` |
| `marks`    | 显示刻度标记。           | `boolean` | `false` |
| `vertical` | 垂直方向。               | `boolean` | `false` |
| `name`     | 表单字段名。             | `string`  | `''`    |
| `required` | 只反射属性，不参与校验。 | `boolean` | `false` |
| `value`    | 当前值。                 | `number`  | `0`     |
| `min`      | 最小值。                 | `number`  | `0`     |
| `max`      | 最大值。                 | `number`  | `100`   |
| `step`     | 步进值。                 | `number`  | `1`     |

### Events

| 名称     | 说明                                                           |
| -------- | -------------------------------------------------------------- |
| `input`  | 取值变化时派发；拖拽过程中连续派发。                           |
| `change` | 一次取值变更结束时派发：拖拽松手、点击 track、每按一次调节键。 |

### Methods

| 名称      | 说明                                 |
| --------- | ------------------------------------ |
| `focus()` | 聚焦 `role="slider"` 的 track 元素。 |
| `blur()`  | 让 track 元素失焦。                  |

### 行为说明

支持 ArrowLeft/Right/Up/Down、Home/End、PageUp/PageDown 键盘导航。使用 pointer capture 处理鼠标、触控笔和触摸交互；组件 host 与触控 track 均声明 `touch-action: none`，拖拽激活期间同时阻止 `touchmove` 默认滚动，避免 iOS Safari 在横/纵拖拽过程中接管手势。

thumb 静止态是正圆，直径取厚度 `--wui-slider-thumb-thickness`；按压或拖拽时沿 track 方向展开成胶囊，厚度不变、长边取 `--wui-slider-thumb-length`。横向 slider 的 thumb 展开为宽度方向，纵向 slider 的 thumb 展开为高度方向，与 switch thumb 同一套配方。形状切换带 `--wui-duration-press` 过渡。

### CSS Custom Properties

| 名称                           | 说明                                 | 默认值  |
| ------------------------------ | ------------------------------------ | ------- |
| `--wui-slider-width`           | slider 宽度                          | `200px` |
| `--wui-slider-vertical-height` | 垂直 slider 高度                     | `200px` |
| `--wui-slider-track-size`      | track 厚度                           | `6px`   |
| `--wui-slider-thumb-length`    | thumb 按压/拖拽态沿 track 方向的长边 | `24px`  |
| `--wui-slider-thumb-thickness` | thumb 厚度（静止态为正圆直径）       | `20px`  |
| `--wui-slider-marks-inset`     | marks 内缩                           | `0`     |

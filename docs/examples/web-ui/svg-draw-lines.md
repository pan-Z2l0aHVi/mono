---
component: svg-draw-lines
tag: web-ui-svg-draw-lines
---

SVG 线条绘制动画：基于 `stroke-dashoffset` 在原元素上动画，不克隆、不操作 DOM；默认画入，`replay({ reverse: true })` 沿原路收回。

## 示例

### 基础

默认插槽放需要动画的 SVG 内容，内容第一次稳定时自动播放一次画入。

```react
<web-ui-svg-draw-lines duration={1200}>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M4 12 L10 18 L20 6" stroke-width="2"></path>
  </svg>
</web-ui-svg-draw-lines>
```

```vue
<template>
  <web-ui-svg-draw-lines :duration="1200">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M4 12 L10 18 L20 6" stroke-width="2"></path>
    </svg>
  </web-ui-svg-draw-lines>
</template>
```

### 关闭自动播放

`no-autoplay` 让内容保持资产原样，由调用方决定何时播放。

```react
<web-ui-svg-draw-lines no-autoplay easing="ease-out">
  <web-ui-icon icon={lucideCheck}></web-ui-icon>
</web-ui-svg-draw-lines>
```

```vue
<template>
  <web-ui-svg-draw-lines no-autoplay easing="ease-out">
    <web-ui-icon :icon="lucideCheck"></web-ui-icon>
  </web-ui-svg-draw-lines>
</template>

<script setup lang="ts">
import { lucideCheck } from '@greypan/web-ui/icons'
</script>
```

### 手工重播

`replay()` 取消当前动画并重新收集几何元素；`reverse` 让线条沿原路收回，收尾的空白作为 DOM 状态保留。

```react
const ref = useRef(null)
const replay = () => ref.current?.replay()
const retract = () => ref.current?.replay({ reverse: true })

return (
  <>
    <web-ui-svg-draw-lines ref={ref}>
      <svg viewBox="0 0 24 24" stroke="currentColor">
        <path d="M4 12 L10 18 L20 6"></path>
      </svg>
    </web-ui-svg-draw-lines>
    <web-ui-button onClick={replay}>重播</web-ui-button>
    <web-ui-button onClick={retract}>收回</web-ui-button>
  </>
)
```

```vue
<template>
  <web-ui-svg-draw-lines ref="lines">
    <svg viewBox="0 0 24 24" stroke="currentColor">
      <path d="M4 12 L10 18 L20 6"></path>
    </svg>
  </web-ui-svg-draw-lines>
  <web-ui-button @click="lines?.replay()">重播</web-ui-button>
  <web-ui-button @click="lines?.replay({ reverse: true })">收回</web-ui-button>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'

const lines = useTemplateRef('lines')
</script>
```

## API

### Props

| 名称          | 说明                                         | 类型      | 默认值     |
| ------------- | -------------------------------------------- | --------- | ---------- |
| `duration`    | 动画时长（毫秒），限制在 0–30000。           | `number`  | `1000`     |
| `easing`      | 传递给 `element.animate()` 的 CSS 缓动函数。 | `string`  | `'linear'` |
| `no-autoplay` | 关闭内容首次出现时的自动播放。               | `boolean` | `false`    |

### Slots

| 名称      | 说明                  |
| --------- | --------------------- |
| `default` | 需要动画的 SVG 内容。 |

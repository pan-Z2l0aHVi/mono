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

| 名称          | 说明                                                                        | 类型      | 默认值     |
| ------------- | --------------------------------------------------------------------------- | --------- | ---------- |
| `duration`    | 动画时长（毫秒），限制在 0–30000。                                          | `number`  | `1000`     |
| `easing`      | 注册长度型自定义属性可用时传给 `element.animate()`；不可用时使用 `linear`。 | `string`  | `'linear'` |
| `no-autoplay` | 关闭内容首次出现时的自动播放。                                              | `boolean` | `false`    |

### Slots

| 名称      | 说明                  |
| --------- | --------------------- |
| `default` | 需要动画的 SVG 内容。 |

### Methods

| 名称               | 说明                                                                                                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `replay(options?)` | 停止当前播放并重新开始，每次调用重新收集子树里的几何元素；`options.reverse` 为 `true` 时沿原路径收回。返回的 Promise 在动画全部结束后兑现，无目标或当前主题范围启用 reduced motion 时立即兑现。 |

### 行为说明

三个属性均会反射（reflected）。

递归遍历 light DOM 和所有开放 Shadow Root，查找 `path`、`rect`、`circle`、`line`、`polyline`、`polygon`、`ellipse` 元素。以 `Z`/`z` 结尾的 `<path>` 会临时应用缺口修复逻辑确保闭合段正确渲染。画入段完成或取消后恢复所有内联样式。

### 自动播放

slot 内容第一次稳定时自动播放一次画入。设置 `no-autoplay` 后保持资产原样、由调用方决定何时播放 —— `<web-ui-checkbox>` 正是靠它避免挂载时就已勾选的勾在页面首帧画出来。

### 收回末态

收回留下的空白是写在被动画的几何元素上的内联样式，包括嵌套开放 Shadow Root（如 `<web-ui-icon>`）里的节点。克隆这些节点（`cloneNode`、`innerHTML` 往返）会把空白一起带走；把节点摘下来再挂回去，描边也仍然是隐去的 —— 收回结束是一个 DOM 状态而不是一条还活着的动画，没有留下任何东西去复原它。要重新显示就调用 `replay()`。由于组件会递归进入嵌套的开放 Shadow Root，两层 `<web-ui-svg-draw-lines>` 不得覆盖同一批几何元素：每个实例只在第一次动画某个元素时记录它的内联 dash 值，内层留下的空白会被外层当成「消费者自己写的值」。

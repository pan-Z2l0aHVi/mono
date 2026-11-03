# SVG Draw Lines

SVG 线条绘制动画。组件直接对插槽里的原元素做动画，不克隆 DOM。默认播放画入，`replay({ reverse: true })` 沿原路径收回。

## Samples

### Basic

把需要动画的 SVG 内容放进默认插槽。内容第一次稳定渲染时，组件自动播放一次画入。`duration` 是这次动画的毫秒数，默认 `1000`。

```tsx
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const lines = useRef<WebUiSvgDrawLines>(null)

  return (
    <div className="flex flex-col items-center gap-3">
      <web-ui-svg-draw-lines ref={lines} duration={1200}>
        <svg
          viewBox="0 0 24 24"
          width="48"
          height="48"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12 L10 18 L20 6"></path>
        </svg>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" onClick={() => lines.current?.replay()}>
        重播
      </web-ui-button>
      <span className="text-xs text-(--wui-color-text-secondary)">挂载后自动画入一次</span>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-center gap-3">
    <web-ui-svg-draw-lines ref="lines" :duration="1200">
      <svg
        viewBox="0 0 24 24"
        width="48"
        height="48"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M4 12 L10 18 L20 6"></path>
      </svg>
    </web-ui-svg-draw-lines>
    <web-ui-button variant="secondary" @click="lines?.replay()">重播</web-ui-button>
    <span class="text-xs text-(--wui-color-text-secondary)">挂载后自动画入一次</span>
  </div>
</template>

<script setup lang="ts">
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const lines = useTemplateRef<WebUiSvgDrawLines>('lines')
</script>
```

### Stroked geometry

参与动画的元素有 `path`、`rect`、`circle`、`line`、`polyline`、`polygon`、`ellipse`。一次播放中它们同时开始、同时推进。组件不提供延迟或错峰，需要逐条播放时请使用多个实例。

```tsx
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const pathLine = useRef<WebUiSvgDrawLines>(null)
  const rectCircle = useRef<WebUiSvgDrawLines>(null)
  const poly = useRef<WebUiSvgDrawLines>(null)
  const closedPath = useRef<WebUiSvgDrawLines>(null)

  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-6 pb-4">
      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref={pathLine}>
          <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 45 L35 10 L65 45"></path>
            <line x1="65" y1="45" x2="95" y2="10"></line>
          </svg>
        </web-ui-svg-draw-lines>
        <web-ui-button variant="secondary" onClick={() => pathLine.current?.replay()}>
          重播
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">路径 + 直线</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref={rectCircle}>
          <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="6" y="12" width="38" height="38"></rect>
            <circle cx="75" cy="31" r="18"></circle>
          </svg>
        </web-ui-svg-draw-lines>
        <web-ui-button variant="secondary" onClick={() => rectCircle.current?.replay()}>
          重播
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">矩形 + 圆</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref={poly}>
          <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6,52 22,12 38,52"></polyline>
            <polygon points="60,52 78,12 96,52"></polygon>
          </svg>
        </web-ui-svg-draw-lines>
        <web-ui-button variant="secondary" onClick={() => poly.current?.replay()}>
          重播
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">折线 + 多边形</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref={closedPath}>
          <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 10 L44 10 L44 44 L6 44 Z"></path>
            <ellipse cx="76" cy="28" rx="18" ry="11"></ellipse>
          </svg>
        </web-ui-svg-draw-lines>
        <web-ui-button variant="secondary" onClick={() => closedPath.current?.replay()}>
          重播
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">闭合 path（以 Z 收尾）+ ellipse</span>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-end gap-x-8 gap-y-6 pb-4">
    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines ref="pathLine">
        <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 45 L35 10 L65 45"></path>
          <line x1="65" y1="45" x2="95" y2="10"></line>
        </svg>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" @click="pathLine?.replay()">重播</web-ui-button>
      <span class="text-xs text-(--wui-color-text-secondary)">路径 + 直线</span>
    </div>

    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines ref="rectCircle">
        <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="12" width="38" height="38"></rect>
          <circle cx="75" cy="31" r="18"></circle>
        </svg>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" @click="rectCircle?.replay()">重播</web-ui-button>
      <span class="text-xs text-(--wui-color-text-secondary)">矩形 + 圆</span>
    </div>

    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines ref="poly">
        <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6,52 22,12 38,52"></polyline>
          <polygon points="60,52 78,12 96,52"></polygon>
        </svg>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" @click="poly?.replay()">重播</web-ui-button>
      <span class="text-xs text-(--wui-color-text-secondary)">折线 + 多边形</span>
    </div>

    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines ref="closedPath">
        <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 10 L44 10 L44 44 L6 44 Z"></path>
          <ellipse cx="76" cy="28" rx="18" ry="11"></ellipse>
        </svg>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" @click="closedPath?.replay()">重播</web-ui-button>
      <span class="text-xs text-(--wui-color-text-secondary)">闭合 path（以 Z 收尾）+ ellipse</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const pathLine = useTemplateRef<WebUiSvgDrawLines>('pathLine')
const rectCircle = useTemplateRef<WebUiSvgDrawLines>('rectCircle')
const poly = useTemplateRef<WebUiSvgDrawLines>('poly')
const closedPath = useTemplateRef<WebUiSvgDrawLines>('closedPath')
</script>
```

### Duration and easing

`duration` 限制在 0 到 30000 毫秒之间，非数字会回退到 `1000`。`easing` 是 CSS 缓动函数，默认 `linear`。

两个值都在每次播放开始时读取。动画进行中修改属性不会影响当前这次播放，下一次 `replay()` 才会生效。

```tsx
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const fast = useRef<WebUiSvgDrawLines>(null)
  const slow = useRef<WebUiSvgDrawLines>(null)
  const bounce = useRef<WebUiSvgDrawLines>(null)

  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-6 pb-4">
      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref={fast} duration={400}>
          <svg
            viewBox="0 0 100 40"
            width="100"
            height="40"
            overflow="visible"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 30 Q25 0 50 30 T95 30"></path>
          </svg>
        </web-ui-svg-draw-lines>
        <web-ui-button variant="secondary" onClick={() => fast.current?.replay()}>
          重播
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">400ms · 线性（默认）</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref={slow} duration={1600} easing="ease-out">
          <svg
            viewBox="0 0 100 40"
            width="100"
            height="40"
            overflow="visible"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 30 Q25 0 50 30 T95 30"></path>
          </svg>
        </web-ui-svg-draw-lines>
        <web-ui-button variant="secondary" onClick={() => slow.current?.replay()}>
          重播
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">1600ms · 缓出</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref={bounce} duration={1600} easing="cubic-bezier(0.68, -0.55, 0.27, 1.55)">
          <svg
            viewBox="0 0 100 40"
            width="100"
            height="40"
            overflow="visible"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 30 Q25 0 50 30 T95 30"></path>
          </svg>
        </web-ui-svg-draw-lines>
        <web-ui-button variant="secondary" onClick={() => bounce.current?.replay()}>
          重播
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">1600ms · 越过端点的曲线</span>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-end gap-x-8 gap-y-6 pb-4">
    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines ref="fast" :duration="400">
        <svg
          viewBox="0 0 100 40"
          width="100"
          height="40"
          overflow="visible"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M5 30 Q25 0 50 30 T95 30"></path>
        </svg>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" @click="fast?.replay()">重播</web-ui-button>
      <span class="text-xs text-(--wui-color-text-secondary)">400ms · 线性（默认）</span>
    </div>

    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines ref="slow" :duration="1600" easing="ease-out">
        <svg
          viewBox="0 0 100 40"
          width="100"
          height="40"
          overflow="visible"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M5 30 Q25 0 50 30 T95 30"></path>
        </svg>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" @click="slow?.replay()">重播</web-ui-button>
      <span class="text-xs text-(--wui-color-text-secondary)">1600ms · 缓出</span>
    </div>

    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines ref="bounce" :duration="1600" easing="cubic-bezier(0.68, -0.55, 0.27, 1.55)">
        <svg
          viewBox="0 0 100 40"
          width="100"
          height="40"
          overflow="visible"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M5 30 Q25 0 50 30 T95 30"></path>
        </svg>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" @click="bounce?.replay()">重播</web-ui-button>
      <span class="text-xs text-(--wui-color-text-secondary)">1600ms · 越过端点的曲线</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const fast = useTemplateRef<WebUiSvgDrawLines>('fast')
const slow = useTemplateRef<WebUiSvgDrawLines>('slow')
const bounce = useTemplateRef<WebUiSvgDrawLines>('bounce')
</script>
```

### Multiple paths and nesting

每次 `replay()` 都会重新收集宿主的全部 light DOM 后代。同一个 `<svg>` 里的多条 `<path>`、并排的多个 `<svg>`，以及任意层 `<g>` 嵌套，都进入同一批，一起开始、一起结束。元素数量不会让动画排队。

```tsx
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const lines = useRef<WebUiSvgDrawLines>(null)

  return (
    <div className="flex flex-wrap items-center gap-6">
      <web-ui-svg-draw-lines ref={lines} duration={1400}>
        <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 54 L30 10 L54 54"></path>
          <path d="M14 38 L46 38"></path>
        </svg>
        <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" strokeWidth="2">
          <g>
            <g>
              <circle cx="30" cy="30" r="18"></circle>
              <path d="M62 12 L92 48"></path>
            </g>
          </g>
        </svg>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" onClick={() => lines.current?.replay()}>
        重播
      </web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-6">
    <web-ui-svg-draw-lines ref="lines" :duration="1400">
      <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 54 L30 10 L54 54"></path>
        <path d="M14 38 L46 38"></path>
      </svg>
      <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" stroke-width="2">
        <g>
          <g>
            <circle cx="30" cy="30" r="18"></circle>
            <path d="M62 12 L92 48"></path>
          </g>
        </g>
      </svg>
    </web-ui-svg-draw-lines>
    <web-ui-button variant="secondary" @click="lines?.replay()">重播</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const lines = useTemplateRef<WebUiSvgDrawLines>('lines')
</script>
```

### Nested shadow roots

嵌套的开放 shadow root 里的几何元素同样参与动画，例如 `<web-ui-icon>` 里的 `<path>`；闭合的 shadow root 会被跳过。因此两层实例不能覆盖同一批几何元素，详见「收回末态」。

```tsx
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { lucideStar } from '@greypan/web-ui/icons'
import { useRef } from 'react'

export default function Demo() {
  const lines = useRef<WebUiSvgDrawLines>(null)

  return (
    <div className="flex flex-wrap items-center gap-6">
      <web-ui-svg-draw-lines ref={lines} duration={1400} easing="ease-in-out">
        <svg
          viewBox="0 0 24 24"
          width="40"
          height="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M12 5 V19"></path>
          <path d="M5 12 H19"></path>
        </svg>
        <web-ui-icon icon={lucideStar} size={40}></web-ui-icon>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" onClick={() => lines.current?.replay()}>
        重播
      </web-ui-button>
      <span className="text-xs text-(--wui-color-text-secondary)">左边是 light DOM，右边是 icon 的 shadow root</span>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-6">
    <web-ui-svg-draw-lines ref="lines" :duration="1400" easing="ease-in-out">
      <svg
        viewBox="0 0 24 24"
        width="40"
        height="40"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      >
        <path d="M12 5 V19"></path>
        <path d="M5 12 H19"></path>
      </svg>
      <web-ui-icon :icon="lucideStar" :size="40"></web-ui-icon>
    </web-ui-svg-draw-lines>
    <web-ui-button variant="secondary" @click="lines?.replay()">重播</web-ui-button>
    <span class="text-xs text-(--wui-color-text-secondary)">左边是 light DOM，右边是 icon 的 shadow root</span>
  </div>
</template>

<script setup lang="ts">
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { lucideStar } from '@greypan/web-ui/icons'
import { useTemplateRef } from 'vue'

const lines = useTemplateRef<WebUiSvgDrawLines>('lines')
</script>
```

### Disabling autoplay

`no-autoplay` 关闭首次自动播放，内容保持资产的完整描边。`replay()` 照常可用，由调用方决定何时播放。

```tsx
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { lucideCheck } from '@greypan/web-ui/icons'
import { useRef } from 'react'

export default function Demo() {
  const lines = useRef<WebUiSvgDrawLines>(null)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-svg-draw-lines ref={lines} noAutoplay easing="ease-out">
        <web-ui-icon icon={lucideCheck} size={48}></web-ui-icon>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" onClick={() => lines.current?.replay()}>
        replay()
      </web-ui-button>
      <span className="text-xs text-(--wui-color-text-secondary)">挂载时静止在完整描边</span>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-svg-draw-lines ref="lines" no-autoplay easing="ease-out">
      <web-ui-icon :icon="lucideCheck" :size="48"></web-ui-icon>
    </web-ui-svg-draw-lines>
    <web-ui-button variant="secondary" @click="lines?.replay()">replay()</web-ui-button>
    <span class="text-xs text-(--wui-color-text-secondary)">挂载时静止在完整描边</span>
  </div>
</template>

<script setup lang="ts">
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { lucideCheck } from '@greypan/web-ui/icons'
import { useTemplateRef } from 'vue'

const lines = useTemplateRef<WebUiSvgDrawLines>('lines')
</script>
```

### Manual replay

`replay()` 取消当前动画，重新收集几何元素，从空白画到完整。`replay({ reverse: true })` 沿原路径收回，收回后的空白以内联样式保留在 DOM 上，要重新显示只能再调用一次 `replay()`。

返回的 Promise 在这一次全部动画结束后兑现。没有目标元素，或当前主题范围启用减少动态效果时，Promise 立即兑现。

```tsx
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const lines = useRef<WebUiSvgDrawLines>(null)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-svg-draw-lines ref={lines} duration={900} easing="ease-in-out">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M7.5 12.5 L10.5 15.5 L16.5 9"></path>
        </svg>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" onClick={() => lines.current?.replay()}>
        画入
      </web-ui-button>
      <web-ui-button variant="secondary" onClick={() => lines.current?.replay({ reverse: true })}>
        反向收回
      </web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-svg-draw-lines ref="lines" :duration="900" easing="ease-in-out">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M7.5 12.5 L10.5 15.5 L16.5 9"></path>
      </svg>
    </web-ui-svg-draw-lines>
    <web-ui-button variant="secondary" @click="lines?.replay()">画入</web-ui-button>
    <web-ui-button variant="secondary" @click="lines?.replay({ reverse: true })">反向收回</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const lines = useTemplateRef<WebUiSvgDrawLines>('lines')
</script>
```

## API

### Props

| 名称          | 说明                                        | 类型      | 默认值     |
| ------------- | ------------------------------------------- | --------- | ---------- |
| `duration`    | 动画时长（毫秒），限制在 0 到 30000。       | `number`  | `1000`     |
| `easing`      | CSS 缓动函数；浏览器不支持时回退 `linear`。 | `string`  | `'linear'` |
| `no-autoplay` | 关闭内容首次出现时的自动播放。              | `boolean` | `false`    |

### Slots

| 名称      | 说明                  |
| --------- | --------------------- |
| `default` | 需要动画的 SVG 内容。 |

### Methods

| 名称               | 说明                                                                                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `replay(options?)` | 停止当前播放并重新开始；每次调用都会重新收集子树里的几何元素。`options.reverse` 为 `true` 时沿原路径收回。返回的 Promise 在动画全部结束后兑现，没有目标元素或当前主题范围启用减少动态效果时立即兑现。 |

### 行为说明

三个属性都会同步为 attribute。

动画目标是 light DOM 和所有开放 shadow root 里的 `path`、`rect`、`circle`、`line`、`polyline`、`polygon`、`ellipse` 元素。

### 自动播放

插槽内容第一次稳定时，组件自动播放一次画入。设置 `no-autoplay` 后内容保持资产原样，由调用方决定何时播放。

### 收回末态

收回后留下的空白，是被动画几何元素上的内联样式；嵌套的开放 shadow root 里的节点（例如 `<web-ui-icon>` 里的节点）也一样。

克隆这些节点（`cloneNode`、`innerHTML` 往返）会连空白一起复制，重新挂载也不会恢复描边。要重新显示就调用 `replay()`。

两层 `<web-ui-svg-draw-lines>` 不能覆盖同一批几何元素。否则内层收回留下的空白会被外层当作自己的值。

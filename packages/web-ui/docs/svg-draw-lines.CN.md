---
component: svg-draw-lines
tag: web-ui-svg-draw-lines
---

SVG 线条绘制动画：基于 `stroke-dashoffset` 在原元素上动画，不克隆、不操作 DOM；默认画入，`replay({ reverse: true })` 沿原路收回。

## Samples

### Basic

默认插槽放需要动画的 SVG 内容；内容第一次稳定时自动播放一次画入。`duration` 是这一笔的毫秒数，默认 `1000`。

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

收集选择器 `path, rect, circle, line, polyline, polygon, ellipse` 命中的几何元素；一次播放里它们同时起播、并行推进。组件没有延迟或错峰的入口，逐条排队的效果要靠拆成多个实例。

以 `Z` 收尾的闭合 `path` 会在播放期间临时补一小段，让收尾那笔真的画出来；播放结束后恢复原来的 `d`。

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

`duration` 限制在 0–30000 毫秒，非数字回退到 `1000`；`easing` 原样传给 `element.animate()`，默认 `linear`。

两个值都在每次播放开始时读取，所以动画进行中改属性不会影响当前这一笔；下一次 `replay()` 才生效。

三个示例画的是同一条曲线，只差时长和缓动。

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

每次 `replay()` 重新收集子树，范围是宿主的全部 light DOM 后代：同一个 `<svg>` 里的多条 `<path>`、并排的多个 `<svg>`、任意层 `<g>` 嵌套都算进同一批，一起起播、一起收尾。条数不会让动画排队，实例也没有并发上限或「逐条播放」的开关。

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

遍历会递归进入**开放**的 shadow root，所以 `<web-ui-icon>` 里的 `<path>` 和宿主 light DOM 的 `<svg>` 落在同一批目标里一起动画；闭合的 shadow root 被跳过。

也正因为会走进嵌套的 shadow root，两层实例不得覆盖同一批几何元素（见「收回末态」）。

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

`no-autoplay` 关掉「首次内容稳定时自动播放一次」，内容停在资产原样 —— 完整描边、看得见，且不写任何内联 dash；`replay()` 照旧可用，什么时候播由调用方决定。`<web-ui-checkbox>` 正是靠它避免挂载时就已勾选的勾在页面首帧画出来。

下面这条挂载时静止，点 `replay()` 才画入。

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

`replay()` 取消当前动画并重新收集几何元素，从空白画满；`replay({ reverse: true })` 沿原路收回，收尾的空白作为 DOM 状态留在内联样式上，要重新显示只能再调用一次 `replay()`。

返回的 Promise 在这一次的全部动画结束后兑现，无目标或当前主题范围启用 reduced motion 时立即兑现。

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

| 名称          | 说明                                                                              | 类型      | 默认值     |
| ------------- | --------------------------------------------------------------------------------- | --------- | ---------- |
| `duration`    | 动画时长（毫秒），限制在 0–30000。                                                | `number`  | `1000`     |
| `easing`      | 浏览器支持注册长度型自定义属性插值时传给 `element.animate()`；否则使用 `linear`。 | `string`  | `'linear'` |
| `no-autoplay` | 关闭内容首次出现时的自动播放。                                                    | `boolean` | `false`    |

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

递归遍历 light DOM 和所有开放 Shadow Root，查找 `path`、`rect`、`circle`、`line`、`polyline`、`polygon`、`ellipse` 元素。

以 `Z`/`z` 结尾的 `<path>` 会临时应用缺口修复逻辑确保闭合段正确渲染。画入段完成或取消后恢复所有内联样式。

### 自动播放

slot 内容第一次稳定时自动播放一次画入。设置 `no-autoplay` 后保持资产原样、由调用方决定何时播放 —— `<web-ui-checkbox>` 正是靠它避免挂载时就已勾选的勾在页面首帧画出来。

### 收回末态

收回留下的空白是写在被动画的几何元素上的内联样式，包括嵌套开放 Shadow Root（如 `<web-ui-icon>`）里的节点。

克隆这些节点（`cloneNode`、`innerHTML` 往返）会把空白一起带走；把节点摘下来再挂回去，描边也仍然是隐去的 —— 收回结束是一个 DOM 状态而不是一条还活着的动画，没有留下任何东西去复原它。要重新显示就调用 `replay()`。

由于组件会递归进入嵌套的开放 Shadow Root，两层 `<web-ui-svg-draw-lines>` 不得覆盖同一批几何元素：每个实例只在第一次动画某个元素时记录它的内联 dash 值，内层留下的空白会被外层当成「消费者自己写的值」。

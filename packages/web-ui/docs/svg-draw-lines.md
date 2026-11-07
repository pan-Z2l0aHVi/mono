# SVG Draw Lines

English | [简体中文](./svg-draw-lines.CN.md)

An SVG line-drawing animation. The component animates the original elements in the slot directly and does not clone the DOM. By default it draws in; `replay({ reverse: true })` retracts along the same path.

## Samples

### Basic

Put the SVG content you want to animate in the default slot. The first time that content is stable, the component plays one draw-in. `duration` is the number of milliseconds for that playback and defaults to `1000`.

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
        Replay
      </web-ui-button>
      <span className="text-xs text-(--wui-color-text-secondary)">Draws in once automatically after mount</span>
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
    <web-ui-button variant="secondary" @click="lines?.replay()">Replay</web-ui-button>
    <span class="text-xs text-(--wui-color-text-secondary)">Draws in once automatically after mount</span>
  </div>
</template>

<script setup lang="ts">
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const lines = useTemplateRef<WebUiSvgDrawLines>('lines')
</script>
```

### Stroked geometry

The elements that take part in the animation are `path`, `rect`, `circle`, `line`, `polyline`, `polygon`, and `ellipse`. Within one playback they start together and advance together. The component has no delay or stagger option, so a one-by-one effect needs multiple instances.

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
          Replay
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">path + line</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref={rectCircle}>
          <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="6" y="12" width="38" height="38"></rect>
            <circle cx="75" cy="31" r="18"></circle>
          </svg>
        </web-ui-svg-draw-lines>
        <web-ui-button variant="secondary" onClick={() => rectCircle.current?.replay()}>
          Replay
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">rect + circle</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref={poly}>
          <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6,52 22,12 38,52"></polyline>
            <polygon points="60,52 78,12 96,52"></polygon>
          </svg>
        </web-ui-svg-draw-lines>
        <web-ui-button variant="secondary" onClick={() => poly.current?.replay()}>
          Replay
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">polyline + polygon</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref={closedPath}>
          <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 10 L44 10 L44 44 L6 44 Z"></path>
            <ellipse cx="76" cy="28" rx="18" ry="11"></ellipse>
          </svg>
        </web-ui-svg-draw-lines>
        <web-ui-button variant="secondary" onClick={() => closedPath.current?.replay()}>
          Replay
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">Closed path (ending with Z) + ellipse</span>
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
      <web-ui-button variant="secondary" @click="pathLine?.replay()">Replay</web-ui-button>
      <span class="text-xs text-(--wui-color-text-secondary)">path + line</span>
    </div>

    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines ref="rectCircle">
        <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="12" width="38" height="38"></rect>
          <circle cx="75" cy="31" r="18"></circle>
        </svg>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" @click="rectCircle?.replay()">Replay</web-ui-button>
      <span class="text-xs text-(--wui-color-text-secondary)">rect + circle</span>
    </div>

    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines ref="poly">
        <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6,52 22,12 38,52"></polyline>
          <polygon points="60,52 78,12 96,52"></polygon>
        </svg>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" @click="poly?.replay()">Replay</web-ui-button>
      <span class="text-xs text-(--wui-color-text-secondary)">polyline + polygon</span>
    </div>

    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines ref="closedPath">
        <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 10 L44 10 L44 44 L6 44 Z"></path>
          <ellipse cx="76" cy="28" rx="18" ry="11"></ellipse>
        </svg>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" @click="closedPath?.replay()">Replay</web-ui-button>
      <span class="text-xs text-(--wui-color-text-secondary)">Closed path (ending with Z) + ellipse</span>
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

`duration` is clamped between 0 and 30000 milliseconds, and a non-numeric value falls back to `1000`. `easing` is a CSS easing function and defaults to `linear`.

Both values are read when each playback starts. Changing the properties during an animation does not affect the current playback; the next `replay()` uses the new values.

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
          Replay
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">400ms · linear (default)</span>
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
          Replay
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">1600ms · ease-out</span>
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
          Replay
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">1600ms · curve that overshoots the endpoints</span>
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
      <web-ui-button variant="secondary" @click="fast?.replay()">Replay</web-ui-button>
      <span class="text-xs text-(--wui-color-text-secondary)">400ms · linear (default)</span>
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
      <web-ui-button variant="secondary" @click="slow?.replay()">Replay</web-ui-button>
      <span class="text-xs text-(--wui-color-text-secondary)">1600ms · ease-out</span>
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
      <web-ui-button variant="secondary" @click="bounce?.replay()">Replay</web-ui-button>
      <span class="text-xs text-(--wui-color-text-secondary)">1600ms · curve that overshoots the endpoints</span>
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

Each `replay()` collects all light DOM descendants of the host again. Multiple `<path>` elements inside one `<svg>`, several `<svg>` elements side by side, and `<g>` nesting at any depth all join the same batch and start and finish together. The number of elements never queues animations.

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
        Replay
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
    <web-ui-button variant="secondary" @click="lines?.replay()">Replay</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const lines = useTemplateRef<WebUiSvgDrawLines>('lines')
</script>
```

### Nested shadow roots

Geometry elements inside nested open shadow roots take part in the animation too, such as the `<path>` inside `<web-ui-icon>`; closed shadow roots are skipped. Two instances therefore must not cover the same geometry elements; see End state after a rewind.

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
        Replay
      </web-ui-button>
      <span className="text-xs text-(--wui-color-text-secondary)">
        Left is the light DOM, right is the shadow root of the icon
      </span>
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
    <web-ui-button variant="secondary" @click="lines?.replay()">Replay</web-ui-button>
    <span class="text-xs text-(--wui-color-text-secondary)"
      >Left is the light DOM, right is the shadow root of the icon</span
    >
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

`no-autoplay` turns off autoplay on first appearance, and the content stays as the fully stroked asset. `replay()` still works, and the caller decides when to play.

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
      <span className="text-xs text-(--wui-color-text-secondary)">Static at the full stroke on mount</span>
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
    <span class="text-xs text-(--wui-color-text-secondary)">Static at the full stroke on mount</span>
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

`replay()` cancels the current animation, collects the geometry elements again, and draws from empty to full. `replay({ reverse: true })` retracts along the same path and leaves the resulting blank in the inline styles on the DOM; showing it again requires calling `replay()` once more.

The returned promise settles after all animations of that playback finish. It settles immediately when there are no targets, or when reduced motion is enabled in the current theme scope.

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
        Draw in
      </web-ui-button>
      <web-ui-button variant="secondary" onClick={() => lines.current?.replay({ reverse: true })}>
        reverse retracts
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
    <web-ui-button variant="secondary" @click="lines?.replay()">Draw in</web-ui-button>
    <web-ui-button variant="secondary" @click="lines?.replay({ reverse: true })">reverse retracts</web-ui-button>
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

| Name          | Description                                                    | Type      | Default    |
| ------------- | -------------------------------------------------------------- | --------- | ---------- |
| `duration`    | Animation duration (milliseconds), clamped to 0 to 30000.      | `number`  | `1000`     |
| `easing`      | CSS easing function; falls back to `linear` where unsupported. | `string`  | `'linear'` |
| `no-autoplay` | Turns off automatic playback when the content first appears.   | `boolean` | `false`    |

### Slots

| Name      | Description             |
| --------- | ----------------------- |
| `default` | SVG content to animate. |

### Methods

| Name               | Description                                                                                                                                                                                                                                                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `replay(options?)` | Stops the current playback and starts over; every call collects the geometry elements in the subtree again. When `options.reverse` is `true` it retracts along the original path. The returned promise settles after all animations finish, and settles immediately when there are no targets or when reduced motion is enabled in the current theme scope. |

### Behavior

All three properties are written back to attributes.

The animation targets `path`, `rect`, `circle`, `line`, `polyline`, `polygon`, and `ellipse` elements in the light DOM and in all open shadow roots.

### Autoplay

The component plays one draw-in the first time the slot content is stable. With `no-autoplay` set, the content keeps its original asset and the caller decides when to play.

### End state after a rewind

The blank left by a rewind is an inline style on the animated geometry elements. Nodes inside nested open shadow roots, such as the nodes in `<web-ui-icon>`, carry it the same way.

Cloning these nodes (`cloneNode`, an `innerHTML` round trip) copies the blank with them, and reattaching does not restore the stroke. Call `replay()` to show it again.

Two `<web-ui-svg-draw-lines>` layers must not cover the same geometry elements. Otherwise the outer layer treats a blank left by the inner rewind as its own value.

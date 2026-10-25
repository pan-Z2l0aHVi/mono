---
component: svg-draw-lines
tag: web-ui-svg-draw-lines
---

An SVG line-drawing animation: it animates the original elements via `stroke-dashoffset` without cloning or touching the DOM; by default it draws in, and `replay({ reverse: true })` retracts along the same path.

## Samples

### Basic {#basic}

The default slot holds the SVG content to animate, and it plays a single draw-in automatically the first time the content is stable. `duration` is the number of milliseconds for that stroke and defaults to `1000`.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <web-ui-svg-draw-lines duration={1200}>
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
      <span className="text-xs text-(--wui-color-text-secondary)">Draws in once automatically after mount</span>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-svg-draw-lines :duration="1200">
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
    <span class="text-xs text-(--wui-color-text-secondary)">Draws in once automatically after mount</span>
  </div>
</template>
```

### Stroked geometry {#geometry}

It collects the geometry elements matched by the selector `path, rect, circle, line, polyline, polygon, ellipse`; within one playback they all start and advance in parallel—the component offers no entry point for delays or staggering, so a one-by-one effect requires splitting into multiple instances.

A closed `path` ending with `Z` is temporarily given a short extra segment during playback so that the closing stroke is really drawn, and its original `d` is restored afterwards.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-end gap-8">
      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines>
          <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 45 L35 10 L65 45"></path>
            <line x1="65" y1="45" x2="95" y2="10"></line>
          </svg>
        </web-ui-svg-draw-lines>
        <span className="text-xs text-(--wui-color-text-secondary)">path + line</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines>
          <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="6" y="12" width="38" height="38"></rect>
            <circle cx="75" cy="31" r="18"></circle>
          </svg>
        </web-ui-svg-draw-lines>
        <span className="text-xs text-(--wui-color-text-secondary)">rect + circle</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines>
          <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6,52 22,12 38,52"></polyline>
            <polygon points="60,52 78,12 96,52"></polygon>
          </svg>
        </web-ui-svg-draw-lines>
        <span className="text-xs text-(--wui-color-text-secondary)">polyline + polygon</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines>
          <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 10 L44 10 L44 44 L6 44 Z"></path>
            <ellipse cx="76" cy="28" rx="18" ry="11"></ellipse>
          </svg>
        </web-ui-svg-draw-lines>
        <span className="text-xs text-(--wui-color-text-secondary)">Closed path (ending with Z) + ellipse</span>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-end gap-8">
    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines>
        <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 45 L35 10 L65 45"></path>
          <line x1="65" y1="45" x2="95" y2="10"></line>
        </svg>
      </web-ui-svg-draw-lines>
      <span class="text-xs text-(--wui-color-text-secondary)">path + line</span>
    </div>

    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines>
        <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="12" width="38" height="38"></rect>
          <circle cx="75" cy="31" r="18"></circle>
        </svg>
      </web-ui-svg-draw-lines>
      <span class="text-xs text-(--wui-color-text-secondary)">rect + circle</span>
    </div>

    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines>
        <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6,52 22,12 38,52"></polyline>
          <polygon points="60,52 78,12 96,52"></polygon>
        </svg>
      </web-ui-svg-draw-lines>
      <span class="text-xs text-(--wui-color-text-secondary)">polyline + polygon</span>
    </div>

    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines>
        <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 10 L44 10 L44 44 L6 44 Z"></path>
          <ellipse cx="76" cy="28" rx="18" ry="11"></ellipse>
        </svg>
      </web-ui-svg-draw-lines>
      <span class="text-xs text-(--wui-color-text-secondary)">Closed path (ending with Z) + ellipse</span>
    </div>
  </div>
</template>
```

### Duration and easing {#duration-easing}

`duration` is clamped to 0–30000 milliseconds, and a non-numeric value falls back to `1000`; `easing` is passed to `element.animate()` as-is and defaults to `linear`.

Both values are read at the moment each playback starts, so changing the properties while an animation is running does not affect the segment in flight; the next `replay()` picks it up.

The three samples draw the same curve and differ only in duration and easing.

```tsx
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const fast = useRef<WebUiSvgDrawLines>(null)
  const slow = useRef<WebUiSvgDrawLines>(null)
  const bounce = useRef<WebUiSvgDrawLines>(null)

  function replayAll() {
    void fast.current?.replay()
    void slow.current?.replay()
    void bounce.current?.replay()
  }

  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex flex-wrap items-end gap-8">
        <div className="flex flex-col items-center gap-2">
          <web-ui-svg-draw-lines ref={fast} duration={400}>
            <svg viewBox="0 0 100 40" width="100" height="40" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 30 Q25 0 50 30 T95 30"></path>
            </svg>
          </web-ui-svg-draw-lines>
          <span className="text-xs text-(--wui-color-text-secondary)">400ms · linear (default)</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <web-ui-svg-draw-lines ref={slow} duration={1600} easing="ease-out">
            <svg viewBox="0 0 100 40" width="100" height="40" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 30 Q25 0 50 30 T95 30"></path>
            </svg>
          </web-ui-svg-draw-lines>
          <span className="text-xs text-(--wui-color-text-secondary)">1600ms · ease-out</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <web-ui-svg-draw-lines ref={bounce} duration={1600} easing="cubic-bezier(0.68, -0.55, 0.27, 1.55)">
            <svg viewBox="0 0 100 40" width="100" height="40" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 30 Q25 0 50 30 T95 30"></path>
            </svg>
          </web-ui-svg-draw-lines>
          <span className="text-xs text-(--wui-color-text-secondary)">
            1600ms · curve that overshoots the endpoints
          </span>
        </div>
      </div>

      <web-ui-button variant="secondary" onClick={replayAll}>
        Replay all three
      </web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-4">
    <div class="flex flex-wrap items-end gap-8">
      <div class="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref="fast" :duration="400">
          <svg viewBox="0 0 100 40" width="100" height="40" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 30 Q25 0 50 30 T95 30"></path>
          </svg>
        </web-ui-svg-draw-lines>
        <span class="text-xs text-(--wui-color-text-secondary)">400ms · linear (default)</span>
      </div>

      <div class="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref="slow" :duration="1600" easing="ease-out">
          <svg viewBox="0 0 100 40" width="100" height="40" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 30 Q25 0 50 30 T95 30"></path>
          </svg>
        </web-ui-svg-draw-lines>
        <span class="text-xs text-(--wui-color-text-secondary)">1600ms · ease-out</span>
      </div>

      <div class="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref="bounce" :duration="1600" easing="cubic-bezier(0.68, -0.55, 0.27, 1.55)">
          <svg viewBox="0 0 100 40" width="100" height="40" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 30 Q25 0 50 30 T95 30"></path>
          </svg>
        </web-ui-svg-draw-lines>
        <span class="text-xs text-(--wui-color-text-secondary)">1600ms · curve that overshoots the endpoints</span>
      </div>
    </div>

    <web-ui-button variant="secondary" @click="replayAll">Replay all three</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const fast = useTemplateRef<WebUiSvgDrawLines>('fast')
const slow = useTemplateRef<WebUiSvgDrawLines>('slow')
const bounce = useTemplateRef<WebUiSvgDrawLines>('bounce')

function replayAll() {
  void fast.value?.replay()
  void slow.value?.replay()
  void bounce.value?.replay()
}
</script>
```

### Multiple paths and nesting {#many-paths}

Each `replay()` collects the subtree again, covering all light DOM descendants of the host: multiple `<path>`s inside one `<svg>`, several `<svg>`s side by side, and `<g>` nesting at any depth all count as one batch and start and finish together. The number of paths never queues animations, and the instance has no concurrency limit and no "play one by one" switch.

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

### Nested shadow roots {#shadow-dom}

The traversal recurses into **open** shadow roots, so a `<path>` inside `<web-ui-icon>` and an `<svg>` in the host's light DOM land in the same batch and animate together; closed shadow roots are skipped.

Precisely because it walks into nested shadow roots, two instances must not cover the same geometry elements (see End state after a rewind).

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

### Disabling autoplay {#no-autoplay}

`no-autoplay` turns off "play once when the content first becomes stable", and the content stays as the asset is—fully stroked, visible, and with no inline dash written; `replay()` still works, and the caller decides when to play. `<web-ui-checkbox>` relies on it to avoid drawing an already-checked check on the page's first frame.

The sample below is static on mount and draws in only when `replay()` is clicked.

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

### Manual replay {#replay}

`replay()` cancels the current animation and collects the geometry elements again, drawing from empty to full; `replay({ reverse: true })` retracts along the same path, and the trailing blank is left in the inline styles as DOM state—showing it again requires calling `replay()` once more.

The returned promise settles after all animations of that playback finish, and settles immediately when there are no targets or when reduced motion is enabled in the current theme scope.

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

| Name          | Description                                                                                                                                     | Type      | Default    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| `duration`    | Animation duration (milliseconds), clamped to 0–30000.                                                                                          | `number`  | `1000`     |
| `easing`      | Passed to `element.animate()` when the browser supports interpolation of registered length-typed custom properties; otherwise `linear` is used. | `string`  | `'linear'` |
| `no-autoplay` | Turns off automatic playback when the content first appears.                                                                                    | `boolean` | `false`    |

### Slots

| Name      | Description             |
| --------- | ----------------------- |
| `default` | SVG content to animate. |

### Methods

| Name               | Description                                                                                                                                                                                                                                                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `replay(options?)` | Stops the current playback and starts over, collecting the geometry elements in the subtree on every call; when `options.reverse` is `true` it retracts along the original path. The returned promise settles after all animations finish, and settles immediately when there are no targets or when reduced motion is enabled in the current theme scope. |

### Behavior

All three properties are reflected.

It traverses the light DOM and all open shadow roots recursively, looking for `path`, `rect`, `circle`, `line`, `polyline`, `polygon`, and `ellipse` elements.

A `<path>` ending with `Z`/`z` temporarily gets gap-fix logic applied so that the closing segment renders correctly. All inline styles are restored once the draw-in segment completes or is cancelled.

### Autoplay

It plays a draw-in once the first time the slot content is stable. With `no-autoplay` set, the asset stays as-is and the caller decides when to play—`<web-ui-checkbox>` relies on it to avoid drawing an already-checked check on the page's first frame.

### End state after a rewind

The blank left by a rewind lives in inline styles on the animated geometry elements, including nodes inside nested open shadow roots (such as `<web-ui-icon>`).

Cloning these nodes (`cloneNode`, an `innerHTML` round trip) carries the blank along with them; detaching and reattaching the node also leaves the stroke hidden—the end of a rewind is a DOM state rather than a still-running animation, and nothing is left to restore it. Call `replay()` to show it again.

Because the component recurses into nested open shadow roots, two `<web-ui-svg-draw-lines>` layers must not cover the same geometry elements: each instance records an element's inline dash value only the first time it animates it, so a blank left by the inner layer is treated by the outer layer as "a value the consumer wrote".

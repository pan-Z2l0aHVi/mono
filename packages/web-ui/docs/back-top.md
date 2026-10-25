---
component: back-top
tag: web-ui-back-top
---

A back-to-top button (`web-ui-back-top`): it appears in the corner once the scroll position reaches `threshold`, and clicking it or pressing Enter / Space returns to the top.

By default it scrolls smoothly to the top; when the theme is set to `motion="reduced"`, or to `motion="system"` with a system preference for reduced motion, clicking or pressing Enter jumps to the top immediately.

By default it follows page scrolling; after pointing `scrollTarget` at a scroll container, it appears only with that container's scrolling and rests in the container's bottom corner.

## Samples

### Custom scroll container {#container}

`scrollTarget` is an element property rather than an attribute, so it can only be assigned after mount: take a `ref` to the container and to `<web-ui-back-top>`, then hand the container over inside `useEffect` / `onMounted`.

After the assignment the component rebinds its `scroll` listener to that container and switches to container mode—the host becomes `position: sticky` and rests at the container's bottom; the button appears only once the container scrolls past `threshold`, and a click returns the container to its top.

The element must therefore live inside the scroll container, and the container itself needs overflowing content to scroll; all three samples use the native `overflow-auto`.

```tsx
import type { WebUiBackTop } from '@greypan/web-ui'
import { useEffect, useRef } from 'react'

export default function Demo() {
  const boxRef = useRef<HTMLDivElement>(null)
  const backTopRef = useRef<WebUiBackTop>(null)

  useEffect(() => {
    const box = boxRef.current
    if (box && backTopRef.current) backTopRef.current.scrollTarget = box
  }, [])

  return (
    <div ref={boxRef} className="h-40 w-full overflow-auto rounded-xl border border-(--wui-color-border) p-3">
      {Array.from({ length: 20 }, (_, index) => (
        <p key={index} className="m-0 py-1 text-sm">
          Scroll container row {index + 1}
        </p>
      ))}
      <web-ui-back-top ref={backTopRef} threshold={100}></web-ui-back-top>
    </div>
  )
}
```

```vue
<template>
  <div ref="box" class="h-40 w-full overflow-auto rounded-xl border border-(--wui-color-border) p-3">
    <p v-for="row in rows" :key="row" class="m-0 py-1 text-sm">{{ row }}</p>
    <web-ui-back-top ref="backTop" :threshold="100"></web-ui-back-top>
  </div>
</template>

<script setup lang="ts">
import type { WebUiBackTop } from '@greypan/web-ui'
import { onMounted, useTemplateRef } from 'vue'

const rows = Array.from({ length: 20 }, (_, index) => `Scroll container row ${index + 1}`)
const box = useTemplateRef<HTMLDivElement>('box')
const backTop = useTemplateRef<WebUiBackTop>('backTop')

onMounted(() => {
  if (box.value && backTop.value) backTop.value.scrollTarget = box.value
})
</script>
```

### Custom content {#custom-content}

The default slot replaces the whole visual content of the button, while the component still provides the interaction semantics: the inner wrapper is `role="button"` with `tabindex="0"`, and pointer clicks, Enter, and Space all call `toTop()`.

The default content is an up-arrow icon wrapped in `web-ui-button`; swapping in a primary button leaves the appearance timing, the threshold, and the scroll behavior unchanged.

The button's accessible name comes from the slot content by default; the default icon content falls back to `Back to top`. Set `aria-label` on the host to specify a name; when set, it should include the visible label text. When the custom content itself has no accessible name, the host `aria-label` should be set as well.

```tsx
import type { WebUiBackTop } from '@greypan/web-ui'
import { useEffect, useRef } from 'react'

export default function Demo() {
  const boxRef = useRef<HTMLDivElement>(null)
  const backTopRef = useRef<WebUiBackTop>(null)

  useEffect(() => {
    const box = boxRef.current
    if (box && backTopRef.current) backTopRef.current.scrollTarget = box
  }, [])

  return (
    <div ref={boxRef} className="h-40 w-full overflow-auto rounded-xl border border-(--wui-color-border) p-3">
      {Array.from({ length: 20 }, (_, index) => (
        <p key={index} className="m-0 py-1 text-sm">
          Scroll container row {index + 1}
        </p>
      ))}
      <web-ui-back-top ref={backTopRef} threshold={100}>
        <web-ui-button variant="primary">Back to top</web-ui-button>
      </web-ui-back-top>
    </div>
  )
}
```

```vue
<template>
  <div ref="box" class="h-40 w-full overflow-auto rounded-xl border border-(--wui-color-border) p-3">
    <p v-for="row in rows" :key="row" class="m-0 py-1 text-sm">{{ row }}</p>
    <web-ui-back-top ref="backTop" :threshold="100">
      <web-ui-button variant="primary">Back to top</web-ui-button>
    </web-ui-back-top>
  </div>
</template>

<script setup lang="ts">
import type { WebUiBackTop } from '@greypan/web-ui'
import { onMounted, useTemplateRef } from 'vue'

const rows = Array.from({ length: 20 }, (_, index) => `Scroll container row ${index + 1}`)
const box = useTemplateRef<HTMLDivElement>('box')
const backTop = useTemplateRef<WebUiBackTop>('backTop')

onMounted(() => {
  if (box.value && backTop.value) backTop.value.scrollTarget = box.value
})
</script>
```

### Jump to top immediately {#instant}

`scroll-behavior="auto"` does not request smooth scrolling, so a click jumps straight to the top.

When the theme requires reduced motion, a click or Enter arrives instantly even if the attribute is the default `smooth` or the scroll container's CSS specifies `scroll-behavior: smooth`.

The two differ only in how they scroll: the visibility check, the threshold, and the slot are all unaffected.

```tsx
import type { WebUiBackTop } from '@greypan/web-ui'
import { useEffect, useRef } from 'react'

export default function Demo() {
  const boxRef = useRef<HTMLDivElement>(null)
  const backTopRef = useRef<WebUiBackTop>(null)

  useEffect(() => {
    const box = boxRef.current
    if (box && backTopRef.current) backTopRef.current.scrollTarget = box
  }, [])

  return (
    <div ref={boxRef} className="h-40 w-full overflow-auto rounded-xl border border-(--wui-color-border) p-3">
      {Array.from({ length: 20 }, (_, index) => (
        <p key={index} className="m-0 py-1 text-sm">
          Scroll container row {index + 1}
        </p>
      ))}
      <web-ui-back-top ref={backTopRef} threshold={100} scrollBehavior="auto"></web-ui-back-top>
    </div>
  )
}
```

```vue
<template>
  <div ref="box" class="h-40 w-full overflow-auto rounded-xl border border-(--wui-color-border) p-3">
    <p v-for="row in rows" :key="row" class="m-0 py-1 text-sm">{{ row }}</p>
    <web-ui-back-top ref="backTop" :threshold="100" scroll-behavior="auto"></web-ui-back-top>
  </div>
</template>

<script setup lang="ts">
import type { WebUiBackTop } from '@greypan/web-ui'
import { onMounted, useTemplateRef } from 'vue'

const rows = Array.from({ length: 20 }, (_, index) => `Scroll container row ${index + 1}`)
const box = useTemplateRef<HTMLDivElement>('box')
const backTop = useTemplateRef<WebUiBackTop>('backTop')

onMounted(() => {
  if (box.value && backTop.value) backTop.value.scrollTarget = box.value
})
</script>
```

## API

### Props

| Name              | Description                                                                                                                                  | Type                    | Default                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------- |
| `aria-label`      | Button name. The host value wins; otherwise the accessible name of the slot content, with the default content falling back to `Back to top`. | `string`                | `'Back to top'` (default content) |
| `scroll-behavior` | Scroll behavior: `smooth` (default) or `auto`; when the theme requires reduced motion it scrolls immediately.                                | `'smooth' \| 'auto'`    | `'smooth'`                        |
| `visible`         | Current visibility, driven by the scroll position.                                                                                           | `boolean`               | `false`                           |
| `scrollTarget`    | Scroll container, `window` (default) or an `HTMLElement` (property).                                                                         | `HTMLElement \| Window` | `window`                          |
| `threshold`       | Scroll threshold (px) at which the button appears.                                                                                           | `number`                | `200`                             |

### Slots

| Name      | Description            |
| --------- | ---------------------- |
| `default` | Custom button content. |

### Methods

| Name      | Description                                                                          |
| --------- | ------------------------------------------------------------------------------------ |
| `toTop()` | Scrolls back to the top; scrolls immediately when the theme requires reduced motion. |

### Positioning

When `scrollTarget` is `window` the button is fixed in a viewport corner, with the offsets in the four directions controlled by `--wui-back-top-top/right/bottom/left`; when it is an `HTMLElement` the element must be placed inside the container, the button floats in the container's bottom corner via `position: sticky`, the horizontal offsets use `--wui-back-top-left/right`, the vertical offset uses `--wui-back-top-bottom`, and `--wui-back-top-top` takes no part in container positioning.

Role: `button`, with the default content accessible name `Back to top`; with custom content the name comes from the slot, and the host `aria-label` can specify it explicitly. Both keyboard Enter and Space trigger back top.

### CSS Custom Properties

| Name                      | Description                   | Default                          |
| ------------------------- | ----------------------------- | -------------------------------- |
| `--wui-back-top-position` | CSS positioning               | `fixed`                          |
| `--wui-back-top-z-index`  | Layer                         | `var(--wui-layer-auxiliary, 20)` |
| `--wui-back-top-top`      | Top offset (window mode only) | `auto`                           |
| `--wui-back-top-right`    | Right offset                  | `20px`                           |
| `--wui-back-top-bottom`   | Bottom offset                 | `20px`                           |
| `--wui-back-top-left`     | Left offset                   | `auto`                           |

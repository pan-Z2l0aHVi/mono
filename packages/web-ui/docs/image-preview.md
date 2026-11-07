# Image Preview

English | [简体中文](./image-preview.CN.md)

Imperative image preview. Open it through `imagePreview()` and control it with the returned handle. Without `container`, the preview mounts into the overlay container of the root theme (`web-ui-theme`); when the page has no theme scope, it falls back to the global default container. Passing `target` resolves the nearest theme scope from that element instead.

The tables below list the `imagePreview()` options and the members of the returned handle.

## Samples

### Single image

With a single image there is no previous / next switching. The rest still works: arrow keys, wheel and `+` / `-` zoom, `0` reset, and double-click toggling between 1x and 2x.

Clicking outside the image or pressing Escape closes. The close request plays the exit transition first, and the handle's `closed` resolves only after the preview leaves the page.

```tsx
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [{ src: gradientImage('First image', '#0a84ff', '#5e5ce6'), alt: 'Example image with a blue gradient' }]

export default function Demo() {
  return <web-ui-button onClick={() => imagePreview({ images: IMAGES })}>Open single image</web-ui-button>
}
```

```vue
<template>
  <web-ui-button @click="open">Open single image</web-ui-button>
</template>

<script setup lang="ts">
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [{ src: gradientImage('First image', '#0a84ff', '#5e5ce6'), alt: 'Example image with a blue gradient' }]

function open() {
  imagePreview({ images: IMAGES })
}
</script>
```

### Multiple images

Passing multiple images lets the arrow keys switch between them; `loop` defaults to `true` and wraps around.

With only `images`, the four display options stay off by default and only the image itself is on screen. The previous / next buttons, zoom toolbar, close button, and indicator all need to be enabled explicitly.

```tsx
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('First image', '#0a84ff', '#5e5ce6'), alt: 'Example image with a blue gradient' },
  { src: gradientImage('Second image', '#ff375f', '#ff9f0a'), alt: 'Example image with an orange-red gradient' },
  { src: gradientImage('Third image', '#30d158', '#0a84ff'), alt: 'Example image with a teal gradient' },
  { src: gradientImage('Fourth image', '#bf5af2', '#ff375f'), alt: 'Example image with a purple gradient' }
]

export default function Demo() {
  return <web-ui-button onClick={() => imagePreview({ images: IMAGES })}>Open multiple images</web-ui-button>
}
```

```vue
<template>
  <web-ui-button @click="open">Open multiple images</web-ui-button>
</template>

<script setup lang="ts">
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('First image', '#0a84ff', '#5e5ce6'), alt: 'Example image with a blue gradient' },
  { src: gradientImage('Second image', '#ff375f', '#ff9f0a'), alt: 'Example image with an orange-red gradient' },
  { src: gradientImage('Third image', '#30d158', '#0a84ff'), alt: 'Example image with a teal gradient' },
  { src: gradientImage('Fourth image', '#bf5af2', '#ff375f'), alt: 'Example image with a purple gradient' }
]

function open() {
  imagePreview({ images: IMAGES })
}
</script>
```

### Display options

`nav`, `toolbar`, `closable`, and `indicator` are independent and all off by default. Only when all four are `true` do the previous / next buttons, the zoom toolbar, the close button, and the "current / total" indicator appear together.

`nav` is rendered only when there is more than one image. `loop` defaults to `true` and wraps around, so the images here can be paged in the same direction forever.

```tsx
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('First image', '#0a84ff', '#5e5ce6'), alt: 'Example image with a blue gradient' },
  { src: gradientImage('Second image', '#ff375f', '#ff9f0a'), alt: 'Example image with an orange-red gradient' },
  { src: gradientImage('Third image', '#30d158', '#0a84ff'), alt: 'Example image with a teal gradient' },
  { src: gradientImage('Fourth image', '#bf5af2', '#ff375f'), alt: 'Example image with a purple gradient' }
]

export default function Demo() {
  return (
    <web-ui-button
      onClick={() => imagePreview({ images: IMAGES, nav: true, toolbar: true, closable: true, indicator: true })}
    >
      Open preview (all controls)
    </web-ui-button>
  )
}
```

```vue
<template>
  <web-ui-button @click="open">Open preview (all controls)</web-ui-button>
</template>

<script setup lang="ts">
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('First image', '#0a84ff', '#5e5ce6'), alt: 'Example image with a blue gradient' },
  { src: gradientImage('Second image', '#ff375f', '#ff9f0a'), alt: 'Example image with an orange-red gradient' },
  { src: gradientImage('Third image', '#30d158', '#0a84ff'), alt: 'Example image with a teal gradient' },
  { src: gradientImage('Fourth image', '#bf5af2', '#ff375f'), alt: 'Example image with a purple gradient' }
]

function open() {
  imagePreview({ images: IMAGES, nav: true, toolbar: true, closable: true, indicator: true })
}
</script>
```

### Swipe

With `swipe: true` and more than one image, a left/right drag at 1x switches images; vertical displacement is ignored, and dragging after zooming pans instead.

```tsx
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('First image', '#0a84ff', '#5e5ce6'), alt: 'Example image with a blue gradient' },
  { src: gradientImage('Second image', '#ff375f', '#ff9f0a'), alt: 'Example image with an orange-red gradient' },
  { src: gradientImage('Third image', '#30d158', '#0a84ff'), alt: 'Example image with a teal gradient' },
  { src: gradientImage('Fourth image', '#bf5af2', '#ff375f'), alt: 'Example image with a purple gradient' }
]

export default function Demo() {
  return (
    <web-ui-button onClick={() => imagePreview({ images: IMAGES, swipe: true, nav: true, indicator: true })}>
      Open and swipe
    </web-ui-button>
  )
}
```

```vue
<template>
  <web-ui-button @click="open">Open and swipe</web-ui-button>
</template>

<script setup lang="ts">
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('First image', '#0a84ff', '#5e5ce6'), alt: 'Example image with a blue gradient' },
  { src: gradientImage('Second image', '#ff375f', '#ff9f0a'), alt: 'Example image with an orange-red gradient' },
  { src: gradientImage('Third image', '#30d158', '#0a84ff'), alt: 'Example image with a teal gradient' },
  { src: gradientImage('Fourth image', '#bf5af2', '#ff375f'), alt: 'Example image with a purple gradient' }
]

function open() {
  imagePreview({ images: IMAGES, swipe: true, nav: true, indicator: true })
}
</script>
```

### No backdrop close

With `noBackdropClose: true`, clicking outside the image does not close it; press Escape, or use the close button in the top-right corner (`closable: true`).

```tsx
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('First image', '#0a84ff', '#5e5ce6'), alt: 'Example image with a blue gradient' },
  { src: gradientImage('Second image', '#ff375f', '#ff9f0a'), alt: 'Example image with an orange-red gradient' },
  { src: gradientImage('Third image', '#30d158', '#0a84ff'), alt: 'Example image with a teal gradient' },
  { src: gradientImage('Fourth image', '#bf5af2', '#ff375f'), alt: 'Example image with a purple gradient' }
]

export default function Demo() {
  return (
    <web-ui-button onClick={() => imagePreview({ images: IMAGES, noBackdropClose: true, closable: true })}>
      Open (backdrop does not close)
    </web-ui-button>
  )
}
```

```vue
<template>
  <web-ui-button @click="open">Open (backdrop does not close)</web-ui-button>
</template>

<script setup lang="ts">
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('First image', '#0a84ff', '#5e5ce6'), alt: 'Example image with a blue gradient' },
  { src: gradientImage('Second image', '#ff375f', '#ff9f0a'), alt: 'Example image with an orange-red gradient' },
  { src: gradientImage('Third image', '#30d158', '#0a84ff'), alt: 'Example image with a teal gradient' },
  { src: gradientImage('Fourth image', '#bf5af2', '#ff375f'), alt: 'Example image with a purple gradient' }
]

function open() {
  imagePreview({ images: IMAGES, noBackdropClose: true, closable: true })
}
</script>
```

### Handle

The handle is the controller for this preview instance: `imagePreview()` returns it when the preview opens, and paging, zooming, and closing all go through it.

The handle's `index`, `scale`, `images`, and `closed` are read-only members; after a method call the new values are readable synchronously. Gestures and keyboard operations inside the preview do not call back to the outside; read them yourself when needed.

The order matters: call `goTo(1)` before `zoomIn()`. Switching images resets the zoom to 1x, so zooming first and then switching loses the zoom.

```tsx
import { imagePreview } from '@greypan/web-ui'
import { useState } from 'react'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('First image', '#0a84ff', '#5e5ce6'), alt: 'Example image with a blue gradient' },
  { src: gradientImage('Second image', '#ff375f', '#ff9f0a'), alt: 'Example image with an orange-red gradient' },
  { src: gradientImage('Third image', '#30d158', '#0a84ff'), alt: 'Example image with a teal gradient' },
  { src: gradientImage('Fourth image', '#bf5af2', '#ff375f'), alt: 'Example image with a purple gradient' }
]

export default function Demo() {
  const [status, setStatus] = useState('Not opened yet')

  function open() {
    const preview = imagePreview({ images: IMAGES, toolbar: true })
    // Switching images resets the zoom to 1x, so call goTo before zoomIn.
    preview.goTo(1)
    preview.zoomIn()
    setStatus(`Image ${preview.index + 1} · zoom ${Math.round(preview.scale * 100)}%`)
    void preview.closed.then(() => setStatus('Preview closed'))
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button onClick={open}>Open and go to image 2</web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">{status}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button @click="open">Open and go to image 2</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">{{ status }}</output>
  </div>
</template>

<script setup lang="ts">
import { imagePreview } from '@greypan/web-ui'
import { ref } from 'vue'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('First image', '#0a84ff', '#5e5ce6'), alt: 'Example image with a blue gradient' },
  { src: gradientImage('Second image', '#ff375f', '#ff9f0a'), alt: 'Example image with an orange-red gradient' },
  { src: gradientImage('Third image', '#30d158', '#0a84ff'), alt: 'Example image with a teal gradient' },
  { src: gradientImage('Fourth image', '#bf5af2', '#ff375f'), alt: 'Example image with a purple gradient' }
]

const status = ref('Not opened yet')

function open() {
  const preview = imagePreview({ images: IMAGES, toolbar: true })
  // Switching images resets the zoom to 1x, so call goTo before zoomIn.
  preview.goTo(1)
  preview.zoomIn()
  status.value = `Image ${preview.index + 1} · zoom ${Math.round(preview.scale * 100)}%`
  void preview.closed.then(() => {
    status.value = 'Preview closed'
  })
}
</script>
```

## API

### Options

| Name              | Description                                                                                                                                                | Type                     | Default |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------- |
| `images`          | Image list, at least one item; each item is `{ src, alt? }`.                                                                                               | `ImagePreviewItem[]`     | -       |
| `index`           | Initial image index; clamped to the valid range when out of bounds.                                                                                        | `number`                 | `0`     |
| `loop`            | Wrap-around switching between the first and last images.                                                                                                   | `boolean`                | `true`  |
| `target`          | Trigger element used to resolve the nearest theme overlay container.                                                                                       | `Element`                | -       |
| `container`       | Explicit mount container; takes precedence over the theme scope.                                                                                           | `HTMLElement`            | -       |
| `nav`             | Shows the previous / next buttons.                                                                                                                         | `boolean`                | `false` |
| `toolbar`         | Shows the zoom toolbar.                                                                                                                                    | `boolean`                | `false` |
| `closable`        | Shows the close button.                                                                                                                                    | `boolean`                | `false` |
| `indicator`       | Shows the "current / total" indicator.                                                                                                                     | `boolean`                | `false` |
| `swipe`           | Allows left/right swipe to switch images at 1x.                                                                                                            | `boolean`                | `false` |
| `noScrollLock`    | Does not lock page scrolling while open.                                                                                                                   | `boolean`                | `false` |
| `noBackdropClose` | Clicking outside the image does not close.                                                                                                                 | `boolean`                | `false` |
| `ariaLabels`      | Grouped overrides for the built-in accessible names (close / previous / next / zoom / reset); keys without a value fall back to the built-in English copy. | `ImagePreviewAriaLabels` | -       |

### Methods

| Name          | Description                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next()`      | Switches to the next image; with `loop` on, the last image returns to the first; with it off, nothing happens at the last image.                        |
| `prev()`      | Switches to the previous image; with `loop` on, the first image returns to the last; with it off, nothing happens at the first image.                   |
| `goTo(index)` | Jumps to the given index; with `loop` on it takes the modulo by image count, with it off it clamps to the valid range; the zoom resets after switching. |
| `zoomIn()`    | Zooms in one step (0.5), up to 4.                                                                                                                       |
| `zoomOut()`   | Zooms out one step (0.5), down to 1.                                                                                                                    |
| `resetZoom()` | Resets zoom and pan: back to 1x and centered.                                                                                                           |
| `close()`     | Closes the preview; the handle's `closed` resolves after the exit transition ends.                                                                      |

### Behavior

The preview is a full-viewport modal layer that does not reuse `<web-ui-dialog>` and brings its own pointer gestures. `noScrollLock` / `noBackdropClose` behave as described in the options table above.

```ts
import { imagePreview } from '@greypan/web-ui'

function openPreview() {
  const preview = imagePreview({
    images: [{ src: '/a.jpg', alt: 'Image A' }, { src: '/b.jpg' }],
    nav: true,
    toolbar: true,
    closable: true,
    indicator: true
  })

  preview.next()
  preview.zoomIn()
}
```

`ImagePreviewItem` is `{ src: string; alt?: string }`; `alt` defaults to an empty string.

Display options are all off by default: with no option passed only the image itself is rendered. Navigation, toolbar, close button, and indicator all need to be enabled explicitly.

### Return handle

| Name     | Description                                                     | Type                          |
| -------- | --------------------------------------------------------------- | ----------------------------- |
| `index`  | Current index; keeps the last value after closing               | `number`                      |
| `scale`  | Current zoom factor, in the range `[1, 4]`                      | `number`                      |
| `images` | Normalized image list                                           | `readonly ImagePreviewItem[]` |
| `closed` | Resolves after the exit transition ends and the host is removed | `Promise<void>`               |

### Interaction

Arrow keys always switch images, regardless of `nav`. The `+` / `-` keys and the wheel zoom the image, and `0` resets it.

Zoom is anchored: the wheel fixes the point under the cursor, a two-finger pinch fixes the midpoint of the two fingers, while toolbar buttons, keyboard shortcuts, and double-click zoom around the viewport center. Double-clicking toggles between 1x and 2x.

Holding the mouse and dragging, or holding one finger and dragging, both pan the image in any direction and independently of the zoom factor; the image can never be dragged out of the viewport, and continuing to drag at the boundary clamps rather than bouncing back. `resetZoom()` is available for a panned 1x image too.

Pinch zoom is always on and has no option: the first finger pans / swipes as usual, and only when a second finger lands does it enter pinch, aborting any in-progress gesture. Pinching does not close the overlay.

Clicking anywhere outside the image or pressing Escape closes. The preview always exposes the accessible name `image preview`.

With `swipe` on and more than one image, a horizontal drag at 1x switches images and vertical displacement is ignored; when zoomed in, dragging always pans and does not switch images.

A close request does not destroy the preview immediately: `closed` resolves after the exit transition ends. While open, page scrolling is locked by default. The preview is a full-viewport modal surface, and wheel and touch gestures are used for zooming and panning, so `noScrollLock` mainly affects other ways of scrolling the page (for example PageDown, programmatic scrolling, or an outer container). It does not let wheel events pass through to scroll the page.

### CSS Custom Properties

| Name                             | Description                                             | Default                          |
| -------------------------------- | ------------------------------------------------------- | -------------------------------- |
| `--wui-image-preview-overlay-bg` | Full-viewport backdrop background color                 | `rgb(0 0 0 / 0.72)`              |
| `--wui-image-preview-edge-gap`   | Visible distance from the controls to the viewport edge | `20px`                           |
| `--wui-duration-swipe-settle`    | Transition duration for the carousel sliding in / back  | `220ms`                          |
| `--wui-ease-swipe`               | Easing curve for the carousel sliding in / back         | `cubic-bezier(0.32, 0.72, 0, 1)` |

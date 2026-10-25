---
component: image-preview
tag: web-ui-image-preview
---

Imperative image preview: open it through `imagePreview()` and control it with the returned handle; it uses a native `<dialog>` internally and, when no `container` is passed, mounts into the overlay root of the root theme (`web-ui-theme`), falling back to the global fallback root when the page has no theme scope—passing `target` instead resolves its nearest theme scope.

The tables below list the `imagePreview()` options and the members of the returned handle.

## Samples

### Basic {#basic}

Calling `imagePreview()` mounts the host into the overlay root of the root theme (or the one `container` names) and opens it immediately, returning a handle.

With only `images`, the four display options stay off by default and only the image itself is on screen—arrow keys to switch images, wheel and `+` / `-` to zoom, `0` to reset, and double-click to toggle between 1x and 2x all still work.

Clicking anywhere outside the image or pressing Escape closes: the close request plays the exit transition first, and the handle's `closed` resolves only after the host is removed.

```tsx
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('First image', '#0a84ff', '#5e5ce6'), alt: 'Example image with a blue gradient' },
  { src: gradientImage('Second image', '#ff375f', '#ff9f0a'), alt: 'Example image with an orange-red gradient' },
  { src: gradientImage('Third image', '#30d158', '#0a84ff'), alt: 'Example image with a teal gradient' }
]

export default function Demo() {
  return <web-ui-button onClick={() => imagePreview({ images: IMAGES })}>Open preview</web-ui-button>
}
```

```vue
<template>
  <web-ui-button @click="open">Open preview</web-ui-button>
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
  { src: gradientImage('Third image', '#30d158', '#0a84ff'), alt: 'Example image with a teal gradient' }
]

function open() {
  imagePreview({ images: IMAGES })
}
</script>
```

### Display options {#display-options}

`nav`, `toolbar`, `closable`, and `indicator` are independent and all off by default; only passing `true` for all four brings out the previous / next buttons, the zoom toolbar, the close button, and the "current / total" indicator together.

`nav` is rendered only when there is more than one image; `loop` defaults to `true` and wraps around, so the three images here can be paged in the same direction forever.

```tsx
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('First image', '#0a84ff', '#5e5ce6'), alt: 'Example image with a blue gradient' },
  { src: gradientImage('Second image', '#ff375f', '#ff9f0a'), alt: 'Example image with an orange-red gradient' },
  { src: gradientImage('Third image', '#30d158', '#0a84ff'), alt: 'Example image with a teal gradient' }
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
  { src: gradientImage('Third image', '#30d158', '#0a84ff'), alt: 'Example image with a teal gradient' }
]

function open() {
  imagePreview({ images: IMAGES, nav: true, toolbar: true, closable: true, indicator: true })
}
</script>
```

### Handle {#handle}

The handle's `index`, `scale`, `images`, and `closed` are read-only members; after a method call the new values are readable synchronously. Gestures and keyboard operations inside the preview do not call back to the outside; read them yourself when needed.

Order matters: call `goTo(1)` before `zoomIn()`; switching images resets the zoom to 1x, so the other order loses the zoom.

The example writes the readout into `<output>` and switches it to "Preview closed" once `closed` resolves.

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
  { src: gradientImage('Third image', '#30d158', '#0a84ff'), alt: 'Example image with a teal gradient' }
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
  { src: gradientImage('Third image', '#30d158', '#0a84ff'), alt: 'Example image with a teal gradient' }
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

| Name              | Description                                                           | Type                 | Default |
| ----------------- | --------------------------------------------------------------------- | -------------------- | ------- |
| `images`          | Image list, at least one item; each item is `{ src, alt? }`.          | `ImagePreviewItem[]` | —       |
| `index`           | Initial image index; clamped to the valid range when out of bounds.   | `number`             | `0`     |
| `loop`            | Wrap-around switching between the first and last images.              | `boolean`            | `true`  |
| `target`          | Trigger element used to resolve the nearest theme-owned overlay root. | `Element`            | —       |
| `container`       | Explicit mount container; takes precedence over the theme scope.      | `HTMLElement`        | —       |
| `nav`             | Shows the previous / next buttons.                                    | `boolean`            | `false` |
| `toolbar`         | Shows the zoom toolbar.                                               | `boolean`            | `false` |
| `closable`        | Shows the close button.                                               | `boolean`            | `false` |
| `indicator`       | Shows the "current / total" indicator.                                | `boolean`            | `false` |
| `swipe`           | Allows left/right swipe to switch images at 1x.                       | `boolean`            | `false` |
| `noScrollLock`    | Does not lock page scrolling while open.                              | `boolean`            | `false` |
| `noBackdropClose` | Clicking outside the image does not close.                            | `boolean`            | `false` |

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

It does not reuse the `<web-ui-dialog>` component: the preview needs a dialog that fills the viewport itself (the full-viewport backdrop is rendered by a separate backdrop layer inside the dialog, the dialog element itself does not transition opacity, and the glass controls' backdrop blur stays continuous throughout) and has its own pointer interactions, which does not share a source with the dialog component's glass card / slot contract.

Both share the `native-dialog-presence` and `scroll-lock` plugins, and `noScrollLock` / `noBackdropClose` are named and behave consistently with the attributes of the same names.

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

Display options are all off by default: with no option passed only the image itself is rendered, and navigation, toolbar, close button, and indicator all need to be enabled explicitly.

### Return handle

| Name     | Description                                                     | Type                          |
| -------- | --------------------------------------------------------------- | ----------------------------- |
| `index`  | Current index; keeps the last value after closing               | `number`                      |
| `scale`  | Current zoom factor, in the range `[1, 4]`                      | `number`                      |
| `images` | Normalized image list                                           | `readonly ImagePreviewItem[]` |
| `closed` | Resolves after the exit transition ends and the host is removed | `Promise<void>`               |

### Interaction

Arrow keys always switch images, regardless of `nav`; the `+` / `-` keys and the wheel zoom, and `0` resets.

Zoom is anchored: the wheel fixes the point under the cursor, a two-finger pinch fixes the midpoint of the two fingers, while toolbar buttons, keyboard shortcuts, and double-click zoom around the viewport center.

Holding the mouse and dragging, or holding one finger and dragging, both pan the image in any direction and independently of the zoom factor: when zoomed in it inspects the clipped edges, and at 1x it moves the image within the viewport. Both cases share the same boundary—half the size difference between the image and the stage—so the image can never be dragged out of the viewport; continuing to drag at the boundary clamps rather than bouncing back.

Double-clicking the image toggles between 1x and 2x.

Pinch zoom is always on and has no option: the stage itself owns the pointer interaction, so there is no conflicting gesture. The first finger pans / swipes as usual, and only when a second finger lands does it enter pinch, aborting any in-progress pan or swipe. Pinching does not close the overlay; a compatibility `click` that mixed input may dispatch afterwards is swallowed instead of being treated as a backdrop click.

Clicking anywhere outside the image or pressing Escape closes; the native dialog always exposes the accessible name `image preview`.

With `swipe` on and more than one image, the images are laid out on a single carousel track: the current image and its neighbors each occupy a slide of equal width and height, the stage clips the overflow, and the whole track translates with the finger.

On release, a slide past the distance threshold (15% of the stage width, rounded) moves into the neighboring image; a quick flick that does not reach the threshold but whose sampled velocity reaches 320px/s or more, or whose displacement is at least 16px with a velocity (window-sampled or averaged over the whole gesture) of 160px/s or more, also commits; otherwise it springs back. With `loop` on, the neighbors that wrap around are always on both sides of the current image; with `loop` off, the boundary direction springs back without crossing.

While this gesture is active it takes over the whole drag: at 1x a horizontal drag switches images and vertical displacement is ignored entirely (it neither drives panning nor follows the finger). When zoomed in, dragging always pans (following both axes) and no longer switches images.

Because 1x can pan as well, `resetZoom()` is available both when "zoomed" and when "panned"—the reset button in the toolbar is clickable for a panned 1x image too.

A close request does not destroy the native dialog immediately: it stays in the top layer until the exit transition ends, and only then is `dialog.close()` called, after which the host is removed from the DOM and `closed` resolves. While open, page scrolling is locked unless `noScrollLock` is `true`.

### CSS Custom Properties

| Name                             | Description                                             | Default                          |
| -------------------------------- | ------------------------------------------------------- | -------------------------------- |
| `--wui-image-preview-overlay-bg` | Full-viewport backdrop background color                 | `rgb(0 0 0 / 0.72)`              |
| `--wui-image-preview-edge-gap`   | Visible distance from the controls to the viewport edge | `20px`                           |
| `--wui-duration-swipe-settle`    | Transition duration for the carousel sliding in / back  | `220ms`                          |
| `--wui-ease-swipe`               | Easing curve for the carousel sliding in / back         | `cubic-bezier(0.32, 0.72, 0, 1)` |

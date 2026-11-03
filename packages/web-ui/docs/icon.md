# Icon

icon renders an icon from an Iconify data object; `@greypan/web-ui/icons` exports objects of this shape, named by icon set. The result is an `<svg>` with `aria-hidden="true"`, and the icon itself provides no accessible name.

## Samples

### Basic

`icon` accepts only a property binding, not an attribute; the value is an Iconify data object, not an icon name. Without `icon` the component draws nothing, not even an `<svg>`.

```tsx
import { lucideFolderOpen, lucideSearch, lucideSettings } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <span className="flex items-center gap-2">
        <web-ui-icon icon={lucideSearch}></web-ui-icon>
        Search
      </span>
      <span className="flex items-center gap-2">
        <web-ui-icon icon={lucideFolderOpen}></web-ui-icon>
        Open project
      </span>
      <span className="flex items-center gap-2">
        <web-ui-icon icon={lucideSettings}></web-ui-icon>
        Settings
      </span>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-6">
    <span class="flex items-center gap-2">
      <web-ui-icon :icon="lucideSearch"></web-ui-icon>
      Search
    </span>
    <span class="flex items-center gap-2">
      <web-ui-icon :icon="lucideFolderOpen"></web-ui-icon>
      Open project
    </span>
    <span class="flex items-center gap-2">
      <web-ui-icon :icon="lucideSettings"></web-ui-icon>
      Settings
    </span>
  </div>
</template>

<script setup lang="ts">
import { lucideFolderOpen, lucideSearch, lucideSettings } from '@greypan/web-ui/icons'
</script>
```

### Bring your own icon data

The component accepts one input shape: `IconifyIcon`. `body` is required and holds a fragment of inner SVG markup; `width` / `height` / `left` / `top` describe the canvas. A hand-built object renders the same way, so the icon does not have to live in `@greypan/web-ui/icons` first.

```tsx
const clock = {
  width: 24,
  height: 24,
  body: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M12 7v5l3 3"/>'
}

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <span className="flex items-center gap-2">
        <web-ui-icon icon={clock}></web-ui-icon>
        Default 18px
      </span>
      <span className="flex items-center gap-2">
        <web-ui-icon icon={clock} size={32} color="#007aff"></web-ui-icon>
        32px
      </span>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-6">
    <span class="flex items-center gap-2">
      <web-ui-icon :icon="clock"></web-ui-icon>
      Default 18px
    </span>
    <span class="flex items-center gap-2">
      <web-ui-icon :icon="clock" :size="32" color="#007aff"></web-ui-icon>
      32px
    </span>
  </div>
</template>

<script setup lang="ts">
const clock = {
  width: 24,
  height: 24,
  body: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M12 7v5l3 3"/>'
}
</script>
```

### Size

`size` is a pixel size. The graphic scales proportionally with the asset's own viewBox and is never stretched. The default is `18`.

```tsx
import { lucideStar } from '@greypan/web-ui/icons'

const sizes = [14, 18, 24, 32]

export default function Demo() {
  return (
    <div className="flex flex-wrap items-end gap-6">
      {sizes.map(size => (
        <span key={size} className="flex flex-col items-center gap-2">
          <web-ui-icon icon={lucideStar} size={size}></web-ui-icon>
          <span className="text-xs text-(--wui-color-text-secondary)">{size}</span>
        </span>
      ))}
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-end gap-6">
    <span v-for="size in sizes" :key="size" class="flex flex-col items-center gap-2">
      <web-ui-icon :icon="lucideStar" :size="size"></web-ui-icon>
      <span class="text-xs text-(--wui-color-text-secondary)">{{ size }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { lucideStar } from '@greypan/web-ui/icons'

const sizes = [14, 18, 24, 32]
</script>
```

### Color

Color is taken in priority order: the `color` property wins, then `--wui-icon-color` on the host, then the text color, because the asset draws with `currentColor`.

```tsx
import { lucideHeart } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <span className="flex items-center gap-2 text-(--wui-color-danger)">
        <web-ui-icon icon={lucideHeart}></web-ui-icon>
        Follows the text color
      </span>
      <web-ui-icon icon={lucideHeart} color="#007aff"></web-ui-icon>
      <web-ui-icon icon={lucideHeart} className="[--wui-icon-color:#34c759]"></web-ui-icon>
      <web-ui-icon icon={lucideHeart} color="#007aff" className="[--wui-icon-color:#34c759]"></web-ui-icon>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-6">
    <span class="flex items-center gap-2 text-(--wui-color-danger)">
      <web-ui-icon :icon="lucideHeart"></web-ui-icon>
      Follows the text color
    </span>
    <web-ui-icon :icon="lucideHeart" color="#007aff"></web-ui-icon>
    <web-ui-icon :icon="lucideHeart" class="[--wui-icon-color:#34c759]"></web-ui-icon>
    <web-ui-icon :icon="lucideHeart" color="#007aff" class="[--wui-icon-color:#34c759]"></web-ui-icon>
  </div>
</template>

<script setup lang="ts">
import { lucideHeart } from '@greypan/web-ui/icons'
</script>
```

### Spin

`spin` adds an infinite rotation to the `<svg>`, with the period taken from `--wui-duration-spin` (`600ms`). Under the `motion="reduced"` theme or a system reduce preference, the token slows to `1600ms` and does not stop: a stopped loading indicator reads as a frozen interface.

```tsx
import { lucideLoaderCircle } from '@greypan/web-ui/icons'
import { useState } from 'react'

export default function Demo() {
  const [spinning, setSpinning] = useState(true)

  return (
    <div className="flex flex-wrap items-center gap-6">
      <web-ui-icon icon={lucideLoaderCircle} size={24} spin={spinning}></web-ui-icon>
      <web-ui-checkbox checked={spinning} onChange={event => setSpinning(event.currentTarget.checked)}>
        Spin
      </web-ui-checkbox>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-6">
    <web-ui-icon :icon="lucideLoaderCircle" :size="24" :spin="spinning"></web-ui-icon>
    <web-ui-checkbox :checked="spinning" @change="spinning = $event.target.checked">Spin</web-ui-checkbox>
  </div>
</template>

<script setup lang="ts">
import { lucideLoaderCircle } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const spinning = ref(true)
</script>
```

### Combined with button

The button's `prefix` / `suffix` slots hold icons. The icon and the label sit on the same flex line and share the label's text color. An icon-only button sets `icon` and writes an `aria-label`: the icon is `aria-hidden`, so when the button has no other visible content the accessible name can only come from `aria-label`.

```tsx
import { lucideChevronLeft, lucideDownload, lucideUpload } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button>
        <web-ui-icon slot="prefix" icon={lucideUpload} size={16}></web-ui-icon>
        Upload
      </web-ui-button>
      <web-ui-button variant="secondary">
        <web-ui-icon slot="suffix" icon={lucideDownload} size={16}></web-ui-icon>
        Download
      </web-ui-button>
      <web-ui-button icon aria-label="Previous page">
        <web-ui-icon icon={lucideChevronLeft}></web-ui-icon>
      </web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button>
      <web-ui-icon slot="prefix" :icon="lucideUpload" :size="16"></web-ui-icon>
      Upload
    </web-ui-button>
    <web-ui-button variant="secondary">
      <web-ui-icon slot="suffix" :icon="lucideDownload" :size="16"></web-ui-icon>
      Download
    </web-ui-button>
    <web-ui-button icon aria-label="Previous page">
      <web-ui-icon :icon="lucideChevronLeft"></web-ui-icon>
    </web-ui-button>
  </div>
</template>

<script setup lang="ts">
import { lucideChevronLeft, lucideDownload, lucideUpload } from '@greypan/web-ui/icons'
</script>
```

## API

### Props

| Name    | Description                                                                       | Type          | Default |
| ------- | --------------------------------------------------------------------------------- | ------------- | ------- |
| `icon`  | Iconify data object; passed only as a property, and an icon name is not accepted. | `IconifyIcon` | —       |
| `spin`  | Rotation animation.                                                               | `boolean`     | `false` |
| `size`  | Pixel size, written into both the `<svg>`'s `width` and `height`.                 | `number`      | `18`    |
| `color` | Icon color; when empty, `--wui-icon-color` is read first, then the text color.    | `string`      | —       |

### Behavior

The icon itself is `aria-hidden="true"` and carries no semantics, so the name always comes from outside: the adjacent text or the host control's `aria-label`. The host sets `user-select: none`, so a mixed icon-and-text run is not selected and dragged away as a whole.

The `spin`, `size`, and `color` properties are written back to attributes, so you can read their current values from the DOM. `icon` is not, because it is an object.

### Canvas

The canvas comes from the data object's `left` / `top` / `width` / `height` and defaults to `0 0 16 16`. Assets from `@greypan/web-ui/icons` carry their own canvas, so the default applies only to raw objects you pass in directly.

A wrong canvas does not raise an error. It scales the graphic at the wrong ratio and pushes it into a corner. When you hand-build an object, write `width` / `height` in the real SVG coordinate system.

### CSS Custom Properties

| Name                  | Description                                                                 | Default   |
| --------------------- | --------------------------------------------------------------------------- | --------- |
| `--wui-icon-color`    | Icon color; the `color` property overrides it                               | `inherit` |
| `--wui-duration-spin` | Rotation period of `spin`; slows to `1600ms` under reduce, without stopping | `600ms`   |

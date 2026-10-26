---
component: badge
tag: web-ui-badge
---

badge / notification count: stacks a `count` corner badge on one corner of the default slot content; `dot` mode shows only a dot.

## Samples

### Basic {#basic}

The default slot is the content to decorate, and `count` is the number on the corner badge; when `count` is 0 the badge is not drawn and the decorated content shows as usual—use `show-zero` to keep a placeholder for 0 as well. Both graphics (icons) and controls (buttons) can be wrapped as content.

```tsx
import { lucideBell } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <web-ui-badge count={5}>
        <web-ui-button variant="secondary">Messages</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={7}>
        <web-ui-icon icon={lucideBell} size={22}></web-ui-icon>
      </web-ui-badge>

      <web-ui-badge count={0}>
        <web-ui-button variant="secondary">Drafts (count is 0)</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={0} show-zero>
        <web-ui-button variant="secondary">Inbox (show-zero)</web-ui-button>
      </web-ui-badge>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-badge :count="5">
      <web-ui-button variant="secondary">Messages</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="7">
      <web-ui-icon :icon="lucideBell" :size="22"></web-ui-icon>
    </web-ui-badge>

    <web-ui-badge :count="0">
      <web-ui-button variant="secondary">Drafts (count is 0)</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="0" show-zero>
      <web-ui-button variant="secondary">Inbox (show-zero)</web-ui-button>
    </web-ui-badge>
  </div>
</template>

<script setup lang="ts">
import { lucideBell } from '@greypan/web-ui/icons'
</script>
```

### Number limit {#max}

When `count` exceeds `max`, `max+` is drawn instead of spilling the extra digits; `max` defaults to 99, and three digits already take the shape of the limit.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <web-ui-badge count={128}>
        <web-ui-button variant="secondary">Default limit 99</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={10} max={9}>
        <web-ui-button variant="secondary">max is 9</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={99999} max={9999}>
        <web-ui-button variant="secondary">max is 9999</web-ui-button>
      </web-ui-badge>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-badge :count="128">
      <web-ui-button variant="secondary">Default limit 99</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="10" :max="9">
      <web-ui-button variant="secondary">max is 9</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="99999" :max="9999">
      <web-ui-button variant="secondary">max is 9999</web-ui-button>
    </web-ui-badge>
  </div>
</template>
```

### Dot mode {#dot}

`dot` draws only a dot and no number, for "something happened but it is not countable". It is the highest-priority switch at the display layer: once `dot` is set the badge is always drawn, and `count` takes no part in the decision.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <web-ui-badge dot>
        <web-ui-button variant="secondary">New messages</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={5} dot>
        <web-ui-button variant="secondary">dot takes precedence over the number</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={0} dot>
        <web-ui-button variant="secondary">Still drawn when count is 0</web-ui-button>
      </web-ui-badge>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-badge dot>
      <web-ui-button variant="secondary">New messages</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="5" dot>
      <web-ui-button variant="secondary">dot takes precedence over the number</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="0" dot>
      <web-ui-button variant="secondary">Still drawn when count is 0</web-ui-button>
    </web-ui-badge>
  </div>
</template>
```

### Placement {#placement}

`placement` pins the badge to one of the four corners of the content box, `top-right` by default. Invalid values take no part in rendering: the component normalizes them back to `top-right`, and the host attribute is corrected along with it.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <web-ui-badge count={1} placement="top-right">
        <web-ui-button variant="secondary">top-right (default)</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={2} placement="top-left">
        <web-ui-button variant="secondary">top-left</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={3} placement="bottom-right">
        <web-ui-button variant="secondary">bottom-right</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={4} placement="bottom-left">
        <web-ui-button variant="secondary">bottom-left</web-ui-button>
      </web-ui-badge>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-badge :count="1" placement="top-right">
      <web-ui-button variant="secondary">top-right (default)</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="2" placement="top-left">
      <web-ui-button variant="secondary">top-left</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="3" placement="bottom-right">
      <web-ui-button variant="secondary">bottom-right</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="4" placement="bottom-left">
      <web-ui-button variant="secondary">bottom-left</web-ui-button>
    </web-ui-badge>
  </div>
</template>
```

### Offset {#offset}

`offset-x` / `offset-y` fine-tune in pixels at the corner chosen by `placement`; negative values pull the badge toward the content and positive values push it outward. Rounded or outlined content often needs the badge pulled back a little so it does not hang outside the outline.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <web-ui-badge count={8} offset-x={-4} offset-y={4}>
        <web-ui-button variant="secondary">Number pulled inward</web-ui-button>
      </web-ui-badge>

      <web-ui-badge dot offset-x={-6} offset-y={6}>
        <web-ui-button variant="secondary">The dot takes the offset too</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={8} offset-x={10} offset-y={-10}>
        <web-ui-button variant="secondary">Pushed outward</web-ui-button>
      </web-ui-badge>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-badge :count="8" :offset-x="-4" :offset-y="4">
      <web-ui-button variant="secondary">Number pulled inward</web-ui-button>
    </web-ui-badge>

    <web-ui-badge dot :offset-x="-6" :offset-y="6">
      <web-ui-button variant="secondary">The dot takes the offset too</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="8" :offset-x="10" :offset-y="-10">
      <web-ui-button variant="secondary">Pushed outward</web-ui-button>
    </web-ui-badge>
  </div>
</template>
```

### Standalone use {#standalone}

When the default slot is empty there is no "corner of content" to pin to, so the badge returns to inline flow and is itself a readable number or dot, suitable for sitting next to text in places such as list items and tab titles.

```tsx
export default function Demo() {
  return (
    <div className="flex items-center gap-4">
      <web-ui-badge count={3}></web-ui-badge>
      <web-ui-badge count={128}></web-ui-badge>
      <web-ui-badge dot></web-ui-badge>
      <web-ui-badge count={0} show-zero></web-ui-badge>
    </div>
  )
}
```

```vue
<template>
  <div class="flex items-center gap-4">
    <web-ui-badge :count="3"></web-ui-badge>
    <web-ui-badge :count="128"></web-ui-badge>
    <web-ui-badge dot></web-ui-badge>
    <web-ui-badge :count="0" show-zero></web-ui-badge>
  </div>
</template>
```

### Hidden {#hidden}

`badge-hidden` stops the badge from being drawn at all while the content shows as usual. It overrides `dot` and `count`: the number or unread state is still there, it is just not shown this time.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <web-ui-badge count={5}>
        <web-ui-button variant="secondary">5 unread</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={5} badge-hidden>
        <web-ui-button variant="secondary">Same 5, badge hidden</web-ui-button>
      </web-ui-badge>

      <web-ui-badge dot badge-hidden>
        <web-ui-button variant="secondary">dot is hidden too</web-ui-button>
      </web-ui-badge>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-badge :count="5">
      <web-ui-button variant="secondary">5 unread</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="5" badge-hidden>
      <web-ui-button variant="secondary">Same 5, badge hidden</web-ui-button>
    </web-ui-badge>

    <web-ui-badge dot badge-hidden>
      <web-ui-button variant="secondary">dot is hidden too</web-ui-button>
    </web-ui-badge>
  </div>
</template>
```

### Controlled count {#controlled}

`count` is a plain property whose value the page owns: when the number grows past `max` the badge shows `max+`, and when it returns to 0 the badge disappears on its own, with no extra conditional rendering in the page.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(3)

  return (
    <div className="flex flex-wrap items-center gap-6">
      <web-ui-badge count={count}>
        <web-ui-button variant="secondary" onClick={() => setCount(value => value + 1)}>
          Inbox
        </web-ui-button>
      </web-ui-badge>

      <web-ui-button onClick={() => setCount(0)}>Clear unread</web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">count={count}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-6">
    <web-ui-badge :count="count">
      <web-ui-button variant="secondary" @click="count += 1">Inbox</web-ui-button>
    </web-ui-badge>

    <web-ui-button @click="count = 0">Clear unread</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">count={{ count }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const count = ref(3)
</script>
```

## API

### Props

| Name           | Description                                                                       | Type                                                           | Default       |
| -------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------- |
| `count`        | Number to display.                                                                | `number`                                                       | `0`           |
| `max`          | Numeric limit; above it `max+` is shown.                                          | `number`                                                       | `99`          |
| `dot`          | Dot mode; shows only a dot and no number.                                         | `boolean`                                                      | `false`       |
| `show-zero`    | Also shows when `count` is 0.                                                     | `boolean`                                                      | `false`       |
| `badge-hidden` | Hides the badge entirely.                                                         | `boolean`                                                      | `false`       |
| `offset-x`     | Horizontal offset (px).                                                           | `number`                                                       | `0`           |
| `offset-y`     | Vertical offset (px).                                                             | `number`                                                       | `0`           |
| `placement`    | Badge position: `top-right` (default), `top-left`, `bottom-right`, `bottom-left`. | `'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left'` | `'top-right'` |

### Slots

| Name      | Description                                                        |
| --------- | ------------------------------------------------------------------ |
| `default` | The decorated content; the badge is stacked on one of its corners. |

### Behavior

Display is decided by a single priority chain: `badge-hidden` first—if set, nothing is drawn; then `dot`—if set, always drawn; only then `count > 0 || show-zero`. The number follows the same rule: empty under `dot`, otherwise `count > max ? 'max+' : count`.

`count` and `max` go through the same numeric normalization: non-finite numbers (`NaN`, ±Infinity) and non-numeric values fall back to their defaults `0` / `99`, while negative values and values beyond `Number.MAX_SAFE_INTEGER` are clamped to the range, so `count={-5}` falls back to 0 (and the badge disappears with it).

`placement` goes through a literal whitelist; values outside the four corners (including the empty string) fall back to `top-right`, and the host attribute is immediately corrected to the normalized value.

The badge is a `role="status"` live region, and the component supplies a fixed `aria-label` per state: `dot` announces `Unread`, a `count` greater than 0 announces `<count> unread messages`, and `show-zero` announces `No unread messages`; with `badge-hidden` the node is not rendered at all, so nothing is announced in the accessibility tree.

The text is built-in English and no configurable accessible name property is provided; to customize the semantics, use no hiding mechanism other than `badge-hidden`.

### Layout

The host is inline-block and the wrapper is inline-flex.

When there is content, the wrapper becomes `position: relative` and the badge is positioned absolutely at the chosen corner; the `translate` baseline comes from `placement` (±50% for the number and ±40% for the dot, so the badge presses past the outline instead of sitting on the edge line), and `offset-x` / `offset-y` stack on top of that translate as internal variables.

Content is judged by the number of element child nodes: plain text alone does not count as content, so the badge stays in inline flow—when wrapping a piece of text, wrap that text in an element.

The badge exposes no size or color knobs: the background uses `--wui-color-danger`, the text uses `--wui-color-on-accent`, and the outline uses `--wui-color-page` (1px, to cut the badge out of dark content).

The radius comes from `--wui-radius-control` (pill by default); the height is 18px, the minimum width is 18px, the horizontal padding is `--wui-space-1`, and the font size is `--wui-font-size-caption`.

`dot` only shrinks the width and height to 8px and removes the padding.

To change the colors, change the scope of these semantic tokens rather than looking for a property on the badge.

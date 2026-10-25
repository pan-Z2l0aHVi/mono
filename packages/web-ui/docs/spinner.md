---
component: spinner
tag: web-ui-spinner
---

A loading spinner: place it declaratively in the page, or mount a full-screen instance with the static `WebUiSpinner.show()` / `hide()`. The eight blades are offset by 1/8 of a cycle each, forming one lap of chasing light.

## Samples

### Basic {#basic}

`size` is a pixel dimension and only changes the width and height of the spinner itself. On connect the host adds `role="status"` and `aria-label`; values that already exist are not overwritten, so to rename it for a context, write it on the element directly.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <span className="flex flex-col items-center gap-2">
        <web-ui-spinner size={16}></web-ui-spinner>
        <span className="text-xs text-(--wui-color-text-secondary)">16</span>
      </span>
      <span className="flex flex-col items-center gap-2">
        <web-ui-spinner></web-ui-spinner>
        <span className="text-xs text-(--wui-color-text-secondary)">24 (default)</span>
      </span>
      <span className="flex flex-col items-center gap-2">
        <web-ui-spinner size={48} aria-label="Submitting"></web-ui-spinner>
        <span className="text-xs text-(--wui-color-text-secondary)">48, with a custom accessible name</span>
      </span>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-6">
    <span class="flex flex-col items-center gap-2">
      <web-ui-spinner :size="16"></web-ui-spinner>
      <span class="text-xs text-(--wui-color-text-secondary)">16</span>
    </span>
    <span class="flex flex-col items-center gap-2">
      <web-ui-spinner></web-ui-spinner>
      <span class="text-xs text-(--wui-color-text-secondary)">24 (default)</span>
    </span>
    <span class="flex flex-col items-center gap-2">
      <web-ui-spinner :size="48" aria-label="Submitting"></web-ui-spinner>
      <span class="text-xs text-(--wui-color-text-secondary)">48, with a custom accessible name</span>
    </span>
  </div>
</template>
```

### Description text {#description}

The description has two channels: the `description` attribute renders a styled line of text, while the `description` slot leaves the layout to you. Supplying both renders two lines—the component does not treat them as mutually exclusive. A declarative instance is an inline-flex box and places the description to the **right** of the spinner; a full-screen instance places it **below**.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-6">
      <web-ui-spinner size={32} description="Loading data"></web-ui-spinner>
      <web-ui-spinner size={32}>
        <span slot="description" className="text-sm text-(--wui-color-text-secondary)">
          Loading data · step 2 of 5
        </span>
      </web-ui-spinner>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-6">
    <web-ui-spinner :size="32" description="Loading data"></web-ui-spinner>
    <web-ui-spinner :size="32">
      <span slot="description" class="text-sm text-(--wui-color-text-secondary)"> Loading data · step 2 of 5 </span>
    </web-ui-spinner>
  </div>
</template>
```

### Full-screen instance {#imperative}

`show()` mounts a full-screen instance in the overlay root of the current theme (falling back to the body's fallback overlay root when there is no theme scope); `size` / `description` / `color` override the appearance, and when `duration` is greater than 0 the instance calls `hide()` automatically on expiry.

While the instance is up, the native `<dialog>`'s `showModal()` blocks the rest of the page from interacting and locks scrolling; `hide()` or unmounting releases the scroll lock and clears the `duration` timer together.

Repeated clicks do not stack—mounting a new instance removes the previous imperative one.

```tsx
import { WebUiSpinner } from '@greypan/web-ui'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button onClick={() => WebUiSpinner.show()}>show()</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.hide()}>hide()</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.show({ size: 16 })}>Small (16px)</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.show({ size: 64, duration: 2000 })}>
        Large (64px), closes itself after 2 seconds
      </web-ui-button>
      <web-ui-button
        onClick={() => WebUiSpinner.show({ description: 'Syncing cloud files, about 10 seconds', duration: 10000 })}
      >
        With description, 10 seconds
      </web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button @click="show">show()</web-ui-button>
    <web-ui-button @click="hide">hide()</web-ui-button>
    <web-ui-button @click="showSmall">Small (16px)</web-ui-button>
    <web-ui-button @click="showLarge">Large (64px), closes itself after 2 seconds</web-ui-button>
    <web-ui-button @click="showWithDescription">With description, 10 seconds</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import { WebUiSpinner } from '@greypan/web-ui'

function show() {
  WebUiSpinner.show()
}

function hide() {
  WebUiSpinner.hide()
}

function showSmall() {
  WebUiSpinner.show({ size: 16 })
}

function showLarge() {
  WebUiSpinner.show({ size: 64, duration: 2000 })
}

function showWithDescription() {
  WebUiSpinner.show({ description: 'Syncing cloud files, about 10 seconds', duration: 10000 })
}
</script>
```

### Speed {#speed}

The chase cycle of the blades is `--wui-duration-spinner` (`800ms`); overriding it on the host changes the speed. Under the theme's `motion="reduced"` or a system reduce preference this token slows to `1600ms` instead of stopping: a stopped loading indicator reads as a frozen interface.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <span className="flex flex-col items-center gap-2">
        <web-ui-spinner size={32}></web-ui-spinner>
        <span className="text-xs text-(--wui-color-text-secondary)">800ms (default)</span>
      </span>
      <span className="flex flex-col items-center gap-2">
        <web-ui-spinner size={32} className="[--wui-duration-spinner:400ms]"></web-ui-spinner>
        <span className="text-xs text-(--wui-color-text-secondary)">400ms</span>
      </span>
      <span className="flex flex-col items-center gap-2">
        <web-ui-spinner size={32} className="[--wui-duration-spinner:1600ms]"></web-ui-spinner>
        <span className="text-xs text-(--wui-color-text-secondary)">1600ms</span>
      </span>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-6">
    <span class="flex flex-col items-center gap-2">
      <web-ui-spinner :size="32"></web-ui-spinner>
      <span class="text-xs text-(--wui-color-text-secondary)">800ms (default)</span>
    </span>
    <span class="flex flex-col items-center gap-2">
      <web-ui-spinner :size="32" class="[--wui-duration-spinner:400ms]"></web-ui-spinner>
      <span class="text-xs text-(--wui-color-text-secondary)">400ms</span>
    </span>
    <span class="flex flex-col items-center gap-2">
      <web-ui-spinner :size="32" class="[--wui-duration-spinner:1600ms]"></web-ui-spinner>
      <span class="text-xs text-(--wui-color-text-secondary)">1600ms</span>
    </span>
  </div>
</template>
```

## API

### Props

| Name          | Description                                                                                           | Type     | Default |
| ------------- | ----------------------------------------------------------------------------------------------------- | -------- | ------- |
| `size`        | Spinner size in pixels; the component writes it to the host inline style as a width and height token. | `number` | `24`    |
| `description` | Description text, laid out by the component (secondary color, centered, at most 240px).               | `string` | `''`    |
| `color`       | Blade color, a CSS color value; when empty it follows the theme's secondary text color.               | `string` | `''`    |

### Slots

| Name          | Description                                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `description` | The second description channel: the content is laid out entirely by you, and supplying it together with the attribute renders two lines. |

### Options

| Name          | Description                                                                                                       | Type     | Default |
| ------------- | ----------------------------------------------------------------------------------------------------------------- | -------- | ------- |
| `size`        | Instance size; written to the instance's `size` only when truthy, so `0` is ignored and the default `24` remains. | `number` | `24`    |
| `description` | Instance description text, using the attribute channel; an empty string means unset.                              | `string` | `''`    |
| `color`       | Instance blade color, a CSS color value; an empty string means unset.                                             | `string` | `''`    |
| `duration`    | When greater than `0`, calls `hide()` automatically on expiry; when omitted or `0` the instance stays up.         | `number` | —       |

### Methods

| Name                          | Description                                                                                                                                                                                                                                                                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WebUiSpinner.show(options?)` | Mounts a full-screen instance in the theme overlay root (the body's fallback overlay root when there is no theme) and returns it; while the instance is up, `showModal()` blocks page interaction and locks scrolling. A new instance removes the previous imperative instance on connect, and on `duration` expiry `hide()` is called. |
| `WebUiSpinner.hide()`         | Releases the scroll lock, clears the `duration` timer, and removes the instance mounted by `show()`; a no-op when there is none.                                                                                                                                                                                                        |

### Behavior

The accessible name is added in `connectedCallback`: a missing `role` becomes `status` and a missing `aria-label` becomes `Loading`; when both already exist they are not overwritten.

The blades are eight `<span>` elements, each rotated by `i * 45deg` and given a negative `animation-delay` of `-(i / 8)` cycle, which visually reads as a trail of light chasing around the ring.

`size` does not merely write a CSS variable: in `updated()` the component writes `--wui-spinner-size` as an **inline style** on the host, so setting a variable of the same name on the host is overridden and `size` is the only entry point for the dimension.

An imperative instance is mounted in the theme's overlay root (the body's fallback overlay root when there is no theme scope), so theme tokens are inherited along the overlay root: the description, the speed (`--wui-duration-spinner`), and the layer (`--wui-layer-loading`) all follow the theme.

Only without a theme scope do they fall back to the literal values `#6a6a6a` / `800ms` / `300` in the component styles.

The component does not clean up for you: when `duration` is omitted or `0` the instance stays up, and only `hide()`, replacement by a new instance, or explicit removal takes it down; when the instance is removed it releases the scroll lock and the overlay placeholder.

### Color

The blades are drawn with `currentcolor`: by default they inherit the host's `--wui-color-text-secondary` (falling back to `#6a6a6a`), and the `color` attribute overrides it with any CSS color value (both the declarative attribute and the `color` option of `show()` go through it).

The description text uses `--wui-color-text-secondary`.

### CSS Custom Properties

| Name                     | Description                                                                                                                             | Default |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `--wui-spinner-size`     | Spinner width and height; written to the host inline style by `size`, so a variable of the same name set by the consumer is overridden. | `24px`  |
| `--wui-duration-spinner` | Chase cycle of the blades; slowed to `1600ms` under reduce, never stopped.                                                              | `800ms` |
| `--wui-layer-loading`    | `z-index` of the imperative overlay, a layer token of the theme.                                                                        | `300`   |

# Spinner

A loading spinner. Use it declaratively in the page, or mount a full-screen instance with the static `WebUiSpinner.show()` / `hide()`.

## Samples

### Basic

`size` is a pixel dimension and only changes the width and height of the spinner itself. The host carries `role="status"` and `aria-label`; values you set are not overwritten, so write a context-specific name on the element directly.

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

### Description text

The description has two channels: the `description` attribute renders a styled line of text, while the `description` slot leaves the layout to you. Supplying both renders two lines; the component does not treat them as mutually exclusive. A declarative instance places the description to the right of the spinner; a full-screen instance places it below.

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

### Full-screen instance

`show()` mounts a full-screen instance in the overlay container of the current theme (falling back to the body's default overlay container when there is no theme scope); `size` / `description` / `color` override the appearance, and when `duration` is greater than 0 the instance calls `hide()` automatically on expiry.

The overlay of a full-screen instance is pointer-transparent. It reports loading without taking over clicks, focus, or page scrolling. `hide()` closes it and clears the `duration` timer.

Repeated clicks do not stack: mounting a new instance removes the previous imperative one.

```tsx
import { WebUiSpinner } from '@greypan/web-ui'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button onClick={() => WebUiSpinner.show()}>show()</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.hide()}>hide()</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.show({ size: 16 })}>Small (16px)</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.show({ size: 64, duration: 2000 })}>Large (64px)</web-ui-button>
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
    <web-ui-button @click="showLarge">Large (64px)</web-ui-button>
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

### Speed

The rotation cycle is controlled by `--wui-duration-spinner` (`800ms`); overriding it on the host changes the speed. Under the theme's `motion="reduced"` or a system reduced-motion preference, the token slows to `1600ms` and does not stop.

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

| Name          | Description                                                                                 | Type     | Default |
| ------------- | ------------------------------------------------------------------------------------------- | -------- | ------- |
| `size`        | Spinner size in pixels.                                                                     | `number` | `24`    |
| `description` | Description text, laid out by the component (secondary color, centered, at most 240px).     | `string` | `''`    |
| `color`       | Indicator color, a CSS color value; when empty it follows the theme's secondary text color. | `string` | `''`    |

### Slots

| Name          | Description                                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `description` | The second description channel: the content is laid out entirely by you, and supplying it together with the attribute renders two lines. |

### Options

| Name          | Description                                                                                                       | Type     | Default |
| ------------- | ----------------------------------------------------------------------------------------------------------------- | -------- | ------- |
| `size`        | Instance size; written to the instance's `size` only when truthy, so `0` is ignored and the default `24` remains. | `number` | `24`    |
| `description` | Instance description text, using the attribute channel; an empty string means unset.                              | `string` | `''`    |
| `color`       | Instance indicator color, a CSS color value; an empty string means unset.                                         | `string` | `''`    |
| `duration`    | When greater than `0`, calls `hide()` automatically on expiry; when omitted or `0` the instance stays up.         | `number` | -       |

### Methods

| Name                          | Description                                                                                                                                                                                                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WebUiSpinner.show(options?)` | Mounts a full-screen instance in the theme overlay container (the body's default overlay container when there is no theme) and returns it; the instance is non-modal and does not block page interaction or scrolling. A new instance removes the previous imperative instance on mount, and on `duration` expiry `hide()` is called. |
| `WebUiSpinner.hide()`         | Closes the instance's dialog, clears the `duration` timer, and removes the instance mounted by `show()` from the overlay container; does nothing when there is none.                                                                                                                                                                  |

### Behavior

The accessible name is added by the component: a missing `role` becomes `status` and a missing `aria-label` becomes `Loading`; when both already exist they are not overwritten.

The dimension has a single entry point, `size`; overriding `--wui-spinner-size` on the host has no effect.

An imperative instance is mounted in the theme's overlay container (the body's default overlay container when there is no theme scope), so the description, the speed (`--wui-duration-spinner`), and the layer (`--wui-layer-loading`) all follow the theme.

The component does not clean up for you. When `duration` is omitted or `0` the instance stays up, and only `hide()` or replacement by a new instance takes it down. The imperative instance does not lock page scrolling.

### Color

The indicator color defaults to the host's `--wui-color-text-secondary`, and the `color` attribute overrides it with any CSS color value (both the declarative attribute and the `color` option of `show()` use it).

The description text uses `--wui-color-text-secondary`.

### CSS Custom Properties

| Name                     | Description                                                             | Default |
| ------------------------ | ----------------------------------------------------------------------- | ------- |
| `--wui-spinner-size`     | Spinner width and height; overriding it has no effect, use `size`.      | `24px`  |
| `--wui-duration-spinner` | Rotation cycle; slowed to `1600ms` under reduced motion, never stopped. | `800ms` |
| `--wui-layer-loading`    | `z-index` of the imperative overlay, a layer token of the theme.        | `3000`  |

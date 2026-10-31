---
component: progress
tag: web-ui-progress
---

progress / progress indicator: a linear track for completed work, with an indeterminate mode for operations whose percentage is not known yet.

## Samples

### Basic

`value` defaults to the `0..100` range, and values above the limit converge to `max`. The host always exposes `role="progressbar"`; the examples provide an accessible name through `aria-label`.

```tsx
export default function Demo() {
  return (
    <div className="grid w-full max-w-xl gap-5">
      <web-ui-progress aria-label="Profile completion" value={24}></web-ui-progress>
      <web-ui-progress aria-label="Upload progress" value={62}></web-ui-progress>
      <web-ui-progress aria-label="Sync complete" value={100}></web-ui-progress>
    </div>
  )
}
```

```vue
<template>
  <div class="grid w-full max-w-xl gap-5">
    <web-ui-progress aria-label="Profile completion" :value="24"></web-ui-progress>
    <web-ui-progress aria-label="Upload progress" :value="62"></web-ui-progress>
    <web-ui-progress aria-label="Sync complete" :value="100"></web-ui-progress>
  </div>
</template>
```

### Custom range

`max` does not have to be 100, so the component also fits business counts such as “12 of 40 selected”. `show-value` displays the rounded percentage beside the track. Assistive technology reads `aria-valuenow` / `aria-valuemax` and does not repeat the visible percentage.

```tsx
export default function Demo() {
  return (
    <div className="grid w-full max-w-xl gap-5">
      <web-ui-progress aria-label="Selected items" max={40} value={12} showValue></web-ui-progress>
      <web-ui-progress aria-label="Storage used" max={256} value={192} showValue></web-ui-progress>
    </div>
  )
}
```

```vue
<template>
  <div class="grid w-full max-w-xl gap-5">
    <web-ui-progress aria-label="Selected items" :max="40" :value="12" show-value></web-ui-progress>
    <web-ui-progress aria-label="Storage used" :max="256" :value="192" show-value></web-ui-progress>
  </div>
</template>
```

### Indeterminate

Use `indeterminate` when work has started but its percentage cannot be calculated yet. The component removes `aria-valuenow` while keeping the progress name and upper bound. The theme's reduced-motion mode slows the loop instead of stopping the only ongoing signal.

```tsx
export default function Demo() {
  return (
    <div className="grid w-full max-w-xl gap-5">
      <web-ui-progress aria-label="Connecting to server" indeterminate></web-ui-progress>
      <web-ui-progress aria-label="Preparing data" indeterminate showValue></web-ui-progress>
    </div>
  )
}
```

```vue
<template>
  <div class="grid w-full max-w-xl gap-5">
    <web-ui-progress aria-label="Connecting to server" indeterminate></web-ui-progress>
    <web-ui-progress aria-label="Preparing data" indeterminate show-value></web-ui-progress>
  </div>
</template>
```

### Styling

Track height, radius, track color and fill color all use CSS Custom Properties, which can be overridden on the host or any ancestor. The host is `display: block; width: 100%` by default, leaving width constraints to the surrounding layout.

```tsx
export default function Demo() {
  return (
    <div className="grid w-full max-w-xl gap-5">
      <web-ui-progress
        aria-label="Success progress"
        className="[--wui-progress-height:12px] [--wui-progress-fill-color:var(--wui-color-success)]"
        value={72}
        showValue
      ></web-ui-progress>
      <web-ui-progress
        aria-label="Thin progress"
        className="[--wui-progress-height:4px] [--wui-progress-radius:2px]"
        value={38}
      ></web-ui-progress>
    </div>
  )
}
```

```vue
<template>
  <div class="grid w-full max-w-xl gap-5">
    <web-ui-progress
      aria-label="Success progress"
      class="[--wui-progress-height:12px] [--wui-progress-fill-color:var(--wui-color-success)]"
      :value="72"
      show-value
    ></web-ui-progress>
    <web-ui-progress
      aria-label="Thin progress"
      class="[--wui-progress-height:4px] [--wui-progress-radius:2px]"
      :value="38"
    ></web-ui-progress>
  </div>
</template>
```

## API

### Props

| Name            | Description                                                                                  | Type      | Default |
| --------------- | -------------------------------------------------------------------------------------------- | --------- | ------- |
| `value`         | Current completed amount, clamped to `0..max`; invalid numbers fall back to `0`.             | `number`  | `0`     |
| `max`           | Upper bound; non-finite or non-positive values fall back to `100`.                           | `number`  | `100`   |
| `indeterminate` | Unknown-progress mode. Removes `aria-valuenow` and plays the loop animation.                 | `boolean` | `false` |
| `show-value`    | Shows the rounded percentage beside the track; indeterminate mode shows an ellipsis instead. | `boolean` | `false` |

### CSS Custom Properties

| Name                                    | Description                                | Default                                           |
| --------------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| `--wui-progress-height`                 | Track height.                              | `8px`                                             |
| `--wui-progress-radius`                 | Radius of the track and completed portion. | `var(--wui-radius-control, calc(infinity * 1px))` |
| `--wui-progress-track-color`            | Track background.                          | `var(--wui-color-surface-track, #e5e5ea)`         |
| `--wui-progress-fill-color`             | Completed-portion color.                   | `var(--wui-color-accent, #0071e3)`                |
| `--wui-progress-indeterminate-duration` | Loop duration in indeterminate mode.       | `var(--wui-duration-spinner, 800ms)`              |

### Parts

The public style parts are `base`, `track`, `indicator` and `value`. Use `::part(...)` when visual control beyond the CSS Custom Properties is required; keep numeric and sizing updates on the documented properties.

### Accessibility

The host carries the `progressbar` role and maintains `aria-valuemin`, `aria-valuemax` and, in determinate mode, `aria-valuenow`. When neither `aria-label` nor `aria-labelledby` is supplied, the built-in English name is `Progress`; consumers should provide a name that matches the actual task.

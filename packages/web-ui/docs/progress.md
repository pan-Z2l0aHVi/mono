# Progress

English | [简体中文](./progress.CN.md)

progress / progress indicator: a linear track for completed work, with a `sport` loop animation for visual emphasis.

## Samples

### Basic

`value` falls in the `0..max` range, and values above the limit are clamped to `max`. The host always exposes `role="progressbar"`; give it an accessible name with `aria-label`.

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

`max` does not have to be 100, so the component also fits business counts such as "12 of 40 selected". `show-value` displays the rounded percentage beside the track. Assistive technology reads `aria-valuenow` / `aria-valuemax` and does not repeat the visible percentage.

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

### Sport

`sport` turns the completed portion into a short bar that loops from left to right across the track. Its **width** is still the `value / max` percentage, while its **position** comes from the animation; both the first and last frames place the bar fully outside the track, so the loop joins without a jump at a fixed percentage. The bar has square corners. A non-linear easing slows both ends and accelerates through the middle; the period defaults to 1s (1.25 times the theme's spinner token) and slows to 2s under the theme's reduced-motion setting, never stopping.

Progress stays knowable in `sport` mode: the host keeps `aria-valuenow`, and `show-value` still shows the percentage. Changing the value mid-animation updates the bar width and the travel endpoint together.

A `progressbar` only expresses known progress. When work has started but its percentage cannot be calculated yet, use a loading indicator such as `web-ui-spinner` instead. The `indeterminate` prop, the `--wui-progress-indeterminate-duration` custom property and the `wui-progress-indeterminate` animation are no longer available. A leftover `indeterminate` attribute in a template is ignored and **silently degrades to 0% when no `value` is given**; remove it and switch to `web-ui-spinner`.

```tsx
export default function Demo() {
  return (
    <div className="grid w-full max-w-xl gap-5">
      <web-ui-progress aria-label="Verifying files" value={35} sport></web-ui-progress>
      <web-ui-progress aria-label="Building index" max={200} value={130} sport showValue></web-ui-progress>
    </div>
  )
}
```

```vue
<template>
  <div class="grid w-full max-w-xl gap-5">
    <web-ui-progress aria-label="Verifying files" :value="35" sport></web-ui-progress>
    <web-ui-progress aria-label="Building index" :max="200" :value="130" sport show-value></web-ui-progress>
  </div>
</template>
```

### Styling

Track height, radius, track color, and fill color all use CSS Custom Properties, which you can override on the host or any ancestor. The host is `display: block; width: 100%` by default, so the surrounding container limits the width.

```tsx
export default function Demo() {
  return (
    <div className="grid w-full max-w-xl gap-5">
      <web-ui-progress
        aria-label="Success-colored progress"
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
      aria-label="Success-colored progress"
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

| Name         | Description                                                                         | Type      | Default |
| ------------ | ----------------------------------------------------------------------------------- | --------- | ------- |
| `value`      | Current completed amount, clamped to `0..max`; invalid numbers fall back to `0`.    | `number`  | `0`     |
| `max`        | Upper bound; non-finite or non-positive values fall back to `100`.                  | `number`  | `100`   |
| `sport`      | Sport mode: a square-cornered bar sized by progress loops with a non-linear easing. | `boolean` | `false` |
| `show-value` | Shows the rounded percentage beside the track.                                      | `boolean` | `false` |

### CSS Custom Properties

| Name                            | Description                                | Default                                           |
| ------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| `--wui-progress-height`         | Track height.                              | `8px`                                             |
| `--wui-progress-radius`         | Radius of the track and completed portion. | `var(--wui-radius-control, calc(infinity * 1px))` |
| `--wui-progress-track-color`    | Track background.                          | `var(--wui-color-surface-track, #e5e5eb)`         |
| `--wui-progress-fill-color`     | Completed-portion color.                   | `var(--wui-color-accent, #0071e3)`                |
| `--wui-progress-sport-duration` | Loop duration in sport mode.               | `calc(var(--wui-duration-spinner, 800ms) * 1.25)` |
| `--wui-progress-sport-easing`   | Easing curve in sport mode.                | `cubic-bezier(0.65, 0, 0.35, 1)`                  |

### Parts

The public style parts are `base`, `track`, `indicator` and `value`. Use `::part(...)` when visual control beyond the CSS Custom Properties is required; keep numeric and sizing updates on the documented properties. `--wui-progress-percent` and `--wui-progress-sport-shift` are written by the component into the `indicator`'s inline style and cannot be overridden externally.

### Accessibility

The host carries the `progressbar` role and always maintains `aria-valuemin`, `aria-valuemax` and `aria-valuenow`. `sport` only changes the visual treatment, not the progress semantics. When neither `aria-label` nor `aria-labelledby` is supplied, the name is the built-in English `Progress`. Provide a name that matches the actual task.

# Shake

English | [简体中文](./shake.CN.md)

Imperative shake. `shake()` moves a target a few times and back to where it started, which signals "not allowed" or "handle this first". Use it when a form still has unsaved content and the user is leaving, or when attention needs to return to a field. It is a function imported straight from `@greypan/web-ui`.

Without `target` it shakes the whole page. Pass `target` to shake only that one box. The horizontal amplitude comes from `--wui-shake-x-distance` (default `12px`), the vertical one from `--wui-shake-y-distance` (default `12px`, the same as the horizontal one), and the total duration from `--wui-shake-duration` (default `420ms`). All three can also be overridden per call through options.

## Samples

### Whole page

`shake()` with no arguments shakes the whole page. In-flow and `position: fixed` content both travel with it. An open dialog or drawer is not affected. Both axes stay in phase, so the composite motion runs along one straight line. With the default amplitudes the first swing goes up and to the left, and the target settles back at rest without a snap at the end.

```tsx
import { shake } from '@greypan/web-ui'

export default function Demo() {
  return <web-ui-button onClick={() => shake()}>Shake the page</web-ui-button>
}
```

```vue
<template>
  <web-ui-button @click="shake()">Shake the page</web-ui-button>
</template>

<script setup lang="ts">
import { shake } from '@greypan/web-ui'
</script>
```

### One element

Passing `target` shakes only that element and leaves the rest of the page alone. One call leaves exactly one animation on the target. Calling again cancels the previous one and restarts instead of stacking into a larger displacement.

A `transform` the target already carries is preserved, so centring such as `translate(-50%, -50%)` is not lost when the shake runs; the element is still centred when it settles.

```tsx
import { shake } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <web-ui-button
        onClick={() => {
          if (cardRef.current) shake({ target: cardRef.current, xDistance: 18 })
        }}
      >
        Shake this card only
      </web-ui-button>
      <div
        ref={cardRef}
        className="mt-3 w-64 rounded-xl border border-(--wui-color-border) bg-(--wui-color-surface) p-3 text-sm"
      >
        Fields that still need attention live here.
      </div>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="shakeCard">Shake this card only</web-ui-button>
  <div ref="card" class="mt-3 w-64 rounded-xl border border-(--wui-color-border) bg-(--wui-color-surface) p-3 text-sm">
    Fields that still need attention live here.
  </div>
</template>

<script setup lang="ts">
import { shake } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const card = useTemplateRef<HTMLDivElement>('card')

function shakeCard() {
  if (card.value) shake({ target: card.value, xDistance: 18 })
}
</script>
```

### Amplitude and duration

`xDistance` and `yDistance` are the horizontal and vertical amplitudes in px, and `duration` is the total time in ms. Each one reads its own token from the target's computed style when omitted. Both axes default to the same amplitude (`12px` each), so calling with no arguments shakes diagonally. Setting one axis to `0` leaves only the other one swinging.

With a `target`, declare the token on any ancestor of that target. When shaking the page, write it on `html` / `:root`.

`0` is per axis. Zeroing one axis only removes that axis, and the other keeps swinging. When both amplitudes are `0` (or the duration is `0`) nothing happens.

```tsx
import { shake } from '@greypan/web-ui'

export default function Demo() {
  return (
    <>
      <web-ui-button onClick={() => shake({ xDistance: 28, duration: 640 })}>Bigger and slower</web-ui-button>
      <web-ui-button onClick={() => shake({ xDistance: 12, yDistance: 0 })}>Horizontal only</web-ui-button>
      <web-ui-button onClick={() => shake({ xDistance: 0, yDistance: 12 })}>Vertical only</web-ui-button>
      <web-ui-button onClick={() => shake({ xDistance: 0, yDistance: 0 })}>
        Both amplitudes 0: nothing happens
      </web-ui-button>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="shake({ xDistance: 28, duration: 640 })">Bigger and slower</web-ui-button>
  <web-ui-button @click="shake({ xDistance: 12, yDistance: 0 })">Horizontal only</web-ui-button>
  <web-ui-button @click="shake({ xDistance: 0, yDistance: 12 })">Vertical only</web-ui-button>
  <web-ui-button @click="shake({ xDistance: 0, yDistance: 0 })">Both amplitudes 0: nothing happens</web-ui-button>
</template>

<script setup lang="ts">
import { shake } from '@greypan/web-ui'
</script>
```

## API

### Options

`shake(input?)` accepts an `HTMLElement` (equivalent to passing only `target`), an option object, or nothing.

| Name        | Description                                                                                                                                               | Type          | Default                    |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------------- |
| `target`    | The element to displace. Shakes the whole page when omitted.                                                                                              | `HTMLElement` | `document.documentElement` |
| `xDistance` | Horizontal peak amplitude in px, i.e. the largest displacement actually swung on the x axis. Reads `--wui-shake-x-distance` from the target when omitted. | `number`      | `12`                       |
| `yDistance` | Vertical amplitude in px, in phase with the horizontal one. Reads `--wui-shake-y-distance` when omitted; defaults to the horizontal amplitude.            | `number`      | `12`                       |
| `duration`  | Total duration in ms. Reads `--wui-shake-duration` from the target's computed style when omitted.                                                         | `number`      | `420`                      |

### Behavior

Both amplitude tokens accept viewport units and `calc()`; percentages do not work and fall back to the default amplitude. The duration accepts both `420ms` and `0.42s`.

Under reduced motion (the system `prefers-reduced-motion`, or the `motion` mode of the enclosing `web-ui-theme`) no displacement is produced and no state is left behind. With a `target` the decision uses that element's nearest theme scope; when shaking the page it uses the page's root theme.

### CSS Custom Properties

| Name                     | Description                                                                                                                             | Default |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `--wui-shake-x-distance` | Horizontal amplitude, i.e. the largest displacement actually swung on the x axis; accepts viewport units and `calc()`, not percentages. | `12px`  |
| `--wui-shake-y-distance` | Vertical amplitude, in phase with the horizontal one; defaults to the horizontal amplitude. Same units as above.                        | `12px`  |
| `--wui-shake-duration`   | Total duration, written as `420ms` or `0.42s`; `0` turns the effect off.                                                                | `420ms` |

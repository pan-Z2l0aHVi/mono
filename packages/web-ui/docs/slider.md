---
component: slider
tag: web-ui-slider
---

Range slider with tick marks and a vertical orientation; dragging uses pointer capture, and the keyboard supports the arrow keys, Home / End, and PageUp / PageDown. Every instance should provide a distinguishing name through `aria-label` or `aria-labelledby`.

## Samples

### Basic {#basic}

With no attributes the range is `0`–`100` with a step of `1`; `min` / `max` / `step` constrain the value range and the step size, and `disabled` takes the track and thumb out of interaction.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-6">
      <web-ui-slider aria-label="Volume"></web-ui-slider>
      <web-ui-slider aria-label="Brightness" min={0} max={100} step={5} value={40}></web-ui-slider>
      <web-ui-slider aria-label="Disabled volume" min={0} max={100} step={5} value={65} disabled></web-ui-slider>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-6">
    <web-ui-slider aria-label="Volume"></web-ui-slider>
    <web-ui-slider aria-label="Brightness" :min="0" :max="100" :step="5" :value="40"></web-ui-slider>
    <web-ui-slider aria-label="Disabled volume" :min="0" :max="100" :step="5" :value="65" disabled></web-ui-slider>
  </div>
</template>
```

### Tick marks {#marks}

`marks` draws tick points along the track, spaced by `step`, so tick density is decided by the step; at most 100 segments are drawn, and when `step` is too dense relative to `min`–`max` only the first 100 segments are drawn instead of filling the track.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-8">
      <web-ui-slider aria-label="Ticks with step 10" marks step={10} value={40}></web-ui-slider>
      <web-ui-slider aria-label="Ticks with step 25" marks step={25} value={50}></web-ui-slider>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-8">
    <web-ui-slider aria-label="Ticks with step 10" marks :step="10" :value="40"></web-ui-slider>
    <web-ui-slider aria-label="Ticks with step 25" marks :step="25" :value="50"></web-ui-slider>
  </div>
</template>
```

### Vertical orientation {#vertical}

`vertical` stands the track up and values grow from bottom to top; `aria-orientation` becomes `vertical` accordingly, and the arrow keys still adjust with the up and down keys.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [brightness, setBrightness] = useState(60)
  const [volume, setVolume] = useState(30)

  return (
    <div className="flex items-start gap-10">
      <div className="flex flex-col items-center gap-3">
        <web-ui-slider
          aria-label="Vertical brightness"
          vertical
          value={brightness}
          onInput={event => setBrightness(event.currentTarget.value)}
        ></web-ui-slider>
        <span className="text-xs text-(--wui-color-text-secondary)">{brightness}</span>
      </div>

      <div className="flex flex-col items-center gap-3">
        <web-ui-slider
          aria-label="Vertical volume"
          vertical
          marks
          step={10}
          value={volume}
          onInput={event => setVolume(event.currentTarget.value)}
        ></web-ui-slider>
        <span className="text-xs text-(--wui-color-text-secondary)">{volume}</span>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex items-start gap-10">
    <div class="flex flex-col items-center gap-3">
      <web-ui-slider
        aria-label="Vertical brightness"
        vertical
        :value="brightness"
        @input="brightness = $event.currentTarget.value"
      ></web-ui-slider>
      <span class="text-xs text-(--wui-color-text-secondary)">{{ brightness }}</span>
    </div>

    <div class="flex flex-col items-center gap-3">
      <web-ui-slider
        aria-label="Vertical volume"
        vertical
        marks
        :step="10"
        :value="volume"
        @input="volume = $event.currentTarget.value"
      ></web-ui-slider>
      <span class="text-xs text-(--wui-color-text-secondary)">{{ volume }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const brightness = ref(60)
const volume = ref(30)
</script>
```

### input and change {#events}

During a drag `input` fires continuously, and on release a single `change` is dispatched only after the value has really changed; with the keyboard, each press of an adjustment key that changes the value produces `input` and then `change`. Clicking an empty spot on the track also counts as one value change.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [inputValue, setInputValue] = useState(40)
  const [changeValue, setChangeValue] = useState(40)

  return (
    <div className="flex flex-wrap items-center gap-5">
      <web-ui-slider
        aria-label="Event demo"
        marks
        step={5}
        min={10}
        max={90}
        value={inputValue}
        onInput={event => setInputValue(event.currentTarget.value)}
        onChange={event => setChangeValue(event.currentTarget.value)}
      ></web-ui-slider>
      <output className="text-sm text-(--wui-color-text-secondary)">
        input: {inputValue} / change: {changeValue}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-5">
    <web-ui-slider
      aria-label="Event demo"
      marks
      :step="5"
      :min="10"
      :max="90"
      :value="inputValue"
      @input="inputValue = $event.currentTarget.value"
      @change="changeValue = $event.currentTarget.value"
    ></web-ui-slider>
    <output class="text-sm text-(--wui-color-text-secondary)">
      input: {{ inputValue }} / change: {{ changeValue }}
    </output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const inputValue = ref(40)
const changeValue = ref(40)
</script>
```

### Form value {#form}

`name` makes the current value enter `FormData` under that field name; the component joins the host `<form>` through ElementInternals, so `form.reset()` returns the value to its initial value.

```tsx
import { useRef, useState } from 'react'

export default function Demo() {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitted, setSubmitted] = useState('')

  return (
    <form
      ref={formRef}
      className="flex flex-wrap items-center gap-4"
      onSubmit={event => {
        event.preventDefault()
        const volume = new FormData(event.currentTarget).get('volume')
        setSubmitted(typeof volume === 'string' ? volume : '')
      }}
    >
      <web-ui-slider aria-label="Form volume" name="volume" step={5} value={40}></web-ui-slider>
      <web-ui-button type="submit">Submit</web-ui-button>
      <web-ui-button
        onClick={() => {
          formRef.current?.reset()
          setSubmitted('')
        }}
      >
        Reset
      </web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">
        {submitted === '' ? 'Not submitted yet' : `volume=${submitted}`}
      </output>
    </form>
  )
}
```

```vue
<template>
  <form ref="form" class="flex flex-wrap items-center gap-4" @submit="onSubmit">
    <web-ui-slider aria-label="Form volume" name="volume" :step="5" :value="40"></web-ui-slider>
    <web-ui-button type="submit">Submit</web-ui-button>
    <web-ui-button @click="reset">Reset</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">
      {{ submitted === '' ? 'Not submitted yet' : `volume=${submitted}` }}
    </output>
  </form>
</template>

<script setup lang="ts">
import { useTemplateRef, ref } from 'vue'

const submitted = ref('')
const form = useTemplateRef('form')

function onSubmit(event: Event) {
  event.preventDefault()
  const volume = new FormData(event.currentTarget as HTMLFormElement).get('volume')
  submitted.value = typeof volume === 'string' ? volume : ''
}

function reset() {
  form.value?.reset()
  submitted.value = ''
}
</script>
```

### CSS variables {#sizing}

`--wui-slider-width` / `--wui-slider-vertical-height` decide the host's axis length, `--wui-slider-track-size` is the track thickness, and the thumb thickness and the long edge of its pressed state each use their own variable.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-end gap-8">
      <web-ui-slider
        aria-label="Wide track"
        className="[--wui-slider-width:300px] [--wui-slider-track-size:10px] [--wui-slider-thumb-thickness:26px] [--wui-slider-thumb-length:38px]"
        value={35}
      ></web-ui-slider>

      <web-ui-slider
        aria-label="Narrow track"
        className="[--wui-slider-width:160px] [--wui-slider-track-size:2px] [--wui-slider-thumb-thickness:12px]"
        value={72}
      ></web-ui-slider>

      <web-ui-slider
        aria-label="Vertical wide track"
        vertical
        marks
        className="[--wui-slider-vertical-height:120px] [--wui-slider-track-size:8px] [--wui-slider-marks-inset:6px]"
        step={10}
        value={50}
      ></web-ui-slider>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-end gap-8">
    <web-ui-slider
      aria-label="Wide track"
      class="[--wui-slider-width:300px] [--wui-slider-track-size:10px] [--wui-slider-thumb-thickness:26px] [--wui-slider-thumb-length:38px]"
      :value="35"
    ></web-ui-slider>

    <web-ui-slider
      aria-label="Narrow track"
      class="[--wui-slider-width:160px] [--wui-slider-track-size:2px] [--wui-slider-thumb-thickness:12px]"
      :value="72"
    ></web-ui-slider>

    <web-ui-slider
      aria-label="Vertical wide track"
      vertical
      marks
      class="[--wui-slider-vertical-height:120px] [--wui-slider-track-size:8px] [--wui-slider-marks-inset:6px]"
      :step="10"
      :value="50"
    ></web-ui-slider>
  </div>
</template>
```

## API

### Props

| Name              | Description                                                            | Type      | Default |
| ----------------- | ---------------------------------------------------------------------- | --------- | ------- |
| `disabled`        | Disabled state.                                                        | `boolean` | `false` |
| `marks`           | Shows tick marks.                                                      | `boolean` | `false` |
| `vertical`        | Vertical orientation.                                                  | `boolean` | `false` |
| `name`            | Form field name.                                                       | `string`  | `''`    |
| `required`        | Reflects the attribute only; does not take part in validation.         | `boolean` | `false` |
| `aria-label`      | Accessible name of the slider.                                         | `string`  | —       |
| `aria-labelledby` | IDs of one or more elements that provide the slider's accessible name. | `string`  | —       |
| `value`           | Current value.                                                         | `number`  | `0`     |
| `min`             | Minimum value.                                                         | `number`  | `0`     |
| `max`             | Maximum value.                                                         | `number`  | `100`   |
| `step`            | Step size.                                                             | `number`  | `1`     |

### Events

| Name     | Description                                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `input`  | Dispatched when the value changes; fires continuously during a drag.                                                       |
| `change` | Dispatched at the end of one value change: release after a drag, a click on the track, or each press of an adjustment key. |

### Methods

| Name      | Description                                     |
| --------- | ----------------------------------------------- |
| `focus()` | Focuses the track element with `role="slider"`. |
| `blur()`  | Blurs the track element.                        |

### Behavior

Supports ArrowLeft/Right/Up/Down, Home/End, and PageUp/PageDown keyboard navigation.

Uses pointer capture for mouse, stylus, and touch interaction; both the component host and the touch track declare `touch-action: none`, and while a drag is active the component also prevents the default scrolling of `touchmove`, so iOS Safari does not take over the gesture during a horizontal or vertical drag.

At rest the thumb is a full circle whose diameter is the thickness `--wui-slider-thumb-thickness`; while pressed or dragged it expands into a pill along the track direction, keeping its thickness and taking `--wui-slider-thumb-length` as the long edge.

A horizontal slider expands the thumb along the width and a vertical slider along the height, the same recipe as the switch thumb.

The shape switch is transitioned with `--wui-duration-press`.

### CSS Custom Properties

| Name                           | Description                                                     | Default |
| ------------------------------ | --------------------------------------------------------------- | ------- |
| `--wui-slider-width`           | Slider width                                                    | `200px` |
| `--wui-slider-vertical-height` | Vertical slider height                                          | `200px` |
| `--wui-slider-track-size`      | Track thickness                                                 | `6px`   |
| `--wui-slider-thumb-length`    | Long edge of the thumb in pressed/dragged state along the track | `24px`  |
| `--wui-slider-thumb-thickness` | Thumb thickness (diameter of the resting circle)                | `20px`  |
| `--wui-slider-marks-inset`     | Marks inset                                                     | `0`     |

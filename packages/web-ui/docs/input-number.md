---
component: input-number
tag: web-ui-input-number
---

Numeric input with a step button on each side, supporting `min` / `max` / `step` / `precision`; out-of-range and invalid input converge back to a valid value at the commit point.

## Samples

### Basic {#basic}

Without a `value`, the component holds the number itself, defaulting to `0`. `value` is always a number and has no empty state, so `placeholder` only appears when the content is cleared during editing: the inner control is bound to an editing draft, and only an empty draft lets the placeholder text show.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input-number></web-ui-input-number>
      <web-ui-input-number value={12}></web-ui-input-number>
      <web-ui-input-number placeholder="pcs" value={0}></web-ui-input-number>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-input-number></web-ui-input-number>
    <web-ui-input-number :value="12"></web-ui-input-number>
    <web-ui-input-number placeholder="pcs" :value="0"></web-ui-input-number>
  </div>
</template>
```

### Value range {#range}

`min` / `max` hold the value in range and `step` decides the step size. At an endpoint, the step button on that side disables itself; while editing you can type out-of-range text, and an out-of-range value is pulled back into range at the moment of commit.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input-number value={5} min={0} max={10}></web-ui-input-number>
      <web-ui-input-number value={20} min={0} max={100} step={5}></web-ui-input-number>
      <web-ui-input-number value={999} min={0} max={100}></web-ui-input-number>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-input-number :value="5" :min="0" :max="10"></web-ui-input-number>
    <web-ui-input-number :value="20" :min="0" :max="100" :step="5"></web-ui-input-number>
    <web-ui-input-number :value="999" :min="0" :max="100"></web-ui-input-number>
  </div>
</template>
```

### Decimal precision {#precision}

`precision` decides how many decimal places are kept when reading and committing; assignment does not erase the original decimals—the order of `value={1.5}` and `precision={1}` does not affect the result.

When not set explicitly, it is derived from the decimal places of `step`: with the default settings `step={0.3}` normalizes to 1 decimal place on each step; with an explicit `precision` the value is normalized to that, for example `precision={0}` rounds fractional step results to integers.

`step` itself does not degrade because of `precision`: with `precision={2}` the step is still `1`.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input-number value={1.5} precision={1} min={0} max={10}></web-ui-input-number>
      <web-ui-input-number value={0.01} precision={2} step={0.01} min={0} max={1}></web-ui-input-number>
      <web-ui-input-number value={2.345} precision={2}></web-ui-input-number>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-input-number :value="1.5" :precision="1" :min="0" :max="10"></web-ui-input-number>
    <web-ui-input-number :value="0.01" :precision="2" :step="0.01" :min="0" :max="1"></web-ui-input-number>
    <web-ui-input-number :value="2.345" :precision="2"></web-ui-input-number>
  </div>
</template>
```

### Controlled value and events {#events}

`value` is a controlled value; catch `input` for it to follow typing and stepping.

`input` fires on every keystroke and every step button click; `change` is dispatched only at commit points—the text blur commit and ArrowUp / ArrowDown—and not by clicking a step button.

Catch both, and the readout below will show the two rhythms separately.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [live, setLive] = useState(1)
  const [committed, setCommitted] = useState(1)

  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-input-number
        value={live}
        min={0}
        max={99}
        step={1}
        onInput={event => setLive(event.currentTarget.value)}
        onChange={event => setCommitted(event.currentTarget.value)}
      ></web-ui-input-number>
      <output className="text-sm text-(--wui-color-text-secondary)">
        Follows input: {live} · change, only at commit points: {committed}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-input-number
      :value="live"
      :min="0"
      :max="99"
      :step="1"
      @input="live = $event.currentTarget.value"
      @change="committed = $event.currentTarget.value"
    ></web-ui-input-number>
    <output class="text-sm text-(--wui-color-text-secondary)">
      Follows input: {{ live }} · change, only at commit points: {{ committed }}
    </output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const live = ref(1)
const committed = ref(1)
</script>
```

### Disabled and readonly {#states}

`disabled` turns off input and stepping, makes validation yield as well, and drops the whole host to forty percent opacity. `readonly` keeps reading and copying possible, but both step buttons are drawn in their disabled state, ArrowUp / ArrowDown do nothing, and a blur commit does not forward `change`.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input-number value={5} disabled></web-ui-input-number>
      <web-ui-input-number value={5} readonly></web-ui-input-number>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-input-number :value="5" disabled></web-ui-input-number>
    <web-ui-input-number :value="5" readonly></web-ui-input-number>
  </div>
</template>
```

### Form value {#form}

`name` is the field name and the submitted value is `String(value)`. `required` blocks submission when the content is cleared during editing (`valueMissing`), and `form.reset()` restores the initial value at mount. Keep an integer `step` for `input-number` inside forms, for the reason given in the behavior notes below.

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
        const fields: string[] = []
        for (const [name, value] of new FormData(event.currentTarget)) {
          if (typeof value === 'string') fields.push(`${name}=${value}`)
        }
        setSubmitted(fields.join(' · ') || '(no fields)')
      }}
    >
      <web-ui-input-number name="quantity" value={3} min={1} max={9} step={1} required></web-ui-input-number>
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
        {submitted === '' ? 'Not submitted yet' : submitted}
      </output>
    </form>
  )
}
```

```vue
<template>
  <form ref="form" class="flex flex-wrap items-center gap-4" @submit="onSubmit">
    <web-ui-input-number name="quantity" :value="3" :min="1" :max="9" :step="1" required></web-ui-input-number>
    <web-ui-button type="submit">Submit</web-ui-button>
    <web-ui-button @click="reset">Reset</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">
      {{ submitted === '' ? 'Not submitted yet' : submitted }}
    </output>
  </form>
</template>

<script setup lang="ts">
import { useTemplateRef, ref } from 'vue'

const submitted = ref('')
const form = useTemplateRef('form')

function onSubmit(event: Event) {
  event.preventDefault()
  const fields: string[] = []
  for (const [name, value] of new FormData(event.currentTarget as HTMLFormElement)) {
    if (typeof value === 'string') fields.push(`${name}=${value}`)
  }
  submitted.value = fields.join(' · ') || '(no fields)'
}

function reset() {
  form.value?.reset()
  submitted.value = ''
}
</script>
```

### CSS variables {#sizing}

The width comes from `--wui-input-width` (the same token as `<web-ui-input>`), and `input-number` has no `full` of its own; however narrow it gets, `--wui-control-size` still holds a minimum width.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input-number value={12} className="[--wui-input-width:280px]"></web-ui-input-number>
      <web-ui-input-number value={12} className="[--wui-input-width:120px]"></web-ui-input-number>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-input-number :value="12" class="[--wui-input-width:280px]"></web-ui-input-number>
    <web-ui-input-number :value="12" class="[--wui-input-width:120px]"></web-ui-input-number>
  </div>
</template>
```

## API

### Props

| Name              | Description                                                                                                              | Type             | Default    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------- | ---------- |
| `placeholder`     | Placeholder text; shown only when the content is cleared during editing.                                                 | `string`         | `''`       |
| `name`            | Form field name.                                                                                                         | `string`         | `''`       |
| `disabled`        | Disabled state.                                                                                                          | `boolean`        | `false`    |
| `readonly`        | Read-only state; the step buttons and the keyboard increment/decrement yield as well.                                    | `boolean`        | `false`    |
| `required`        | Required validation.                                                                                                     | `boolean`        | `false`    |
| `value`           | Current value, also the form submission value; an out-of-range write converges to a range endpoint.                      | `number`         | `0`        |
| `min`             | Minimum value.                                                                                                           | `number`         | `0`        |
| `max`             | Maximum value.                                                                                                           | `number`         | `Infinity` |
| `step`            | Step size; when `precision` is not set explicitly, its decimal places decide the default normalization precision.        | `number`         | `1`        |
| `precision`       | Normalizes to this value when set explicitly; when set to `null` or the attribute is removed, it is derived from `step`. | `number \| null` | `0`        |
| `aria-label`      | Accessible name of the input.                                                                                            | `string`         | —          |
| `aria-labelledby` | Accessible name reference, used to name the inner input.                                                                 | `string`         | —          |

### Events

| Name     | Description                                                                                                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `input`  | Fired on every keystroke and every step button click; the component has no clear button that could empty the value.           |
| `change` | Dispatched at commit points: the text blur commit and ArrowUp / ArrowDown. Clicking a step button does not dispatch this one. |

### Behavior

`value` has no empty state: it defaults to `0`, and both assignment and submission first converge through `min` / `max`, so writing `999` into `max=100` yields `100`.

Editing is another layer—the inner control is bound to a draft, and `1.`, an empty string, or non-numeric text only change the display, not `value`; on blur a valid draft is written back and committed, while an invalid or empty draft restores the last committed value and dispatches no `change`.

`precision` takes no part in assignment; it only happens at two points, reading (`get value`) and the step commit, so declaration order does not matter; `0.01` is not rounded to `0` ahead of time by the default settings.

When `precision` is not set explicitly, the normalization precision is derived from the decimal places of `step`, so fractional cases no longer have to write `step={0.01}` together with `precision`; once set explicitly the value is normalized to it, and `step` itself does not degrade.

The inconsistent event dispatch rhythm is the component's current state: `input` from text entry comes from the inner native control bubbling up, while `change` is dispatched once by the component on the host because the native `change` is not composed and cannot cross the shadow boundary; the step buttons dispatch only `input`, and ArrowUp / ArrowDown dispatch both `input` and `change`.

A controlled setup that listens only to `change` misses step button clicks.

Validation passes only `required` / `disabled` / `readonly` through to the inner control; `min` / `max` / `step` are not passed through.

As a result `valueMissing` works normally (required blocks submission after clearing), while `rangeUnderflow` / `rangeOverflow` basically never trigger—out-of-range values are clamped at commit time; and `stepMismatch` is judged against the native `number` control's default `step=1` with base `0`, so non-integer values risk being judged invalid and blocking submission.

For `input-number` inside a form, prefer an integer `step`; when decimals are needed, validate them yourself in the outer layer.

The component has no slot: `prefix` / `suffix` are capabilities of `<web-ui-input>` and `<web-ui-textarea>`, and child nodes written inside `input-number` are not rendered.

Nor is there any `focus()` / `blur()` / `select()` delegation: the host itself has no tab stop, so Tab enters the native control inside the shadow root, and calling these three methods on the host will not reach it.

The disabled state is driven by the `disabled` attribute on the host, and the focus state reflects to a `focused` attribute, which the focus ring follows.

### Layout

The host is inline-block.

The input area takes its width from `--wui-input-width` (`200px`), its minimum width and height from `--wui-control-size` (`36px`), and its radius from `--wui-radius-control` (pill), on the shared glass surface.

The two step buttons are native `<button class="num-btn">` elements inside the shadow root (not `<web-ui-button>`), 30×30, borderless with a transparent background, in the secondary text color, with hover and active going through the state layer tokens, and they enter their disabled state when `min` / `max` is reached or `readonly` is set.

The number is centered (`text-align: center`), and the native spinner is hidden, with the two buttons taking over increment and decrement.

The text takes `--wui-font-size`, clamped to no less than `16px` on coarse pointer devices to prevent iOS Safari from zooming the page on focus; the placeholder text takes the secondary text color.

### CSS Custom Properties

| Name                | Description                                                                               | Default |
| ------------------- | ----------------------------------------------------------------------------------------- | ------- |
| `--wui-input-width` | Input area width, sharing the same token as `<web-ui-input>`; there is no `full` variant. | `200px` |

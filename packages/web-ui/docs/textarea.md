# Textarea

A multiline text input with a clear button, autosize, and prefix/suffix slots; focus is delegated to the native textarea inside the shadow root.

## Samples

### Basic

`rows` sets the initial number of visible rows (3 by default), and `placeholder` is shown when the value is empty; when `input` is not handled, the component holds the content itself—to sync it from the page, write `value` and handle `input`, as in Controlled value and character count below.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <web-ui-textarea placeholder="Three rows by default"></web-ui-textarea>
      <web-ui-textarea rows={6} placeholder="Six rows tall"></web-ui-textarea>
      <web-ui-textarea aria-label="Filled multiline text" rows={3} value="Content already written"></web-ui-textarea>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <web-ui-textarea placeholder="Three rows by default"></web-ui-textarea>
    <web-ui-textarea :rows="6" placeholder="Six rows tall"></web-ui-textarea>
    <web-ui-textarea aria-label="Filled multiline text" :rows="3" value="Content already written"></web-ui-textarea>
  </div>
</template>
```

### Autosize

`autosize` makes the height follow the content: the component writes the height as an inline value and turns off the native resize handle at the same time, so the two sources of height never coexist.

`max-height` (px, `0` meaning no limit) is written separately into the inner control's inline style and takes effect whenever it is greater than 0, regardless of whether `autosize` is on: with autosize on it caps the automatic height and the box scrolls once the cap is reached; with autosize off it clamps the height produced by dragging the resize handle.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <web-ui-textarea
        autosize
        full
        placeholder="Type multiple lines; the height grows with the content"
      ></web-ui-textarea>
      <web-ui-textarea
        autosize
        full
        max-height={120}
        placeholder="Scrolls inside the box beyond 120px"
      ></web-ui-textarea>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <web-ui-textarea
      autosize
      full
      placeholder="Type multiple lines; the height grows with the content"
    ></web-ui-textarea>
    <web-ui-textarea
      autosize
      full
      :max-height="120"
      placeholder="Scrolls inside the box beyond 120px"
    ></web-ui-textarea>
  </div>
</template>
```

### Prefix and suffix

The `prefix` / `suffix` slots hold an icon or text and are top-aligned with the first line of text; without a visible label, use `aria-label` to provide the accessible name (see Behavior below for the limits of `aria-labelledby`).

```tsx
import { lucideFileText } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <web-ui-textarea aria-label="Notes" clearable placeholder="With a prefix icon">
        <web-ui-icon slot="prefix" icon={lucideFileText} size={16}></web-ui-icon>
      </web-ui-textarea>
      <web-ui-textarea aria-label="Feedback" clearable placeholder="Both prefix and suffix are text">
        <span slot="prefix">Notes: </span>
        <span slot="suffix">up to 200 characters</span>
      </web-ui-textarea>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <web-ui-textarea aria-label="Notes" clearable placeholder="With a prefix icon">
      <web-ui-icon slot="prefix" :icon="lucideFileText" :size="16"></web-ui-icon>
    </web-ui-textarea>
    <web-ui-textarea aria-label="Feedback" clearable placeholder="Both prefix and suffix are text">
      <span slot="prefix">Notes: </span>
      <span slot="suffix">up to 200 characters</span>
    </web-ui-textarea>
  </div>
</template>

<script setup lang="ts">
import { lucideFileText } from '@greypan/web-ui/icons'
</script>
```

### Controlled value and character count

`value` is the input value and also the form-submitted value; `input` is dispatched on every keystroke (including newlines), and `change` aligns with the inner native control and is forwarded once when the value has changed and the field loses focus. `maxlength` limits the length that can be typed, and the counter is computed by the page from `value`.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [value, setValue] = useState('')
  const [committed, setCommitted] = useState('')

  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-textarea
        full
        clearable
        rows={4}
        maxlength={20}
        value={value}
        placeholder="Up to 20 characters, commits on blur after typing"
        onInput={event => setValue(event.currentTarget.value)}
        onChange={event => setCommitted(event.currentTarget.value)}
      ></web-ui-textarea>
      <div className="flex items-center gap-3 text-sm text-(--wui-color-text-secondary)">
        <output>
          input: {value.length} / 20 · change: {committed ? `${committed.length} chars` : '(not committed)'}
        </output>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-textarea
      full
      clearable
      :rows="4"
      :maxlength="20"
      :value="value"
      placeholder="Up to 20 characters, commits on blur after typing"
      @input="value = $event.currentTarget.value"
      @change="committed = $event.currentTarget.value"
    ></web-ui-textarea>
    <div class="flex items-center gap-3 text-sm text-(--wui-color-text-secondary)">
      <output
        >input: {{ value.length }} / 20 · change:
        {{ committed ? `${committed.length} chars` : '(not committed)' }}</output
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const value = ref('')
const committed = ref('')
</script>
```

### Clear button

`clearable` draws the clear button only when there is a value and neither `disabled` nor `readonly` is set; an empty value, disabled, or readonly draws nothing. The clear button is aligned with the first line rather than centered vertically in the whole box; clicking it clears the value and dispatches `input`. `full` makes the control fill the parent's width, and `--wui-textarea-width` only takes effect when `full` is not set.

```tsx
export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-textarea
        full
        clearable
        aria-label="Clearable multiline text"
        value="This block can be cleared in one go"
      ></web-ui-textarea>
      <web-ui-textarea full clearable placeholder="No clear button when the value is empty"></web-ui-textarea>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-textarea
      full
      clearable
      aria-label="Clearable multiline text"
      value="This block can be cleared in one go"
    ></web-ui-textarea>
    <web-ui-textarea full clearable placeholder="No clear button when the value is empty"></web-ui-textarea>
  </div>
</template>
```

### Disabled and readonly

`disabled` turns off typing, validation, and clearing, and drops the whole host to forty percent opacity; `readonly` keeps the content readable, selectable, and copyable and still lets the user drag the bottom-right corner to change the height, but rejects input and hides the clear button.

```tsx
export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-textarea
        full
        disabled
        aria-label="Disabled multiline text"
        value="Disabled: readable, not editable"
      ></web-ui-textarea>
      <web-ui-textarea
        full
        readonly
        clearable
        aria-label="Readonly multiline text"
        value="Readonly: the clear button is hidden"
      ></web-ui-textarea>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-textarea
      full
      disabled
      aria-label="Disabled multiline text"
      value="Disabled: readable, not editable"
    ></web-ui-textarea>
    <web-ui-textarea
      full
      readonly
      clearable
      aria-label="Readonly multiline text"
      value="Readonly: the clear button is hidden"
    ></web-ui-textarea>
  </div>
</template>
```

### Borderless

`borderless` removes the border, background, blur, and glass ring, leaving only padding and the focus ring; the radius still comes from `--wui-radius-menu`. Use this form when an outer layer draws its own container.

```tsx
export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-textarea full borderless placeholder="Borderless input"></web-ui-textarea>
      <web-ui-textarea
        full
        borderless
        aria-label="Borderless multiline text"
        rows={4}
        value="Borderless with a value; the outer layer owns the container"
      ></web-ui-textarea>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-textarea full borderless placeholder="Borderless input"></web-ui-textarea>
    <web-ui-textarea
      full
      borderless
      aria-label="Borderless multiline text"
      :rows="4"
      value="Borderless with a value; the outer layer owns the container"
    ></web-ui-textarea>
  </div>
</template>
```

### Form value

`name` is the field name and the submitted value is the current content. `required` blocks submission when the field is empty (`valueMissing`), and `minlength` blocks it when the text is too short (`tooShort`); both checks are forwarded to the host `<form>` through ElementInternals.

```tsx
import { useRef, useState } from 'react'

export default function Demo() {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitted, setSubmitted] = useState('')

  return (
    <form
      ref={formRef}
      className="flex w-full flex-col items-start gap-3"
      onSubmit={event => {
        event.preventDefault()
        const fields: string[] = []
        for (const [name, value] of new FormData(event.currentTarget)) {
          if (typeof value === 'string') fields.push(`${name}=${value.replace(/\n/g, '\\n')}`)
        }
        setSubmitted(fields.join(' · ') || '(no fields)')
      }}
    >
      <web-ui-textarea
        name="notes"
        rows={3}
        required
        minlength={10}
        placeholder="Notes: required, at least 10 characters"
      ></web-ui-textarea>
      <div className="flex items-center gap-3">
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
      </div>
    </form>
  )
}
```

```vue
<template>
  <form ref="form" class="flex w-full flex-col items-start gap-3" @submit="onSubmit">
    <web-ui-textarea
      name="notes"
      :rows="3"
      required
      :minlength="10"
      placeholder="Notes: required, at least 10 characters"
    ></web-ui-textarea>
    <div class="flex items-center gap-3">
      <web-ui-button type="submit">Submit</web-ui-button>
      <web-ui-button @click="reset">Reset</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">{{
        submitted === '' ? 'Not submitted yet' : submitted
      }}</output>
    </div>
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
    if (typeof value === 'string') fields.push(`${name}=${value.replace(/\n/g, '\\n')}`)
  }
  submitted.value = fields.join(' · ') || '(no fields)'
}

function reset() {
  form.value?.reset()
  submitted.value = ''
}
</script>
```

### Focus and select all

`focus()` / `blur()` delegate to the native textarea inside the shadow root, and `select()` selects the current content; none of the three has any effect when `disabled`. The host itself has no tab stop, so pressing Tab always lands on the focus of the inner control.

```tsx
import type { WebUiTextarea } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiTextarea>(null)

  return (
    <div className="flex flex-col gap-3">
      <web-ui-textarea
        aria-label="Multiline text to select"
        ref={fieldRef}
        rows={3}
        value="Type directly to replace after selecting all"
      ></web-ui-textarea>
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button onClick={() => fieldRef.current?.focus()}>Focus</web-ui-button>
        <web-ui-button onClick={() => fieldRef.current?.select()}>Select all</web-ui-button>
        <web-ui-button onClick={() => fieldRef.current?.blur()}>Blur</web-ui-button>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <web-ui-textarea
      aria-label="Multiline text to select"
      ref="field"
      :rows="3"
      value="Type directly to replace after selecting all"
    ></web-ui-textarea>
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button @click="field?.focus()">Focus</web-ui-button>
      <web-ui-button @click="field?.select()">Select all</web-ui-button>
      <web-ui-button @click="field?.blur()">Blur</web-ui-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiTextarea } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const field = useTemplateRef<WebUiTextarea>('field')
</script>
```

### CSS variables

`--wui-textarea-width` sets the input area width (taken over by `100%` under `full`), and `--wui-textarea-clear-color` sets the clear button color.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <web-ui-textarea
        clearable
        aria-label="Wider multiline text"
        value="One step wider, clear color set to danger"
        className="[--wui-textarea-width:280px] [--wui-textarea-clear-color:var(--wui-color-danger)]"
      ></web-ui-textarea>
      <web-ui-textarea
        clearable
        aria-label="Narrower multiline text"
        value="One step narrower"
        className="[--wui-textarea-width:120px]"
      ></web-ui-textarea>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-start gap-3">
    <web-ui-textarea
      clearable
      aria-label="Wider multiline text"
      value="One step wider, clear color set to danger"
      class="[--wui-textarea-width:280px] [--wui-textarea-clear-color:var(--wui-color-danger)]"
    ></web-ui-textarea>
    <web-ui-textarea
      clearable
      aria-label="Narrower multiline text"
      value="One step narrower"
      class="[--wui-textarea-width:120px]"
    ></web-ui-textarea>
  </div>
</template>
```

## API

### Props

| Name               | Description                                                                                      | Type                  | Default |
| ------------------ | ------------------------------------------------------------------------------------------------ | --------------------- | ------- |
| `placeholder`      | Placeholder text.                                                                                | `string`              | `''`    |
| `name`             | Form field name.                                                                                 | `string`              | `''`    |
| `disabled`         | Disabled state.                                                                                  | `boolean`             | `false` |
| `readonly`         | Readonly state.                                                                                  | `boolean`             | `false` |
| `required`         | Required validation.                                                                             | `boolean`             | `false` |
| `full`             | Fills the parent's width.                                                                        | `boolean`             | `false` |
| `clearable`        | Shows the clear button when there is a value and neither `disabled` nor `readonly` is set.       | `boolean`             | `false` |
| `aria-clear-label` | Accessible name of the clear button; falls back to the built-in English copy (`Clear`).          | `string`              | `''`    |
| `borderless`       | Ghost form: removes the border, background, and shadow while keeping padding and the focus ring. | `boolean`             | `false` |
| `rows`             | Number of visible rows; also the starting point for autosize.                                    | `number`              | `3`     |
| `minlength`        | Minimum length validation.                                                                       | `number \| undefined` | —       |
| `maxlength`        | Maximum length validation.                                                                       | `number \| undefined` | —       |
| `autosize`         | Adjusts the height automatically and forces `resize: none`.                                      | `boolean`             | `false` |
| `max-height`       | Upper bound for the automatic height (px); 0 means no limit.                                     | `number`              | `0`     |
| `aria-label`       | Accessible label.                                                                                | `string \| null`      | `null`  |
| `aria-labelledby`  | Accessible label reference.                                                                      | `string \| undefined` | —       |
| `value`            | Input value, also the form-submitted value.                                                      | `string`              | `''`    |

### Events

| Name     | Description                                                                              |
| -------- | ---------------------------------------------------------------------------------------- |
| `input`  | Dispatched on every input.                                                               |
| `change` | Forwarded once by the inner native control when the value has changed and focus is lost. |
| `focus`  | The inner native control's `focus`, composed but not bubbling: capture on the host.      |
| `blur`   | The inner native control's `blur`, on the same path as `focus`.                          |

### Slots

| Name     | Description                                                                     |
| -------- | ------------------------------------------------------------------------------- |
| `prefix` | Icon or text to the left of the textarea, aligned with the first line.          |
| `suffix` | Icon or text to the right of the textarea; the clear button is drawn before it. |

### Methods

| Name              | Description                                                                            |
| ----------------- | -------------------------------------------------------------------------------------- |
| `focus(options?)` | Focuses the native textarea inside the shadow root; no effect when `disabled`.         |
| `blur()`          | Blurs the native textarea inside the shadow root.                                      |
| `select()`        | Selects the current value; no effect when `disabled`, still available when `readonly`. |

### Behavior

The host is not focusable and has no tab stop: both Tab and clicks hand focus to the native textarea inside the shadow root, and the component reflects the focus state as a `focused` attribute on the host, which drives the focus ring.

The inner control's `input` already bubbles and is composed; `change` is not composed, so the component re-dispatches a `composed` `change` on the host.

The clear button dispatches only `input`, not `change`—this differs from `<web-ui-input>`, so consumers that only listen to `change` do not receive this clearing.

`autosize` owns the height exclusively: it writes the height as an inline value and therefore turns off the native resize handle, so that the next content change after a drag does not pull the box back.

The height is recomputed whenever the value changes and whenever `rows` changes, without relying on a `ResizeObserver` callback, so the same control switching between long and short copy in its outer layout never keeps a stale height.

`max-height` is written as an inline style and clamps the inner control independently of `autosize`: with autosize on it caps the automatic height and the box scrolls once the cap is reached; with autosize off it clamps the height produced by dragging. `0` means no limit.

The `required` / `minlength` / `maxlength` checks (`valueMissing` / `tooShort` / `tooLong`) are forwarded to the host `<form>` through ElementInternals; `disabled` and form-level disabling make validation back off along with everything else.

`readonly` also makes validation back off: per the HTML specification, a readonly native control is barred from constraint validation, so the forwarded state is always clean and an empty `required readonly` value does not block submission.

`form.reset()` restores the value from mount time.

The only accessible name that works is `aria-label`: it is forwarded to the native `<textarea>` inside the shadow root together with `aria-labelledby`, but `aria-labelledby` is an IDREF that only resolves inside the same shadow tree and cannot reach the light DOM, so a reference to an element outside the host yields no name.

The component does not expose the inner control's id either, so an outer `<label for>` cannot connect to it (the host is not a labelable element).

To give the control a name, write `aria-label`: the visible text in the `prefix` slot lands on the container, not inside the native `<textarea>` box, and does not become its name.

### Layout

The host is a block box; the input area width comes from `--wui-textarea-width` (`200px`), and `full` changes it to `100%`. The container wraps its content, its minimum height comes from `--wui-control-size` (`36px`), its radius from `--wui-radius-menu` (`18px`), and its surface from the shared glass surface; `borderless` removes the ring along with it.

When `autosize` is off, the native resize handle is available (`resize: vertical`).

Text takes `--wui-font-size` and line height `--wui-line-height-normal`, with the font size clamped to no less than `16px` on coarse-pointer devices so that iOS Safari does not zoom the page on focus. Placeholder text and slot content take the secondary text color.

The clear button reuses the icon ghost form of `<web-ui-button>`, offsets the container's `gap` and its own padding with negative margins, and aligns to the center of the first line—the container is top-aligned, which keeps it against the first line even in a multiline box.

### CSS Custom Properties

| Name                         | Description                                                | Default                          |
| ---------------------------- | ---------------------------------------------------------- | -------------------------------- |
| `--wui-textarea-width`       | Input area width; taken over by `100%` when `full` is set. | `200px`                          |
| `--wui-textarea-clear-color` | Clear button color.                                        | `var(--wui-color-text-tertiary)` |

# Input

A text input with a clear button and prefix/suffix slots that integrates with the native `<form>`. The host itself is not focusable, so focus lands on the native input; `focus()` / `blur()` / `select()` act on it.

## Samples

### Basic

`placeholder` is shown only when the value is empty, and `value` is both the displayed value and the value submitted with the form. When `input` is not handled, the component holds the typed content itself. To sync the value from the page, write `value` and handle `input`, as in Controlled value and events below.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input placeholder="Enter a nickname"></web-ui-input>
      <web-ui-input aria-label="Filled nickname" value="web-ui"></web-ui-input>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-input placeholder="Enter a nickname"></web-ui-input>
    <web-ui-input aria-label="Filled nickname" value="web-ui"></web-ui-input>
  </div>
</template>
```

### Input types

`type` is forwarded as-is to the native input, and masking and format validation both come from the native type: `password` masks the content, and `email` validates the format on form submit.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input type="text" placeholder="Text"></web-ui-input>
      <web-ui-input type="password" placeholder="Password"></web-ui-input>
      <web-ui-input type="email" placeholder="Email"></web-ui-input>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-input type="text" placeholder="Text"></web-ui-input>
    <web-ui-input type="password" placeholder="Password"></web-ui-input>
    <web-ui-input type="email" placeholder="Email"></web-ui-input>
  </div>
</template>
```

### Prefix and suffix

The `prefix` / `suffix` slots place an icon or text on either side of the input area; a side with no assigned nodes collapses entirely and leaves no `gap`. An input with no visible label uses `aria-label` to provide the accessible name.

```tsx
import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input aria-label="Search" clearable placeholder="Search components">
        <web-ui-icon slot="prefix" icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-input>
      <web-ui-input aria-label="Website" value="web-ui">
        <span slot="prefix">www.</span>
        <span slot="suffix">.com</span>
      </web-ui-input>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-input aria-label="Search" clearable placeholder="Search components">
      <web-ui-icon slot="prefix" :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-input>
    <web-ui-input aria-label="Website" value="web-ui">
      <span slot="prefix">www.</span>
      <span slot="suffix">.com</span>
    </web-ui-input>
  </div>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### Clear button

`clearable` draws the clear button only when there is a value and neither `disabled` nor `readonly` is set; an empty value, disabled, or readonly draws nothing. Clicking the clear button clears the value and dispatches both `input` and `change`. Clearing is a committed discrete change rather than continuous typing, so code that listens only to `change` receives it too. `full` makes the control fill the parent's width.

```tsx
export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-input full clearable aria-label="Clearable value" value="web-ui"></web-ui-input>
      <web-ui-input full clearable placeholder="No content yet, so there is no clear button"></web-ui-input>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-input full clearable aria-label="Clearable value" value="web-ui"></web-ui-input>
    <web-ui-input full clearable placeholder="No content yet, so there is no clear button"></web-ui-input>
  </div>
</template>
```

### Disabled and readonly

`disabled` turns off typing, validation, and clearing, and drops the whole host to 40% opacity. `readonly` keeps the content readable, selectable, and copyable but rejects input and hides the clear button. Clearing would change the value, which conflicts with readonly semantics.

```tsx
import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input disabled placeholder="Disabled"></web-ui-input>
      <web-ui-input disabled aria-label="Disabled input with a value" value="Disabled with a value"></web-ui-input>
      <web-ui-input readonly clearable aria-label="Readonly input" value="Readonly: can select and copy, cannot edit">
        <web-ui-icon slot="prefix" icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-input>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-input disabled placeholder="Disabled"></web-ui-input>
    <web-ui-input disabled aria-label="Disabled input with a value" value="Disabled with a value"></web-ui-input>
    <web-ui-input readonly clearable aria-label="Readonly input" value="Readonly: can select and copy, cannot edit">
      <web-ui-icon slot="prefix" :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-input>
  </div>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### Borderless

`borderless` removes the border, background, backdrop blur, shadow, and glass ring, leaving only padding and the focus ring, for an outer container to draw its own; the input area width still comes from `--wui-input-width`.

```tsx
import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input borderless placeholder="Borderless input"></web-ui-input>
      <web-ui-input
        borderless
        aria-label="Borderless input with a value"
        value="Borderless with a value"
      ></web-ui-input>
      <web-ui-input borderless aria-label="Search" placeholder="Borderless with an icon">
        <web-ui-icon slot="prefix" icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-input>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-input borderless placeholder="Borderless input"></web-ui-input>
    <web-ui-input borderless aria-label="Borderless input with a value" value="Borderless with a value"></web-ui-input>
    <web-ui-input borderless aria-label="Search" placeholder="Borderless with an icon">
      <web-ui-icon slot="prefix" :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-input>
  </div>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### Controlled value and events

`input` is dispatched on every keystroke; `change` aligns with the inner native control and is forwarded once when the value has changed and the field loses focus. Both carry only the event itself; read the host's `value` for the value.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [value, setValue] = useState('')
  const [committed, setCommitted] = useState('')

  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-input
        full
        clearable
        value={value}
        placeholder="Commits on blur after typing"
        onInput={event => setValue(event.currentTarget.value)}
        onChange={event => setCommitted(event.currentTarget.value)}
      ></web-ui-input>
      <output className="text-sm text-(--wui-color-text-secondary)">
        input: {value || '(empty)'} / change: {committed || '(not committed)'}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-input
      full
      clearable
      :value="value"
      placeholder="Commits on blur after typing"
      @input="value = $event.currentTarget.value"
      @change="committed = $event.currentTarget.value"
    ></web-ui-input>
    <output class="text-sm text-(--wui-color-text-secondary)">
      input: {{ value || '(empty)' }} / change: {{ committed || '(not committed)' }}
    </output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const value = ref('')
const committed = ref('')
</script>
```

### Form value

`name` is the field name and the submitted value is the current content; `required` blocks native submission when the field is empty (`valueMissing`), and a malformed `type="email"` value blocks it as well (`typeMismatch`). Validation is handled by the native `<form>`, and the bubble points at this control.

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
          if (typeof value === 'string') fields.push(`${name}=${value}`)
        }
        setSubmitted(fields.join(' · ') || '(no fields)')
      }}
    >
      <web-ui-input name="nickname" required placeholder="Nickname (required)"></web-ui-input>
      <web-ui-input
        name="email"
        type="email"
        placeholder="Email (optional, but must be well-formed if filled)"
      ></web-ui-input>
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
    <web-ui-input name="nickname" required placeholder="Nickname (required)"></web-ui-input>
    <web-ui-input
      name="email"
      type="email"
      placeholder="Email (optional, but must be well-formed if filled)"
    ></web-ui-input>
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

### Focus and select all

`focus()` / `blur()` / `select()` act on the native input; `focus()` and `select()` have no effect when `disabled`, while `blur()` has no such guard.

The host itself has no tab stop, so pressing Tab lands on the native input.

```tsx
import type { WebUiInput } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiInput>(null)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input aria-label="Input to focus" ref={fieldRef} value="Hand focus to it"></web-ui-input>
      <web-ui-button onClick={() => fieldRef.current?.focus()}>Focus</web-ui-button>
      <web-ui-button onClick={() => fieldRef.current?.select()}>Select all</web-ui-button>
      <web-ui-button onClick={() => fieldRef.current?.blur()}>Blur</web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-input aria-label="Input to focus" ref="field" value="Hand focus to it"></web-ui-input>
    <web-ui-button @click="field?.focus()">Focus</web-ui-button>
    <web-ui-button @click="field?.select()">Select all</web-ui-button>
    <web-ui-button @click="field?.blur()">Blur</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import type { WebUiInput } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const field = useTemplateRef<WebUiInput>('field')
</script>
```

### CSS variables

`--wui-input-width` sets the input area width (taken over by 100% under `full`), and `--wui-input-clear-color` sets the clear button color, which defaults to the tertiary text color.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input
        clearable
        aria-label="Wider input"
        value="One step wider, clear color set to danger"
        className="[--wui-input-width:280px] [--wui-input-clear-color:var(--wui-color-danger)]"
      ></web-ui-input>
      <web-ui-input
        clearable
        aria-label="Narrower input"
        value="One step narrower"
        className="[--wui-input-width:120px]"
      ></web-ui-input>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-input
      clearable
      aria-label="Wider input"
      value="One step wider, clear color set to danger"
      class="[--wui-input-width:280px] [--wui-input-clear-color:var(--wui-color-danger)]"
    ></web-ui-input>
    <web-ui-input
      clearable
      aria-label="Narrower input"
      value="One step narrower"
      class="[--wui-input-width:120px]"
    ></web-ui-input>
  </div>
</template>
```

## API

### Props

| Name               | Description                                                                                                     | Type             | Default  |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | ---------------- | -------- |
| `type`             | HTML input type, forwarded to the native input inside.                                                          | `string`         | `'text'` |
| `placeholder`      | Placeholder text.                                                                                               | `string`         | `''`     |
| `name`             | Form field name.                                                                                                | `string`         | `''`     |
| `disabled`         | Disabled state.                                                                                                 | `boolean`        | `false`  |
| `readonly`         | Readonly state.                                                                                                 | `boolean`        | `false`  |
| `required`         | Required validation.                                                                                            | `boolean`        | `false`  |
| `clearable`        | Shows the clear button when there is a value and neither `disabled` nor `readonly` is set.                      | `boolean`        | `false`  |
| `aria-clear-label` | Accessible name of the clear button; falls back to the built-in English copy (`Clear`).                         | `string`         | `''`     |
| `full`             | Fills the parent's width.                                                                                       | `boolean`        | `false`  |
| `borderless`       | Ghost form: removes the border, background, backdrop blur, and shadow while keeping padding and the focus ring. | `boolean`        | `false`  |
| `aria-label`       | Accessible label.                                                                                               | `string \| null` | `null`   |
| `value`            | Input value, also the form-submitted value.                                                                     | `string`         | `''`     |

### Events

| Name     | Description                                                                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `input`  | Dispatched on every input; also dispatched together when the clear button empties the value.                                                               |
| `change` | Forwarded once by the inner native control when the value has changed and focus is lost; also dispatched together when the clear button empties the value. |
| `focus`  | The inner native control's `focus`, composed but not bubbling: listen on the host in the capture phase.                                                    |
| `blur`   | The inner native control's `blur`, on the same path as `focus`.                                                                                            |

### Slots

| Name     | Description                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------ |
| `prefix` | Icon or text to the left of the input area; an empty slot collapses entirely and takes no space. |
| `suffix` | Icon or text to the right of the input area; the clear button is drawn before it.                |

### Methods

| Name              | Description                                                                            |
| ----------------- | -------------------------------------------------------------------------------------- |
| `focus(options?)` | Focuses the inner native input; no effect when `disabled`.                             |
| `blur()`          | Blurs the inner native input.                                                          |
| `select()`        | Selects the current value; no effect when `disabled`, still available when `readonly`. |

### Behavior

The host is not focusable and has no tab stop: both Tab and clicks hand focus to the inner native input, and the `focused` attribute tracks the focus state and drives the focus ring. `focus()` / `blur()` / `select()` act on it.

`input` bubbles and is composed, so the host receives it directly; `change` is re-dispatched by the component as a `composed` event on the host.

The clear button triggers the same discrete change, dispatching `input` and `change` together, so code that only listens to `change`, such as `v-model.lazy`, do not miss the clearing.

`disabled` and form-level disabling (an ancestor `<fieldset disabled>`) both withdraw typing and validation: the `required` and `type="email"` checks (`valueMissing` / `typeMismatch`) are handled by the host `<form>`, and do not block submission while disabled.

`readonly` withdraws validation as well: an empty `required readonly` value does not block submission.

`form.reset()` restores the value from mount time.

### Layout

The host is inline-block; with `full` it fills the parent. The input area takes its height from `--wui-control-size` (`36px`) and its radius from `--wui-radius-control` (pill); `borderless` removes the border, background, backdrop blur, shadow, and ring.

Text takes `--wui-font-size`, at least `16px` on coarse-pointer devices so that iOS Safari does not zoom the page on focus.

Placeholder text and slot content take the secondary text color.

A side whose slot has no assigned nodes leaves no `gap`; assigning a node that is itself `display: none` still counts as "has content", and the `gap` stays.

The clear button appears only when there is a value and neither `disabled` nor `readonly` is set, and sits against the input text.

### CSS Custom Properties

| Name                      | Description                                                | Default                          |
| ------------------------- | ---------------------------------------------------------- | -------------------------------- |
| `--wui-input-width`       | Input area width; taken over by `100%` when `full` is set. | `200px`                          |
| `--wui-input-clear-color` | Clear button color.                                        | `var(--wui-color-text-tertiary)` |

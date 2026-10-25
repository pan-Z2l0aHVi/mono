---
component: radio
tag: web-ui-radio
---

A single radio button that shares the selection-control box contract with `<web-ui-checkbox>`; `<web-ui-radio-group>` is responsible for keeping a single selection across a set of options.

## Samples

### Basic {#basic}

The default slot is the label text. A radio control only ever selects and stays selected; clicking an already selected item does not deselect it. When used standalone, the page therefore owns the value and writes `checked` as a comparison result.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [plan, setPlan] = useState('basic')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-radio checked={plan === 'basic'} onChange={() => setPlan('basic')}>
        Basic
      </web-ui-radio>
      <web-ui-radio checked={plan === 'pro'} onChange={() => setPlan('pro')}>
        Pro
      </web-ui-radio>
      <output className="text-sm text-(--wui-color-text-secondary)">Current plan: {plan}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-radio :checked="plan === 'basic'" @change="plan = 'basic'">Basic</web-ui-radio>
    <web-ui-radio :checked="plan === 'pro'" @change="plan = 'pro'">Pro</web-ui-radio>
    <output class="text-sm text-(--wui-color-text-secondary)">Current plan: {{ plan }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const plan = ref('basic')
</script>
```

### Disabled {#disabled}

`disabled` turns off interaction: an already selected item stays selected, pressing it changes nothing, and validation steps aside; group-level disabling is written on `<web-ui-radio-group>`, see the radio group docs.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-radio checked disabled>
        Enterprise (selected, disabled)
      </web-ui-radio>
      <web-ui-radio disabled>Ultimate (disabled)</web-ui-radio>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-radio :checked="true" disabled>Enterprise (selected, disabled)</web-ui-radio>
    <web-ui-radio disabled>Ultimate (disabled)</web-ui-radio>
  </div>
</template>
```

### Form value {#form}

The selected item enters `FormData` with `name` as the field name and `value` as the value, while unselected ones do not. When `value` is left empty, `'on'` is submitted. When two items with the same name exist independently, whichever is clicked is the one submitted, so keeping a single selection is the page's job—use `<web-ui-radio-group>` to let the component do it.

```tsx
import { useRef, useState } from 'react'

export default function Demo() {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitted, setSubmitted] = useState('')
  const [size, setSize] = useState('m')

  return (
    <form
      ref={formRef}
      className="flex flex-col items-start gap-3"
      onSubmit={event => {
        event.preventDefault()
        const fields: string[] = []
        for (const [name, value] of new FormData(event.currentTarget)) {
          if (typeof value === 'string') fields.push(`${name}=${value}`)
        }
        setSubmitted(fields.join(' · '))
      }}
    >
      <web-ui-radio name="size" value="s" checked={size === 's'} onChange={() => setSize('s')}>
        Small
      </web-ui-radio>
      <web-ui-radio name="size" value="m" checked={size === 'm'} onChange={() => setSize('m')}>
        Medium
      </web-ui-radio>
      <web-ui-radio name="size" value="l" checked={size === 'l'} onChange={() => setSize('l')}>
        Large
      </web-ui-radio>
      <div className="flex items-center gap-3">
        <web-ui-button type="submit">Submit</web-ui-button>
        <web-ui-button
          onClick={() => {
            formRef.current?.reset()
            setSubmitted('')
            setSize('m')
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
  <form ref="form" class="flex flex-col items-start gap-3" @submit="onSubmit">
    <web-ui-radio name="size" value="s" :checked="size === 's'" @change="size = 's'">Small</web-ui-radio>
    <web-ui-radio name="size" value="m" :checked="size === 'm'" @change="size = 'm'">Medium</web-ui-radio>
    <web-ui-radio name="size" value="l" :checked="size === 'l'" @change="size = 'l'">Large</web-ui-radio>
    <div class="flex items-center gap-3">
      <web-ui-button type="submit">Submit</web-ui-button>
      <web-ui-button @click="reset">Reset</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">
        {{ submitted === '' ? 'Not submitted yet' : submitted }}
      </output>
    </div>
  </form>
</template>

<script setup lang="ts">
import { useTemplateRef, ref } from 'vue'

const submitted = ref('')
const size = ref('m')
const form = useTemplateRef('form')

function onSubmit(event: Event) {
  event.preventDefault()
  const fields: string[] = []
  for (const [name, value] of new FormData(event.currentTarget as HTMLFormElement)) {
    if (typeof value === 'string') fields.push(`${name}=${value}`)
  }
  submitted.value = fields.join(' · ')
}

function reset() {
  form.value?.reset()
  submitted.value = ''
  size.value = 'm'
}
</script>
```

## API

### Props

| Name       | Description                         | Type      | Default |
| ---------- | ----------------------------------- | --------- | ------- |
| `checked`  | Selected state.                     | `boolean` | `false` |
| `value`    | Form value submitted when selected. | `string`  | `''`    |
| `name`     | Form field name.                    | `string`  | `''`    |
| `disabled` | Disabled state.                     | `boolean` | `false` |
| `required` | Required validation.                | `boolean` | `false` |

### Events

| Name     | Description                                                                                                      |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| `input`  | Dispatched when the user picks this item: a click, or Enter / Space; not dispatched when it is already selected. |
| `change` | Dispatched together with `input` in the same user interaction.                                                   |

### Slots

| Name      | Description                                                                    |
| --------- | ------------------------------------------------------------------------------ |
| `default` | Label text; when empty, the gap between the indicator and the label collapses. |

### Behavior

An interactive `<span>` inside the Shadow DOM declares `role="radio"` and mirrors `aria-checked`, `aria-disabled`, and `tabindex`. Enter/Space toggles it from the keyboard.

A click only marks this item as selected; it does not deselect itself, nor its siblings. Single selection on a page is maintained by host state or by `<web-ui-radio-group>`.

`required` blocks native submission while unselected (`valueMissing`); members inside a group hand that decision to the group.

The `input` / `change` dispatched by a member inside a group do not bubble and do not cross the shadow boundary; the group dispatches the event once on the host.

### Layout

Shares the same selection-control box contract with `<web-ui-checkbox>`, including collapsing the gap when the label draws nothing—the host height is opened by its content and does not inherit the page line height, the indicator takes its width and height from `--wui-selection-control-size`, and it aligns with adjacent text via `vertical-align: middle`.

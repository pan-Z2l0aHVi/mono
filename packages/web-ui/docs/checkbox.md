# Checkbox

A single checkbox that toggles with Enter / Space. It integrates with a native `<form>` and submits `value` into `FormData` when checked.

## Samples

### Basic

`checked` is the control state and the default slot is the label text; the indicator, the gap, and the label on the right are all part of the trigger area, so a click anywhere counts as one toggle.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [channels, setChannels] = useState(['email'])

  function toggle(channel: string) {
    setChannels(current =>
      current.includes(channel) ? current.filter(item => item !== channel) : [...current, channel]
    )
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-checkbox checked={channels.includes('email')} onChange={() => toggle('email')}>
        Email notifications
      </web-ui-checkbox>
      <web-ui-checkbox checked={channels.includes('sms')} onChange={() => toggle('sms')}>
        SMS notifications
      </web-ui-checkbox>
      <output className="text-sm text-(--wui-color-text-secondary)">
        Selected: {channels.join(', ') || 'nothing selected yet'}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-checkbox :checked="channels.includes('email')" @change="toggle('email')">
      Email notifications
    </web-ui-checkbox>
    <web-ui-checkbox :checked="channels.includes('sms')" @change="toggle('sms')">SMS notifications</web-ui-checkbox>
    <output class="text-sm text-(--wui-color-text-secondary)"
      >Selected: {{ channels.join(', ') || 'nothing selected yet' }}</output
    >
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const channels = ref(['email'])

function toggle(channel: string) {
  channels.value = channels.value.includes(channel)
    ? channels.value.filter(item => item !== channel)
    : [...channels.value, channel]
}
</script>
```

### Disabled

`disabled` turns interaction off: pressing does nothing and validation is skipped; group-level disabling goes on `<web-ui-checkbox-group>`, see the checkbox group below.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-checkbox checked disabled>
        Email notifications (checked, disabled)
      </web-ui-checkbox>
      <web-ui-checkbox disabled>SMS notifications (disabled)</web-ui-checkbox>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-checkbox :checked="true" disabled>Email notifications (checked, disabled)</web-ui-checkbox>
    <web-ui-checkbox disabled>SMS notifications (disabled)</web-ui-checkbox>
  </div>
</template>
```

### Form value

`name` is the field name and `value` is the value submitted when checked: several checkboxes can share one field name, each checked item contributes its own `FormData` entry, and unchecked ones stay out of the form. `required` lets native validation block submission while the box is unchecked.

```tsx
import { useRef, useState } from 'react'

export default function Demo() {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitted, setSubmitted] = useState('')

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
      <web-ui-checkbox name="channel" value="email">
        Email
      </web-ui-checkbox>
      <web-ui-checkbox name="channel" value="sms">
        SMS
      </web-ui-checkbox>
      <web-ui-checkbox name="agreement" value="yes" required>
        I have read and agree to the terms of service
      </web-ui-checkbox>
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
  <form ref="form" class="flex flex-col items-start gap-3" @submit="onSubmit">
    <web-ui-checkbox name="channel" value="email">Email</web-ui-checkbox>
    <web-ui-checkbox name="channel" value="sms">SMS</web-ui-checkbox>
    <web-ui-checkbox name="agreement" value="yes" required>
      I have read and agree to the terms of service
    </web-ui-checkbox>
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
}
</script>
```

To collapse several independent checkboxes into one `string[]`, with the group dispatching events and submission centrally, use `<web-ui-checkbox-group>`, see the checkbox group below.

## API

### Props

| Name       | Description                        | Type      | Default |
| ---------- | ---------------------------------- | --------- | ------- |
| `checked`  | Checked state.                     | `boolean` | `false` |
| `value`    | Form value submitted when checked. | `string`  | `''`    |
| `name`     | Form field name.                   | `string`  | `''`    |
| `disabled` | Disabled state.                    | `boolean` | `false` |
| `required` | Required validation.               | `boolean` | `false` |

### Events

| Name     | Description                                                               |
| -------- | ------------------------------------------------------------------------- |
| `input`  | Fired when the user toggles the checked state: a click, or Enter / Space. |
| `change` | Dispatched together with `input` in the same user action.                 |

### Slots

| Name      | Description                                                                     |
| --------- | ------------------------------------------------------------------------------- |
| `default` | Label text; when empty, the gap between the indicator and the label is removed. |

### Behavior

The interactive `<span>` inside the shadow root declares `role="checkbox"` and keeps `aria-checked`, `aria-disabled`, and `tabindex` in sync. Enter/Space toggles it from the keyboard.

Unchecked items are not written into `FormData`; `getFormValue` falls back to `'on'` when `value` is empty, matching a native checkbox.

The `input` / `change` dispatched by group members (direct children of `<web-ui-checkbox-group>`) do not bubble and do not cross the shadow boundary; the group dispatches the events once on its host, so outside the host there is one set of events rather than one per member.

### Layout

The host is an inline-flex box whose height is set by its content and does not inherit the page line height, so no extra gap appears above or below the indicator; `--wui-selection-control-size` (`18px`) sets the indicator width and height, and alignment with adjacent text is fixed at `vertical-align: middle`.

`<web-ui-radio>` shares this same contract.

The 10px between the indicator and the label belongs to the label: when the default slot draws nothing (it is empty, or holds only a visually hidden accessible name such as an `.sr-only` span), that gap is removed too and the host becomes as wide as the indicator.

Emptiness is judged by the rendered width of the label box rather than by whether nodes are assigned to the slot—an accessible name is exactly the "assigned, but draws no box" case; nor can the label be removed with `display: none`, since that would take the name out of the accessibility tree.

### Check animation

The check mark is a stroke asset from `@/icons`, rendered by a nested `<web-ui-icon>` inside `<web-ui-svg-draw-lines>` with `no-autoplay`, so a control that is already checked at mount shows a static check.

On check, the line is drawn from the left tip at a constant stroke speed, with a duration taken from `--wui-duration-trigger` (160ms by default) resolved from the effective theme at the moment of the toggle, landing on the same beat as the indicator background transition; on uncheck it retracts along the same path back to empty rather than merely fading out; under a theme scope with `motion="reduced"` both are skipped and the two states switch directly.

The stroke color is `--wui-color-on-control`, passed down through `<web-ui-icon>`'s `--wui-icon-color`, because once checked the background behind it is `--wui-color-accent`.

This structure brings two constraints: the asset must stay stroked (`fill: none` + `stroke: currentColor`), because a filled icon still runs the dash animation but draws nothing, so the check appears directly; and it renders at the `<web-ui-icon>` default of 18px, since the host cannot reach the `<svg>` inside the icon's shadow root, so it does not grow with `--wui-selection-control-size`.

### Inactive state

The unchecked indicator takes its background from `--wui-color-surface-control` (the same control surface as the neutral button), which stays distinguishable from `--wui-color-page` in dark mode too.

When any part of the trigger area (the indicator, the gap, or the slot label on the right) is hovered, a 6% state layer is overlaid on that background.

Hover applies only on devices matching `(hover: hover) and (pointer: fine)`; there is no pressed state, and the checked and disabled states keep their own backgrounds.

`<web-ui-radio>` shares this same set of states.

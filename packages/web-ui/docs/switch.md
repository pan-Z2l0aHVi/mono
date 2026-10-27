---
component: switch
tag: web-ui-switch
---

Switch, declaring `role="switch"` and `aria-checked`; a click toggles it immediately, and holding the track to drag horizontally or flicking it also sets the value, with both Space and Enter toggling from the keyboard.

Text children of the default slot become the visible label and the default accessible name; `aria-label` or `aria-labelledby` can also be set on the host.

## Samples

### Basic

`checked` is the on/off state. Text written inside `<web-ui-switch>` renders as the visible label next to the switch (see Slots); when you do not want a visible label, keep the label outside the host. When the page owns this value, catch `change` and write it back to `checked`.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [enabled, setEnabled] = useState(false)

  return (
    <div className="flex items-center gap-3">
      <web-ui-switch checked={enabled} onChange={event => setEnabled(event.currentTarget.checked)}></web-ui-switch>
      <span className="text-sm text-(--wui-color-text-secondary)">{enabled ? 'On' : 'Off'}</span>
    </div>
  )
}
```

```vue
<template>
  <div class="flex items-center gap-3">
    <web-ui-switch :checked="enabled" @change="onChange"></web-ui-switch>
    <span class="text-sm text-(--wui-color-text-secondary)">{{ enabled ? 'On' : 'Off' }}</span>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiSwitch } from '@greypan/web-ui'
import { ref } from 'vue'

const enabled = ref(false)

function onChange(event: WebUiEvent<WebUiSwitch, 'change'>) {
  enabled.value = event.currentTarget.checked
}
</script>
```

### Disabled and loading

`disabled` and `loading` both block interaction and both use the same disabled appearance.

The difference is in semantics and visuals, and also in validation: `loading` draws a spinning icon in the thumb to say the result is undecided while `checked` stays put, suiting a "submitting" wait; the `required` check honors only `disabled` (including form-level disabling), so while `loading` an unchecked switch still reports `valueMissing` and blocks submission.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <web-ui-switch checked disabled></web-ui-switch>
        <span className="text-sm text-(--wui-color-text-secondary)">disabled: on, but cannot be changed</span>
      </div>
      <div className="flex items-center gap-3">
        <web-ui-switch checked loading></web-ui-switch>
        <span className="text-sm text-(--wui-color-text-secondary)">
          loading: keeps the current value while waiting
        </span>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-3">
      <web-ui-switch checked disabled></web-ui-switch>
      <span class="text-sm text-(--wui-color-text-secondary)">disabled: on, but cannot be changed</span>
    </div>
    <div class="flex items-center gap-3">
      <web-ui-switch checked loading></web-ui-switch>
      <span class="text-sm text-(--wui-color-text-secondary)">loading: keeps the current value while waiting</span>
    </div>
  </div>
</template>
```

### Event timing

Events are dispatched only after user action: a click, Enter, and Space all make the component dispatch both `input` and `change`. Writing `checked` programmatically dispatches neither—that is exactly the path the button below takes.

```tsx
import type { WebUiSwitch } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiSwitch>(null)
  const [inputs, setInputs] = useState(0)
  const [changes, setChanges] = useState(0)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-switch
        ref={fieldRef}
        onInput={() => setInputs(count => count + 1)}
        onChange={() => setChanges(count => count + 1)}
      ></web-ui-switch>
      <web-ui-button
        onClick={() => {
          const field = fieldRef.current
          if (field) field.checked = !field.checked
        }}
      >
        Write checked programmatically
      </web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">
        input {inputs} times · change {changes} times
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-switch ref="field" @input="inputs = inputs + 1" @change="changes = changes + 1"></web-ui-switch>
    <web-ui-button @click="writeChecked">Write checked programmatically</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)"
      >input {{ inputs }} times · change {{ changes }} times</output
    >
  </div>
</template>

<script setup lang="ts">
import type { WebUiSwitch } from '@greypan/web-ui'
import { useTemplateRef, ref } from 'vue'

const inputs = ref(0)
const changes = ref(0)
const field = useTemplateRef<WebUiSwitch>('field')

function writeChecked() {
  const element = field.value
  if (element) element.checked = !element.checked
}
</script>
```

### Drag and flick

After pressing, the switch enters dragging only once horizontal movement exceeds 6px, and the thumb follows the pointer; on release, moving past half the distance sets the value, and a horizontal velocity beyond ±300 px/s sets it in the flick direction regardless of where the pointer landed.

One drag counts as one value change, with `input` and `change` dispatched once each; the click that immediately follows is swallowed by the drag flag and does not flip the switch a second time.

The host has `touch-action: none`, so vertical page scrolling does not steal this gesture.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [log, setLog] = useState<string[]>([])

  function record(name: string) {
    setLog(entries => [...entries.slice(-5), name])
  }

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <div className="flex items-center gap-3">
        <web-ui-switch onInput={() => record('input')} onChange={() => record('change')}></web-ui-switch>
        <span className="text-sm text-(--wui-color-text-secondary)">
          Press and drag the whole control; crossing the midpoint or flicking sets the value
        </span>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">
        {log.length === 0 ? 'Waiting for interaction' : log.join(' → ')}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col items-start gap-3">
    <div class="flex items-center gap-3">
      <web-ui-switch @input="record('input')" @change="record('change')"></web-ui-switch>
      <span class="text-sm text-(--wui-color-text-secondary)">
        Press and drag the whole control; crossing the midpoint or flicking sets the value
      </span>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">
      {{ log.length === 0 ? 'Waiting for interaction' : log.join(' → ') }}
    </output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const log = ref<string[]>([])

function record(name: string) {
  log.value = [...log.value.slice(-5), name]
}
</script>
```

### Form value

`name` is the field name and `value` is the submitted value, which defaults to `'on'` when left empty.

When unchecked the field does not enter `FormData` at all; `required` blocks submission while unchecked (`valueMissing`), and validation yields as well when an outer `<fieldset disabled>` disables it.

The visible label also names the switch; `aria-label` or `aria-labelledby` can override the default name.

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
      <web-ui-switch name="newsletter" value="yes" required></web-ui-switch>
      <span className="text-sm text-(--wui-color-text-secondary)">Newsletter subscription: required</span>
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
    <web-ui-switch name="newsletter" value="yes" required></web-ui-switch>
    <span class="text-sm text-(--wui-color-text-secondary)">Newsletter subscription: required</span>
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

## API

### Props

| Name       | Description                                                                                                                                   | Type      | Default |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------- |
| `checked`  | On/off state; it is not an observed attribute, so a programmatic write takes effect without reflecting to an attribute or dispatching events. | `boolean` | `false` |
| `name`     | Form field name.                                                                                                                              | `string`  | `''`    |
| `value`    | Form submission value, `'on'` when left empty; the field is not submitted while unchecked.                                                    | `string`  | `''`    |
| `disabled` | Disabled state; blocks interaction and makes validation yield.                                                                                | `boolean` | `false` |
| `required` | Required validation: blocks submission while unchecked.                                                                                       | `boolean` | `false` |
| `loading`  | Loading state: blocks interaction, shows a spinning icon in the thumb, and keeps the current value.                                           | `boolean` | `false` |

### Slots

| Name      | Description                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| `default` | Visible label text, which also serves as the switch's accessible name; no extra spacing is added when empty. |

### Events

| Name     | Description                                                                                                            |
| -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `input`  | Dispatched when the user toggles: click, Enter, Space, and drag-to-set—all four paths are dispatched by the component. |
| `change` | Dispatched at the same commit points as `input`; a programmatic write to `checked` dispatches nothing.                 |

### Behavior

`checked` is not an observed attribute but a getter / setter pair over internal state: a `checked` written on the native tag is read only once at mount, after which the attribute is not observed; a framework's dynamic binding updates it only when it lands on the property.

Writing `el.checked = true` directly takes effect, but does not reflect to an attribute and dispatches no events.

To follow the page, catch `change` and write it back, as in the basic sample above.

The three activation paths end at the same place: click, Space / Enter, and drag-to-set all write the new value through the component and dispatch both `input` and `change` as `composed` events on the host.

The host handles click and keydown itself (calling `preventDefault()` on Space / Enter before toggling, without relying on an inner native control), so the three paths do not differ in bubbling or forwarding, and a programmatic write to `checked` still dispatches nothing.

`disabled` and `loading` share one disabled path: when `_isDisabled` (including form-level disabling) or `loading` is true, all three entry points—click, keyboard, and drag—return at the top of their handlers, and the thumb stays at the current value.

Validation only goes halfway: the `valueMissing` check for `required` reads `_isDisabled`, so `disabled` reports a clean state while `loading` does not report.

Keyboard focus lands on the host (`tabindex=0` when enabled), and the focus ring is drawn on the track via `:host(:focus-visible)`; focus triggered by the mouse draws no ring and is left to the shared pointer focus suppression mechanism.

When `disabled` or `loading`, the host's `tabindex` is pressed to `-1` (the original value is recorded and restored on recovery), so the whole control leaves the tab sequence and the focus ring has no way to appear.

accessible name: the default slot content is the visible label and also the switch's accessible name; to reference an external label, set `aria-labelledby` on the `web-ui-switch` host, or set `aria-label` directly.

`role="switch"`, `aria-checked`, and `aria-disabled` on the host are maintained by the component.

### Layout

The default spacing between the label and the track is `8px`; when the default slot has no renderable width (an empty slot, or only a visually hidden accessible name), the spacing collapses and the host width does not exceed the track.

The track is a 40×20 pill box, taking its radius from `--wui-radius-control` and its background from `--wui-color-surface-track`, switching to `--wui-color-accent` when on.

The thumb is a 16×16 dot; at rest it is solid `--wui-color-on-control` with a shadow, and when pressed or dragged it switches to the glass surface and widens to 20px with `scale(1.5)`, with a transition bridging the two forms.

The on state is offset by 20px (16px in the pressed state, matching the enlarged visual position).

Position during a drag goes through an inline `--wui-switch-drag-offset`, with transitions turned off so it follows the hand—this variable is driven by the component itself; do not use it as a style hook.

Both the host and the track are `touch-action: none`, and `user-select: none` is written on the track only; disabled and loading land on `.is-disabled`, dropping the whole control to forty percent opacity and switching to a `not-allowed` cursor.

The component has no size or color tokens of its own; everything goes through shared theme tokens, so there is no CSS Custom Properties table here: to change the width or colors, change the theme variables themselves, such as `--wui-color-surface-track` and `--wui-color-accent`, and the effect covers every control.

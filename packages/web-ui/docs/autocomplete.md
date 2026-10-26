---
component: autocomplete
tag: web-ui-autocomplete
---

A single-value selector that accepts input and filters candidates: typed text filters candidates by `option` label, and a selection fills the label back into the input and exposes that option's value as the readonly `selected-value`.

## Samples

### Basic

`value` is the current input text and is owned by the page: typing filters candidates by label (default `contains`), and the panel stays closed when nothing matches; after a selection the text is filled back with that option's label and `selected-value` gives that option's value.

```tsx
import { useState } from 'react'

const frameworks = ['Vue', 'React', 'Svelte', 'Angular']

export default function Demo() {
  const [text, setText] = useState('')
  const [picked, setPicked] = useState('')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-autocomplete
        value={text}
        placeholder="Type a framework name"
        onInput={event => setText(event.currentTarget.value)}
        onChange={event => {
          setText(event.currentTarget.value)
          setPicked(event.currentTarget.selectedValue)
        }}
      >
        {frameworks.map(name => (
          <web-ui-option key={name} value={name} label={name}></web-ui-option>
        ))}
      </web-ui-autocomplete>
      <output className="text-sm text-(--wui-color-text-secondary)">
        input: {text || '(empty)'} · selected-value: {picked || '(empty)'}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-autocomplete :value="text" placeholder="Type a framework name" @input="onInput" @change="onChange">
      <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name"></web-ui-option>
    </web-ui-autocomplete>
    <output class="text-sm text-(--wui-color-text-secondary)">
      input: {{ text || '(empty)' }} · selected-value: {{ picked || '(empty)' }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiAutocomplete, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const frameworks = ['Vue', 'React', 'Svelte', 'Angular']
const text = ref('')
const picked = ref('')

function onInput(event: WebUiEvent<WebUiAutocomplete, 'input'>) {
  text.value = event.currentTarget.value
}

function onChange(event: WebUiEvent<WebUiAutocomplete, 'change'>) {
  text.value = event.currentTarget.value
  picked.value = event.currentTarget.selectedValue
}
</script>
```

### Filter modes

`filter` takes `contains` (default), `prefix`, or `none`: the first two match labels by substring or prefix, while `none` turns filtering off and always lists all candidates.

```tsx
import { useState } from 'react'

type FilterMode = 'contains' | 'prefix' | 'none'

const frameworks = ['Vue', 'React', 'Svelte', 'Angular']

export default function Demo() {
  const [mode, setMode] = useState<FilterMode>('contains')

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-select
          className="[--wui-input-width:140px]"
          value={mode}
          onChange={event => setMode(event.currentTarget.value as FilterMode)}
        >
          <web-ui-option value="contains" label="contains"></web-ui-option>
          <web-ui-option value="prefix" label="prefix"></web-ui-option>
          <web-ui-option value="none" label="none"></web-ui-option>
        </web-ui-select>
        <output className="text-sm text-(--wui-color-text-secondary)">Current mode: {mode}</output>
      </div>
      <web-ui-autocomplete filter={mode} placeholder="Type a framework name">
        {frameworks.map(name => (
          <web-ui-option key={name} value={name} label={name}></web-ui-option>
        ))}
      </web-ui-autocomplete>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-select class="[--wui-input-width:140px]" :value="mode" @change="onModeChange">
        <web-ui-option value="contains" label="contains"></web-ui-option>
        <web-ui-option value="prefix" label="prefix"></web-ui-option>
        <web-ui-option value="none" label="none"></web-ui-option>
      </web-ui-select>
      <output class="text-sm text-(--wui-color-text-secondary)">Current mode: {{ mode }}</output>
    </div>
    <web-ui-autocomplete :filter="mode" placeholder="Type a framework name">
      <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name"></web-ui-option>
    </web-ui-autocomplete>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiSelect } from '@greypan/web-ui'
import { ref } from 'vue'

type FilterMode = 'contains' | 'prefix' | 'none'

const frameworks = ['Vue', 'React', 'Svelte', 'Angular']
const mode = ref<FilterMode>('contains')

function onModeChange(event: WebUiEvent<WebUiSelect, 'change'>) {
  mode.value = event.currentTarget.value as FilterMode
}
</script>
```

### change and selected-value

After a candidate is selected, `selected-value` is that option's value; it clears when the input no longer exactly matches any label—it is derived by the component during its update cycle, so reading it in `input` takes one tick (`requestAnimationFrame`), while `change` sees the value committed by that interaction.

```tsx
import { useState } from 'react'

const cities = [
  { label: 'Beijing', value: 'beijing' },
  { label: 'Shanghai', value: 'shanghai' },
  { label: 'Guangzhou', value: 'guangzhou' },
  { label: 'Shenzhen', value: 'shenzhen' }
]

export default function Demo() {
  const [text, setText] = useState('')
  const [liveSelected, setLiveSelected] = useState('')
  const [committed, setCommitted] = useState('')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-autocomplete
        placeholder="Select Beijing, then delete one character"
        onInput={event => {
          const host = event.currentTarget
          setText(host.value)
          // selected-value is derived during the component's update cycle; only the next frame reads the value matching the current text
          requestAnimationFrame(() => setLiveSelected(host.selectedValue))
        }}
        onChange={event => {
          setText(event.currentTarget.value)
          setLiveSelected(event.currentTarget.selectedValue)
          setCommitted(event.currentTarget.selectedValue)
        }}
      >
        {cities.map(city => (
          <web-ui-option key={city.value} value={city.value} label={city.label}></web-ui-option>
        ))}
      </web-ui-autocomplete>
      <output className="text-sm text-(--wui-color-text-secondary)">
        input: {text || '(empty)'} · selected-value: {liveSelected || '(empty)'}
      </output>
      <output className="text-sm text-(--wui-color-text-secondary)">
        selected-value of the latest change: {committed || '(empty)'}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-autocomplete placeholder="Select Beijing, then delete one character" @input="onInput" @change="onChange">
      <web-ui-option v-for="city in cities" :key="city.value" :value="city.value" :label="city.label"></web-ui-option>
    </web-ui-autocomplete>
    <output class="text-sm text-(--wui-color-text-secondary)">
      input: {{ text || '(empty)' }} · selected-value: {{ liveSelected || '(empty)' }}
    </output>
    <output class="text-sm text-(--wui-color-text-secondary)">
      selected-value of the latest change: {{ committed || '(empty)' }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiAutocomplete, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const cities = [
  { label: 'Beijing', value: 'beijing' },
  { label: 'Shanghai', value: 'shanghai' },
  { label: 'Guangzhou', value: 'guangzhou' },
  { label: 'Shenzhen', value: 'shenzhen' }
]
const text = ref('')
const liveSelected = ref('')
const committed = ref('')

function onInput(event: WebUiEvent<WebUiAutocomplete, 'input'>) {
  const host = event.currentTarget
  text.value = host.value
  // selected-value is derived during the component's update cycle; only the next frame reads the value matching the current text
  requestAnimationFrame(() => (liveSelected.value = host.selectedValue))
}

function onChange(event: WebUiEvent<WebUiAutocomplete, 'change'>) {
  text.value = event.currentTarget.value
  liveSelected.value = event.currentTarget.selectedValue
  committed.value = event.currentTarget.selectedValue
}
</script>
```

### Custom trigger

Put an editable component into the `trigger` slot to replace the default input: a multiline trigger keeps Enter as a newline and closes the panel with Escape or blur; this example also uses `filter="none"` so that all candidates are always listed.

`focus()` delegates to the current trigger and lands on the native control inside `web-ui-textarea`.

```tsx
import type { WebUiAutocomplete } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiAutocomplete>(null)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-autocomplete ref={fieldRef} filter="none">
        <web-ui-textarea
          slot="trigger"
          rows={3}
          className="[--wui-textarea-width:20rem]"
          placeholder="Multiline trigger: Enter inserts a newline, Escape or blur closes the panel"
        ></web-ui-textarea>
        <web-ui-option value="bug" label="Bug"></web-ui-option>
        <web-ui-option value="feature" label="Feature"></web-ui-option>
      </web-ui-autocomplete>
      <web-ui-button onClick={() => fieldRef.current?.focus()}>Focus the trigger</web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-autocomplete ref="field" filter="none">
      <web-ui-textarea
        slot="trigger"
        :rows="3"
        class="[--wui-textarea-width:20rem]"
        placeholder="Multiline trigger: Enter inserts a newline, Escape or blur closes the panel"
      ></web-ui-textarea>
      <web-ui-option value="bug" label="Bug"></web-ui-option>
      <web-ui-option value="feature" label="Feature"></web-ui-option>
    </web-ui-autocomplete>
    <web-ui-button @click="field?.focus()">Focus the trigger</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import type { WebUiAutocomplete } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const field = useTemplateRef<WebUiAutocomplete>('field')
</script>
```

### Allow custom values

With `allow-custom-value` on, text that is not among the candidates can still be submitted: pressing Enter takes the raw input as a custom value, the panel closes, `change` fires, and `selected-value` stays empty; when filtering leaves no candidates the panel does not open, and Enter still submits.

```tsx
import { useState } from 'react'

const frameworks = ['Vue', 'React', 'Svelte', 'Angular']

export default function Demo() {
  const [submitted, setSubmitted] = useState('')
  const [selected, setSelected] = useState('')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-autocomplete
        allowCustomValue
        placeholder="Type text outside the candidates, then press Enter"
        onChange={event => {
          setSubmitted(event.currentTarget.value)
          setSelected(event.currentTarget.selectedValue)
        }}
      >
        {frameworks.map(name => (
          <web-ui-option key={name} value={name} label={name}></web-ui-option>
        ))}
      </web-ui-autocomplete>
      <output className="text-sm text-(--wui-color-text-secondary)">
        Last submitted: {submitted || '(empty)'} · selected-value: {selected || '(empty)'}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-autocomplete
      allow-custom-value
      placeholder="Type text outside the candidates, then press Enter"
      @change="onChange"
    >
      <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name"></web-ui-option>
    </web-ui-autocomplete>
    <output class="text-sm text-(--wui-color-text-secondary)">
      Last submitted: {{ submitted || '(empty)' }} · selected-value: {{ selected || '(empty)' }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiAutocomplete, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const frameworks = ['Vue', 'React', 'Svelte', 'Angular']
const submitted = ref('')
const selected = ref('')

function onChange(event: WebUiEvent<WebUiAutocomplete, 'change'>) {
  submitted.value = event.currentTarget.value
  selected.value = event.currentTarget.selectedValue
}
</script>
```

### Disabled and readonly

Neither `disabled` nor `readonly` accepts input or opens the panel, while a prefilled `value` is still displayed as usual; both count as passing required validation.

```tsx
const frameworks = ['Vue', 'React', 'Svelte', 'Angular']

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-autocomplete value="Vue" disabled placeholder="Disabled">
        {frameworks.map(name => (
          <web-ui-option key={name} value={name} label={name}></web-ui-option>
        ))}
      </web-ui-autocomplete>
      <web-ui-autocomplete value="Vue" readonly placeholder="Readonly">
        {frameworks.map(name => (
          <web-ui-option key={name} value={name} label={name}></web-ui-option>
        ))}
      </web-ui-autocomplete>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-autocomplete value="Vue" disabled placeholder="Disabled">
      <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name"></web-ui-option>
    </web-ui-autocomplete>
    <web-ui-autocomplete value="Vue" readonly placeholder="Readonly">
      <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name"></web-ui-option>
    </web-ui-autocomplete>
  </div>
</template>

<script setup lang="ts">
const frameworks = ['Vue', 'React', 'Svelte', 'Angular']
</script>
```

## API

### Props

| Name                 | Description                                                                                      | Type                  | Default      |
| -------------------- | ------------------------------------------------------------------------------------------------ | --------------------- | ------------ |
| `placeholder`        | Input placeholder text.                                                                          | `string`              | `''`         |
| `borderless`         | Ghost form: removes the border, background, and shadow while keeping padding and the focus ring. | `boolean`             | `false`      |
| `disabled`           | Disabled state: no input, no dropdown.                                                           | `boolean`             | `false`      |
| `readonly`           | Readonly state: no input, no dropdown.                                                           | `boolean`             | `false`      |
| `required`           | Required validation.                                                                             | `boolean`             | `false`      |
| `portal`             | Renders the dropdown panel in the theme-owned overlay root.                                      | `boolean`             | `false`      |
| `no-scroll-lock`     | Does not lock page scrolling while open.                                                         | `boolean`             | `false`      |
| `allow-custom-value` | Allows Enter to submit input text that is not among the candidates.                              | `boolean`             | `false`      |
| `overlayContainer`   | Explicit portal container (property, not attribute).                                             | `OverlayContainer`    | —            |
| `name`               | Form field name.                                                                                 | `string`              | `''`         |
| `aria-label`         | Accessible name.                                                                                 | `string \| null`      | `null`       |
| `aria-labelledby`    | Accessible name reference.                                                                       | `string \| undefined` | —            |
| `filter`             | Candidate filtering mode: `contains` (default), `prefix`, or `none`.                             | `FilterMode`          | `'contains'` |
| `value`              | Current input text, also the form-submitted value.                                               | `string`              | `''`         |

### Events

| Name          | Description                                                             |
| ------------- | ----------------------------------------------------------------------- |
| `input`       | Fires on input; `value` is the current text.                            |
| `change`      | Fires when a candidate is selected or a custom value is submitted.      |
| `focus`       | Fires when the trigger gains focus.                                     |
| `blur`        | Fires when the trigger loses focus.                                     |
| `open-change` | The dropdown panel opens or closes; `detail.open` is the current state. |

### Slots

| Name      | Description                                                       |
| --------- | ----------------------------------------------------------------- |
| `trigger` | Custom content for the trigger area, replacing the default input. |
| `default` | Projects `<web-ui-option>` candidates.                            |

### Methods

| Name      | Description                                                                                                                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `focus()` | Focuses the current trigger: a `web-ui-input` / `web-ui-textarea` trigger hands focus to its inner native control, while a custom trigger without its own focus redirection gets focus on the trigger element itself. |
| `blur()`  | Blurs the current trigger.                                                                                                                                                                                            |

### Behavior

Typing filters candidates by label (`contains` or `prefix`; `none` turns filtering off).

When nothing matches, the dropdown panel stays closed; when deleting characters brings matches back, the panel opens again.

Selecting an option fills the text back with that option's label and exposes that option's value as `selected-value`; `change` fires when the selection is committed.

ArrowDown/ArrowUp/Enter/Escape keyboard navigation is supported.

When a portal panel is created, it mirrors these variables as resolved on the host; after updating the host, the portal panel must be reopened for the change to take effect.

### Trigger

The default trigger is the `web-ui-input` inside the shadow root.

Put any editable component into the `trigger` slot to replace it—the wrapper div keeps carrying the combobox ARIA, marks the custom trigger with `data-custom-trigger`, and the overlay always anchors to the trigger element.

The component's `focus()` / `blur()` delegate to the trigger currently in effect: `web-ui-input` and `web-ui-textarea` land focus on their inner native control; a custom trigger without its own focus redirection gets focus on the trigger element itself.

```html
<web-ui-autocomplete placeholder="Describe the problem">
  <web-ui-textarea slot="trigger" rows="3"></web-ui-textarea>
  <web-ui-option value="bug" label="Bug"></web-ui-option>
  <web-ui-option value="feature" label="Feature"></web-ui-option>
</web-ui-autocomplete>
```

Custom triggers share the same contract as the default trigger: a string `value` carries the text, the trigger is focusable, and it dispatches the events the component listens to by delegation (`input`, `click`, `focus`, `blur`).

`web-ui-input` and `web-ui-textarea` work out of the box; a custom element only has to expose a string `value` property to plug in.

The wrapper div takes no tab stop (`tabindex="-1"`): sequential focus belongs to the trigger itself, and a custom trigger must be focusable so that keyboard users can reach the combobox.

A multiline trigger (an editable `<textarea>`) keeps Enter as a newline: Enter neither selects the highlighted option nor submits a custom value, and the panel is closed with Escape or blur. Selecting an option still writes that option's label back into the trigger.

A single-line custom trigger keeps the default Enter semantics.

While the panel is open, ArrowUp/ArrowDown follow the same exception: the arrow keys move the text caret instead of navigating candidates, and in that state the keyboard cannot navigate options—select with a pointer instead. While the panel is closed, ArrowDown/ArrowUp can still open it.

With `allow-custom-value` enabled, when there is no match and no active option, Enter submits the current raw input as a custom value and closes the panel; `change` fires and `selected-value` stays empty.

When filtering leaves no candidates at all, the panel does not open (and collapses if it is open), and Enter still takes the same submission path.

The component never creates options on its own and never trims the raw text. Text that hits a disabled option does not bypass the disabled semantics and is not derived into a selected option.

### CSS Custom Properties

| Name                            | Description                                | Default |
| ------------------------------- | ------------------------------------------ | ------- |
| `--wui-autocomplete-max-width`  | Dropdown maximum width                     | `500px` |
| `--wui-autocomplete-max-height` | Maximum height of the dropdown scroll area | `200px` |
| `--wui-overlay-min-width`       | Dropdown minimum width                     | `200px` |

---
component: select
tag: web-ui-select
---

Select dropdown: the default slot projects `<web-ui-option>` candidates, and the `trigger` slot can replace the default trigger area. Supports keyboard navigation and Portal.

## Samples

### Basic

`value` is owned by the page: after a selection, `change` hands `event.currentTarget.value` back, and once it is written to `value` the trigger text follows; when `value` is not set, the trigger shows `placeholder`.

Writing `value` programmatically dispatches no event, so "Clear" only changes page state.

`disabled` takes the whole control out of interaction.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [framework, setFramework] = useState('vue')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-select
        aria-label="Frontend framework"
        value={framework}
        placeholder="Select a framework"
        onChange={event => setFramework(event.currentTarget.value)}
      >
        <web-ui-option value="vue" label="Vue"></web-ui-option>
        <web-ui-option value="react" label="React"></web-ui-option>
        <web-ui-option value="svelte" label="Svelte"></web-ui-option>
      </web-ui-select>
      <div className="flex items-center gap-3">
        <web-ui-button onClick={() => setFramework('')}>Clear</web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">Current value: {framework || '(empty)'}</output>
      </div>
      <web-ui-select placeholder="Disabled" disabled>
        <web-ui-option value="a" label="Unavailable"></web-ui-option>
      </web-ui-select>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-select
      aria-label="Frontend framework"
      :value="framework"
      placeholder="Select a framework"
      @change="framework = $event.currentTarget.value"
    >
      <web-ui-option value="vue" label="Vue"></web-ui-option>
      <web-ui-option value="react" label="React"></web-ui-option>
      <web-ui-option value="svelte" label="Svelte"></web-ui-option>
    </web-ui-select>
    <div class="flex items-center gap-3">
      <web-ui-button @click="framework = ''">Clear</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">Current value: {{ framework || '(empty)' }}</output>
    </div>
    <web-ui-select placeholder="Disabled" disabled>
      <web-ui-option value="a" label="Unavailable"></web-ui-option>
    </web-ui-select>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const framework = ref('vue')
</script>
```

### Option decoration

The `prefix` / `suffix` slots put icons and notes on either side of the label; within one option the order is check → prefix → label → suffix. A `disabled` item stays in the list but cannot be selected, and keyboard navigation skips it.

```tsx
import { lucideFileText, lucideFilm, lucideImage } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-select placeholder="Choose an attachment type">
      <web-ui-option value="doc" label="Document">
        <web-ui-icon slot="prefix" icon={lucideFileText} size={14}></web-ui-icon>
        <span slot="suffix" className="text-xs text-(--wui-color-text-secondary)">
          PDF
        </span>
      </web-ui-option>
      <web-ui-option value="image" label="Image">
        <web-ui-icon slot="prefix" icon={lucideImage} size={14}></web-ui-icon>
        <span slot="suffix" className="text-xs text-(--wui-color-text-secondary)">
          PNG
        </span>
      </web-ui-option>
      <web-ui-option value="video" label="Video (unavailable)" disabled>
        <web-ui-icon slot="prefix" icon={lucideFilm} size={14}></web-ui-icon>
        <span slot="suffix" className="text-xs text-(--wui-color-text-secondary)">
          MP4
        </span>
      </web-ui-option>
    </web-ui-select>
  )
}
```

```vue
<template>
  <web-ui-select placeholder="Choose an attachment type">
    <web-ui-option value="doc" label="Document">
      <web-ui-icon slot="prefix" :icon="lucideFileText" :size="14"></web-ui-icon>
      <span slot="suffix" class="text-xs text-(--wui-color-text-secondary)">PDF</span>
    </web-ui-option>
    <web-ui-option value="image" label="Image">
      <web-ui-icon slot="prefix" :icon="lucideImage" :size="14"></web-ui-icon>
      <span slot="suffix" class="text-xs text-(--wui-color-text-secondary)">PNG</span>
    </web-ui-option>
    <web-ui-option value="video" label="Video (unavailable)" disabled>
      <web-ui-icon slot="prefix" :icon="lucideFilm" :size="14"></web-ui-icon>
      <span slot="suffix" class="text-xs text-(--wui-color-text-secondary)">MP4</span>
    </web-ui-option>
  </web-ui-select>
</template>

<script setup lang="ts">
import { lucideFileText, lucideFilm, lucideImage } from '@greypan/web-ui/icons'
</script>
```

### Custom trigger

The `trigger` slot replaces the default label text; the shell, arrow, and open/close behavior still come from the component. The slot content is ordinary nodes rendered by the page, so writing its text from page state makes it follow the selection.

```tsx
import { lucideGlobe } from '@greypan/web-ui/icons'
import { useState } from 'react'

const LABELS: Record<string, string> = { zh: '中文', en: 'English', ja: '日本語' }

export default function Demo() {
  const [lang, setLang] = useState('en')

  return (
    <web-ui-select value={lang} onChange={event => setLang(event.currentTarget.value)}>
      <div slot="trigger" className="flex items-center gap-1.5">
        <web-ui-icon icon={lucideGlobe} size={16}></web-ui-icon>
        <span className="text-sm">{LABELS[lang] ?? 'Select language'}</span>
      </div>
      <web-ui-option value="zh" label="中文"></web-ui-option>
      <web-ui-option value="en" label="English"></web-ui-option>
      <web-ui-option value="ja" label="日本語"></web-ui-option>
    </web-ui-select>
  )
}
```

```vue
<template>
  <web-ui-select :value="lang" @change="lang = $event.currentTarget.value">
    <div slot="trigger" class="flex items-center gap-1.5">
      <web-ui-icon :icon="lucideGlobe" :size="16"></web-ui-icon>
      <span class="text-sm">{{ LABELS[lang] ?? 'Select language' }}</span>
    </div>
    <web-ui-option value="zh" label="中文"></web-ui-option>
    <web-ui-option value="en" label="English"></web-ui-option>
    <web-ui-option value="ja" label="日本語"></web-ui-option>
  </web-ui-select>
</template>

<script setup lang="ts">
import { lucideGlobe } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const LABELS: Record<string, string> = { zh: '中文', en: 'English', ja: '日本語' }
const lang = ref('en')
</script>
```

### Open-change notification

`open-change` only notifies: the component applies the open state first, then reports the result through `detail.open`. select's `open` is a read-only getter with no writable controlled property, so the page just follows the event readout.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('—')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-select
        placeholder="Open or close the panel"
        onopen-change={event => {
          setCount(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <web-ui-option value="a" label="Option A"></web-ui-option>
        <web-ui-option value="b" label="Option B"></web-ui-option>
      </web-ui-select>
      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change: {count} times · last detail.open = {last}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-select placeholder="Open or close the panel" @open-change="onOpenChange">
      <web-ui-option value="a" label="Option A"></web-ui-option>
      <web-ui-option value="b" label="Option B"></web-ui-option>
    </web-ui-select>
    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change: {{ count }} times · last detail.open = {{ last }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiSelect } from '@greypan/web-ui'
import { ref } from 'vue'

const count = ref(0)
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiSelect, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### Form value

`name` makes the selected value enter `FormData` under that field name; when the value is empty, `required` reports `valueMissing` and native submission is blocked. `form.reset()` returns the value to the initial value at mount, and the trigger goes back to `placeholder` with it.

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
        const framework = new FormData(event.currentTarget).get('framework')
        setSubmitted(typeof framework === 'string' ? framework : '')
      }}
    >
      <web-ui-select name="framework" required placeholder="Select a framework">
        <web-ui-option value="vue" label="Vue"></web-ui-option>
        <web-ui-option value="react" label="React"></web-ui-option>
        <web-ui-option value="svelte" label="Svelte"></web-ui-option>
      </web-ui-select>
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
          {submitted === '' ? 'Not submitted yet' : `framework=${submitted}`}
        </output>
      </div>
    </form>
  )
}
```

```vue
<template>
  <form ref="form" class="flex flex-col items-start gap-3" @submit="onSubmit">
    <web-ui-select name="framework" required placeholder="Select a framework">
      <web-ui-option value="vue" label="Vue"></web-ui-option>
      <web-ui-option value="react" label="React"></web-ui-option>
      <web-ui-option value="svelte" label="Svelte"></web-ui-option>
    </web-ui-select>
    <div class="flex items-center gap-3">
      <web-ui-button type="submit">Submit</web-ui-button>
      <web-ui-button @click="reset">Reset</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">
        {{ submitted === '' ? 'Not submitted yet' : `framework=${submitted}` }}
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
  const framework = new FormData(event.currentTarget as HTMLFormElement).get('framework')
  submitted.value = typeof framework === 'string' ? framework : ''
}

function reset() {
  form.value?.reset()
  submitted.value = ''
}
</script>
```

### Portal rendering

By default the panel renders in select's own shadow tree and is positioned absolutely, so an ancestor's `overflow` clips it; `portal` hands the panel to the theme-owned overlay root and positions it fixed, where no container can clip it.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex h-24 flex-col items-start gap-2 overflow-hidden rounded-lg border border-(--wui-color-border) p-3">
        <span className="text-xs text-(--wui-color-text-secondary)">
          Default: the panel is clipped by the container
        </span>
        <web-ui-select placeholder="Default">
          <web-ui-option value="a" label="Option A"></web-ui-option>
          <web-ui-option value="b" label="Option B"></web-ui-option>
        </web-ui-select>
      </div>
      <div className="flex h-24 flex-col items-start gap-2 overflow-hidden rounded-lg border border-(--wui-color-border) p-3">
        <span className="text-xs text-(--wui-color-text-secondary)">portal: the panel is fully visible</span>
        <web-ui-select portal placeholder="portal">
          <web-ui-option value="a" label="Option A"></web-ui-option>
          <web-ui-option value="b" label="Option B"></web-ui-option>
        </web-ui-select>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-start gap-4">
    <div class="flex h-24 flex-col items-start gap-2 overflow-hidden rounded-lg border border-(--wui-color-border) p-3">
      <span class="text-xs text-(--wui-color-text-secondary)">Default: the panel is clipped by the container</span>
      <web-ui-select placeholder="Default">
        <web-ui-option value="a" label="Option A"></web-ui-option>
        <web-ui-option value="b" label="Option B"></web-ui-option>
      </web-ui-select>
    </div>
    <div class="flex h-24 flex-col items-start gap-2 overflow-hidden rounded-lg border border-(--wui-color-border) p-3">
      <span class="text-xs text-(--wui-color-text-secondary)">portal: the panel is fully visible</span>
      <web-ui-select portal placeholder="portal">
        <web-ui-option value="a" label="Option A"></web-ui-option>
        <web-ui-option value="b" label="Option B"></web-ui-option>
      </web-ui-select>
    </div>
  </div>
</template>
```

## API

### Props

| Name               | Description                                                 | Type               | Default |
| ------------------ | ----------------------------------------------------------- | ------------------ | ------- |
| `placeholder`      | Placeholder text shown when nothing is selected.            | `string`           | `''`    |
| `disabled`         | Disabled state.                                             | `boolean`          | `false` |
| `required`         | Required validation.                                        | `boolean`          | `false` |
| `portal`           | Renders the dropdown panel in the theme-owned overlay root. | `boolean`          | `false` |
| `no-scroll-lock`   | Does not lock page scrolling while open.                    | `boolean`          | `false` |
| `overlayContainer` | Explicit Portal container (property).                       | `OverlayContainer` | —       |
| `name`             | Form field name.                                            | `string`           | `''`    |
| `aria-label`       | Accessible name of the combobox.                            | `string \| null`   | `null`  |
| `value`            | Selected value.                                             | `string`           | `''`    |

### Events

| Name          | Description                                                             |
| ------------- | ----------------------------------------------------------------------- |
| `input`       | Fired after the user selects an item; `value` is the new value.         |
| `change`      | Dispatched in pair with `input`, one each per selection.                |
| `open-change` | The dropdown panel opens or closes; `detail.open` is the current state. |

### Slots

| Name      | Description                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------- |
| `trigger` | Custom trigger area content, replacing the default label; the arrow is still rendered by the component. |
| `default` | Projects `<web-ui-option>` candidates.                                                                  |

### Behavior

Child `<web-ui-option>` elements register through `option-register` / `option-unregister`.

While open, the panel uses `role="listbox"` and the candidates use `role="option"`; the option matching the current non-empty `value` is set to `aria-selected="true"`, and `aria-disabled` reflects the disabled state.

Outside Portal mode, `aria-activedescendant` points at the current option during keyboard navigation; in Portal mode the option and the combobox live in different Shadow DOM trees, so this attribute is not set.

When closed, Space / Enter / ArrowDown / ArrowUp open the panel; when expanded, ArrowDown / ArrowUp, Home / End, and typeahead move the active item, Enter / Space select and close, and Escape closes.

When a Portal panel is created it mirrors these variables as resolved on the host; after updating the host, the Portal panel must be reopened for the change to take effect.

### CSS Custom Properties

| Name                      | Description                                   | Default                            |
| ------------------------- | --------------------------------------------- | ---------------------------------- |
| `--wui-select-max-width`  | Maximum dropdown width                        | `500px`                            |
| `--wui-select-max-height` | Maximum height of the scrolling dropdown area | `200px`                            |
| `--wui-overlay-min-width` | Minimum dropdown width                        | `200px`                            |
| `--wui-select-bg-hover`   | Trigger hover background                      | `--wui-color-surface-glass-hover`  |
| `--wui-select-bg-active`  | Trigger pressed/open background               | `--wui-color-surface-glass-active` |

# Select

English | [简体中文](./select.CN.md)

Select dropdown. The default slot holds `<web-ui-option>` candidates, and the `trigger` slot can replace the default trigger area. The component supports keyboard navigation and Portal.

## Samples

### Basic

`value` is owned by the page. After the user selects an item, `change` hands `event.currentTarget.value` back; write it to `value` and the trigger text updates. When `value` is not set, the trigger shows `placeholder`. Writing `value` programmatically dispatches no event, so "Clear" only changes page state.

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

The `prefix` / `suffix` slots put icons and notes on either side of the label. A `disabled` item stays in the list but cannot be selected, and keyboard navigation skips it.

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

### Custom trigger slot

The `trigger` slot replaces the default label text; the arrow and the open/close behavior still come from the component. The component does not rewrite the font, color, or size of slot content. Driving the slot content from page state makes it follow the selection.

```tsx
import { lucideGlobe } from '@greypan/web-ui/icons'
import { useState } from 'react'

const LABELS: Record<string, string> = { zh: '中文', en: 'English', ja: '日本語' }

export default function Demo() {
  const [lang, setLang] = useState('en')

  return (
    <web-ui-select value={lang} onChange={event => setLang(event.currentTarget.value)}>
      <div slot="trigger" className="flex items-center gap-1.5">
        <web-ui-icon icon={lucideGlobe}></web-ui-icon>
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
      <web-ui-icon :icon="lucideGlobe"></web-ui-icon>
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

### Trigger modes

`trigger` is a gesture set separated by spaces or commas: `click`, `hover`, `focus`, `none`. It defaults to `click`. `hover` opens and closes with pointer entry and exit, and `focus` opens on keyboard focus (`:focus-visible`); gestures can be written side by side.

`none` accepts no gesture and takes no part in outside-click closing or Escape; in the closed state, arrow keys, Space, Enter and typeahead no longer auto-open either — only the `open` property or `show()` / `hide()` moves it. `none` and gestures are mutually exclusive: when both appear, `none` wins and a development warning is printed.

`show-delay` / `hide-delay` only apply to hover-originated opens and closes; clicks, focus and programmatic calls act immediately.

```tsx
import type { WebUiSelect } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const picker = useRef<WebUiSelect>(null)
  const [last, setLast] = useState('—')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-select
        ref={picker}
        trigger="none"
        placeholder="none mode"
        aria-label="none mode"
        onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
      >
        <web-ui-option value="a" label="Option A"></web-ui-option>
        <web-ui-option value="b" label="Option B"></web-ui-option>
      </web-ui-select>
      <div className="flex flex-wrap items-center gap-2">
        <web-ui-button size="28" variant="secondary" onClick={() => picker.current?.show()}>
          show()
        </web-ui-button>
        <web-ui-button size="28" variant="secondary" onClick={() => picker.current?.hide()}>
          hide()
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">Last detail.open = {last}</output>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-select
      ref="picker"
      trigger="none"
      placeholder="none mode"
      aria-label="none mode"
      @open-change="last = $event.detail.open ? 'true' : 'false'"
    >
      <web-ui-option value="a" label="Option A"></web-ui-option>
      <web-ui-option value="b" label="Option B"></web-ui-option>
    </web-ui-select>
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button size="28" variant="secondary" @click="picker?.show()">show()</web-ui-button>
      <web-ui-button size="28" variant="secondary" @click="picker?.hide()">hide()</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">Last detail.open = {{ last }}</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiSelect } from '@greypan/web-ui'
import { ref, useTemplateRef } from 'vue'

const picker = useTemplateRef<WebUiSelect>('picker')
const last = ref('—')
</script>
```

### Open-change notification

`open-change` is notification only, with `detail.open` as the current state. Gestures and `show()` / `hide()` dispatch it; writing `open` directly is silent and lets the page drive the panel one-way.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('-')

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
const last = ref('-')

function onOpenChange(event: WebUiEvent<WebUiSelect, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### Icon variant

`variant="icon"` keeps the arrow on the right and turns the left side into an icon area; the icon can follow the selected value. The trigger itself has no text, so give the select an `aria-label`.

```tsx
import { lucideLayoutGrid, lucideList, lucideSettings } from '@greypan/web-ui/icons'
import { useState } from 'react'

const ICONS = { grid: lucideLayoutGrid, list: lucideList, settings: lucideSettings } as const
type ViewMode = keyof typeof ICONS

export default function Demo() {
  const [view, setView] = useState<ViewMode>('grid')

  return (
    <web-ui-select
      variant="icon"
      aria-label="View mode"
      value={view}
      onChange={event => {
        const next = event.currentTarget.value
        if (next in ICONS) setView(next as ViewMode)
      }}
    >
      <web-ui-icon slot="trigger" icon={ICONS[view]} size={18}></web-ui-icon>
      <web-ui-option value="grid" label="Grid"></web-ui-option>
      <web-ui-option value="list" label="List"></web-ui-option>
      <web-ui-option value="settings" label="Settings"></web-ui-option>
    </web-ui-select>
  )
}
```

```vue
<template>
  <web-ui-select variant="icon" aria-label="View mode" :value="view" @change="pick($event.currentTarget.value)">
    <web-ui-icon slot="trigger" :icon="ICONS[view]" :size="18"></web-ui-icon>
    <web-ui-option value="grid" label="Grid"></web-ui-option>
    <web-ui-option value="list" label="List"></web-ui-option>
    <web-ui-option value="settings" label="Settings"></web-ui-option>
  </web-ui-select>
</template>

<script setup lang="ts">
import { lucideLayoutGrid, lucideList, lucideSettings } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const ICONS = { grid: lucideLayoutGrid, list: lucideList, settings: lucideSettings }
type ViewMode = keyof typeof ICONS

const view = ref<ViewMode>('grid')

function pick(value: string) {
  if (value in ICONS) view.value = value as ViewMode
}
</script>
```

### Form value

`name` makes the selected value enter `FormData` under that field name. When the value is empty, `required` reports `valueMissing` and native submission is blocked. `form.reset()` returns the value to the initial value at mount, and the trigger goes back to `placeholder` with it.

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

By default an ancestor's `overflow` clips the panel. `portal` renders the panel into the theme overlay container, where no container can clip it.

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

| Name               | Description                                                                                                                              | Type                | Default          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------- |
| `placeholder`      | Placeholder text shown when nothing is selected.                                                                                         | `string`            | `''`             |
| `variant`          | Trigger appearance: `label` shows the selected text and arrow, `icon` keeps the arrow and treats the `trigger` slot as icon content.     | `'label' \| 'icon'` | `'label'`        |
| `trigger`          | Trigger gesture set, separated by spaces or commas: `click`, `hover`, `focus`, `none`; reads back as a comma-separated canonical string. | `string`            | `'click'`        |
| `show-delay`       | Hover-open delay (milliseconds); only hover-originated opens use it.                                                                     | `number`            | `200`            |
| `hide-delay`       | Hover-close delay (milliseconds); only hover-originated closes use it.                                                                   | `number`            | `100`            |
| `disabled`         | Disabled state.                                                                                                                          | `boolean`           | `false`          |
| `required`         | Required validation.                                                                                                                     | `boolean`           | `false`          |
| `portal`           | Renders the dropdown panel in the theme overlay container.                                                                               | `boolean`           | `false`          |
| `placement`        | Placement of the dropdown panel; defaults to expanding downward from the trigger's bottom-left corner.                                   | `Placement`         | `'bottom-start'` |
| `no-scroll-lock`   | Does not lock page scrolling while open.                                                                                                 | `boolean`           | `false`          |
| `overlayContainer` | Explicit Portal container (property).                                                                                                    | `OverlayContainer`  | —                |
| `name`             | Form field name.                                                                                                                         | `string`            | `''`             |
| `aria-label`       | Accessible name of the combobox.                                                                                                         | `string \| null`    | `null`           |
| `value`            | Selected value.                                                                                                                          | `string`            | `''`             |
| `open`             | Declarative switch; writing it directly is silent and does not dispatch `open-change`.                                                   | `boolean`           | `false`          |
| `isOpen`           | Whether the panel is currently open (read-only).                                                                                         | `boolean`           | —                |

### Events

| Name          | Description                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `input`       | Fired after the user selects an item; `value` is the new value.                                                                              |
| `change`      | Dispatched in pair with `input`, one each per selection.                                                                                     |
| `open-change` | Dispatched when gestures or `show()` / `hide()` change the open state; `detail.open` is the current state. Writing `open` does not dispatch. |

### Slots

| Name      | Description                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `trigger` | Custom trigger area content, replacing the default label; with `variant="icon"` it is the left icon area and the arrow stays on the right. |
| `default` | Projects `<web-ui-option>` candidates; other nodes also count as panel content.                                                            |

### Methods

| Name       | Description                                                                              |
| ---------- | ---------------------------------------------------------------------------------------- |
| `show()`   | Opens the panel and dispatches `open-change`; no effect when `disabled` or already open. |
| `hide()`   | Closes the panel and dispatches `open-change`; no effect when already closed.            |
| `toggle()` | Toggles according to the current `open` and dispatches `open-change`.                    |

### Behavior

The panel uses `role="listbox"` and the candidates use `role="option"`. The option matching the current non-empty `value` is set to `aria-selected="true"`, and `aria-disabled` mirrors the disabled state.

Outside Portal mode, `aria-activedescendant` points at the current option during keyboard navigation; in Portal mode this attribute is not set.

Opening requires content: with nothing in the `default` slot to show, click, keyboard gestures and hover do nothing. `show()` and writing `open` still open an empty panel, and content added while closed does not open it. If the last content disappears while the panel is open, it collapses immediately without an exit transition.

When closed, Space / Enter / ArrowDown / ArrowUp open the panel; under `none` these keys no longer auto-open it. When expanded, ArrowDown / ArrowUp, Home / End, and typeahead move the active item, Enter / Space select and close, and Escape closes.

`hover` opens and closes with pointer entry and exit; once the pointer leaves both the trigger and the panel it closes after `hide-delay` when focus is outside them if `focus` is enabled. `show-delay` / `hide-delay` only apply to hover-originated opens and closes; clicks, focus and programmatic calls act immediately. Outside clicks close layers with `click`, focus loss closes layers with `focus`, and Escape closes layers except those in `none`.

A Portal panel reads these variables as resolved on the host when it is created; after updating the host, the Portal panel must be reopened for the change to take effect.

### CSS Custom Properties

| Name                      | Description                                   | Default                            |
| ------------------------- | --------------------------------------------- | ---------------------------------- |
| `--wui-select-max-width`  | Maximum dropdown width                        | `500px`                            |
| `--wui-select-max-height` | Maximum height of the scrolling dropdown area | `200px`                            |
| `--wui-overlay-min-width` | Minimum dropdown width                        | `200px`                            |
| `--wui-select-bg-hover`   | Trigger hover background                      | `--wui-color-surface-glass-hover`  |
| `--wui-select-bg-active`  | Trigger pressed/open background               | `--wui-color-surface-glass-active` |

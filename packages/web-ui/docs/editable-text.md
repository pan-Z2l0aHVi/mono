# Editable Text

English | [简体中文](./editable-text.CN.md)

An inline plain-text editor. Click the text to edit it in place; Enter and blur commit, and only Escape cancels. Entering edit mode does not shift the layout.

## Samples

### Basic

Clicking the text enters edit mode with the caret at the click position; focusing with Tab puts the caret at the end of the text. Font, color, and alignment are inherited entirely from the outer context, so before editing it is just a piece of ordinary text.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text value="Click to edit in place" aria-label="Title"></web-ui-editable-text>
      <web-ui-editable-text
        value="This block inherits its typography into the edit layer"
        className="text-lg font-medium"
      ></web-ui-editable-text>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text value="Click to edit in place" aria-label="Title"></web-ui-editable-text>
    <web-ui-editable-text
      value="This block inherits its typography into the edit layer"
      class="text-lg font-medium"
    ></web-ui-editable-text>
  </div>
</template>
```

### Controlled value and commit

`value` is the current value and also the form-submitted value. `input` fires on every input; `change` is dispatched once at a commit point, which is Enter or blur. To have the page own the value, handle `change` and write it back.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [title, setTitle] = useState('Quarterly review')
  const [draft, setDraft] = useState('')
  const [committed, setCommitted] = useState('')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text
        value={title}
        aria-label="Title"
        placeholder="Untitled"
        onInput={event => setDraft(event.currentTarget.value)}
        onChange={event => {
          setTitle(event.currentTarget.value)
          setCommitted(event.currentTarget.value)
        }}
      ></web-ui-editable-text>
      <output className="text-sm text-(--wui-color-text-secondary)">
        input draft: {draft || '(nothing typed yet)'} · change commit: {committed || '(not committed)'}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text
      :value="title"
      aria-label="Title"
      placeholder="Untitled"
      @input="onInput"
      @change="onChange"
    ></web-ui-editable-text>
    <output class="text-sm text-(--wui-color-text-secondary)">
      input draft: {{ draft || '(nothing typed yet)' }} · change commit: {{ committed || '(not committed)' }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEditableText, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const title = ref('Quarterly review')
const draft = ref('')
const committed = ref('')

function onInput(event: WebUiEvent<WebUiEditableText, 'input'>) {
  draft.value = event.currentTarget.value
}

function onChange(event: WebUiEvent<WebUiEditableText, 'change'>) {
  const value = event.currentTarget.value
  title.value = value
  committed.value = value
}
</script>
```

### Escape cancels

Only Escape cancels: the value returns to the state it had when editing began, `cancel` is dispatched instead of `change`, and focus goes back to the host. The component handles this key press, so an outer overlay (drawer, menu) does not close on the same key press. `cancel` neither bubbles nor is composed, so listeners always attach to the component itself. React has no synthetic event for it, so a native listener is the only option.

```tsx
import type { WebUiEditableText } from '@greypan/web-ui'
import { useEffect, useRef, useState } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiEditableText>(null)
  const [last, setLast] = useState('No action yet')

  useEffect(() => {
    const element = fieldRef.current
    if (!element) return
    const onCancel = () => setLast('cancel: Escape restored the value to the state when editing began')
    element.addEventListener('cancel', onCancel)
    return () => element.removeEventListener('cancel', onCancel)
  }, [])

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text ref={fieldRef} value="Change a few characters, then press Escape"></web-ui-editable-text>
      <output className="text-sm text-(--wui-color-text-secondary)">{last}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text value="Change a few characters, then press Escape" @cancel="onCancel"></web-ui-editable-text>
    <output class="text-sm text-(--wui-color-text-secondary)">{{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const last = ref('No action yet')

function onCancel() {
  last.value = 'cancel: Escape restored the value to the state when editing began'
}
</script>
```

### Empty value and placeholder

`placeholder` is shown only when the value is empty. Submitting an empty value still counts as a commit, and after the value becomes empty the display shows the placeholder again. With an empty value and no `placeholder`, a clickable line is still kept so the user can click into edit mode.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text placeholder="Untitled project" aria-label="Empty"></web-ui-editable-text>
      <web-ui-editable-text
        value="No placeholder when there is a value"
        placeholder="Untitled project"
        aria-label="Has value"
      ></web-ui-editable-text>
      <web-ui-editable-text aria-label="After clearing"></web-ui-editable-text>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text placeholder="Untitled project" aria-label="Empty"></web-ui-editable-text>
    <web-ui-editable-text
      value="No placeholder when there is a value"
      placeholder="Untitled project"
      aria-label="Has value"
    ></web-ui-editable-text>
    <web-ui-editable-text aria-label="After clearing"></web-ui-editable-text>
  </div>
</template>
```

### Multiline

Newlines already present in the value render as lines as usual (`white-space` defaults to `pre-wrap`), and the second line wraps naturally at the box width. Enter commits rather than inserting a newline, so multiline copy relies on the value containing `\n`. Entering edit mode does not shift the content by a pixel.

```tsx
export default function Demo() {
  return (
    <web-ui-editable-text
      className="w-80"
      value={
        'The first line breaks where the value has a newline\nThe second line of longer copy wraps at the box width; the text state and the edit state share the same box'
      }
      placeholder="Multiline placeholder"
      aria-label="Multiline"
    ></web-ui-editable-text>
  )
}
```

```vue
<template>
  <web-ui-editable-text
    class="w-80"
    :value="multiline"
    placeholder="Multiline placeholder"
    aria-label="Multiline"
  ></web-ui-editable-text>
</template>

<script setup lang="ts">
const multiline =
  'The first line breaks where the value has a newline\nThe second line of longer copy wraps at the box width; the text state and the edit state share the same box'
</script>
```

### Disabled and readonly

`disabled` removes the host from the tab order and blocks editing from both pointer and keyboard; it only switches the cursor to `not-allowed`, with no visual dimming. `readonly` can still be focused and selected, but input is rejected and leaving edit mode dispatches no `change`.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text
        value="Disabled: cannot be clicked and is out of the tab order"
        disabled
        aria-label="Disabled"
      ></web-ui-editable-text>
      <web-ui-editable-text
        placeholder="Disabled and empty: still shows the placeholder"
        disabled
        aria-label="Disabled empty"
      ></web-ui-editable-text>
      <web-ui-editable-text
        value="Readonly: can select and copy, cannot edit"
        readonly
        aria-label="Readonly"
      ></web-ui-editable-text>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text
      value="Disabled: cannot be clicked and is out of the tab order"
      disabled
      aria-label="Disabled"
    ></web-ui-editable-text>
    <web-ui-editable-text
      placeholder="Disabled and empty: still shows the placeholder"
      disabled
      aria-label="Disabled empty"
    ></web-ui-editable-text>
    <web-ui-editable-text
      value="Readonly: can select and copy, cannot edit"
      readonly
      aria-label="Readonly"
    ></web-ui-editable-text>
  </div>
</template>
```

### Form value

`name` is the field name and the submitted value is the current value; an empty value still enters `FormData` as an empty string. The component has no `required` and forwards no validation state, so required checks belong to the outer layer. `form.reset()` restores the value from mount time.

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
          if (typeof value === 'string') fields.push(`${name}=${value.replace(/\n/g, '\\n') || '(empty)'}`)
        }
        setSubmitted(fields.join(' · ') || '(no fields)')
      }}
    >
      <div className="flex flex-col items-start gap-1">
        <span className="text-sm text-(--wui-color-text-secondary)">Title</span>
        <web-ui-editable-text name="title" value="Initial title" aria-label="Title"></web-ui-editable-text>
      </div>
      <div className="flex flex-col items-start gap-1">
        <span className="text-sm text-(--wui-color-text-secondary)">Summary: optional</span>
        <web-ui-editable-text
          name="bio"
          className="w-80"
          placeholder="Write a one-line summary"
          aria-label="Summary"
        ></web-ui-editable-text>
      </div>
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
    <div class="flex flex-col items-start gap-1">
      <span class="text-sm text-(--wui-color-text-secondary)">Title</span>
      <web-ui-editable-text name="title" value="Initial title" aria-label="Title"></web-ui-editable-text>
    </div>
    <div class="flex flex-col items-start gap-1">
      <span class="text-sm text-(--wui-color-text-secondary)">Summary: optional</span>
      <web-ui-editable-text
        name="bio"
        class="w-80"
        placeholder="Write a one-line summary"
        aria-label="Summary"
      ></web-ui-editable-text>
    </div>
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
    if (typeof value === 'string') fields.push(`${name}=${value.replace(/\n/g, '\\n') || '(empty)'}`)
  }
  submitted.value = fields.join(' · ') || '(no fields)'
}

function reset() {
  form.value?.reset()
  submitted.value = ''
}
</script>
```

### Preserving the draft on unmount

When an element that is halfway through editing is removed from the DOM, Chromium dispatches `blur` and finishes with commit semantics, while WebKit dispatches nothing and the draft is discarded with the component. `commit-on-unmount` exists for the latter case.

Once enabled, unmounting also finishes with commit semantics: the draft becomes the new value, exactly one `change` is dispatched, and it is only committed when the draft really differs from the value at the start of editing. When the unmount is driven by the framework's own render, `change` cannot reach the framework's event delegation root, so attach a native listener and read the value from the element.

```tsx
import type { WebUiEditableText } from '@greypan/web-ui'
import { useEffect, useRef, useState } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiEditableText>(null)
  const [mounted, setMounted] = useState(true)
  const [saved, setSaved] = useState('')

  // The unmount is driven by this render, so change never reaches React's delegated root: attach a native listener and read the value from the element
  useEffect(() => {
    const element = fieldRef.current
    if (!element) return
    const onChange = () => {
      const value = element.value
      queueMicrotask(() => setSaved(value))
    }
    element.addEventListener('change', onChange)
    return () => element.removeEventListener('change', onChange)
  }, [mounted])

  return (
    <div className="flex flex-col items-start gap-3">
      {mounted ? (
        <web-ui-editable-text
          ref={fieldRef}
          commit-on-unmount
          value="Change a few characters, then click the unmount button below"
          aria-label="Unmountable"
        ></web-ui-editable-text>
      ) : (
        <span className="text-sm text-(--wui-color-text-secondary)">This line has been removed from the DOM</span>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button onClick={() => setMounted(false)}>Unmount this line</web-ui-button>
        <web-ui-button onClick={() => setMounted(true)}>Mount again</web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">
          Preserved on unmount: {saved || '(nothing yet)'}
        </output>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text
      v-if="mounted"
      commit-on-unmount
      value="Change a few characters, then click the unmount button below"
      aria-label="Unmountable"
      @change="saveDraft"
    ></web-ui-editable-text>
    <span v-else class="text-sm text-(--wui-color-text-secondary)">This line has been removed from the DOM</span>
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button @click="mounted = false">Unmount this line</web-ui-button>
      <web-ui-button @click="mounted = true">Mount again</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)"
        >Preserved on unmount: {{ saved || '(nothing yet)' }}</output
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEditableText, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const mounted = ref(true)
const saved = ref('')

// The unmount is driven by this render: when change arrives the element is leaving the document, so take the value out first and then hand it to state
function saveDraft(event: WebUiEvent<WebUiEditableText, 'change'>) {
  const value = event.currentTarget.value
  queueMicrotask(() => (saved.value = value))
}
</script>
```

### Focus and select all

The host itself is focusable (it carries `tabindex="0"` when not disabled). `focus()` focuses the host and enters edit mode; `select()` enters edit mode and selects the content, and when already in edit mode it only selects again. Neither has any effect when `disabled`.

```tsx
import type { WebUiEditableText } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiEditableText>(null)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text
        ref={fieldRef}
        value="Type directly to replace after selecting all"
        aria-label="Replace"
      ></web-ui-editable-text>
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button onClick={() => fieldRef.current?.focus()}>Focus</web-ui-button>
        <web-ui-button onClick={() => fieldRef.current?.select()}>Select all</web-ui-button>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text
      ref="field"
      value="Type directly to replace after selecting all"
      aria-label="Replace"
    ></web-ui-editable-text>
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button @click="field?.focus()">Focus</web-ui-button>
      <web-ui-button @click="field?.select()">Select all</web-ui-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEditableText } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const field = useTemplateRef<WebUiEditableText>('field')
</script>
```

### CSS variables

The whitespace and word-break variables apply to both the display state and the edit state, so overrides keep them consistent. The caret color follows the shared `--wui-color-accent`, and setting it on the host or any ancestor works.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text
        value="AAAABBBBCCCCDDDDEEEE"
        className="w-32"
        aria-label="Long word breaking"
      ></web-ui-editable-text>
      <web-ui-editable-text
        value={'Whitespace is preserved as-is\npre-wrap by default'}
        className="w-40 [--wui-editable-text-white-space:pre]"
        aria-label="Preserve whitespace"
      ></web-ui-editable-text>
      <web-ui-editable-text
        value="Caret color changed to this accent"
        className="[--wui-color-accent:#7c3aed]"
      ></web-ui-editable-text>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text
      value="AAAABBBBCCCCDDDDEEEE"
      class="w-32"
      aria-label="Long word breaking"
    ></web-ui-editable-text>
    <web-ui-editable-text
      :value="spacing"
      class="w-40 [--wui-editable-text-white-space:pre]"
      aria-label="Preserve whitespace"
    ></web-ui-editable-text>
    <web-ui-editable-text
      value="Caret color changed to this accent"
      class="[--wui-color-accent:#7c3aed]"
    ></web-ui-editable-text>
  </div>
</template>

<script setup lang="ts">
const spacing = 'Whitespace is preserved as-is\npre-wrap by default'
</script>
```

## API

### Props

| Name                | Description                                                                                                        | Type             | Default |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------- | ------- |
| `name`              | Form field name.                                                                                                   | `string`         | `''`    |
| `placeholder`       | Placeholder text shown when the value is empty.                                                                    | `string`         | `''`    |
| `disabled`          | Disabled state; affects behavior only, without visual dimming.                                                     | `boolean`        | `false` |
| `readonly`          | Readonly state: can still be focused and selected, but cannot be edited or committed.                              | `boolean`        | `false` |
| `commit-on-unmount` | Ends edit mode with commit semantics on unmount; under WebKit there is no blur, and only this preserves the draft. | `boolean`        | `false` |
| `aria-label`        | Accessible name.                                                                                                   | `string \| null` | `null`  |
| `value`             | Current value, also the form-submitted value.                                                                      | `string`         | `''`    |

### Events

| Name     | Description                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------- |
| `input`  | Fires on every input.                                                                                   |
| `change` | Fires when the draft is committed (Enter or blur); exactly one per commit.                              |
| `cancel` | Fires when Escape cancels; does not bubble or compose: listeners always attach to the component itself. |

### Methods

| Name       | Description                                                                                                                                                                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `focus()`  | Focuses the host and enters edit mode with the caret at the end of the text; when `disabled` the host has no tab stop and calling it has no effect.                                                                                                                                |
| `blur()`   | While editing it is equivalent to a blur commit: the draft becomes the new value and exactly one `change` is dispatched (under `readonly` it only exits editing without dispatching). Outside edit mode it is a no-op; moving focus outside the component is the same commit path. |
| `select()` | Enters edit mode and selects the content; when already in edit mode it only selects again. Does not enter edit mode when `disabled`.                                                                                                                                               |

### Behavior

Clicking puts the caret at the click position; keyboard focus puts it at the end of the text.

Both `Enter` and `blur` commit the draft and dispatch exactly one `change`: `Enter` inserts no newline and returns focus to the host; `blur` does not touch focus, which stays where the user moved it.

Only `Escape` cancels: the value returns to the state it had when editing began, `cancel` is dispatched instead of `change`, and focus goes back to the host. The component handles this key press, so an outer overlay (drawer, menu) does not close on the same key press.

`cancel` neither bubbles nor is composed and is dispatched only on the component itself, so listeners always attach to the component itself.

Newlines already in the value still render as multiple lines; Enter cannot add new lines. An empty value keeps showing the placeholder. An empty or whitespace-only draft still has a place to hold the caret even when the host itself collapses (a flex item with `min-width: 0`, a table cell).

Edit mode is expressed by the `editing` attribute on the host, and the attribute is not set when `disabled`.

`select()` enters edit mode and selects the content; when already in edit mode it only selects again. When `disabled` it has no effect, just like `focus()`.

When `readonly`, the component can still be focused and selected, but input is rejected and leaving edit mode dispatches no `change`.

There are two layout constraints. `line-height` must be at least `1`, otherwise the text shifts. With `nowrap` and a fixed width, copy wider than the box overflows in the display state and scrolls inside the box in the edit state.

### Unmounted mid-edit

Engines differ when an element being edited is removed from the DOM: Chromium dispatches `blur` and finishes with commit semantics, WebKit dispatches nothing and the draft is discarded with the element, and Gecko is unverified, so treat it as unknown.

To keep "the draft survives when a line is recycled", enable `commit-on-unmount`. On Safari and iOS it is the only way to preserve the draft; on Chromium it moves the commit ahead of the `blur` that removal already produces.

With it enabled, unmounting finishes with commit semantics: the draft becomes the new value, editing ends, exactly one `change` is dispatched, and it only commits when the draft really differs from the value at the start of editing. Outside edit mode, under `disabled`, and under `readonly` no commit event is dispatched, but the draft stays on the component under `disabled` while under `readonly` it is really discarded. This is not treated as a cancel: the user gets neither `change` nor `cancel`.

`change` still dispatches upward along the composed path, including ancestors that are themselves being unmounted, so listeners cannot assume the component is still in the document. When the result must outlive this removal, hand it explicitly to state outside the host tree, for example with `queueMicrotask`. An unmount driven by the framework's own render never reaches the framework's delegated event root, so the value has to be read from the element instead.

Setting `display: none` on an ancestor does not count as removal. The component is still in the document and dispatches no event; that situation needs your app to end editing explicitly.

The host is an inline-level box: without a set width it sizes to its content, and when lines wrap its height grows with the line count. Font, color, text alignment, and whitespace handling are all inherited from the outer context, so before editing it is just a piece of ordinary text.

The caret color follows the shared semantic token `--wui-color-accent` by default; setting that token on the host or any ancestor recolors it everywhere. A long run without spaces (consecutive letters and digits) wider than the box breaks inside the box, and the display state does not overflow the host box.

### CSS Custom Properties

| Name                                | Description                                                                                                           | Default    |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------- |
| `--wui-editable-text-white-space`   | Whitespace handling shared by the display state and the edit state                                                    | `pre-wrap` |
| `--wui-editable-text-overflow-wrap` | Word-break handling shared by both; by default long runs without spaces break inside the box, matching native editing | `anywhere` |

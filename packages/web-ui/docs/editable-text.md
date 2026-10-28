---
component: editable-text
tag: web-ui-editable-text
---

An inline plain-text editor: click the text to edit it in place, Enter and blur commit, and only Escape cancels; the text layer and the edit layer share one box, so entering edit mode moves nothing by a pixel.

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

`value` is the current value and also the form-submitted value; `input` comes from the native input of the edit layer, and `change` is dispatched once at a commit point—Enter or blur. To have the page own the value, handle `change` and write it back.

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

Only Escape cancels: the value returns to the state it had when editing began, `cancel` is dispatched instead of `change`, focus goes back to the host, and this key press is consumed by the edit layer, so an outer overlay (drawer, menu) does not close on the same key press. `cancel` neither bubbles nor is composed, so listeners always attach to the component itself—React has no synthetic event for it, so a native listener is the only option.

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

`placeholder` is shown only when the value is empty, in the secondary text color; submitting an empty value still counts as a commit, and the text layer falls back to the placeholder once the value becomes empty. With an empty value and no `placeholder`, the component keeps a zero-width character to preserve the line box and the place to click into edit mode.

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

Newlines already present in the value render as lines as usual (`white-space` defaults to `pre-wrap`), and the second line wraps naturally at the box width; Enter commits rather than inserting a newline, so multiline copy relies on the value containing `\n`. The text layer and the edit layer share the same box and typography, so entering edit mode does not shift a pixel.

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

`disabled` removes the host from the tab order and blocks editing from both pointer and keyboard, switching only the cursor to `not-allowed` without any visual dimming; `readonly` can still be focused and selected but rejects input, and leaving edit mode dispatches no `change`.

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

`name` is the field name and the submitted value is the current value; an empty value still enters `FormData` as an empty string. The component has no `required` and forwards no validation state, so required checks belong to the outer layer; `form.reset()` restores the value from mount time.

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

When an element that is halfway through editing is removed from the DOM, Chromium dispatches `blur` and finishes with commit semantics, while WebKit dispatches nothing and the draft is discarded with the component—`commit-on-unmount` exists for the latter.

Once enabled, unmounting reuses the same commit path: the draft becomes the new value, exactly one `change` is dispatched, and it is only committed when the draft really differs from the value at the start of editing.

When the removal is driven by the component's own render, `change` cannot reach the framework's event delegation root, so this example attaches a native listener, reads the value from the element, and hands the result to state outside the component tree in a microtask.

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

The host itself is focusable (it carries `tabindex="0"` when not disabled); `focus()` focuses the host and enters edit mode, and `select()` enters edit mode and selects the content—when already in edit mode it only selects again. Neither has any effect when `disabled`.

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

Both layers share the same whitespace and word-break variables, so overrides keep them consistent; the caret color comes from the shared `--wui-color-accent`, and since custom properties inherit across the shadow boundary, setting it on the host or any ancestor works.

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
| `input`  | Fires on every input, bubbled from the edit layer's native `input`.                                     |
| `change` | Fires when the draft is committed (Enter or blur); exactly one per commit.                              |
| `cancel` | Fires when Escape cancels; does not bubble or compose: listeners always attach to the component itself. |

### Methods

| Name       | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `focus()`  | The component does not override it, so this is native host focus: the host has a tab stop (`tabindex="0"`), the host's `focus` listener catches the focus and enters edit mode with the caret at the end of the text; when `disabled` the host has no tab stop and calling it has no effect.                                                                                                                                                                                                              |
| `blur()`   | The component does not override it, so this is native blurring: in edit mode focus is on the shadow's edit layer, and calling `blur()` on the host still moves focus away from the edit layer, so it goes through the edit layer's own blur commit path—the draft becomes the new value and exactly one `change` is dispatched (under `readonly` it only exits editing without dispatching). Outside edit mode it is a no-op; moving focus outside the component is another way to trigger the same path. |
| `select()` | Enters edit mode and selects the content; when already in edit mode it only selects again. Does not enter edit mode when `disabled`.                                                                                                                                                                                                                                                                                                                                                                      |

### Behavior

Clicking puts the caret at the click position; keyboard focus puts it at the end of the text.

Both `Enter` and `blur` commit the draft and dispatch exactly one `change`: `Enter` inserts no newline and returns focus to the host; `blur` does not touch focus, which stays where the user moved it.

Only `Escape` cancels: the value returns to the state it had when editing began, `cancel` is dispatched instead of `change`, focus goes back to the host, and the key press is consumed by the edit layer, so an outer overlay (drawer, menu) does not close on the same key press.

`cancel` neither bubbles nor is composed and is dispatched only on the component itself: a custom `cancel` that reaches the `<dialog>` inside an outer overlay shadow root (whether composed or not) is treated as a close request and closes that overlay as well (issue #159), so listeners always attach to the component itself.

Newlines already in the value still render as multiple lines; Enter cannot add new lines. An empty value keeps showing the placeholder; the edit layer always grows with its own content, so an empty or whitespace-only draft still has a place to hold the caret even when the host itself collapses (a flex item with `min-width: 0`, a table cell).

Edit mode is expressed by the `editing` attribute on the host, and the attribute is not set when `disabled`.

`select()` enters edit mode and selects the content; when already in edit mode it only selects again. When `disabled` it has no effect, just like `focus()`.

When `readonly`, the component can still be focused and selected, but input is rejected and leaving edit mode dispatches no `change`.

The shared box brings two constraints: `line-height` must be at least `1`, otherwise the native edit layer's content is taller than its box and the text shifts by 1px; with `nowrap` and a fixed width, copy wider than the box overflows in the text state and scrolls inside the box in the edit state.

### Unmounted mid-edit

What happens when an element being edited is removed from the DOM depends on the engine, and that difference is exactly why this property exists:

- **Chromium** dispatches `blur` on the edit layer, so a pure `value` commit already happens today and the default `false` does not change that. `blur` and the `change` it triggers are both dispatched synchronously **after** the unmount callback has run, which means the commit lands after "the consumer has already updated its state for this removal".
- **WebKit (Safari, iOS)** dispatches no `blur` at all. With the default `false` nothing is committed and the draft is discarded with the element.
- **Gecko (Firefox) is unverified**: no Firefox could start on the machines used for testing, so nothing is asserted here. Treat Gecko as unknown rather than assuming it matches either column above; enable this property when you rely on unmount commits to preserve drafts.

If your code depends on "the draft survives when a line is recycled", **enable `commit-on-unmount`**: on Safari and iOS it is the only way to preserve the draft, and on Chromium it moves the commit ahead of the `blur` that removal already produces.

Under both engines, unmounting finishes an open editing session with commit semantics—the draft becomes the new value, editing ends, and exactly one `change` is dispatched, through the same implementation as `Enter` and `blur`.

The conclusion has been verified on Chromium and WebKit; the browser test suite only runs Chromium, the WebKit result comes from a one-off cross-engine investigation outside CI, and Gecko is not tested at all.

`Enter` and `blur` are triggered by user actions and always count as commit intent; unmounting has no such intent. So it only commits when the draft really differs from the value at the start of editing—a session where nothing changed produces no empty commit.

Outside edit mode there is nothing to commit; when `disabled` or `readonly` it follows the same path as `blur` and dispatches no commit event. But the two handle "a draft already exists" differently: under `disabled` the draft stays on the component, while under `readonly` the draft is really discarded.

`readonly` cannot take back characters typed earlier, and at unmount time there is no blur left to fall back on—on WebKit there is not even a blur. The reachable path is: enter the editable state → type a draft → switch to readonly in the meantime → unmount.

This is not treated as a cancel—the cancel contract restores the value from the start of editing, whereas unmounting has neither focus to return nor a host to receive the result; what the user sees is "the text I typed is gone", with neither `change` nor `cancel`.

The commit happens inside the unmount callback, and `change` still dispatches upward along the composed path, so listeners attached to the component itself or any ancestor run, **including ancestors that are themselves being unmounted**: dispatching does not require the ancestor to still be in the document. Listeners therefore cannot assume the component is still in the document; when the result must outlive this removal, hand it explicitly to state outside the host tree, for example with `queueMicrotask`.

Note that this reachability does not hold for "an unmount driven by React's own render": that removal never reaches React's delegated event root, so `onChange` does not fire and the value has to be read from the element instead—the same caveat as the `cancel` note above.

Setting `display: none` on an ancestor does not count as removal—under both engines the component is still in the document and dispatches no event; that situation needs the consumer to end editing explicitly.

The host is an inline-level box: without a set width it sizes to its content, and when lines wrap its height grows with the line count. Font, color, text alignment, and whitespace handling are all inherited from the outer context, so before editing it is just a piece of ordinary text.

The caret color follows the shared semantic token `--wui-color-accent` by default; setting that token on the host or any ancestor recolors it everywhere. Both layers break long runs without spaces (consecutive letters and digits) at the same set of break points: a run wider than the box breaks inside the box, and the text state does not overflow the host box.

### CSS Custom Properties

| Name                                | Description                                                                                                                   | Default    |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `--wui-editable-text-white-space`   | Whitespace handling for both layers                                                                                           | `pre-wrap` |
| `--wui-editable-text-overflow-wrap` | Word-break handling for both layers; by default long runs without spaces break inside the box, matching the native edit layer | `anywhere` |

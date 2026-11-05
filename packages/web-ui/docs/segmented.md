# Segmented

segmented is a single-select button group whose children are `<web-ui-segmented-trigger>` elements. `value` synchronizes the selected item, and the group integrates with a native `<form>`.

## Samples

### Basic controlled

The default slot projects segmented-trigger, and `value` decides which item is selected. After a click (or Enter / Space), `input` carries the new value back, and the page writes it into `value` to stay controlled.

Holding the current item and dragging horizontally also switches continuously. On release the indicator snaps to the nearest trigger; a fast flick switches by velocity.

`aria-label` is forwarded to the group's listbox and names the set of options. `aria-labelledby` IDREFs cannot resolve across the component boundary, so when you need a visible text label, use `aria-label`.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [day, setDay] = useState('wed')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-segmented aria-label="Weekday" value={day} onInput={event => setDay(event.currentTarget.value)}>
        <web-ui-segmented-trigger value="mon">Mon</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="tue">Tue</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="wed">Wed</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="thu">Thu</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="fri">Fri</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output className="text-sm text-(--wui-color-text-secondary)">Selected: {day}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-segmented aria-label="Weekday" :value="day" @input="day = $event.currentTarget.value">
      <web-ui-segmented-trigger value="mon">Mon</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="tue">Tue</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="wed">Wed</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="thu">Thu</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="fri">Fri</web-ui-segmented-trigger>
    </web-ui-segmented>
    <output class="text-sm text-(--wui-color-text-secondary)">Selected: {{ day }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const day = ref('wed')
</script>
```

### Variant comparison

`variant` decides the material of the track and the indicator. `inset` (default) embeds the indicator in a track with a permanent stroke ring and a shadow; in `raised` the indicator floats above the track. Both variants share the same interaction, pressed state, and text color; only the idle look differs.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [insetView, setInsetView] = useState('week')
  const [raisedView, setRaisedView] = useState('week')

  return (
    <div className="flex flex-wrap items-start gap-8">
      <div className="flex flex-col items-start gap-3">
        <span className="text-sm text-(--wui-color-text-secondary)">inset (default)</span>
        <web-ui-segmented value={insetView} onInput={event => setInsetView(event.currentTarget.value)}>
          <web-ui-segmented-trigger value="day">Day</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="week">Week</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="month">Month</web-ui-segmented-trigger>
        </web-ui-segmented>
        <output className="text-sm text-(--wui-color-text-secondary)">Selected: {insetView}</output>
      </div>

      <div className="flex flex-col items-start gap-3">
        <span className="text-sm text-(--wui-color-text-secondary)">raised</span>
        <web-ui-segmented
          variant="raised"
          value={raisedView}
          onInput={event => setRaisedView(event.currentTarget.value)}
        >
          <web-ui-segmented-trigger value="day">Day</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="week">Week</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="month">Month</web-ui-segmented-trigger>
        </web-ui-segmented>
        <output className="text-sm text-(--wui-color-text-secondary)">Selected: {raisedView}</output>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-start gap-8">
    <div class="flex flex-col items-start gap-3">
      <span class="text-sm text-(--wui-color-text-secondary)">inset (default)</span>
      <web-ui-segmented :value="insetView" @input="insetView = $event.currentTarget.value">
        <web-ui-segmented-trigger value="day">Day</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="week">Week</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="month">Month</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output class="text-sm text-(--wui-color-text-secondary)">Selected: {{ insetView }}</output>
    </div>

    <div class="flex flex-col items-start gap-3">
      <span class="text-sm text-(--wui-color-text-secondary)">raised</span>
      <web-ui-segmented variant="raised" :value="raisedView" @input="raisedView = $event.currentTarget.value">
        <web-ui-segmented-trigger value="day">Day</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="week">Week</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="month">Month</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output class="text-sm text-(--wui-color-text-secondary)">Selected: {{ raisedView }}</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const insetView = ref('week')
const raisedView = ref('week')
</script>
```

### Item and group disabled

`disabled` on a trigger disables only that item, and the rest keep switching. `disabled` on `<web-ui-segmented>` disables the whole group: the triggers' own `disabled` attributes stay unchanged, but they all leave the tab order and stop responding to clicks.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [view, setView] = useState('list')
  const [lockedView] = useState('list')

  return (
    <div className="flex flex-wrap items-start gap-8">
      <div className="flex flex-col items-start gap-3">
        <span className="text-sm text-(--wui-color-text-secondary)">Item disabled</span>
        <web-ui-segmented value={view} onInput={event => setView(event.currentTarget.value)}>
          <web-ui-segmented-trigger value="list">List</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="grid" disabled>
            Grid
          </web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="board">Board</web-ui-segmented-trigger>
        </web-ui-segmented>
        <output className="text-sm text-(--wui-color-text-secondary)">Selected: {view}</output>
      </div>

      <div className="flex flex-col items-start gap-3">
        <span className="text-sm text-(--wui-color-text-secondary)">Group disabled</span>
        <web-ui-segmented disabled value={lockedView}>
          <web-ui-segmented-trigger value="list">List</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="grid">Grid</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="board">Board</web-ui-segmented-trigger>
        </web-ui-segmented>
        <output className="text-sm text-(--wui-color-text-secondary)">Selected: {lockedView} (not switchable)</output>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-start gap-8">
    <div class="flex flex-col items-start gap-3">
      <span class="text-sm text-(--wui-color-text-secondary)">Item disabled</span>
      <web-ui-segmented :value="view" @input="view = $event.currentTarget.value">
        <web-ui-segmented-trigger value="list">List</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="grid" disabled>Grid</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="board">Board</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output class="text-sm text-(--wui-color-text-secondary)">Selected: {{ view }}</output>
    </div>

    <div class="flex flex-col items-start gap-3">
      <span class="text-sm text-(--wui-color-text-secondary)">Group disabled</span>
      <web-ui-segmented disabled :value="lockedView">
        <web-ui-segmented-trigger value="list">List</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="grid">Grid</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="board">Board</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output class="text-sm text-(--wui-color-text-secondary)">Selected: {{ lockedView }} (not switchable)</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const view = ref('list')
const lockedView = ref('list')
</script>
```

### Icon-only

An icon-only trigger still needs its own accessible name, so write `aria-label` on each `<web-ui-segmented-trigger>`. The group keeps the same single-select, drag, and keyboard behavior.

```tsx
import { lucideLayoutGrid, lucideList, lucideSettings } from '@greypan/web-ui/icons'
import { useState } from 'react'

export default function Demo() {
  const [view, setView] = useState('grid')

  return (
    <web-ui-segmented aria-label="View mode" value={view} onInput={event => setView(event.currentTarget.value)}>
      <web-ui-segmented-trigger value="grid" aria-label="Grid view">
        <web-ui-icon icon={lucideLayoutGrid} size={16}></web-ui-icon>
      </web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="list" aria-label="List view">
        <web-ui-icon icon={lucideList} size={16}></web-ui-icon>
      </web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="settings" aria-label="Settings view">
        <web-ui-icon icon={lucideSettings} size={16}></web-ui-icon>
      </web-ui-segmented-trigger>
    </web-ui-segmented>
  )
}
```

```vue
<template>
  <web-ui-segmented aria-label="View mode" :value="view" @input="view = $event.currentTarget.value">
    <web-ui-segmented-trigger value="grid" aria-label="Grid view">
      <web-ui-icon :icon="lucideLayoutGrid" :size="16"></web-ui-icon>
    </web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="list" aria-label="List view">
      <web-ui-icon :icon="lucideList" :size="16"></web-ui-icon>
    </web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="settings" aria-label="Settings view">
      <web-ui-icon :icon="lucideSettings" :size="16"></web-ui-icon>
    </web-ui-segmented-trigger>
  </web-ui-segmented>
</template>

<script setup lang="ts">
import { lucideLayoutGrid, lucideList, lucideSettings } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const view = ref('grid')
</script>
```

### Form field

`name` makes the selected value enter `FormData` under that field name; when nothing is selected, the field is not submitted. `form.reset()` returns `value` to the value it had at mount.

```tsx
import { useRef, useState } from 'react'

export default function Demo() {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitted, setSubmitted] = useState('')
  const [day, setDay] = useState('wed')

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
      <web-ui-segmented name="day" value={day} onInput={event => setDay(event.currentTarget.value)}>
        <web-ui-segmented-trigger value="mon">Mon</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="tue">Tue</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="wed">Wed</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="thu">Thu</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="fri">Fri</web-ui-segmented-trigger>
      </web-ui-segmented>
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button type="submit">Submit</web-ui-button>
        <web-ui-button
          onClick={() => {
            formRef.current?.reset()
            setSubmitted('')
            setDay('wed')
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
    <web-ui-segmented name="day" :value="day" @input="day = $event.currentTarget.value">
      <web-ui-segmented-trigger value="mon">Mon</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="tue">Tue</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="wed">Wed</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="thu">Thu</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="fri">Fri</web-ui-segmented-trigger>
    </web-ui-segmented>
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button type="submit">Submit</web-ui-button>
      <web-ui-button @click="reset">Reset</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">
        {{ submitted === '' ? 'Not submitted yet' : submitted }}
      </output>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

const submitted = ref('')
const day = ref('wed')
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
  day.value = 'wed'
}
</script>
```

### input and change

Every user switch (click, Enter / Space, or drag) dispatches `input` and then `change`, once each; clicking a trigger that is already current dispatches neither. Setting `value` directly is a programmatic update: the indicator moves, and neither counter changes.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [view, setView] = useState('week')
  const [inputCount, setInputCount] = useState(0)
  const [changeCount, setChangeCount] = useState(0)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-segmented
        value={view}
        onInput={event => {
          setView(event.currentTarget.value)
          setInputCount(count => count + 1)
        }}
        onChange={event => {
          setView(event.currentTarget.value)
          setChangeCount(count => count + 1)
        }}
      >
        <web-ui-segmented-trigger value="day">Day</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="week">Week</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="month">Month</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output className="text-sm text-(--wui-color-text-secondary)">
        input: {inputCount} / change: {changeCount} · current: {view}
      </output>
      <web-ui-button onClick={() => setView('month')}>Set to "Month" externally</web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-segmented :value="view" @input="onInput" @change="onChange">
      <web-ui-segmented-trigger value="day">Day</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="week">Week</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="month">Month</web-ui-segmented-trigger>
    </web-ui-segmented>
    <output class="text-sm text-(--wui-color-text-secondary)">
      input: {{ inputCount }} / change: {{ changeCount }} · current: {{ view }}
    </output>
    <web-ui-button @click="view = 'month'">Set to "Month" externally</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiSegmented } from '@greypan/web-ui'
import { ref } from 'vue'

const view = ref('week')
const inputCount = ref(0)
const changeCount = ref(0)

function onInput(event: WebUiEvent<WebUiSegmented, 'input'>) {
  view.value = event.currentTarget.value
  inputCount.value += 1
}

function onChange(event: WebUiEvent<WebUiSegmented, 'change'>) {
  view.value = event.currentTarget.value
  changeCount.value += 1
}
</script>
```

## API

### Props

| Name         | Description                                                                                                                                                                    | Type                  | Default   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | --------- |
| `name`       | Form field name.                                                                                                                                                               | `string`              | `''`      |
| `variant`    | Material variant: `inset` (default) or `raised`.                                                                                                                               | `'inset' \| 'raised'` | `'inset'` |
| `disabled`   | Disables every trigger.                                                                                                                                                        | `boolean`             | `false`   |
| `required`   | Reflects the attribute only; not part of validation.                                                                                                                           | `boolean`             | `false`   |
| `aria-label` | Accessible name of the group; `aria-labelledby` cannot resolve across the component boundary, and the name is forwarded to the `role="listbox"` element inside the shadow DOM. | `string`              | -         |
| `value`      | Currently selected value.                                                                                                                                                      | `string`              | `''`      |

### Events

| Name     | Description                                                                            |
| -------- | -------------------------------------------------------------------------------------- |
| `input`  | Fired when the selection changes through a user click, keyboard, or the end of a drag. |
| `change` | Dispatched as a pair with `input`, once each per switch.                               |

### Slots

| Name      | Description                                     |
| --------- | ----------------------------------------------- |
| `default` | Projects `<web-ui-segmented-trigger>` children. |

### Variants

`inset` (default) embeds the indicator in an opaque track with a permanent 1px stroke ring and shadow; `raised` has a track with no ring or shadow, and the indicator floats above it with a soft shadow. Both variants share the same interaction and text color.

Invalid values fall back to `inset`.

Integration with the native `<form>`: `name` submits the current value and `form.reset()` restores the initial value.

The component syncs the child triggers' `checked` state from `value`. `disabled` gives the whole group an inherited effective disabled state without rewriting the triggers' own `disabled` attribute. Setting `value` directly dispatches no events.

Keyboard users press Tab into the currently selected item; with no selection, the first enabled item receives focus. Only that one item in the group participates in the tab order.

In a horizontal group, ArrowLeft / ArrowRight move focus cyclically among enabled items and update the selection; Home / End move to the first / last enabled item; disabled items are skipped.

ArrowUp / ArrowDown do not move focus.

Holding the current item and dragging horizontally slides the indicator, and releasing snaps to the nearest option; a fast flick switches by velocity.

When trigger widths differ, the dragging indicator takes the width of the item closest to its own center, which is the item the release would land on. It does not keep the width of the pressed item.

The touch surface declares `touch-action: none` and blocks the default `touchmove` scroll while a drag is active, so iOS Safari does not interrupt the gesture.

### Pressed state

Both variants share the same pressed / drag state: the indicator turns into a transparent glass surface (blur, stroke ring, and 1.5x scale) that settles on the first frame of the press and fades back to its own idle surface on release.

### Label color

All labels use `--wui-color-text`; selected and unselected items keep the same color, the selection is still carried by the indicator, and no label uses `--wui-color-accent`. Under the built-in light/dark themes, 14px text meets 4.5:1.

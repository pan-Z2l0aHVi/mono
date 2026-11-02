# Segmented

segmented (a single-select button group) has `<web-ui-segmented-trigger>` children; `value` synchronizes the selected item and integrates with the native `<form>`.

## Samples

### Basic controlled

The default slot projects segmented-trigger, and `value` decides which item is selected; after a click (or Enter / Space), `input` carries the new value back and the page writes it into `value` to stay controlled.

Holding and dragging horizontally on the current item also switches continuously; on release the indicator snaps to the trigger closest to its center, and a fast fling switches by velocity.

The inner `role="listbox"` lives in the shadow DOM and does not inherit the host's `aria-label`, so the component forwards it to the listbox; the sample uses `aria-label` to name the group "Weekday". `aria-labelledby` IDREFs cannot resolve across the shadow boundary, so express a visible label through `aria-label`.

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

`variant` picks the material of the track and the indicator: `inset` (default) embeds the indicator in a track with a persistent ring and shadow, while `raised` is the classic floating form. Both variants share the same interaction, pressed state, and text color; only the resting surface differs.

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

`disabled` on a trigger disables only that item while the rest keep switching; `disabled` on `<web-ui-segmented>` disables the whole group—the members' own `disabled` attributes stay unchanged, but they all leave the tab order and stop responding to clicks.

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

An icon-only trigger still needs its own accessible name: the inner `role="option"` has no text, so write `aria-label` on each `<web-ui-segmented-trigger>`. The group keeps the same single-select, drag, and keyboard behavior.

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

`name` makes the currently selected value enter `FormData` under that field name, and when nothing is selected the field is not submitted. The component joins the `<form>` through ElementInternals, and `form.reset()` returns `value` to the initial value at mount time.

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

Every user switch (click, Enter / Space, or drag) dispatches `input` and then `change`, one each; clicking a trigger that is already current dispatches neither. The button below changes `value` directly along the programmatic path: the indicator moves and neither counter changes.

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
      <web-ui-button onClick={() => setView('month')}>Set to “Month” externally</web-ui-button>
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
    <web-ui-button @click="view = 'month'">Set to “Month” externally</web-ui-button>
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

| Name         | Description                                                                                        | Type                  | Default   |
| ------------ | -------------------------------------------------------------------------------------------------- | --------------------- | --------- |
| `name`       | Form field name.                                                                                   | `string`              | `''`      |
| `variant`    | Material variant: `inset` (default) or `raised`.                                                   | `'inset' \| 'raised'` | `'inset'` |
| `disabled`   | Disables every trigger.                                                                            | `boolean`             | `false`   |
| `required`   | Reflects the attribute only; not part of validation.                                               | `boolean`             | `false`   |
| `aria-label` | Accessible name of the inner listbox; `aria-labelledby` cannot resolve across the shadow boundary. | `string`              | —         |
| `value`      | Currently selected value.                                                                          | `string`              | `''`      |

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

`inset` (default, "concave") is an opaque solid track (`--wui-color-surface`)—the 1px stroke ring and shadow stay on at all times, and the resting indicator is a flat gray `--wui-color-surface-segmented` fill, so it looks embedded in the track.

In light mode the track has the same value as `--wui-color-page` and sits flush with the page, so the concave feel comes only from the persistent ring and shadow; in dark mode the track is one elevation step above the page and still floats off it.

The indicator step takes the default of `--wui-color-surface-control` in both light and dark—that is, the `secondary` button surface (light `#dfdfdf`, dark `#3a3a3c`): the selected chip shares the surface of a neutral interactive control in the same theme instead of introducing another gray. This is the same value, not an alias—the two tokens are defined independently in the theme and do not reference each other, so overriding control alone does not move this indicator.

`raised` ("convex") is the classic form: a flat gray track (`--wui-color-surface-segmented-track`, no ring or shadow) with the resting indicator as a `--wui-color-surface-selected` solid fill plus a soft shadow, floating above the track.

In light mode this pair is `#e5e5ea → #fff`: the indicator is as white as `--wui-color-page`, and the raised feel reads from "a solid surface in the page color floating above a recessed track + a soft shadow".

Dark follows the same invariant: the indicator still matches `--wui-color-page` (`#242628`), and the track is what moves—`--wui-color-surface-segmented-track` sinks below the page to `#17191a`, 13 to 14/255 darker than the page, on the same order as this theme's upward steps (page→surface is +6 to +8, surface→control is +14, control→track is +10).

The page is already the darkest step of the dark ladder, so "the same color as the page" can only hold by opening the track downward rather than lifting the indicator up. The raised direction still reads from "the indicator is brighter than the track": the WCAG luminance ratios of the two steps are 1.26:1 (light) and 1.16:1 (dark), the same order of magnitude, so neither overpowers the soft shadow.

So in dark mode the two variants use different gray pairs: inset is a `#2c2c2e` track + `#3a3a3c` indicator (the selected surface is brighter than the track, reading as a pressed gray), while raised is a `#17191a` track + `#242628` indicator (the selected surface matches the page, reading as a slice of page floating up).

The invariant says "the same color as the page", not "the same color as the containing element". In light mode the page and surface are both `#fff`, so the two statements are equivalent; in dark mode the surface is `#2c2c2e`, so putting the raised variant inside a surface card makes the chip one step darker than the card itself.

In both containers the raised feel comes from the track and the soft shadow; only "whether the chip is flush with the surface behind it" changes: flush on the page, not flush on a surface.

Both variants share the same pressed / drag state—the indicator turns into transparent glass (backdrop blur, a stroke ring fading in over 80ms, 1.5x scale), and fades back to its own resting surface on release.

Invalid values fall back to `inset`.

Integration with the native `<form>` (through `ElementInternals`).

Syncs the child triggers' `checked` state from `value`. `disabled` provides an inherited effective disabled state without rewriting the triggers' own `disabled` attribute. Setting `value` directly dispatches no events.

Keyboard users press Tab into the currently selected item; with no selection, the first enabled item receives focus. Only that one item in the group participates in the tab order.

In a horizontal group, ArrowLeft / ArrowRight move focus cyclically among enabled items and update the selection, and Home / End move to the first / last enabled item; disabled items are skipped.

ArrowUp / ArrowDown do not move focus.

Holding the current item and dragging horizontally slides the indicator, and releasing snaps to the nearest option (a fast fling switches by velocity).

When trigger widths differ, the dragging indicator takes the width of the item closest to its own center—that is, the item the release would land on, rather than keeping the width of the pressed item.

The touch surface declares `touch-action: none` and blocks the default `touchmove` scroll while a drag is active, so iOS Safari does not interrupt the gesture.

### Pressed state

In every state the track is an opaque solid surface (`--wui-color-surface`, i.e. the page color in light mode, with no backdrop filter), and its 1px stroke ring and shadow never change; the layer that turns into glass is the indicator.

The resting indicator is a solid `--wui-color-surface-segmented` fill with all glass output turned off.

The pressed / drag state gains a backdrop blur, a glass stroke ring fading in over an 80ms transition, and 1.5x scale, with a fully transparent fill: the indicator's blur sample area lies entirely inside the track. A fully transparent indicator over a glass track differs from the adjacent track by only +0.5 steps on a uniformly dark base, and on a striped background the indicator interior measures a gray std of 1.89 (background bleed).

Once the track is solid, the same sample std drops to zero, and the pressed body's perceptibility comes from the solid track together with the scale / ring / shadow, so no tint base or suppression of the track's edge decoration is needed.

The fill does not fade in—it settles on the first frame of the press; on release the indicator fades back to the solid gray fill over `--wui-duration-press`.

### Label color

All labels use the primary `--wui-color-text`; under the built-in light/dark themes, 14px text on the resting `inset`/`raised` indicator meets 4.5:1. Selected and unselected items keep the same color, the selection is still carried by the indicator, and no label uses `--wui-color-accent`.

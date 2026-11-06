# Button

button triggers an immediate action: submitting a form, opening a dialog, or toggling state.

It does not contribute a value to `FormData`. `type="submit"` and `type="reset"` forward those two native actions to the surrounding `<form>`. The only outward event is the native button's `click`; the component dispatches no custom events.

## Samples

### Variants

`variant` determines the visual hierarchy. The only valid values are `primary` / `secondary` / `ghost` / `danger` / `glass`; any value outside the set falls back to `glass`. `glass` blends into the page background and suits toolbars; a page should have only one `primary`.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button variant="primary">Primary</web-ui-button>
      <web-ui-button variant="secondary">Secondary</web-ui-button>
      <web-ui-button variant="ghost">Ghost</web-ui-button>
      <web-ui-button variant="danger">Danger</web-ui-button>
      <web-ui-button variant="glass">Glass</web-ui-button>
      <web-ui-button>No variant (also glass)</web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button variant="primary">Primary</web-ui-button>
    <web-ui-button variant="secondary">Secondary</web-ui-button>
    <web-ui-button variant="ghost">Ghost</web-ui-button>
    <web-ui-button variant="danger">Danger</web-ui-button>
    <web-ui-button variant="glass">Glass</web-ui-button>
    <web-ui-button>No variant (also glass)</web-ui-button>
  </div>
</template>
```

### Sizes

`size` accepts a bare number or a CSS length. A bare number is interpreted as px, so `size="28"` means 28px; values with units (`32px`, `1.5rem`) are used as-is. It only controls the height; when omitted, the height comes from the theme's `--wui-control-size` (36px).

In `icon` mode the host is a square that grows with `size`.

Inside a group, `<web-ui-button-group>` sets every member height to 30px, so a `size` written on a member does not take effect.

```tsx
import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button variant="primary" size="28">
        Small 28
      </web-ui-button>
      <web-ui-button variant="primary">Default 36</web-ui-button>
      <web-ui-button variant="primary" size="48">
        Large 48
      </web-ui-button>
      <web-ui-button icon size="48" aria-label="Large search">
        <web-ui-icon icon={lucideSearch} size={20}></web-ui-icon>
      </web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button variant="primary" size="28">Small 28</web-ui-button>
    <web-ui-button variant="primary">Default 36</web-ui-button>
    <web-ui-button variant="primary" size="48">Large 48</web-ui-button>
    <web-ui-button icon size="48" aria-label="Large search">
      <web-ui-icon :icon="lucideSearch" :size="20"></web-ui-icon>
    </web-ui-button>
  </div>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### Width

Two settings control the width: `full` makes the control fill the parent, and `--wui-button-width` gives the button a fixed width (default `max-content`).

When both are set, `full` takes precedence and `--wui-button-width` is ignored.

The label does not wrap, so an overly narrow container overflows.

```tsx
export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-5">
      <web-ui-button full variant="primary">
        full: fills the row
      </web-ui-button>

      <div className="grid w-full grid-cols-2 gap-2">
        <web-ui-button full variant="primary">
          full: fills this column
        </web-ui-button>
        <web-ui-button full>full: glass</web-ui-button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="secondary" className="[--wui-button-width:160px]">
          160px wide
        </web-ui-button>
        <web-ui-button variant="secondary" size="40" className="[--wui-button-width:220px]">
          40×220
        </web-ui-button>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col gap-5">
    <web-ui-button full variant="primary">full: fills the row</web-ui-button>

    <div class="grid w-full grid-cols-2 gap-2">
      <web-ui-button full variant="primary">full: fills this column</web-ui-button>
      <web-ui-button full>full: glass</web-ui-button>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button variant="secondary" class="[--wui-button-width:160px]">160px wide</web-ui-button>
      <web-ui-button variant="secondary" size="40" class="[--wui-button-width:220px]">40×220</web-ui-button>
    </div>
  </div>
</template>
```

### Prefix and suffix

The default slot is the label text, and the named `prefix` / `suffix` slots sit on either side of it. The gap between the three parts comes from `--wui-button-gap`.

An empty side takes no `gap`. Prefix and suffix accept anything; both `<web-ui-icon>` and `<span>` can be projected.

```tsx
import { lucideChevronLeft, lucideChevronRight, lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button variant="secondary">
        <web-ui-icon slot="prefix" icon={lucideSearch}></web-ui-icon>
        Search
      </web-ui-button>
      <web-ui-button variant="secondary">
        Next
        <web-ui-icon slot="suffix" icon={lucideChevronRight}></web-ui-icon>
      </web-ui-button>
      <web-ui-button variant="primary">
        <web-ui-icon slot="prefix" icon={lucideChevronLeft}></web-ui-icon>
        Back
        <span slot="suffix" className="opacity-60">
          Enter
        </span>
      </web-ui-button>
      <web-ui-button>
        <span slot="prefix">prefix</span>
        button
        <span slot="suffix">suffix</span>
      </web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button variant="secondary">
      <web-ui-icon slot="prefix" :icon="lucideSearch"></web-ui-icon>
      Search
    </web-ui-button>
    <web-ui-button variant="secondary">
      Next
      <web-ui-icon slot="suffix" :icon="lucideChevronRight"></web-ui-icon>
    </web-ui-button>
    <web-ui-button variant="primary">
      <web-ui-icon slot="prefix" :icon="lucideChevronLeft"></web-ui-icon>
      Back
      <span slot="suffix" class="opacity-60">Enter</span>
    </web-ui-button>
    <web-ui-button>
      <span slot="prefix">prefix</span>
      button
      <span slot="suffix">suffix</span>
    </web-ui-button>
  </div>
</template>

<script setup lang="ts">
import { lucideChevronLeft, lucideChevronRight, lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### Icon mode

`icon` makes the host a square. The whole default slot becomes icon content, and `prefix` / `suffix` are not rendered in this mode.

An icon button with no visible text must have an `aria-label`, otherwise a screen reader announces an empty button.

`loading` takes precedence over icon content: the spinner replaces the default slot and the icon inside it is not rendered.

```tsx
import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button icon aria-label="Search">
        <web-ui-icon icon={lucideSearch}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="primary" aria-label="Search">
        <web-ui-icon icon={lucideSearch}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="secondary" aria-label="Search">
        <web-ui-icon icon={lucideSearch}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="ghost" aria-label="Search">
        <web-ui-icon icon={lucideSearch}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="danger" aria-label="Search">
        <web-ui-icon icon={lucideSearch}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="primary" loading aria-label="Loading">
        <web-ui-icon icon={lucideSearch}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon aria-label="Plus">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
        </svg>
      </web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button icon aria-label="Search">
      <web-ui-icon :icon="lucideSearch"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="primary" aria-label="Search">
      <web-ui-icon :icon="lucideSearch"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="secondary" aria-label="Search">
      <web-ui-icon :icon="lucideSearch"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="ghost" aria-label="Search">
      <web-ui-icon :icon="lucideSearch"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="danger" aria-label="Search">
      <web-ui-icon :icon="lucideSearch"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="primary" loading aria-label="Loading">
      <web-ui-icon :icon="lucideSearch"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon aria-label="Plus">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
      </svg>
    </web-ui-button>
  </div>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### Disabled and loading

Both `disabled` and `loading` disable the control: it dispatches no `click` and leaves the tab order. The disabled state drops the whole control to 40% opacity and has no hover or pressed state.

Outside icon mode, `loading` puts a spinner before the label. The text and prefix/suffix still show, so the width changes; use icon mode when the width must stay stable.

The page holds `loading` itself: click "Save" to enter the loading state and "Stop waiting" to leave it.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [pending, setPending] = useState(false)

  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button disabled>Disabled</web-ui-button>
        <web-ui-button variant="primary" disabled>
          Disabled
        </web-ui-button>
        <web-ui-button loading>Loading</web-ui-button>
        <web-ui-button variant="primary" loading>
          Loading
        </web-ui-button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="primary" loading={pending} onClick={() => setPending(true)}>
          Save
        </web-ui-button>
        <web-ui-button variant="secondary" disabled={!pending} onClick={() => setPending(false)}>
          Stop waiting
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">
          loading: {pending ? 'true, the Save button cannot be clicked' : 'false'}
        </output>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-4">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button disabled>Disabled</web-ui-button>
      <web-ui-button variant="primary" disabled>Disabled</web-ui-button>
      <web-ui-button loading>Loading</web-ui-button>
      <web-ui-button variant="primary" loading>Loading</web-ui-button>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button variant="primary" :loading="pending" @click="pending = true">Save</web-ui-button>
      <web-ui-button variant="secondary" :disabled="!pending" @click="pending = false">Stop waiting</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">
        loading: {{ pending ? 'true, the Save button cannot be clicked' : 'false' }}
      </output>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const pending = ref(false)
</script>
```

### Click and pressed state

button has no custom events, so listen to the native `click`. It bubbles out composed and `event.target` is retargeted to the host, so both React and Vue can put a handler directly on `<web-ui-button>`.

Enter and Space produce the same `click`.

Hover is only drawn on devices matching `(hover: hover) and (pointer: fine)`, while the pressed state applies to every device.

The disabled and loading buttons produce no click.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [clicks, setClicks] = useState(0)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button variant="primary" onClick={() => setClicks(count => count + 1)}>
        Click me
      </web-ui-button>
      <web-ui-button variant="primary" disabled onClick={() => setClicks(count => count + 1)}>
        Disabled (clicks are not counted)
      </web-ui-button>
      <web-ui-button variant="primary" loading onClick={() => setClicks(count => count + 1)}>
        Loading (clicks are not counted)
      </web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">click: {clicks} times</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button variant="primary" @click="clicks += 1">Click me</web-ui-button>
    <web-ui-button variant="primary" disabled @click="clicks += 1">Disabled (clicks are not counted)</web-ui-button>
    <web-ui-button variant="primary" loading @click="clicks += 1">Loading (clicks are not counted)</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">click: {{ clicks }} times</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const clicks = ref(0)
</script>
```

### Form submit and reset

`type` has only three valid values, `button` / `submit` / `reset`; invalid values normalize to `button`.

`submit` / `reset` are forwarded to the host `<form>` after the synchronous listeners of this `click` have run, so calling `preventDefault()` on this click cancels the action.

`SubmitEvent.submitter` is `null`.

"Reset" forwards `form.reset()`, so `<web-ui-input>` returns to its value at mount time.

Only `nickname` is submitted by this form: button contributes no value, and the outer `<fieldset disabled>` disables these buttons too.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [submitted, setSubmitted] = useState('')

  return (
    <form
      className="flex flex-wrap items-center gap-3"
      onSubmit={event => {
        event.preventDefault()
        const nickname = new FormData(event.currentTarget).get('nickname')
        const submitter = (event.nativeEvent as SubmitEvent).submitter
        setSubmitted(
          `nickname=${typeof nickname === 'string' && nickname !== '' ? nickname : '(empty)'} · submitter=${
            submitter === null ? 'null' : 'non-null'
          }`
        )
      }}
    >
      <web-ui-input name="nickname" placeholder="Nickname"></web-ui-input>
      <web-ui-button type="submit" variant="primary">
        Submit
      </web-ui-button>
      <web-ui-button
        type="submit"
        variant="secondary"
        onClick={event => {
          event.preventDefault()
          setSubmitted('This click was preventDefault-ed; nothing was submitted')
        }}
      >
        Submit but blocked
      </web-ui-button>
      <web-ui-button type="reset" variant="ghost" onClick={() => setSubmitted('')}>
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
  <form class="flex flex-wrap items-center gap-3" @submit="onSubmit">
    <web-ui-input name="nickname" placeholder="Nickname"></web-ui-input>
    <web-ui-button type="submit" variant="primary">Submit</web-ui-button>
    <web-ui-button type="submit" variant="secondary" @click="onCancelledClick">Submit but blocked</web-ui-button>
    <web-ui-button type="reset" variant="ghost" @click="submitted = ''">Reset</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">
      {{ submitted === '' ? 'Not submitted yet' : submitted }}
    </output>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const submitted = ref('')

function onSubmit(event: Event) {
  event.preventDefault()
  const nickname = new FormData(event.currentTarget as HTMLFormElement).get('nickname')
  const submitter = (event as SubmitEvent).submitter
  submitted.value = `nickname=${
    typeof nickname === 'string' && nickname !== '' ? nickname : '(empty)'
  } · submitter=${submitter === null ? 'null' : 'non-null'}`
}

function onCancelledClick(event: MouseEvent) {
  event.preventDefault()
  submitted.value = 'This click was preventDefault-ed; nothing was submitted'
}
</script>
```

### CSS variables

All seven variables in the table are declared on the `<web-ui-button>` host. `--wui-button-width` / `--wui-button-px` / `--wui-button-gap` work from a class on the host.

`--wui-button-color` / `--wui-button-bg` / `--wui-button-bg-hover` / `--wui-button-bg-active` are declared on the host by the variant, so an inherited value cannot override them. Write them on this host or in an inline `style`.

The hover / active colors of `primary` and `secondary` are derived from `--wui-button-bg`, so changing only the background deepens those two states along with it. `danger` and `glass` do not follow this, so changing their background means supplying those two states yourself.

```tsx
import { lucideUpload } from '@greypan/web-ui/icons'
import type { CSSProperties } from 'react'

const successOnly = { '--wui-button-bg': 'var(--wui-color-success)' } as CSSProperties

const fourStates = {
  '--wui-button-color': 'var(--wui-color-on-accent)',
  '--wui-button-bg': 'var(--wui-color-success)',
  '--wui-button-bg-hover': 'var(--wui-color-accent)',
  '--wui-button-bg-active': 'var(--wui-color-warning)'
} as CSSProperties

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button variant="secondary" className="[--wui-button-px:28px] [--wui-button-gap:14px]">
        <web-ui-icon slot="prefix" icon={lucideUpload}></web-ui-icon>
        Wider padding and slot gap
      </web-ui-button>
      <web-ui-button variant="primary" style={successOnly}>
        Background only
      </web-ui-button>
      <web-ui-button variant="secondary" style={fourStates}>
        Four state colors
      </web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button class="[--wui-button-px:28px] [--wui-button-gap:14px]" variant="secondary">
      <web-ui-icon slot="prefix" :icon="lucideUpload"></web-ui-icon>
      Wider padding and slot gap
    </web-ui-button>
    <web-ui-button :style="successOnly" variant="primary">Background only</web-ui-button>
    <web-ui-button :style="fourStates" variant="secondary">Four state colors</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import { lucideUpload } from '@greypan/web-ui/icons'
import type { CSSProperties } from 'vue'

const successOnly = { '--wui-button-bg': 'var(--wui-color-success)' } as CSSProperties

const fourStates = {
  '--wui-button-color': 'var(--wui-color-on-accent)',
  '--wui-button-bg': 'var(--wui-color-success)',
  '--wui-button-bg-hover': 'var(--wui-color-accent)',
  '--wui-button-bg-active': 'var(--wui-color-warning)'
} as CSSProperties
</script>
```

## API

### Props

| Name            | Description                                                                                                                                                                     | Type                                                         | Default    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------- |
| `variant`       | Visual variant; values outside the set fall back to `glass`.                                                                                                                    | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'glass'` | `'glass'`  |
| `disabled`      | Disabled state.                                                                                                                                                                 | `boolean`                                                    | `false`    |
| `loading`       | Loading state. Blocks interaction as well, and renders the spinner first.                                                                                                       | `boolean`                                                    | `false`    |
| `full`          | Fills the parent's width.                                                                                                                                                       | `boolean`                                                    | `false`    |
| `icon`          | Icon mode: the host becomes a square and the default slot is used wholesale as icon content.                                                                                    | `boolean`                                                    | `false`    |
| `size`          | Button height; bare numbers are interpreted as px, and CSS lengths such as `32px` and `1.5rem` are accepted. Inside `<web-ui-button-group>` it is unified to 30px by the group. | `string`                                                     | `''`       |
| `type`          | The native button's `type`; invalid values normalize to `button`.                                                                                                               | `'button' \| 'submit' \| 'reset'`                            | `'button'` |
| `aria-label`    | Accessible name.                                                                                                                                                                | `string \| null`                                             | `null`     |
| `aria-expanded` | Expanded state for assistive technology to read.                                                                                                                                | `string \| null`                                             | `null`     |

### Slots

| Name      | Description                                                                                    |
| --------- | ---------------------------------------------------------------------------------------------- |
| `default` | Label text; in `icon` mode the whole slot is icon content.                                     |
| `prefix`  | Icon or marker to the left of the label; not rendered in `icon` mode.                          |
| `suffix`  | Icon or marker to the right of the label; an empty side produces no box, so it takes no `gap`. |

### Behavior

`click` is dispatched by the native button, bubbles out composed to the host, and `event.target` is retargeted to the host. Enter and Space go through the same native activation, so pointer and keyboard share this one event.

`disabled`, `loading`, and form-level disabling (an ancestor `<fieldset disabled>`) all disable the control: no click is produced and the tab order does not reach it.

`aria-label` and `aria-expanded` are delegated to the native button inside; `aria-controls` and other attributes stay on the host and are not copied automatically.

When `<web-ui-button>` is used as a collapse trigger, assistive technology can read `aria-expanded`.

`submit` and `reset` are forwarded to the native `<form>` after all synchronous listeners of the composed `click` have run; calling `preventDefault()` on this click cancels the action.

`SubmitEvent.submitter` is `null`.

button does not contribute a value to `FormData` (form state is always `null`).

`disabled` is the only path to a disabled state: neither `click` nor form actions happen. `aria-disabled` is neither read nor forwarded, and a hand-written `aria-disabled` stays on the host with no effect on behavior.

When `icon` and `loading` are both on, only the spinner is rendered and the default slot is not projected; outside icon mode the spinner comes before the label and coexists with prefix/suffix.

Invalid values of `variant` and `type` fall back to `glass` and `button` respectively.

The default shape is a square, decided by `icon`, except when `full` or an explicit `--wui-button-width` is set.

### Layout

The host is an inline-flex box; the height is decided by the inner button and does not inherit the page line height. With `full` it stretches the width to 100%.

The height comes from `--wui-control-size` (`36px`, overridden by `size`), the radius is a pill, and the horizontal padding comes from `--wui-button-px`.

The label does not wrap, so an insufficient width overflows. The font size comes from `--wui-font-size`.

The cursor is fixed to `default`, and `not-allowed` when disabled; the disabled opacity is 0.4.

The focus ring uses `--wui-focus-ring-width` / `--wui-color-focus-ring`; it is hidden during a pointer click and restored when keyboard Tab returns.

The inner button is exposed as `::part(button)`.

### CSS Custom Properties

| Name                     | Description                                                                                                                                                        | Default              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| `--wui-button-width`     | Button width; taken over by `100%` when `full` is set.                                                                                                             | `max-content`        |
| `--wui-button-px`        | Horizontal padding.                                                                                                                                                | `var(--wui-space-3)` |
| `--wui-button-gap`       | Gap between the prefix / label / suffix parts.                                                                                                                     | `var(--wui-space-2)` |
| `--wui-button-color`     | Button text color, following the variant.                                                                                                                          | Depends on variant   |
| `--wui-button-bg`        | Button background color, following the variant.                                                                                                                    | Depends on variant   |
| `--wui-button-bg-hover`  | Hover background color, effective only under `(hover: hover) and (pointer: fine)`; for primary / secondary it is derived from `--wui-button-bg`.                   | Depends on variant   |
| `--wui-button-bg-active` | Pressed background color, effective on `:active` when not disabled and regardless of pointer device; for primary / secondary it is derived from `--wui-button-bg`. | Depends on variant   |

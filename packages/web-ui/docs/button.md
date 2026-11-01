---
component: button
tag: web-ui-button
---

button triggers an immediate action: submitting a form, opening a dialog, or toggling state.

It does not contribute a value to `FormData`; `type="submit"` / `type="reset"` forward those two native actions to the host `<form>`. The only outward event is the `click` emitted by the native button inside the shadow root, and the component dispatches no custom events of its own.

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

`size` accepts a bare number or a CSS length: a bare number is interpreted as px (`size="28"` means `--wui-control-size: 28px`), while values with units (`32px`, `1.5rem`) are used as-is. It only controls the height; when omitted, the height comes from the theme's `--wui-control-size` (36px).

In `icon` mode `min-width` equals the height, so that square grows together with it.

Inside a group, `<web-ui-button-group>` unifies member heights to 30px, so a `size` written on a member has no effect there.

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

There are only two ways to set the width: `full` makes the host a block and stretches the inner button across the parent, while `--wui-button-width` gives the inner button a fixed width (default `max-content`).

When both are set, `full` wins: the `:host([full]) button` rule writes the width as `100%` and ignores the variable.

The label is always `white-space: nowrap`, so an overly narrow container produces overflow rather than wrapping.

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

The default slot is the label text (wrapped in an inner span), and the named `prefix` / `suffix` slots sit on either side of it. The gap between the three parts comes from `--wui-button-gap`.

A slot with no assigned nodes generates no box, so an empty side leaves no half `gap` behind. Prefix and suffix accept anything; both `<web-ui-icon>` and `<span>` can be projected.

```tsx
import { lucideChevronLeft, lucideChevronRight, lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button variant="secondary">
        <web-ui-icon slot="prefix" icon={lucideSearch} size={16}></web-ui-icon>
        Search
      </web-ui-button>
      <web-ui-button variant="secondary">
        Next
        <web-ui-icon slot="suffix" icon={lucideChevronRight} size={16}></web-ui-icon>
      </web-ui-button>
      <web-ui-button variant="primary">
        <web-ui-icon slot="prefix" icon={lucideChevronLeft} size={16}></web-ui-icon>
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
      <web-ui-icon slot="prefix" :icon="lucideSearch" :size="16"></web-ui-icon>
      Search
    </web-ui-button>
    <web-ui-button variant="secondary">
      Next
      <web-ui-icon slot="suffix" :icon="lucideChevronRight" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button variant="primary">
      <web-ui-icon slot="prefix" :icon="lucideChevronLeft" :size="16"></web-ui-icon>
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

`icon` zeroes the padding and makes `min-width` equal the height, so the host becomes a square. The default slot is treated wholesale as icon content, without the label span wrapper; `prefix` / `suffix` are not rendered in this mode.

An icon button with no visible text must have an `aria-label`, otherwise a screen reader announces an empty button.

`loading` takes precedence over icon content: the spinner replaces the default slot and the icon inside it is not projected, so the same button never shows two graphics before and after loading.

```tsx
import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button icon aria-label="Search">
        <web-ui-icon icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="primary" aria-label="Search">
        <web-ui-icon icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="secondary" aria-label="Search">
        <web-ui-icon icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="ghost" aria-label="Search">
        <web-ui-icon icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="danger" aria-label="Search">
        <web-ui-icon icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="primary" loading aria-label="Loading">
        <web-ui-icon icon={lucideSearch} size={16}></web-ui-icon>
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
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="primary" aria-label="Search">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="secondary" aria-label="Search">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="ghost" aria-label="Search">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="danger" aria-label="Search">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="primary" loading aria-label="Loading">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
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

Both `disabled` and `loading` really disable the native button inside: it dispatches no `click` and leaves the tab order, and writing both attributes produces the same result. The disabled state drops the whole control to forty percent opacity and gives up hover / pressed states.

Outside icon mode, `loading` puts a spinner before the label, and the text and prefix/suffix are still projected—so the width changes. Use icon mode when a stable width is required.

The button below is held in `loading` by the page itself: click "Save" to enter the loading state and "Stop waiting" to leave it.

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

button has no custom events; the host listens to the native `click`. It originates on the native button inside the shadow root, bubbles out composed, and `event.target` is retargeted to the host, so both React and Vue can put a handler directly on `<web-ui-button>`.

The keyboard Enter / Space keys go through the same native activation, so pointer and keyboard share this one handler.

While held down, the `:active` pressed state is drawn; hover is only drawn on devices matching `(hover: hover) and (pointer: fine)`, while the pressed state applies to every device.

The disabled and loading buttons produce no click, so the counter does not move.

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

After the synchronous listeners of this composed `click` have finished, the latter two read the host's ElementInternals form owner and forward `requestSubmit()` / `reset()`, so calling `preventDefault()` on this click cancels the action—that is what "Submit but blocked" below does.

The inner button has no form owner of its own, so `SubmitEvent.submitter` is `null` (visible in the readout).

"Reset" forwards `form.reset()`, so `<web-ui-input>` returns to its value at mount time and the readout is cleared by this click's own handler.

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

All seven variables in the table are declared on the `<web-ui-button>` host itself. `--wui-button-width` / `--wui-button-px` / `--wui-button-gap` are declared nowhere else, so a class on the host is enough (the first button below).

`--wui-button-color` / `--wui-button-bg` / `--wui-button-bg-hover` / `--wui-button-bg-active` are declared on the host itself by `:host([variant='...'])`.

An inherited value cannot override a declaration on the element itself, so either write it on this host or put it directly in an inline `style`—this example uses inline `style` and supplies all four states at once.

One more derivation is worth knowing: the hover / active colors of the `primary` and `secondary` variants are derived from `--wui-button-bg` through `color-mix(... , black)` (primary uses 88% / 76%, secondary uses 92% / 82%), so changing only `--wui-button-bg` makes those two states deepen along with it (that is the second button; hold it to see).

`danger` and `glass` do not follow this derivation, so changing their background means supplying those two states yourself.

The third button points each of the four states at an existing token, just to make hover and press jump to visibly different colors; a real page would not be configured this way.

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
        <web-ui-icon slot="prefix" icon={lucideUpload} size={16}></web-ui-icon>
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
      <web-ui-icon slot="prefix" :icon="lucideUpload" :size="16"></web-ui-icon>
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
| `disabled`      | Disabled state; the native button inside is disabled too.                                                                                                                       | `boolean`                                                    | `false`    |
| `loading`       | Loading state. Blocks interaction as well, and renders the spinner first.                                                                                                       | `boolean`                                                    | `false`    |
| `full`          | Fills the parent's width.                                                                                                                                                       | `boolean`                                                    | `false`    |
| `icon`          | Icon mode: the host becomes a square and the default slot is used wholesale as icon content.                                                                                    | `boolean`                                                    | `false`    |
| `size`          | Button height; bare numbers are interpreted as px, and CSS lengths such as `32px` and `1.5rem` are accepted. Inside `<web-ui-button-group>` it is unified to 30px by the group. | `string`                                                     | `''`       |
| `type`          | The native button's `type`; invalid values normalize to `button`.                                                                                                               | `'button' \| 'submit' \| 'reset'`                            | `'button'` |
| `aria-label`    | Accessible name, forwarded to the native button inside.                                                                                                                         | `string \| null`                                             | `null`     |
| `aria-expanded` | Expanded state; forwarded to the native button inside for assistive technology to read.                                                                                         | `string \| null`                                             | `null`     |

### Slots

| Name      | Description                                                                                    |
| --------- | ---------------------------------------------------------------------------------------------- |
| `default` | Label text (wrapped in an inner span); in `icon` mode the whole slot is icon content.          |
| `prefix`  | Icon or marker to the left of the label; not rendered in `icon` mode.                          |
| `suffix`  | Icon or marker to the right of the label; an empty side produces no box, so it takes no `gap`. |

### Behavior

`click` is dispatched by the native button inside the shadow root, bubbles out composed to the host, and `event.target` is retargeted to the host. Enter and Space go through the same native activation, so pointer and keyboard share this one event.

`disabled`, `loading`, and form-level disabling (an ancestor `<fieldset disabled>`) all really disable the inner button: no click is produced and the tab order does not reach it.

`aria-label` and `aria-expanded` are explicitly delegated to the native button inside; `aria-controls` and other attributes stay on the host and are not copied automatically, because IDREFs cannot resolve across a shadow root.

When `<web-ui-button>` is used as a collapse trigger, assistive technology can read `aria-expanded` on the inner node exposed as a button.

`submit` and `reset` are forwarded through the host's form owner to the native `<form>` after all synchronous listeners of the composed `click` have run; calling `preventDefault()` on this click cancels the action.

The inner button has no form owner of its own, so `SubmitEvent.submitter` is `null`.

button does not contribute a value to `FormData` (form state is always `null`).

`disabled` is the only path to a disabled state: it really disables the native button inside, so neither `click` nor form actions happen. `aria-disabled` is neither read nor forwarded—the "looks disabled but stays focusable" semantics are not offered, and a hand-written `aria-disabled` stays on the host with no effect on behavior.

When `icon` and `loading` are both on, only the spinner is rendered and the default slot is not projected; outside icon mode the spinner comes before the label and coexists with prefix/suffix.

Invalid values of `variant` and `type` fall back to `glass` and `button` respectively.

The default square shape is decided by `icon`, except when `full` or an explicit `--wui-button-width` is set.

### Layout

The host is an inline-flex box that centers the inner button in both axes; the height is decided by the inner button and does not inherit the page line height. With `full` it becomes a block and stretches the width to 100%.

The inner button takes its height from `--wui-control-size` (`36px`, overridden by `size`), its radius from `--wui-radius-control` (pill), and its horizontal padding from `--wui-button-px`; in `icon` mode the padding is zero and `min-width` equals the height.

The label is `white-space: nowrap` and the container is `overflow: clip`, so an insufficient width overflows rather than wraps. The font size comes from `font: inherit` on the host and then `--wui-font-size`, avoiding the UA's Arial on native buttons.

The cursor is fixed to `default` by the component (it does not follow `pointer`), and the host adds a `not-allowed` layer when disabled; the disabled opacity is 0.4.

The focus ring is drawn on the inner button's `:focus-visible` (`--wui-focus-ring-width` / `--wui-color-focus-ring`); during a pointer click it is suppressed to transparent by `data-wui-pointer-focus` and restored when keyboard Tab returns.

The inner button is exposed as `::part(button)`.

### CSS Custom Properties

| Name                     | Description                                                                                                                                                           | Default              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `--wui-button-width`     | Button width; taken over by `100%` when `full` is set.                                                                                                                | `max-content`        |
| `--wui-button-px`        | Horizontal padding.                                                                                                                                                   | `var(--wui-space-3)` |
| `--wui-button-gap`       | Gap between the prefix / label / suffix parts.                                                                                                                        | `var(--wui-space-2)` |
| `--wui-button-color`     | Button text color, declared by `:host([variant='...'])`.                                                                                                              | Depends on variant   |
| `--wui-button-bg`        | Button background color, declared by `:host([variant='...'])`.                                                                                                        | Depends on variant   |
| `--wui-button-bg-hover`  | Hover background color, effective only under `(hover: hover) and (pointer: fine)`; for primary / secondary it is derived from `--wui-button-bg`.                      | Depends on variant   |
| `--wui-button-bg-active` | Pressed background color, effective on `:active` when not disabled and regardless of pointer device; also derived from `--wui-button-bg` (except for danger / glass). | Depends on variant   |

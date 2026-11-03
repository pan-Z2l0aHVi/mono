# Collapse

A collapse panel packs the trigger and the content into one element. Put the trigger in the default slot and the content in the `content` slot.

When the user clicks the trigger, the component updates `open` and then dispatches `open-change`. The handler writes `detail.open` back into page state, so the page state matches the panel.

## Samples

### Basic

`open` is the single source of truth. The `content` slot holds the content to collapse, and the default slot holds the trigger.

A trigger click updates `open` and then dispatches `open-change`. The handler only has to write `detail.open` back into page state.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-collapse open={open} onopen-change={event => setOpen(event.detail.open)}>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          Show details
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            <p className="m-0">The content slot accepts any node: text, forms, images, even another collapse.</p>
          </div>
        </div>
      </web-ui-collapse>
      <output className="text-sm text-(--wui-color-text-secondary)">open after write-back: {String(open)}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-collapse :open="open" @open-change="open = $event.detail.open">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Show details
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p class="m-0">The content slot accepts any node: text, forms, images, even another collapse.</p>
        </div>
      </div>
    </web-ui-collapse>
    <output class="text-sm text-(--wui-color-text-secondary)">open after write-back: {{ open }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### Without binding open

The component toggles `open` on its own, so it works with no binding at all. Just provide the default slot and the `content` slot. A static `open` means the panel starts expanded. When it is already `open` at mount, it shows the expanded state directly and plays no enter animation. A static value applies only once at mount. After that the component keeps toggling the property itself, and the page plays no part in it.

```tsx
export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-collapse>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          Collapsed initially
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            <p className="m-0">No open binding: on a trigger click the component writes the property itself.</p>
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse open>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          Expanded initially
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            <p className="m-0">
              It carries open at mount and lands directly in the expanded state; only the next click plays the exit
              animation.
            </p>
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-collapse>
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Collapsed initially
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p class="m-0">No open binding: on a trigger click the component writes the property itself.</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse :open="true">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Expanded initially
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p class="m-0">
            It carries open at mount and lands directly in the expanded state; only the next click plays the exit
            animation.
          </p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>
```

### Trigger types

Interaction semantics come from the element in the default slot. A native `<button>` and a `<web-ui-button>` already provide Enter / Space activation and focus. The component writes `aria-expanded` back to the first element in the default slot and adds `disabled` to it while it is disabled.

`aria-controls` is not written back: `aria-expanded` expresses the expanded relationship, and `<web-ui-button>` syncs it to its inner `button`.

The whole default slot is clickable, so a click anywhere in it counts as a toggle. Do not put explanatory text in it.

A plain-text trigger can be clicked, but it cannot take focus and has no keyboard activation.

```tsx
import { lucideChevronDown } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-collapse>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          Native button
        </button>
        <div slot="content">
          <div className="p-3 text-sm">Enter / Space and focus are provided by this native button itself.</div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse>
        <web-ui-button variant="secondary" full>
          web-ui-button
        </web-ui-button>
        <div slot="content">
          <div className="p-3 text-sm">
            A custom element also works as a trigger; the expanded state is synced to its inner native button for
            assistive technology to read.
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse>
        <web-ui-button variant="secondary" full>
          <web-ui-icon slot="prefix" icon={lucideChevronDown} size={14}></web-ui-icon>Trigger with a prefix icon
        </web-ui-button>
        <div slot="content">
          <div className="p-3 text-sm">
            The first assigned thing is still that button; the expanded state is synced to its inner native button.
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse>
        Plain-text trigger
        <div slot="content">
          <div className="p-3 text-sm">
            The wrong way: clickable with a mouse, but not focusable and with no keyboard activation.
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-collapse>
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Native button
      </button>
      <div slot="content">
        <div class="p-3 text-sm">Enter / Space and focus are provided by this native button itself.</div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse>
      <web-ui-button variant="secondary" full>web-ui-button</web-ui-button>
      <div slot="content">
        <div class="p-3 text-sm">
          A custom element also works as a trigger; the expanded state is synced to its inner native button for
          assistive technology to read.
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse>
      <web-ui-button variant="secondary" full>
        <web-ui-icon slot="prefix" :icon="lucideChevronDown" :size="14"></web-ui-icon>
        Trigger with a prefix icon
      </web-ui-button>
      <div slot="content">
        <div class="p-3 text-sm">
          The first assigned thing is still that button; the expanded state is synced to its inner native button.
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse>
      Plain-text trigger
      <div slot="content">
        <div class="p-3 text-sm">
          The wrong way: clickable with a mouse, but not focusable and with no keyboard activation.
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
import { lucideChevronDown } from '@greypan/web-ui/icons'
</script>
```

### Disabled

`disabled` makes clicks be ignored and adds `disabled` to the trigger element. Removing the disabled state removes that attribute and lets the trigger report its own disabled state again. It does not change a panel that is already expanded. With both `open` and `disabled` set, the content stays visible. `disabled` only blocks triggering, not the current state.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [disabled, setDisabled] = useState(true)

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <web-ui-checkbox checked={disabled} onChange={event => setDisabled(event.currentTarget.checked)}>
        Disable the trigger of the first one
      </web-ui-checkbox>

      <web-ui-collapse disabled={disabled}>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          Disabled with the checkbox
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            Uncheck to expand; once checked it does not react to clicks, but the content of this one was not expanded to
            begin with.
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse open disabled>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          Expanded and disabled
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            Disabling does not collapse expanded content: this one stays visible and trigger clicks have no effect.
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <web-ui-checkbox :checked="disabled" @change="disabled = $event.target.checked">
      Disable the trigger of the first one
    </web-ui-checkbox>

    <web-ui-collapse :disabled="disabled">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Disabled with the checkbox
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          Uncheck to expand; once checked it does not react to clicks, but the content of this one was not expanded to
          begin with.
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse :open="true" disabled>
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Expanded and disabled
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          Disabling does not collapse expanded content: this one stays visible and trigger clicks have no effect.
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const disabled = ref(true)
</script>
```

### Events and methods

`open-change` is dispatched only after a user gesture. `detail.open` is the state the component has already set.

The three buttons on the right call the element instance's `show()` / `close()` / `toggle()`. They change the same `open` and the animation still plays, but they dispatch no event. Programmatic calls must stay silent, otherwise the handler's write-back and the notification would form a loop.

```tsx
import type { WebUiCollapse } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const panel = useRef<WebUiCollapse>(null)
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('Nothing dispatched yet')

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <web-ui-button variant="secondary" onClick={() => panel.current?.show()}>
          show()
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={() => panel.current?.close()}>
          close()
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={() => panel.current?.toggle()}>
          toggle()
        </web-ui-button>
      </div>

      <web-ui-collapse
        ref={panel}
        onopen-change={event => {
          setCount(current => current + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          Click the trigger to toggle
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            The three buttons above open and close the panel without incrementing the count.
          </div>
        </div>
      </web-ui-collapse>

      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change: {count} times · last detail.open = {last}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button variant="secondary" @click="panel?.show()">show()</web-ui-button>
      <web-ui-button variant="secondary" @click="panel?.close()">close()</web-ui-button>
      <web-ui-button variant="secondary" @click="panel?.toggle()">toggle()</web-ui-button>
    </div>

    <web-ui-collapse ref="panel" @open-change="onOpenChange">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Click the trigger to toggle
      </button>
      <div slot="content">
        <div class="p-3 text-sm">The three buttons above open and close the panel without incrementing the count.</div>
      </div>
    </web-ui-collapse>

    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change: {{ count }} times · last detail.open = {{ last }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiCollapse, WebUiEvent } from '@greypan/web-ui'
import { ref, useTemplateRef } from 'vue'

const panel = useTemplateRef<WebUiCollapse>('panel')
const count = ref(0)
const last = ref('Nothing dispatched yet')

function onOpenChange(event: WebUiEvent<WebUiCollapse, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### Closed state and scroll position

Both panels close to a visible height of 0. The difference is what happens to the content while closed.

By default, closed content is not rendered, so its scroll position is lost. With `keep-mounted` the content stays mounted but non-interactive, preserving its scroll position and size. The cost is that closed content remains in the page.

`keep-mounted` does not give the closed panel any height. Scroll the right panel to the middle, collapse and expand it, and the position is still there. Do the same on the left and it returns to the top.

```tsx
export default function Demo() {
  const rows = Array.from({ length: 20 }, (_, index) => `List item ${index + 1}`)

  return (
    <div className="flex w-full flex-col items-start gap-4 sm:flex-row">
      <web-ui-collapse className="w-full sm:max-w-xs">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          Default closed state
        </button>
        <div slot="content">
          <div className="max-h-32 overflow-y-auto p-3 text-sm">
            {rows.map(row => (
              <p key={row} className="m-0">
                {row}
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse keepMounted className="w-full sm:max-w-xs">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          keep-mounted closed state
        </button>
        <div slot="content">
          <div className="max-h-32 overflow-y-auto p-3 text-sm">
            {rows.map(row => (
              <p key={row} className="m-0">
                {row}
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col items-start gap-4 sm:flex-row">
    <web-ui-collapse class="w-full sm:max-w-xs">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Default closed state
      </button>
      <div slot="content">
        <div class="max-h-32 overflow-y-auto p-3 text-sm">
          <p v-for="row in rows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse keep-mounted class="w-full sm:max-w-xs">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        keep-mounted closed state
      </button>
      <div slot="content">
        <div class="max-h-32 overflow-y-auto p-3 text-sm">
          <p v-for="row in rows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
const rows = Array.from({ length: 20 }, (_, index) => `List item ${index + 1}`)
</script>
```

### Peek preview

`peek` makes the closed panel keep a fixed length instead of 0, and the exposed strip hints that more content follows. Its closed-state behavior equals `keep-mounted`. The content stays mounted but is entirely non-interactive, so the exposed part is not clickable and cannot be reached with Tab. Expand first to interact.

When the content is shorter than `peek`, the closed height equals the content height and leaves no blank space.

`peek` accepts any CSS length. Written in `rem`, it scales with the root font size.

```tsx
export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <web-ui-collapse peek="80px">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          peek 80px (content is longer)
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 8 }, (_, index) => (
              <p key={index} className="m-0">
                Paragraph {index + 1}: when closed only the first 80px shows, and that strip is not clickable either.
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse peek="200px">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          peek 200px (content is shorter)
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            Content is under 200px: the collapsed height takes the actual height of the content and is not stretched to
            200px.
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <web-ui-collapse peek="80px">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        peek 80px (content is longer)
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in longRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse peek="200px">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        peek 200px (content is shorter)
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          Content is under 200px: the collapsed height takes the actual height of the content and is not stretched to
          200px.
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
const longRows = Array.from(
  { length: 8 },
  (_, index) => `Paragraph ${index + 1}: when closed only the first 80px shows, and that strip is not clickable either.`
)
</script>
```

### Edge fade

The clipping edge of the exposed region carries an transparency fade, and the same area also gets a background blur. The length is calculated from `peek`: the default ratio is 0.4, capped at `--wui-collapse-peek-edge-max` (`112px`).

`--wui-collapse-peek-edge-ratio` adjusts the fade area as a ratio of `peek`, and the result never exceeds `--wui-collapse-peek-edge-max`.

```tsx
export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <web-ui-collapse peek="200px">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          peek 200px · default ratio 0.4
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 6 }, (_, index) => (
              <p key={index} className="m-0">
                Paragraph {index + 1}: the last 80px (200px × 0.4) is the fade and blur area.
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse peek="200px" className="[--wui-collapse-peek-edge-ratio:0.7]">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          peek 200px · ratio 0.7, clamped by the cap
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 6 }, (_, index) => (
              <p key={index} className="m-0">
                Paragraph {index + 1}: 200px × 0.7 = 140px, but it is drawn at the 112px cap.
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <web-ui-collapse peek="200px">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        peek 200px · default ratio 0.4
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in derivedRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse peek="200px" class="[--wui-collapse-peek-edge-ratio:0.7]">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        peek 200px · ratio 0.7, clamped by the cap
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in cappedRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
const derivedRows = Array.from(
  { length: 6 },
  (_, index) => `Paragraph ${index + 1}: the last 80px (200px × 0.4) is the fade and blur area.`
)
const cappedRows = Array.from(
  { length: 6 },
  (_, index) => `Paragraph ${index + 1}: 200px × 0.7 = 140px, but it is drawn at the 112px cap.`
)
</script>
```

### CSS variables

`--wui-collapse-peek-edge` sets the gradient length explicitly, overriding the default. `--wui-collapse-peek-edge-blur` is the radius of the background blur on the same area. `--wui-collapse-peek-edge-color` is the gradient's starting color at the clipping edge (the page background by default), fading to fully transparent towards the content.

When `peek` is a percentage no fade is produced; in that form set the length explicitly with `--wui-collapse-peek-edge`.

```tsx
import type { CSSProperties } from 'react'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <web-ui-collapse
        peek="160px"
        style={
          {
            '--wui-collapse-peek-edge': '28px',
            '--wui-collapse-peek-edge-blur': '10px'
          } as CSSProperties
        }
      >
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          Explicit length 28px · blur 10px
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 5 }, (_, index) => (
              <p key={index} className="m-0">
                Paragraph {index + 1}: the token sets the fade length to 28px and the blur radius to 10px.
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse
        peek="160px"
        style={{ '--wui-collapse-peek-edge-color': 'var(--wui-color-border)' } as CSSProperties}
      >
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          Edge color from the shared border color
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 5 }, (_, index) => (
              <p key={index} className="m-0">
                Paragraph {index + 1}: the clipping edge uses the border color as its base, and the band fades from the
                edge inwards.
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <web-ui-collapse
      peek="160px"
      :style="{
        '--wui-collapse-peek-edge': '28px',
        '--wui-collapse-peek-edge-blur': '10px'
      }"
    >
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Explicit length 28px · blur 10px
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in blurRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse peek="160px" :style="{ '--wui-collapse-peek-edge-color': 'var(--wui-color-border)' }">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Edge color from the shared border color
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in edgeColorRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
const blurRows = Array.from(
  { length: 5 },
  (_, index) => `Paragraph ${index + 1}: the token sets the fade length to 28px and the blur radius to 10px.`
)
const edgeColorRows = Array.from(
  { length: 5 },
  (_, index) =>
    `Paragraph ${index + 1}: the clipping edge uses the border color as its base, and the area fades from the edge inwards.`
)
</script>
```

### Horizontal

`horizontal` switches the animation axis from height to width, so the content expands along the width and the trigger and content sit on one row. The host is a block box, so add flex on the host to get a row, for example `flex items-center gap-2`.

After the axis change `peek` also becomes a width, and the fade area falls on the right edge.

The cost is that the content reflows as the width changes during the animation.

```tsx
import { radixIconsPanelLeftMinimized } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col items-start gap-4">
      <web-ui-collapse horizontal className="flex items-center gap-2">
        <button
          type="button"
          className="flex-none cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2"
        >
          <web-ui-icon className="align-[-2px]" icon={radixIconsPanelLeftMinimized} size={14}></web-ui-icon>
          Expand sidebar
        </button>
        <div slot="content">
          <div className="w-64 whitespace-nowrap p-3 text-sm">
            The content area expands along the width, and the trigger stays on the same row.
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse horizontal peek="120px" className="flex items-center gap-2">
        <button
          type="button"
          className="flex-none cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2"
        >
          Horizontal peek
        </button>
        <div slot="content">
          <div className="w-64 whitespace-nowrap p-3 text-sm">
            When closed it exposes 120px of width, with the fade on the right edge.
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-4">
    <web-ui-collapse horizontal class="flex items-center gap-2">
      <button type="button" class="flex-none cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2">
        <web-ui-icon class="align-[-2px]" :icon="radixIconsPanelLeftMinimized" :size="14"></web-ui-icon>
        Expand sidebar
      </button>
      <div slot="content">
        <div class="w-64 whitespace-nowrap p-3 text-sm">
          The content area expands along the width, and the trigger stays on the same row.
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse horizontal peek="120px" class="flex items-center gap-2">
      <button type="button" class="flex-none cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2">
        Horizontal peek
      </button>
      <div slot="content">
        <div class="w-64 whitespace-nowrap p-3 text-sm">
          When closed it exposes 120px of width, with the fade on the right edge.
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
import { radixIconsPanelLeftMinimized } from '@greypan/web-ui/icons'
</script>
```

### Nested

The inner collapse sits in the outer one's `content` slot. Expanding the inner one makes the outer one grow, with its height decided by the content.

The two collapses do not interfere. Clicking the inner trigger does not toggle the outer one as well.

However, `open-change` has `bubbles` and `composed`, so the inner notification passes through the outer host. When binding a handler on the outer one, filter by `event.target === event.currentTarget`, otherwise an inner toggle is read as an outer toggle.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [outer, setOuter] = useState(false)
  const [inner, setInner] = useState(false)

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-collapse
        open={outer}
        onopen-change={event => {
          // The inner open-change bubbles through the outer host: only accept the one dispatched to this element.
          if (event.target === event.currentTarget) setOuter(event.detail.open)
        }}
      >
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          Outer collapse
        </button>
        <div slot="content">
          <div className="p-3">
            <p className="m-0 mb-2 text-sm">Outer content, with another one nested inside.</p>
            <web-ui-collapse open={inner} onopen-change={event => setInner(event.detail.open)}>
              <button
                type="button"
                className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-raised) px-3 py-2 text-left"
              >
                Inner collapse
              </button>
              <div slot="content">
                <div className="p-3 text-sm">
                  Expanding the inner one makes the outer one taller; each level holds its own open.
                </div>
              </div>
            </web-ui-collapse>
          </div>
        </div>
      </web-ui-collapse>

      <output className="text-sm text-(--wui-color-text-secondary)">
        outer {String(outer)} · inner {String(inner)}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-collapse :open="outer" @open-change="onOuterChange">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Outer collapse
      </button>
      <div slot="content">
        <div class="p-3">
          <p class="m-0 mb-2 text-sm">Outer content, with another one nested inside.</p>
          <web-ui-collapse :open="inner" @open-change="inner = $event.detail.open">
            <button
              type="button"
              class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-raised) px-3 py-2 text-left"
            >
              Inner collapse
            </button>
            <div slot="content">
              <div class="p-3 text-sm">
                Expanding the inner one makes the outer one taller; each level holds its own open.
              </div>
            </div>
          </web-ui-collapse>
        </div>
      </div>
    </web-ui-collapse>

    <output class="text-sm text-(--wui-color-text-secondary)">outer {{ outer }} · inner {{ inner }}</output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiCollapse, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const outer = ref(false)
const inner = ref(false)

function onOuterChange(event: WebUiEvent<WebUiCollapse, 'open-change'>) {
  // The inner open-change bubbles through the outer host: only accept the one dispatched to this element.
  if (event.target === event.currentTarget) outer.value = event.detail.open
}
</script>
```

### Multiple instances

The three panels each hold their own `open`, and the page uses an array as the source of truth. Each `open` is written as whether the panel is in the array, and write-back goes through `open-change`'s `detail.open`. With "Only one at a time" checked, the page guarantees exclusivity. Collapse does not manage groups; exclusivity is the page's state management, not a component property.

Multiple instances on the same page each own their `open` and their own ARIA write-back, so they do not interfere with each other.

```tsx
import { useState } from 'react'

const sections = [
  { title: 'Shipping', body: 'Orders placed before 18:00 on a business day ship the same day.' },
  { title: 'Returns', body: 'Returns and exchanges can be requested within 7 days of delivery.' },
  { title: 'Invoices', body: 'Select an invoice at checkout; the e-invoice is issued within 3 business days.' }
]

export default function Demo() {
  const [open, setOpen] = useState(['Shipping'])
  const [exclusive, setExclusive] = useState(true)

  function setAt(title: string, value: boolean) {
    setOpen(current => {
      if (!value) return current.filter(item => item !== title)
      return exclusive ? [title] : [...current, title]
    })
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-checkbox checked={exclusive} onChange={event => setExclusive(event.currentTarget.checked)}>
        Only one at a time
      </web-ui-checkbox>

      {sections.map(item => (
        <web-ui-collapse
          key={item.title}
          open={open.includes(item.title)}
          onopen-change={event => setAt(item.title, event.detail.open)}
        >
          <button
            type="button"
            className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
          >
            {item.title}
          </button>
          <div slot="content">
            <div className="p-3 text-sm">{item.body}</div>
          </div>
        </web-ui-collapse>
      ))}

      <output className="text-sm text-(--wui-color-text-secondary)">expanded: {open.join(', ') || 'none'}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-checkbox :checked="exclusive" @change="exclusive = $event.target.checked"
      >Only one at a time</web-ui-checkbox
    >

    <web-ui-collapse
      v-for="item in sections"
      :key="item.title"
      :open="open.includes(item.title)"
      @open-change="setAt(item.title, $event.detail.open)"
    >
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        {{ item.title }}
      </button>
      <div slot="content">
        <div class="p-3 text-sm">{{ item.body }}</div>
      </div>
    </web-ui-collapse>

    <output class="text-sm text-(--wui-color-text-secondary)">expanded: {{ open.join(', ') || 'none' }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const sections = [
  { title: 'Shipping', body: 'Orders placed before 18:00 on a business day ship the same day.' },
  { title: 'Returns', body: 'Returns and exchanges can be requested within 7 days of delivery.' },
  { title: 'Invoices', body: 'Select an invoice at checkout; the e-invoice is issued within 3 business days.' }
]

const open = ref(['Shipping'])
const exclusive = ref(true)

function setAt(title: string, value: boolean) {
  if (!value) {
    open.value = open.value.filter(item => item !== title)
    return
  }
  open.value = exclusive.value ? [title] : [...open.value, title]
}
</script>
```

### Content height changes

In the expanded state the height is decided by the content. When the content grows or shrinks inside the panel, the panel grows or shrinks with it. Add or remove a row and it takes effect immediately.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(true)
  const [rows, setRows] = useState(['Row 1'])

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <web-ui-button
          variant="secondary"
          onClick={() => setRows(current => [...current, `Row ${current.length + 1}`])}
        >
          Add a row
        </web-ui-button>
        <web-ui-button
          variant="secondary"
          disabled={rows.length === 1}
          onClick={() => setRows(current => current.slice(0, -1))}
        >
          Remove a row
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">rows: {rows.length}</output>
      </div>

      <web-ui-collapse open={open} onopen-change={event => setOpen(event.detail.open)}>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          Change content while expanded
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {rows.map(row => (
              <p key={row} className="m-0">
                {row}
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button variant="secondary" @click="addRow">Add a row</web-ui-button>
      <web-ui-button variant="secondary" :disabled="rows.length === 1" @click="removeRow">Remove a row</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">rows: {{ rows.length }}</output>
    </div>

    <web-ui-collapse :open="open" @open-change="open = $event.detail.open">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Change content while expanded
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in rows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(true)
const rows = ref(['Row 1'])

function addRow() {
  rows.value = [...rows.value, `Row ${rows.value.length + 1}`]
}

function removeRow() {
  if (rows.value.length > 1) rows.value = rows.value.slice(0, -1)
}
</script>
```

## API

### Props

| Name           | Description                                                                                                                                                                                                | Type             | Default |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------- |
| `open`         | Expanded state, the single source of truth. On a trigger click the component writes it to the new value itself, then dispatches `open-change`; a static value in the template only sets the initial state. | `boolean`        | `false` |
| `disabled`     | Disables triggering: clicks are ignored and `disabled` is added to the trigger element; already-expanded content stays as it is.                                                                           | `boolean`        | `false` |
| `horizontal`   | Horizontal direction: expands along the width instead of the default height.                                                                                                                               | `boolean`        | `false` |
| `keep-mounted` | Keeps the content mounted but non-interactive when closed, preserving scroll position and size.                                                                                                            | `boolean`        | `false` |
| `peek`         | Size exposed when closed (a CSS length such as `120px` or `6rem`). When set, behaves like `keep-mounted`.                                                                                                  | `string \| null` | `null`  |

### Events

| Name          | Description                                                                                                                                                                                                                                                                                                                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open-change` | Notification after a user-gesture toggle: `detail.open` is the state the component has already set, and the handler writes it back to `open` so page state matches reality. `show()` / `close()` / `toggle()` and writing `open` directly dispatch nothing. The event is `bubbles` and `composed` and passes through ancestor hosts; when bound on an ancestor, filter by `event.target`. |

### Slots

| Name      | Description                                                                                                                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `default` | The trigger. The whole slot is clickable, so a click anywhere in it counts as a toggle. `aria-expanded` is written to the first element in the slot, and `disabled` is added to it while disabled. `<web-ui-button>` syncs both to its inner `button`, so put an interactive element here. |
| `content` | Collapse content. When closed the content is non-interactive; `keep-mounted` keeps it mounted, `peek` exposes its head.                                                                                                                                                                    |

### Methods

| Name       | Description                                                                        |
| ---------- | ---------------------------------------------------------------------------------- |
| `show()`   | Expands: sets `open` to `true`; programmatic changes dispatch no `open-change`.    |
| `close()`  | Collapses: sets `open` to `false`; programmatic changes dispatch no `open-change`. |
| `toggle()` | Toggles expansion according to the current `open`.                                 |

### Behavior

A panel mounted with the `open` attribute shows the expanded state directly and plays no enter animation. Only later changes go through the transition. The expanded height is always decided by the content; when the content grows or shrinks, the panel grows or shrinks with it.

Durations come from `--wui-duration-collapse-enter` / `--wui-duration-collapse-exit` (200ms / 160ms, defined by `<web-ui-theme>`). With theme `motion="reduced"` or the system `prefers-reduced-motion`, no animation plays and the panel goes straight to the final state.

`open-change` is dispatched only after a user gesture (`bubbles` and `composed`). `show()` / `close()` / `toggle()` and writing `open` directly are all silent.

Not writing it back will not revert the value, but the page state then disagrees with the panel.

When nested, clicks do not interfere: a click on the inner trigger does not toggle the outer one as well. The inner `open-change` does pass through the outer host, so a listener bound on the outer one must filter by `event.target === event.currentTarget`.

### Trigger semantics

Interaction semantics come from the element placed in the default slot. A native `<button>`, a `<web-ui-button>`, or another interactive element provides Enter / Space activation and focus.

collapse writes `aria-expanded` back to the first element in the trigger slot and adds `disabled` to it while it is disabled. `<web-ui-button>` passes both to its inner `button`.

`aria-controls` is not written back; `aria-expanded` expresses the expanded relationship.

Use an interactive element as the trigger. A plain `<span>` is clickable but has no keyboard or focus semantics.

All content of the default slot is clickable, so explanatory text placed in the default slot also counts as a toggle when clicked. The component only writes back to the first element in the slot, so put the interactive element first.

### Closed state semantics

By default the content is not rendered when closed, invisible and non-interactive, and its own scroll position is lost with it.

`keep-mounted` keeps the content mounted but non-interactive, preserving both its scroll position and its size. The closed content remains in the page but takes no visible height.

`peek` has the same behavior as `keep-mounted`. During a toggle animation the content is non-interactive as well.

### Peek preview

With `peek` set, the closed panel exposes the head of the content along the animation axis for `peek` length (width with `horizontal`) instead of collapsing to 0.

Its behavior equals `keep-mounted`. The content stays mounted but all of it is unfocusable and unclickable, including the exposed strip.

When the content itself is shorter than `peek`, it collapses to the content's actual size and leaves no blank space.

```html
<web-ui-collapse peek="120px">
  <button type="button">Toggle</button>
  <div slot="content">Very long content: when closed only the first 120px shows</div>
</web-ui-collapse>
```

### Edge fade

The clipping edge of the exposed region carries an transparency fade (on the right with `horizontal`), and the same area also gets a background blur, so the clipped part fades into the background instead of cutting off hard. The gradient length is calculated from `peek`. There is no extra attribute to adjust it; use CSS variables when needed.

Setting the ratio to `0` turns the fade off. When `peek` is in rem the gradient length follows the root font size.

Known limitation: when `peek` is a percentage no fade appears. In that case set the length explicitly with `--wui-collapse-peek-edge`.

```html
<!-- Stronger fade: ratio 0.5 → a 120px peek gets a 60px fade -->
<web-ui-collapse peek="120px" style="--wui-collapse-peek-edge-ratio: 0.5">
  <button type="button">Toggle</button>
  <div slot="content">Very long content: the fade at the bottom of the 120px exposed area is stronger</div>
</web-ui-collapse>
```

### CSS Custom Properties

| Name                             | Description                                                               | Default                       |
| -------------------------------- | ------------------------------------------------------------------------- | ----------------------------- |
| `--wui-collapse-peek-edge-ratio` | Gradient length as a share of `peek`                                      | `0.4`                         |
| `--wui-collapse-peek-edge-max`   | Length cap, so a large `peek` does not calculate an overly long blur area | `112px`                       |
| `--wui-collapse-peek-edge`       | Explicit length, overriding the calculated default                        | —                             |
| `--wui-collapse-peek-edge-color` | Gradient start color at the clipping edge                                 | `var(--wui-color-page, #fff)` |
| `--wui-collapse-peek-edge-blur`  | Radius of the background blur on the same gradient area                   | `4px`                         |

### Known limitations

During a `horizontal` animation the content reflows as the width changes.

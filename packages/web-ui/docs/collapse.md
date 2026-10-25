---
component: collapse
tag: web-ui-collapse
---

A collapse panel packs the trigger and the content into one element: the trigger goes into the default slot, and the content to collapse goes into the `content` slot.

When the user clicks the trigger, the component writes `open` to the new value itself and then dispatches an `open-change` notification; the consumer writes `detail.open` back into page state so that the readout on the page matches the panel.

## Samples

### Basic {#basic}

`open` is the single source of truth; the `content` slot holds the content to collapse, and the default slot holds the trigger.

On a trigger click the component first writes `open` to the new value and then dispatches `open-change`, so the handler only has to write `detail.open` back into page state.

The readout below shows the written-back value; the component keeps no second copy of the state.

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

### Without binding open {#uncontrolled}

The component toggles `open` on its own, so it works with no binding at all: just provide the default slot and the `content` slot. The second one writes `open` statically, meaning it starts expanded—when it is already `open` at mount it lands directly in the expanded resting state and plays no enter animation. A static value only applies once at mount; afterwards the component keeps toggling the property itself and the page is no longer involved.

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
              It carries open at mount and lands directly in the expanded resting state; only the next click plays the
              exit animation.
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
            It carries open at mount and lands directly in the expanded resting state; only the next click plays the
            exit animation.
          </p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>
```

### Trigger types {#trigger}

Interaction semantics come from the element in the default slot itself: a native `<button>` and a `<web-ui-button>` already provide Enter / Space activation and focus, and the component writes `aria-expanded` / `aria-controls` / `aria-disabled` back to the first assigned element in the default slot.

`<web-ui-button>` syncs `aria-expanded` and `aria-disabled` to its inner native button; `aria-controls` stays on the host and is not copied into another shadow root, because IDREFs cannot resolve across shadow roots.

The whole default slot falls inside the click proxy, so a click anywhere in it counts as a toggle; do not put explanatory text in it.

The last one uses a plain-text trigger: it can be clicked, but it cannot take focus and has no keyboard activation; it only demonstrates the wrong way.

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

### Disabled {#disabled}

`disabled` makes clicks be ignored and writes `aria-disabled` to the trigger element; removing the disabled state removes that attribute. It does not change a panel that is already expanded: the second one sets both `open` and `disabled` and its content stays visible—disabling governs triggering, not the current state.

The checkbox below toggles the first one's `disabled` at runtime, so you can compare how `aria-disabled` is written and removed.

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

### Events and methods {#events}

The readout shows the `open-change` count and the last `detail.open`, both taken on this collapse host. A trigger click increments the count: `open-change` is dispatched only after a user gesture, and `detail.open` is the state the component has already landed on.

The three buttons on the right call the element instance's `show()` / `close()` / `toggle()`; they change the same `open` and the animation still plays, but they dispatch no event—programmatic entry points must be silent, otherwise the consumer's write-back and the notification would form a loop.

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

### Closed resting state and scroll position {#keep-mounted}

Both stay in the closed resting state and both have a visible height of 0; the difference is how the content exits.

The left one is the default: the content container inside the shadow root is `hidden` (`display: none`), so its inner scroll position is lost along with it. The right one uses `keep-mounted`: the content stays in the `0fr` track and the whole subtree is `inert`, so the scroll position survives and the size stays measurable, at the cost of the closed state remaining in the render tree.

`keep-mounted` does not mean the closed state occupies a layer of height. Try it: scroll the right one to the middle, collapse and expand it again, and the position is still there; do the same on the left and it returns to the top.

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
          Default closed resting state
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
          keep-mounted closed resting state
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
        Default closed resting state
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
        keep-mounted closed resting state
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

### Peek preview band {#peek}

`peek` makes the closed resting state collapse to a fixed length instead of 0, and the exposed strip hints that more content follows. Its closed-state semantics equal `keep-mounted`: the whole inner subtree sits inside an `inert` subtree, so the exposed part is likewise not clickable and cannot be reached with Tab; expand first to interact.

The second one's content is shorter than `peek`, so the collapsed height equals the content height and leaves no blank space.

`peek` accepts any CSS length; written in `rem` it scales with the root font size.

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

### Edge fade {#peek-edge}

The clipping edge of the exposed region carries an alpha fade, and the same band layers a background blur on top; its length is derived from `peek`: a default ratio of 0.4, clamped within `--wui-collapse-peek-edge-max` (`112px`).

The first one with `peek="200px"` gets an 80px band; the second raises `--wui-collapse-peek-edge-ratio` to 0.7, and the computed 140px is clamped by the cap to 112px.

This one is about the band length and where it is derived from; it uses its own `peek` and ratio, separate from the collapse in the code area below the sample card: the preview is not inside the code-area collapse, so the two do not overlap.

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
                Paragraph {index + 1}: the last 80px (200px × 0.4) is the fade-plus-blur band.
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
  (_, index) => `Paragraph ${index + 1}: the last 80px (200px × 0.4) is the fade-plus-blur band.`
)
const cappedRows = Array.from(
  { length: 6 },
  (_, index) => `Paragraph ${index + 1}: 200px × 0.7 = 140px, but it is drawn at the 112px cap.`
)
</script>
```

### CSS variables {#theming}

`--wui-collapse-peek-edge` sets the gradient length explicitly and takes precedence over the derived value; `--wui-collapse-peek-edge-blur` is the radius of the background blur on the same band; `--wui-collapse-peek-edge-color` is the gradient's starting color at the clipping edge (the page background by default), fading to fully transparent towards the content.

When `peek` is a percentage the derived result is not a length and cannot be interpolated by the registered `<length>` property, so it silently falls back to no fade—with that form the only way to get a band is `--wui-collapse-peek-edge`.

Both stay in the closed resting state; the first raises the blur radius to 10px, and the second points the edge color at the shared `--wui-color-border`, so the band stands out from the default page color.

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
                Paragraph {index + 1}: the band length ignores the 0.4 derivation of peek, and the blur radius rises
                from 4px to 10px.
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
  (_, index) =>
    `Paragraph ${index + 1}: the band length ignores the 0.4 derivation of peek, and the blur radius rises from 4px to 10px.`
)
const edgeColorRows = Array.from(
  { length: 5 },
  (_, index) =>
    `Paragraph ${index + 1}: the clipping edge uses the border color as its base, and the band fades from the edge inwards.`
)
</script>
```

### Horizontal {#horizontal}

`horizontal` switches the animation axis from height to width, so the content expands along the width and the trigger and content sit on one row—the host itself is only a block box, so add flex on the host to get a row (both of these set `flex items-center gap-2`).

After the axis change `peek` also becomes a width; the second one pairs `horizontal` with `peek="120px"`, and its fade band falls on the right edge.

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
            When closed it exposes 120px of width, with the fade band on the right edge.
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
          When closed it exposes 120px of width, with the fade band on the right edge.
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
import { radixIconsPanelLeftMinimized } from '@greypan/web-ui/icons'
</script>
```

### Nested {#nested}

The inner collapse sits in the outer one's `content` slot. Expanding the inner one makes the outer one grow: the expanded resting track stays at `1fr` and the height is decided by the content, so the component does not need to measure the inner one.

The two collapses do not interfere—the click proxy only recognizes the bubbling path of its own trigger wrapper, so clicking the inner trigger does not toggle the outer one as well.

However, `open-change` is `bubbles` and `composed`, so the inner notification passes through the outer host; when binding a handler on the outer one, filter by `event.target === event.currentTarget`, otherwise an inner toggle is read as an outer toggle.

This one has only two levels and short content, so it will not stack two long collapses with the code area of the sample card.

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

### Multiple instances {#accordion}

The three panels each hold their own `open`, and the page uses an array as the source of truth: each `open` is written as whether it is in the array, and write-back goes through `open-change`'s `detail.open`. With "Only one at a time" checked, the page guarantees exclusivity—collapse has no group contract; exclusivity is the consumer's state management, not a component property.

Each one's `aria-controls` points at its own track inside the shadow root, and the id is generated by the component, so multiple instances on the same page do not collide.

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

### Content height changes {#content-height}

The expanded resting track stays at `1fr` and the height is decided by the content: the component does not need to re-measure when the content grows or shrinks inside the panel; add or remove a row and the panel grows or shrinks with it. Only the transition between `peek` and expanded—fixed length to content height—needs a pixel read (see Peek preview band).

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
| `disabled`     | Disables triggering: clicks are ignored and `aria-disabled` is written to the trigger element; already-expanded content stays as it is.                                                                    | `boolean`        | `false` |
| `horizontal`   | Horizontal direction: expands along the width instead of the default height.                                                                                                                               | `boolean`        | `false` |
| `keep-mounted` | Keeps the content `inert` rather than `hidden` in the closed resting state, preserving scroll position and measurability.                                                                                  | `boolean`        | `false` |
| `peek`         | Size exposed in the closed resting state (a CSS length such as `120px` or `6rem`). When set, semantics equal `keep-mounted`.                                                                               | `string \| null` | `null`  |

### Events

| Name          | Description                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `open-change` | Notification after a user-gesture toggle: `detail.open` is the state the component has already landed on, and the consumer writes it back to `open` so page state matches reality. `show()` / `close()` / `toggle()` and writing `open` directly dispatch nothing. The event is `bubbles` and `composed` and passes through ancestor hosts; when bound on an ancestor, filter by `event.target`. |

### Slots

| Name      | Description                                                                                                                                                                                                                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default` | The trigger. The whole slot is inside the click proxy, so a click anywhere in it counts as a toggle; `aria-expanded` / `aria-controls` / `aria-disabled` are written to the first assigned element. `<web-ui-button>` syncs `aria-expanded` and `aria-disabled` to its inner native button, so put an interactive element here. |
| `content` | Collapse content. In the closed state `keep-mounted` / `peek` decide whether it is `hidden` or `inert`.                                                                                                                                                                                                                         |

### Methods

| Name       | Description                                                                        |
| ---------- | ---------------------------------------------------------------------------------- |
| `show()`   | Expands: sets `open` to `true`; programmatic changes dispatch no `open-change`.    |
| `close()`  | Collapses: sets `open` to `false`; programmatic changes dispatch no `open-change`. |
| `toggle()` | Toggles expansion according to the current `open`.                                 |

### Behavior

With the `open` attribute present initially it lands directly in the expanded resting state and plays no enter animation; only later changes go through the transition. The animation runs along the block axis (height by default, width with `horizontal`) and is driven by a `0fr ↔ 1fr` grid track inside the shadow root; the expanded resting height is always decided by the content, and content that grows or shrinks while expanded needs no re-measurement.

Durations come from `--wui-duration-collapse-enter` / `--wui-duration-collapse-exit` (200ms / 160ms, defined by `<web-ui-theme>`); with theme `motion="reduced"` or the system `prefers-reduced-motion`, both are zero and the component skips measurement to land on the resting state directly.

`open-change` is a notification, not a request: on a trigger click the component first writes `open` to the new value, then dispatches the event (`bubbles` and `composed`); `show()` / `close()` / `toggle()` and writing `open` directly are all silent, otherwise the consumer's write-back and the notification would form a loop.

Not writing it back will not snap the value back, but the page state then disagrees with the panel.

When nested, clicks do not interfere: the click proxy only recognizes the bubbling path of its own trigger wrapper, so a click on the inner trigger does not toggle the outer one as well; the inner `open-change` does pass through the outer host, so a listener bound on the outer one must filter by `event.target === event.currentTarget`.

### Trigger semantics

Interaction semantics come entirely from the element placed in the default slot—a native `<button>`, a `<web-ui-button>`, or another interactive element natively provides Enter / Space activation and focus.

collapse writes `aria-expanded` / `aria-controls` (pointing at the content track) and `aria-disabled` back to the first assigned element of the trigger slot; `<web-ui-button>` syncs `aria-expanded` and `aria-disabled` to its inner native button.

`aria-controls` stays on the host, because an IDREF pointing into the collapse shadow root cannot resolve in another shadow root.

Use an interactive element as the trigger: a plain `<span>` is clickable but has no keyboard / focus semantics.

All content of the default slot is wrapped in the trigger wrapper and therefore inside the click proxy: explanatory text placed in the default slot also counts as a toggle when clicked. The component only writes back to the first assigned element, so put the interactive element first.

### Closed resting state semantics

The consumer's light DOM is never moved or unmounted; the closed resting state is implemented inside the shadow root in one of three ways: by default `hidden` is set on the content container (`display: none`, removed from the render and accessibility trees); with `keep-mounted` the inner subtree is marked `inert` and stays in the `0fr` track, measurable and with its scroll position intact; with `peek` it is likewise `inert` and the track stops at the clipping window.

The visible height of all three states is whatever the track gives—`keep-mounted` does not make the closed state occupy a layer of height; the price of staying in the render tree is staying mounted and measurable.

During a toggle animation the content is `inert` as well; the attributes take over only once the resting state is reached.

### Peek preview band

With `peek` set, the closed resting state no longer collapses to 0 but exposes the head of the content along the animation axis for `peek` length (width with `horizontal`): the track stays at the content height and the clipping length applies to the inner container.

Its semantics equal `keep-mounted`—the content stays mounted, but the whole inner subtree is blocked by `inert`, so the exposed strip is equally unfocusable and unclickable, and the clipped part even more so.

When the content itself is shorter than `peek`, it collapses to the content's actual size and leaves no blank space.

Because a fixed length and an intrinsic height cannot be interpolated by CSS, the two directions between `peek` and expanded read pixels and drive an explicit length instead (one measurement per toggle); all other animation paths remain zero-measurement grid `fr` transitions.

```html
<web-ui-collapse peek="120px">
  <button type="button">Toggle</button>
  <div slot="content">Very long content—when closed only the first 120px shows</div>
</web-ui-collapse>
```

### Edge fade

The clipping edge of the exposed region carries an alpha gradient (on the right with `horizontal`), so the clipped part fades into the background instead of cutting off hard. The gradient length is derived from `peek`; no second attribute is needed or available—fine-tune it with CSS variables when needed:

The band consists of two layers and reuses the shared `.wui-glow` (the same style as the layout header's glow; see `@greypan/web-ui/classes.css`): on top of the alpha fade, the same band adds a real `backdrop-filter` blur, so the clipped content is actually **blurred**, not merely made semi-transparent.

Inside the component both layers are raised above the content (`.wui-glow` sits below content by default). The blur strength is modulated by the box's own `mask-image`—rising from 0 at the band start to full strength in the second half, then back to 0 before the clipping edge: a non-zero start would leave a seam where the blur suddenly begins, and a non-zero end would blur all the way to the clipping boundary.

In the expanded state the active length is 0, all color stops collapse to 100% and the last stop is fully transparent, so this layer draws nothing.

Setting the ratio to `0` turns the fade off. The derivation is pure CSS `calc(peek * ratio)`: when `peek` is in rem the gradient length follows the root font size automatically, and the JS side needs no unit parsing.

Known limitation: when `peek` is a percentage the derived result is not a length and cannot be interpolated by the registered property, so it silently falls back to no fade; in that case set the length explicitly with `--wui-collapse-peek-edge`.

The alpha fade over the content uses four stops that drop steeply first and then gently, rather than a linear ramp: the fully opaque body extends to the band start, then the first 30% of the distance drops to 60% alpha, 26% at 65%, and the end is fully transparent. With a linear gradient the alpha stays close to 1.0 over the first 40% of the band, so the perceived fade is far shorter than the declared length—front-loading the drop makes the band visibly fade from its start and nearly doubles the perceived length at the same measured length.

The band position is declared in percentages relative to the container's **current rendered height** (the same height the `max-height` animation drives), so during the exit animation the band follows the clipping edge frame by frame and the `mask-image` string itself needs no interpolation. The band length is driven by a registered `<length>` custom property, so it fades in and out smoothly with the toggle animation instead of popping in only once the exit animation lands.

```html
<!-- Stronger fade: ratio 0.5 → a 120px peek gets a 60px fade -->
<web-ui-collapse peek="120px" style="--wui-collapse-peek-edge-ratio: 0.5">
  <button type="button">Toggle</button>
  <div slot="content">Very long content—the fade at the bottom of the 120px exposed area is stronger</div>
</web-ui-collapse>
```

### CSS Custom Properties

| Name                             | Description                                                             | Default                       |
| -------------------------------- | ----------------------------------------------------------------------- | ----------------------------- |
| `--wui-collapse-peek-edge-ratio` | Gradient length as a share of `peek`                                    | `0.4`                         |
| `--wui-collapse-peek-edge-max`   | Length cap, so a large `peek` does not compute an overly long blur band | `112px`                       |
| `--wui-collapse-peek-edge`       | Explicit length, taking precedence over the derived value               | —                             |
| `--wui-collapse-peek-edge-color` | Gradient start color at the clipping edge                               | `var(--wui-color-page, #fff)` |
| `--wui-collapse-peek-edge-blur`  | Radius of the background blur on the same gradient band                 | `4px`                         |

### Known limitations

During a `horizontal` animation the content reflows as the width changes.

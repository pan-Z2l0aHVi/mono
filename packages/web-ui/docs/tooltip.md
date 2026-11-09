# Tooltip

English | [简体中文](./tooltip.CN.md)

The gestures that show a tooltip are declared by `trigger`, which defaults to pointer hover only. The `content` attribute supplies plain text, and the `content` slot can hold richer content.

Hover-only is deliberate: keyboard and screen-reader users get the same information from the trigger's own accessible name or visible text, without a transient panel appearing on focus and disturbing normal interaction. Put essential information on the element itself, as a visible label or `aria-label`. Treat the tooltip as a supplementary hint for pointer users. Set `trigger="hover focus"` only when the tooltip really is the element's accessible description.

## Samples

### Basic

The default slot is the trigger. The `content` attribute gives the plain-text hint.

Pointer entry shows it after the `show-delay`, and pointer exit hides it after the `hide-delay`. Set `trigger="hover focus"` to also show it on keyboard focus.

`open-change` is dispatched after gestures or `show()` / `hide()` change visibility, and `detail.open` is the state the component has already moved to. Writing `open` directly is silent.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('-')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <web-ui-tooltip
        content="Save current changes"
        onopen-change={event => {
          setCount(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <web-ui-button variant="secondary">Save</web-ui-button>
      </web-ui-tooltip>
      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change: {count} times · last detail.open = {last}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <web-ui-tooltip content="Save current changes" @open-change="onOpenChange">
      <web-ui-button variant="secondary">Save</web-ui-button>
    </web-ui-tooltip>
    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change: {{ count }} times · last detail.open = {{ last }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiTooltip } from '@greypan/web-ui'
import { ref } from 'vue'

const count = ref(0)
const last = ref('-')

function onOpenChange(event: WebUiEvent<WebUiTooltip, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### Rich content

The `content` slot replaces the plain text and can hold multiple lines, bold text, or inline code. The slot element must be a direct child of the tooltip with `slot="content"`. The trigger in the default slot should not carry a slot attribute.

Use an icon button with an `aria-label` so keyboard and screen-reader users can identify the action. Set `trigger="hover focus"` to show the hint on focus.

```tsx
import { lucideInfo } from '@greypan/web-ui/icons'
import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('-')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-tooltip onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}>
          <web-ui-button icon variant="ghost" aria-label="View shortcuts">
            <web-ui-icon icon={lucideInfo}></web-ui-icon>
          </web-ui-button>
          <div slot="content" className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Keyboard shortcuts</span>
            <span>
              Press <kbd className="rounded border border-(--wui-color-border) px-1 font-mono text-xs">⌘K</kbd> to open
              the command palette
            </span>
          </div>
        </web-ui-tooltip>
        <span className="text-sm text-(--wui-color-text-secondary)">Hover over the icon button</span>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">last detail.open = {last}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-tooltip @open-change="last = $event.detail.open ? 'true' : 'false'">
        <web-ui-button icon variant="ghost" aria-label="View shortcuts">
          <web-ui-icon :icon="lucideInfo"></web-ui-icon>
        </web-ui-button>
        <div slot="content" class="flex flex-col gap-1 text-sm">
          <span class="font-semibold">Keyboard shortcuts</span>
          <span>
            Press <kbd class="rounded border border-(--wui-color-border) px-1 font-mono text-xs">⌘K</kbd>
            to open the command palette
          </span>
        </div>
      </web-ui-tooltip>
      <span class="text-sm text-(--wui-color-text-secondary)">Hover over the icon button</span>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">last detail.open = {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { lucideInfo } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const last = ref('-')
</script>
```

### Delay

`show-delay` / `hide-delay` control the show and hide delays as the pointer enters and leaves, and `0` means no wait. `disabled` turns every trigger off: pointer, focus, and click all fail to bring the hint up, a hint already shown closes right away, and a pending delay is cancelled. The disabled state dispatches no `open-change`.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('-')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-tooltip
          content="Appears instantly"
          show-delay={0}
          hide-delay={0}
          onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
        >
          <web-ui-button variant="secondary">Instant tooltip</web-ui-button>
        </web-ui-tooltip>
        <web-ui-tooltip content="Does not appear when disabled" disabled>
          <web-ui-button variant="secondary">Disabled tooltip</web-ui-button>
        </web-ui-tooltip>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">
        Instant tooltip last detail.open = {last} · the disabled one dispatches nothing
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-tooltip
        content="Appears instantly"
        :show-delay="0"
        :hide-delay="0"
        @open-change="last = $event.detail.open ? 'true' : 'false'"
      >
        <web-ui-button variant="secondary">Instant tooltip</web-ui-button>
      </web-ui-tooltip>
      <web-ui-tooltip content="Does not appear when disabled" disabled>
        <web-ui-button variant="secondary">Disabled tooltip</web-ui-button>
      </web-ui-tooltip>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">
      Instant tooltip last detail.open = {{ last }} · the disabled one dispatches nothing
    </output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const last = ref('-')
</script>
```

### Trigger modes

`trigger` is a gesture set separated by spaces or commas: `click`, `hover`, `focus`, `none`. It defaults to `hover`, so pointer hover shows the hint. With `trigger="click"` it toggles on a trigger click and closes when you click outside it. Gestures can be written side by side: `trigger="hover focus click"`.

`none` accepts no gesture and takes no part in outside-click closing or Escape; only the `open` property or `show()` / `hide()` moves it. `none` and gestures are mutually exclusive: when both appear, `none` wins and a development warning is printed.

```tsx
import type { WebUiTooltip } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const hint = useRef<WebUiTooltip>(null)
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-tooltip
          content="Click to open, click again to close"
          trigger="click"
          onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
        >
          <web-ui-button variant="secondary">Click tooltip</web-ui-button>
        </web-ui-tooltip>
        <web-ui-tooltip
          ref={hint}
          content="Follows show() / hide() only"
          trigger="none"
          onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
        >
          <web-ui-button variant="secondary" onClick={() => hint.current?.show()}>
            show()
          </web-ui-button>
        </web-ui-tooltip>
        <web-ui-button size="28" variant="secondary" onClick={() => hint.current?.hide()}>
          hide()
        </web-ui-button>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">Last detail.open = {last}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-tooltip
        content="Click to open, click again to close"
        trigger="click"
        @open-change="last = $event.detail.open ? 'true' : 'false'"
      >
        <web-ui-button variant="secondary">Click tooltip</web-ui-button>
      </web-ui-tooltip>
      <web-ui-tooltip
        ref="hint"
        content="Follows show() / hide() only"
        trigger="none"
        @open-change="last = $event.detail.open ? 'true' : 'false'"
      >
        <web-ui-button variant="secondary" @click="hint?.show()">show()</web-ui-button>
      </web-ui-tooltip>
      <web-ui-button size="28" variant="secondary" @click="hint?.hide()">hide()</web-ui-button>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">Last detail.open = {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiTooltip } from '@greypan/web-ui'
import { ref, useTemplateRef } from 'vue'

const hint = useTemplateRef<WebUiTooltip>('hint')
const last = ref('—')
</script>
```

## API

### Props

| Name               | Description                                                                                                                              | Type               | Default   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------- |
| `placement`        | Tooltip placement; defaults to `top`.                                                                                                    | `Placement`        | `'top'`   |
| `trigger`          | Trigger gesture set, separated by spaces or commas: `click`, `hover`, `focus`, `none`; reads back as a comma-separated canonical string. | `string`           | `'hover'` |
| `show-delay`       | Hover-open delay (milliseconds); only hover-originated opens use it.                                                                     | `number`           | `200`     |
| `hide-delay`       | Hover-close delay (milliseconds); only hover-originated closes use it.                                                                   | `number`           | `100`     |
| `disabled`         | Disabled state.                                                                                                                          | `boolean`          | `false`   |
| `offset`           | Distance from the trigger (px).                                                                                                          | `number`           | `6`       |
| `content`          | Hint text, the plain-text alternative to the `content` slot.                                                                             | `string`           | `''`      |
| `open`             | Visibility.                                                                                                                              | `boolean`          | `false`   |
| `isOpen`           | Whether the hint is currently visible (read-only).                                                                                       | `boolean`          | —         |
| `portal`           | Renders in the theme overlay container.                                                                                                  | `boolean`          | `false`   |
| `overlayContainer` | Explicit Portal container (property).                                                                                                    | `OverlayContainer` | —         |

### Events

| Name          | Description                                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `open-change` | Dispatched when gestures or `show()` / `hide()` change visibility; `detail.open` is the current state. Writing `open` does not dispatch. |

### Slots

| Name      | Description                                               |
| --------- | --------------------------------------------------------- |
| `default` | The trigger.                                              |
| `content` | Tooltip panel content, replacing the `content` attribute. |

### Methods

| Name       | Description                                                                     |
| ---------- | ------------------------------------------------------------------------------- |
| `show()`   | Opens the tooltip and dispatches `open-change`; available under `none` as well. |
| `hide()`   | Hides the tooltip and dispatches `open-change`; no effect when already hidden.  |
| `toggle()` | Toggles by current visibility and dispatches `open-change`.                     |

### Behavior

Each gesture in `trigger` wires up its own events, and the gestures combine freely. Unknown values are dropped; when no known gesture remains it falls back to the default `hover`.

- `click`: clicking the trigger toggles the hint and clicking outside closes it; keyboard activation (Enter / Space) is treated like a click, with no entrance animation.
- `hover`: pointer entry shows the hint after `show-delay`; once the pointer leaves both the trigger and the panel, it hides after `hide-delay`; focus keeps it open only when `trigger` includes `focus`. Touch pointers do not count.
- `focus`: keyboard focus (`:focus-visible`) shows it right away without an entrance animation; it hides after focus leaves both the trigger and the panel.
- `none`: no gesture moves it, and neither outside clicks nor Escape close it; only the `open` property or `show()` / `hide()` does.

`show-delay` / `hide-delay` only apply to hover-originated opens and closes; clicks, focus and programmatic calls act immediately.

Showing requires `content` text or at least one `slot="content"` node. With no content, gestures do nothing, while `show()` and writing `open` still show an empty panel. Content added while hidden does not show it; clearing the content while visible hides the tooltip immediately without an exit transition.

Outside clicks close tooltips with `click`; focus loss closes those with `focus`. Escape closes every tooltip except those in `none`.

`open` is a self-managed visibility property. Gestures and `show()` / `hide()` update it, and assigning the property directly also shows or hides the tooltip, but that write is silent and does not dispatch `open-change`.

Once a tooltip is shown, moving the pointer to an adjacent tooltip switches immediately.

While open, the tooltip text is written to `aria-description` on the trigger's focusable element, including native controls inside it, and restored on close. The screen-reader description does not use `aria-describedby`: the panel and trigger usually sit in different DOM trees, where IDREFs cannot resolve.

### CSS Custom Properties

| Name                      | Description           | Default |
| ------------------------- | --------------------- | ------- |
| `--wui-tooltip-max-width` | Maximum tooltip width | `240px` |
| `--wui-tooltip-font-size` | Tooltip font size     | `13px`  |

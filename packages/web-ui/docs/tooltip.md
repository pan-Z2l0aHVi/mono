---
component: tooltip
tag: web-ui-tooltip
---

tooltip shows on pointer and focus; the `content` attribute supplies plain text and the `content` slot can hold richer content.

## Samples

### Basic

The default slot is the trigger, and the `content` attribute gives the plain-text hint.

Pointer entry shows it after the `show-delay`; keyboard focus (`:focus-visible`) shows it immediately. Pointer exit hides it after the `hide-delay`, while losing focus hides it immediately.

`open-change` is dispatched only after user-originated open and close actions, and `detail.open` is the state the component has already settled into; the readout below is the value of the latest notification.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('—')

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
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiTooltip, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### Rich content

The `content` slot replaces the plain text and can hold multiple lines, bold text, or inline code. The slot element must be a direct child of the tooltip with `slot="content"`; the trigger in the default slot should not carry a slot attribute.

Use an icon button with an `aria-label` as the trigger so it stays focusable and keyboard users see the hint too.

```tsx
import { lucideInfo } from '@greypan/web-ui/icons'
import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-tooltip onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}>
          <web-ui-button icon variant="ghost" aria-label="View shortcuts">
            <web-ui-icon icon={lucideInfo} size={16}></web-ui-icon>
          </web-ui-button>
          <div slot="content" className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Keyboard shortcuts</span>
            <span>
              Press <kbd className="rounded border border-(--wui-color-border) px-1 font-mono text-xs">⌘K</kbd> to open
              the command palette
            </span>
          </div>
        </web-ui-tooltip>
        <span className="text-sm text-(--wui-color-text-secondary)">Hover or focus the icon button</span>
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
          <web-ui-icon :icon="lucideInfo" :size="16"></web-ui-icon>
        </web-ui-button>
        <div slot="content" class="flex flex-col gap-1 text-sm">
          <span class="font-semibold">Keyboard shortcuts</span>
          <span>
            Press <kbd class="rounded border border-(--wui-color-border) px-1 font-mono text-xs">⌘K</kbd>
            to open the command palette
          </span>
        </div>
      </web-ui-tooltip>
      <span class="text-sm text-(--wui-color-text-secondary)">Hover or focus the icon button</span>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">last detail.open = {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { lucideInfo } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const last = ref('—')
</script>
```

### Delay

`show-delay` / `hide-delay` control the show and hide delays as the pointer enters and leaves, and `0` means no wait. `disabled` turns triggering off: neither pointer nor focus makes the hint appear, while a hint already shown is not taken down by this attribute. The second tooltip never shows, so the readout follows only the first one; the disabled state dispatches no `open-change`.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

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

const last = ref('—')
</script>
```

## API

### Props

| Name               | Description                                                  | Type               | Default |
| ------------------ | ------------------------------------------------------------ | ------------------ | ------- |
| `placement`        | Floating UI placement, `top` by default.                     | `Placement`        | `'top'` |
| `show-delay`       | Show delay (milliseconds).                                   | `number`           | `200`   |
| `hide-delay`       | Hide delay (milliseconds).                                   | `number`           | `100`   |
| `disabled`         | Disabled state.                                              | `boolean`          | `false` |
| `offset`           | Distance from the trigger (px).                              | `number`           | `6`     |
| `content`          | Hint text, the plain-text alternative to the `content` slot. | `string`           | `''`    |
| `open`             | Visibility.                                                  | `boolean`          | `false` |
| `portal`           | Renders in the theme-owned overlay root.                     | `boolean`          | `false` |
| `overlayContainer` | Explicit Portal container (property).                        | `OverlayContainer` | —       |

### Events

| Name          | Description                                                      |
| ------------- | ---------------------------------------------------------------- |
| `open-change` | The tooltip opens or closes; `detail.open` is the current state. |

### Slots

| Name      | Description                                               |
| --------- | --------------------------------------------------------- |
| `default` | The trigger.                                              |
| `content` | Tooltip panel content, replacing the `content` attribute. |

### Behavior

`open` is a self-managed visibility property. Pointer and focus triggers update it, and assigning the property directly also syncs the local or Portal panel; `open-change` is dispatched only for user-originated toggles.

Once the first tooltip is shown, an adjacent tooltip switches immediately; other pointer/focus triggers use the delay timers.

While open, the tooltip text is written to `aria-description` on the trigger's focusable element (including native controls inside its shadow DOM) and restored on close; the panel also carries a unique `id`. The panel and trigger usually live in different shadow roots, where `aria-describedby` IDREFs cannot resolve, so it does not carry the screen-reader description.

### CSS Custom Properties

| Name                      | Description           | Default |
| ------------------------- | --------------------- | ------- |
| `--wui-tooltip-max-width` | Maximum tooltip width | `240px` |
| `--wui-tooltip-font-size` | Tooltip font size     | `13px`  |

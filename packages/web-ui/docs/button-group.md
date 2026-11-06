# Button Group

Groups several `<web-ui-button>` elements into one. The group does two things: it makes adjacent buttons read as one control (a shared glass base, dividers between adjacent buttons) and it sets the layout direction. It does not manage selection state and does not change members' own events or form behavior. A member's own `size` is ignored inside the group, where every member renders 30px high.

## Samples

### Horizontal group

The whole row shares a glass base, with a divider between adjacent members and none after the last one.

A member's `variant` carries only text color here: the background is transparent and hover / active use a shared state layer.

As a result `secondary` / `ghost` / `glass` look identical inside the group, and only the red text of `danger` remains.

`primary` keeps only its white text, which is almost unreadable on the light glass. Use `secondary` or `ghost` inside a group.

```tsx
export default function Demo() {
  return (
    <web-ui-button-group>
      <web-ui-button variant="secondary">Left</web-ui-button>
      <web-ui-button variant="secondary">Middle</web-ui-button>
      <web-ui-button variant="secondary">Right</web-ui-button>
    </web-ui-button-group>
  )
}
```

```vue
<template>
  <web-ui-button-group>
    <web-ui-button variant="secondary">Left</web-ui-button>
    <web-ui-button variant="secondary">Middle</web-ui-button>
    <web-ui-button variant="secondary">Right</web-ui-button>
  </web-ui-button-group>
</template>
```

### Member content

A member can be icon-only, text-only, or have an icon wrapped in `prefix` / `suffix`; member heights are set to 30px and centered, so mixed content is neither stretched nor squeezed.

An icon-only member still needs an `aria-label`, otherwise a screen reader announces an empty button.

Nodes that are not `<web-ui-button>` are still projected but do not participate in last-position and divider calculation.

```tsx
import { lucideChevronLeft, lucideChevronRight } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-5">
      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">icon-only member</span>
        <web-ui-button-group>
          <web-ui-button icon variant="secondary" aria-label="Previous page">
            <web-ui-icon icon={lucideChevronLeft}></web-ui-icon>
          </web-ui-button>
          <web-ui-button icon variant="secondary" aria-label="Next page">
            <web-ui-icon icon={lucideChevronRight}></web-ui-icon>
          </web-ui-button>
        </web-ui-button-group>
      </div>

      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">icon via prefix / suffix</span>
        <web-ui-button-group>
          <web-ui-button variant="secondary">
            <web-ui-icon slot="prefix" icon={lucideChevronLeft}></web-ui-icon>
            Previous
          </web-ui-button>
          <web-ui-button variant="secondary">
            Next
            <web-ui-icon slot="suffix" icon={lucideChevronRight}></web-ui-icon>
          </web-ui-button>
        </web-ui-button-group>
      </div>

      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">Text and icon mixed</span>
        <web-ui-button-group>
          <web-ui-button icon variant="secondary" aria-label="Previous page">
            <web-ui-icon icon={lucideChevronLeft}></web-ui-icon>
          </web-ui-button>
          <web-ui-button variant="secondary">Page 1 / 3</web-ui-button>
          <web-ui-button icon variant="secondary" aria-label="Next page">
            <web-ui-icon icon={lucideChevronRight}></web-ui-icon>
          </web-ui-button>
        </web-ui-button-group>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-5">
    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">icon-only member</span>
      <web-ui-button-group>
        <web-ui-button icon variant="secondary" aria-label="Previous page">
          <web-ui-icon :icon="lucideChevronLeft"></web-ui-icon>
        </web-ui-button>
        <web-ui-button icon variant="secondary" aria-label="Next page">
          <web-ui-icon :icon="lucideChevronRight"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>

    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">icon via prefix / suffix</span>
      <web-ui-button-group>
        <web-ui-button variant="secondary">
          <web-ui-icon slot="prefix" :icon="lucideChevronLeft"></web-ui-icon>
          Previous
        </web-ui-button>
        <web-ui-button variant="secondary">
          Next
          <web-ui-icon slot="suffix" :icon="lucideChevronRight"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>

    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">Text and icon mixed</span>
      <web-ui-button-group>
        <web-ui-button icon variant="secondary" aria-label="Previous page">
          <web-ui-icon :icon="lucideChevronLeft"></web-ui-icon>
        </web-ui-button>
        <web-ui-button variant="secondary">Page 1 / 3</web-ui-button>
        <web-ui-button icon variant="secondary" aria-label="Next page">
          <web-ui-icon :icon="lucideChevronRight"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { lucideChevronLeft, lucideChevronRight } from '@greypan/web-ui/icons'
</script>
```

### Vertical group

`direction` decides horizontal or vertical layout and defaults to `horizontal`; the only valid values are those two, and any value outside the set falls back to `horizontal`.

This attribute only decides the layout direction; the group does not rewrite any member attribute.

Vertically, the minimum width is `--wui-control-size` (36px) and the height is driven by the members. Members still render at 30px, so an icon-only member stays a 30px square with 3px of slack on each side; a text member can widen the track because its label does not wrap.

The divider is then drawn below the member, and `--wui-button-group-divider-length` controls the width.

```tsx
import { lucideMinus, lucidePlus, lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-button-group direction="vertical">
      <web-ui-button icon variant="secondary" aria-label="Zoom in">
        <web-ui-icon icon={lucidePlus}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="secondary" aria-label="Zoom out">
        <web-ui-icon icon={lucideMinus}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="secondary" aria-label="Search">
        <web-ui-icon icon={lucideSearch}></web-ui-icon>
      </web-ui-button>
    </web-ui-button-group>
  )
}
```

```vue
<template>
  <web-ui-button-group direction="vertical">
    <web-ui-button icon variant="secondary" aria-label="Zoom in">
      <web-ui-icon :icon="lucidePlus"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="secondary" aria-label="Zoom out">
      <web-ui-icon :icon="lucideMinus"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="secondary" aria-label="Search">
      <web-ui-icon :icon="lucideSearch"></web-ui-icon>
    </web-ui-button>
  </web-ui-button-group>
</template>

<script setup lang="ts">
import { lucideMinus, lucidePlus, lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### Member gap

button-group has no gap token of its own: the gap between members and the inner padding of the glass box both take the theme's `--wui-space-1` (4px), so changing that one moves both.

An override on an ancestor outside `<web-ui-theme>` does not reach the group; writing it on the group host itself takes precedence.

The divider does not follow `--wui-space-1`: after increasing the gap it drifts toward the left member.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-5">
      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">--wui-space-1: 4px (default)</span>
        <web-ui-button-group>
          <web-ui-button variant="secondary">Left</web-ui-button>
          <web-ui-button variant="secondary">Middle</web-ui-button>
          <web-ui-button variant="secondary">Right</web-ui-button>
        </web-ui-button-group>
      </div>

      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">
          --wui-space-1: 12px, the divider does not follow
        </span>
        <web-ui-button-group className="[--wui-space-1:12px]">
          <web-ui-button variant="secondary">Left</web-ui-button>
          <web-ui-button variant="secondary">Middle</web-ui-button>
          <web-ui-button variant="secondary">Right</web-ui-button>
        </web-ui-button-group>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-5">
    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">--wui-space-1: 4px (default)</span>
      <web-ui-button-group>
        <web-ui-button variant="secondary">Left</web-ui-button>
        <web-ui-button variant="secondary">Middle</web-ui-button>
        <web-ui-button variant="secondary">Right</web-ui-button>
      </web-ui-button-group>
    </div>

    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">--wui-space-1: 12px, the divider does not follow</span>
      <web-ui-button-group class="[--wui-space-1:12px]">
        <web-ui-button variant="secondary">Left</web-ui-button>
        <web-ui-button variant="secondary">Middle</web-ui-button>
        <web-ui-button variant="secondary">Right</web-ui-button>
      </web-ui-button-group>
    </div>
  </div>
</template>
```

### Divider

The divider is rendered by non-last members, carries `aria-hidden`, and the last member has none.

The short side is always 1px and the long side comes from `--wui-button-group-divider-length` (20px by default): horizontally it controls the height, vertically the width; the color comes from the global `--wui-color-border`.

A class on the group host is enough; written on a single member, it only affects the divider on that member's right (or bottom) side.

```tsx
import { lucideMinus, lucidePlus } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-5">
      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">Horizontal: 12px divider</span>
        <web-ui-button-group className="[--wui-button-group-divider-length:12px]">
          <web-ui-button variant="secondary">Left</web-ui-button>
          <web-ui-button variant="secondary">Middle</web-ui-button>
          <web-ui-button variant="secondary">Right</web-ui-button>
        </web-ui-button-group>
      </div>

      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">Vertical: the same variable sets the width</span>
        <web-ui-button-group className="[--wui-button-group-divider-length:32px]" direction="vertical">
          <web-ui-button icon variant="secondary" aria-label="Zoom in">
            <web-ui-icon icon={lucidePlus}></web-ui-icon>
          </web-ui-button>
          <web-ui-button icon variant="secondary" aria-label="Zoom out">
            <web-ui-icon icon={lucideMinus}></web-ui-icon>
          </web-ui-button>
        </web-ui-button-group>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-5">
    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">Horizontal: 12px divider</span>
      <web-ui-button-group class="[--wui-button-group-divider-length:12px]">
        <web-ui-button variant="secondary">Left</web-ui-button>
        <web-ui-button variant="secondary">Middle</web-ui-button>
        <web-ui-button variant="secondary">Right</web-ui-button>
      </web-ui-button-group>
    </div>

    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">Vertical: the same variable sets the width</span>
      <web-ui-button-group class="[--wui-button-group-divider-length:32px]" direction="vertical">
        <web-ui-button icon variant="secondary" aria-label="Zoom in">
          <web-ui-icon :icon="lucidePlus"></web-ui-icon>
        </web-ui-button>
        <web-ui-button icon variant="secondary" aria-label="Zoom out">
          <web-ui-icon :icon="lucideMinus"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { lucideMinus, lucidePlus } from '@greypan/web-ui/icons'
</script>
```

### Member events

The group does not intercept member `click`s; they bubble through the group host unchanged.

`event.target` is that member host, so one handler catches the whole group and uses `data-id` to tell which member it was; `data-*` stays on the host and is safe as an identity marker.

Members with `disabled` and `loading` still produce no click.

Grouping does not change form behavior either: a member with `type="submit"` still submits the outer `<form>`.

button-group has no `disabled` of its own: to disable the whole group, put it inside `<fieldset disabled>` (members are disabled through form-level disabling and turn gray together), or write it on each member.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [log, setLog] = useState('No clicks yet')

  return (
    <form
      className="flex flex-wrap items-center gap-4"
      onSubmit={event => {
        event.preventDefault()
        setLog('The outer form received submit')
      }}
    >
      <web-ui-input name="note" placeholder="Note"></web-ui-input>
      <web-ui-button-group
        onClick={event => {
          const id = (event.target as HTMLElement).dataset.id
          if (id) setLog(`Clicked ${id}`)
        }}
      >
        <web-ui-button variant="secondary" type="submit" data-id="save">
          Save
        </web-ui-button>
        <web-ui-button variant="secondary" data-id="copy">
          Copy
        </web-ui-button>
        <web-ui-button variant="secondary" loading data-id="pending">
          Pending
        </web-ui-button>
        <web-ui-button variant="danger" disabled data-id="delete">
          Delete
        </web-ui-button>
      </web-ui-button-group>
      <output className="text-sm text-(--wui-color-text-secondary)">{log}</output>
    </form>
  )
}
```

```vue
<template>
  <form class="flex flex-wrap items-center gap-4" @submit="onSubmit">
    <web-ui-input name="note" placeholder="Note"></web-ui-input>
    <web-ui-button-group @click="onGroupClick">
      <web-ui-button variant="secondary" type="submit" data-id="save">Save</web-ui-button>
      <web-ui-button variant="secondary" data-id="copy">Copy</web-ui-button>
      <web-ui-button variant="secondary" loading data-id="pending">Pending</web-ui-button>
      <web-ui-button variant="danger" disabled data-id="delete">Delete</web-ui-button>
    </web-ui-button-group>
    <output class="text-sm text-(--wui-color-text-secondary)">{{ log }}</output>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const log = ref('No clicks yet')

function onGroupClick(event: MouseEvent) {
  const id = (event.target as HTMLElement).dataset.id
  if (id) log.value = `Clicked ${id}`
}

function onSubmit(event: Event) {
  event.preventDefault()
  log.value = 'The outer form received submit'
}
</script>
```

## API

### Props

| Name        | Description                      | Type                         | Default        |
| ----------- | -------------------------------- | ---------------------------- | -------------- |
| `direction` | Layout direction of the members. | `'horizontal' \| 'vertical'` | `'horizontal'` |

### Slots

| Name      | Description                                                                     |
| --------- | ------------------------------------------------------------------------------- |
| `default` | `<web-ui-button>` members of the group; other nodes are projected as usual too. |

### Behavior

The group holds no selection, value, or disabled state, rewrites no member attribute, and makes no exclusive choice for members. When `direction` receives a value outside the set, it falls back to `horizontal`.

A member's `size` is ignored inside the group and its height is unified to 30px; when a member leaves the group it regains standalone control semantics (it draws its own background by variant and takes its height from its own `size`).

Member `click`s bubble out of the group host unchanged, and `event.target` is that member host.

The component dispatches no custom events of its own and has no group-level state such as `disabled` / `required`: disabling the whole group relies on an ancestor `<fieldset disabled>` (members' form-level disabling takes effect together) or is written per member.

The divider is rendered by non-last members with `aria-hidden`; adding, removing, or reordering members recomputes the divider and last-position detection automatically.

### Layout

The host is inline-block and the glass box is flex: horizontal uses `row`, width `max-content`, height `var(--wui-control-size)` (36px); vertical switches to `column` with `min-width: var(--wui-control-size)`, height driven by the content, and the inner padding rotated to top and bottom.

Both directions center their members, the gap between members and the inner padding of the box both take `--wui-space-1` (4px), and the radius takes `--wui-radius-control` (a pill).

`--wui-control-size` sets this group's width and height but does not override member height: members are fixed at 30px, leaving 3px above and below inside the 36px box.

### CSS Custom Properties

| Name                                | Description                                                                                                                                    | Default |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `--wui-button-group-divider-length` | Long side of the divider between adjacent members; the short side is always 1px, and it sets the height horizontally and the width vertically. | `20px`  |

---
component: button-group
tag: web-ui-button-group
---

Groups several `<web-ui-button>` elements into one: the group is responsible only for the visual contiguity between members (a shared glass base, dividers drawn between adjacent buttons) and the layout direction; it does not manage selection state and does not change members' own events or form behavior. A member's own `size` is ignored inside the group, where every member renders 30px high.

## Samples

### Horizontal group

The group puts a glass base under the whole row (`.wui-glass` drawn on the group's inner box) and adds a divider between adjacent members, but not after the last one.

A member's `variant` carries only text color here: the `button.is-grouped` layer inside the member writes `--wui-button-bg` as `transparent` and replaces hover / active with a shared state layer.

A declaration on the element itself always beats a value inherited from the variant, so `secondary` / `ghost` / `glass` look identical inside the group (`glass` does not even draw its own glass base once grouped, since `wui-glass` is only added without a group context), and only the red text of `danger` survives.

`primary` keeps only its `var(--wui-color-on-accent)` white text, which is almost unreadable on the light glass—use `secondary` or `ghost` inside a group.

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

A member can be icon-only, text-only, or have an icon wrapped in `prefix` / `suffix`; the group only lays the host boxes in one row and centers them: `align-items: center` is hard-coded and member heights are unified to 30px, so mixed content aligns naturally and no member is stretched or squeezed.

An icon-only member still needs an `aria-label`, otherwise a screen reader announces an empty button.

Nodes that are not `<web-ui-button>` are still projected into the glass but do not participate in last-position and divider calculation—the group only recognizes `web-ui-button` as members.

```tsx
import { lucideChevronLeft, lucideChevronRight } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-5">
      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">icon-only member</span>
        <web-ui-button-group>
          <web-ui-button icon variant="secondary" aria-label="Previous page">
            <web-ui-icon icon={lucideChevronLeft} size={16}></web-ui-icon>
          </web-ui-button>
          <web-ui-button icon variant="secondary" aria-label="Next page">
            <web-ui-icon icon={lucideChevronRight} size={16}></web-ui-icon>
          </web-ui-button>
        </web-ui-button-group>
      </div>

      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">icon via prefix / suffix</span>
        <web-ui-button-group>
          <web-ui-button variant="secondary">
            <web-ui-icon slot="prefix" icon={lucideChevronLeft} size={16}></web-ui-icon>
            Previous
          </web-ui-button>
          <web-ui-button variant="secondary">
            Next
            <web-ui-icon slot="suffix" icon={lucideChevronRight} size={16}></web-ui-icon>
          </web-ui-button>
        </web-ui-button-group>
      </div>

      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">Text and icon mixed</span>
        <web-ui-button-group>
          <web-ui-button icon variant="secondary" aria-label="Previous page">
            <web-ui-icon icon={lucideChevronLeft} size={16}></web-ui-icon>
          </web-ui-button>
          <web-ui-button variant="secondary">Page 1 / 3</web-ui-button>
          <web-ui-button icon variant="secondary" aria-label="Next page">
            <web-ui-icon icon={lucideChevronRight} size={16}></web-ui-icon>
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
          <web-ui-icon :icon="lucideChevronLeft" :size="16"></web-ui-icon>
        </web-ui-button>
        <web-ui-button icon variant="secondary" aria-label="Next page">
          <web-ui-icon :icon="lucideChevronRight" :size="16"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>

    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">icon via prefix / suffix</span>
      <web-ui-button-group>
        <web-ui-button variant="secondary">
          <web-ui-icon slot="prefix" :icon="lucideChevronLeft" :size="16"></web-ui-icon>
          Previous
        </web-ui-button>
        <web-ui-button variant="secondary">
          Next
          <web-ui-icon slot="suffix" :icon="lucideChevronRight" :size="16"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>

    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">Text and icon mixed</span>
      <web-ui-button-group>
        <web-ui-button icon variant="secondary" aria-label="Previous page">
          <web-ui-icon :icon="lucideChevronLeft" :size="16"></web-ui-icon>
        </web-ui-button>
        <web-ui-button variant="secondary">Page 1 / 3</web-ui-button>
        <web-ui-button icon variant="secondary" aria-label="Next page">
          <web-ui-icon :icon="lucideChevronRight" :size="16"></web-ui-icon>
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

This attribute is only handed down to members as a presentation context (`{ direction, isLast }`); the group does not rewrite any member attribute.

Vertically, the glass box is at least `--wui-control-size` wide (the page value, 36px by default) and its height is driven by the members. Icon-only members therefore get a square 36px track; a text member can still widen the track because its label does not wrap.

The divider is then drawn below the member, and the same `--wui-button-group-divider-length` now controls the width.

```tsx
import { lucideMinus, lucidePlus, lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-button-group direction="vertical">
      <web-ui-button icon variant="secondary" aria-label="Zoom in">
        <web-ui-icon icon={lucidePlus} size={16}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="secondary" aria-label="Zoom out">
        <web-ui-icon icon={lucideMinus} size={16}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="secondary" aria-label="Search">
        <web-ui-icon icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-button>
    </web-ui-button-group>
  )
}
```

```vue
<template>
  <web-ui-button-group direction="vertical">
    <web-ui-button icon variant="secondary" aria-label="Zoom in">
      <web-ui-icon :icon="lucidePlus" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="secondary" aria-label="Zoom out">
      <web-ui-icon :icon="lucideMinus" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="secondary" aria-label="Search">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
  </web-ui-button-group>
</template>

<script setup lang="ts">
import { lucideMinus, lucidePlus, lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### Member gap

button-group has no gap token of its own: the gap between members and the inner padding of the glass box both read the theme spacing step `--wui-space-1` (4px by default), so changing that one moves both.

It is declared by the `<web-ui-theme>` host on its own subtree—written on an ancestor outside the theme element it does not reach the group, while writing it on the group host itself always wins (a declaration on the element beats an inherited value).

One more thing to know: the divider is pinned at `right: -2px` on the member host (`bottom: -2px` when vertical), which lands exactly in the middle of two members at a 4px gap; after increasing `--wui-space-1` it does not follow and drifts toward the left member.

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

The divider is rendered by the "non-last" member itself, carries `aria-hidden`, and the last member has none.

The short side is always 1px and the long side comes from `--wui-button-group-divider-length` (20px by default): horizontally that value is the height, vertically it is the width; the color comes from the global `--wui-color-border` and is not part of this component's variable table.

The theme does not declare this variable and the divider is its only consumer, so a class on the group host is enough; written on a single member, it only affects the divider on that member's right (or bottom) side.

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
            <web-ui-icon icon={lucidePlus} size={16}></web-ui-icon>
          </web-ui-button>
          <web-ui-button icon variant="secondary" aria-label="Zoom out">
            <web-ui-icon icon={lucideMinus} size={16}></web-ui-icon>
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
          <web-ui-icon :icon="lucidePlus" :size="16"></web-ui-icon>
        </web-ui-button>
        <web-ui-button icon variant="secondary" aria-label="Zoom out">
          <web-ui-icon :icon="lucideMinus" :size="16"></web-ui-icon>
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

The group does not intercept member `click`s: `GroupController` only listens to `change` on the host in the capture phase, and button-group uses a purely presentational context that does not even implement `handleChange`, so member clicks bubble through the group host unchanged.

`event.target` is that member host—one handler catches the whole group and uses `data-id` to tell which member it was (button delegates only `aria-label` to the inner button and leaves other attributes on the host without copying them into the shadow, so `data-*` is safe as an identity marker).

Members with `disabled` and `loading` still produce no click, so the readout does not move.

Grouping does not change form behavior either: a member with `type="submit"` still submits the outer `<form>`, so clicking "Save" first reads `Clicked save` and is then overwritten by the submit event.

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

The group hands members a read-only presentation context `{ direction, isLast }` through `@lit/context`; it is the only downstream channel: the group holds no selection, value, or disabled state, rewrites no member attribute, and makes no exclusive choice for members. When `direction` receives a value outside the set, it falls back to `horizontal`.

A member's `size` is ignored inside the group and its height is unified to 30px; when a member leaves the group the context is cleared and it regains standalone control semantics (it draws its own background by variant and takes its height from its own `size`). Moving between groups disconnects and clears first, then subscribes to the new group, so dividers and last-position detection are recomputed against the new member list.

`GroupController` listens to `change` on the host in the capture phase, but button-group uses the presentational lifecycle (only `sync` / `disconnect`) without `handleChange`, so member `click`s always bubble out of the group host unchanged and `event.target` is that member host.

The component dispatches no custom events of its own and has no group-level state such as `disabled` / `required`: disabling the whole group relies on an ancestor `<fieldset disabled>` (members' form-level disabling takes effect together) or is written per member.

The divider is rendered by non-last members with `aria-hidden`; the last member has none. Member count or order changes trigger a recomputation through a light DOM `MutationObserver` and `slotchange`, so comment nodes left by React conditional rendering and Vue `v-if` are tracked too.

### Layout

The host is inline-block and the glass box `.wui-button-group-inner` is flex: horizontal uses `row` + `width: max-content` + `height: var(--wui-control-size)` (36px).

Vertical switches to `column` through `:host([direction='vertical'])` and swaps width and height (`width: var(--wui-control-size)`, `height: auto`).

Both directions hard-code `align-items: center`, so members are neither stretched nor squeezed; the gap between members and the inner padding of the box both take `--wui-space-1` (4px).

The all-around `border-radius` takes `--wui-radius-control` (the theme supplies `calc(infinity * 1px)`, i.e. a pill), while the highlight radius of the glass stroke ring is written separately by the box as `calc(var(--wui-control-size) / 2)`, coming from the same source as that radius.

`--wui-control-size` is the source of this group's width, height, and that highlight radius, but it does not override member height: the 30px of a member is written as an inline style on its inner button, leaving 3px above and below inside the 36px box.

### CSS Custom Properties

| Name                                | Description                                                                                                                                    | Default |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `--wui-button-group-divider-length` | Long side of the divider between adjacent members; the short side is always 1px, and it sets the height horizontally and the width vertically. | `20px`  |

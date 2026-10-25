---
component: radio-group
tag: web-ui-radio-group
---

A container for a group of `<web-ui-radio>`: it collapses the members' selected state into a single `value`, dispatches `input` / `change` uniformly when the selection changes, and handles group-level disabling and required validation. The container provides `radiogroup` semantics, `direction` is mirrored as `aria-orientation`, and the group-level disabled and required states are exposed as `aria-disabled` and `aria-required` respectively. Set the group's accessible name with `aria-label` or `aria-labelledby`. In a horizontal group the left / right arrow keys move focus and selection between members; in a vertical group the up / down arrow keys do. A member's own `name` does not take part in submission inside the group; the form field name comes from the group's `name`.

## Samples

### Single radio group {#basic}

The group holds the only value: `value` decides which member is selected, the selected state of members is pushed down by the group, and the page only reads the group's value.

When Tab enters the group, focus lands on the selected member; if nothing is selected yet, it lands on the first enabled member. Only that member is a tab stop inside the group. The arrow keys move focus cyclically between enabled members and select immediately; `Home` and `End` select the first and last enabled member respectively.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [size, setSize] = useState('m')

  return (
    <web-ui-radio-group name="size" value={size} onInput={event => setSize(event.currentTarget.value)}>
      <web-ui-radio value="s">Small</web-ui-radio>
      <web-ui-radio value="m">Medium</web-ui-radio>
      <web-ui-radio value="l">Large</web-ui-radio>
    </web-ui-radio-group>
  )
}
```

```vue
<template>
  <web-ui-radio-group name="size" :value="size" @input="onInput">
    <web-ui-radio value="s">Small</web-ui-radio>
    <web-ui-radio value="m">Medium</web-ui-radio>
    <web-ui-radio value="l">Large</web-ui-radio>
  </web-ui-radio-group>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiRadioGroup } from '@greypan/web-ui'
import { ref } from 'vue'

const size = ref('m')

function onInput(event: WebUiEvent<WebUiRadioGroup, 'input'>) {
  size.value = event.currentTarget.value
}
</script>
```

### Direction {#direction}

`direction` decides whether members are laid out horizontally or vertically, default `vertical`; invalid values also fall back to `vertical`.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap gap-8">
      <div className="flex flex-col gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">direction: vertical (default)</span>
        <web-ui-radio-group value="s">
          <web-ui-radio value="s">Small</web-ui-radio>
          <web-ui-radio value="m">Medium</web-ui-radio>
        </web-ui-radio-group>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">direction: horizontal</span>
        <web-ui-radio-group direction="horizontal" value="s">
          <web-ui-radio value="s">Small</web-ui-radio>
          <web-ui-radio value="m">Medium</web-ui-radio>
        </web-ui-radio-group>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap gap-8">
    <div class="flex flex-col gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">direction: vertical (default)</span>
      <web-ui-radio-group value="s">
        <web-ui-radio value="s">Small</web-ui-radio>
        <web-ui-radio value="m">Medium</web-ui-radio>
      </web-ui-radio-group>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">direction: horizontal</span>
      <web-ui-radio-group direction="horizontal" value="s">
        <web-ui-radio value="s">Small</web-ui-radio>
        <web-ui-radio value="m">Medium</web-ui-radio>
      </web-ui-radio-group>
    </div>
  </div>
</template>
```

### Member gap {#gap}

The gap between members comes from `--wui-radio-group-gap`, which by default resolves through `--wui-space-2` to 8px; overriding it changes only the gap, not the layout direction. The two groups below share the same members and differ only in this variable.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-6">
      <web-ui-radio-group direction="horizontal" value="s">
        <web-ui-radio value="s">Small</web-ui-radio>
        <web-ui-radio value="m">Medium</web-ui-radio>
        <web-ui-radio value="l">Large</web-ui-radio>
      </web-ui-radio-group>

      <web-ui-radio-group direction="horizontal" className="[--wui-radio-group-gap:16px]" value="s">
        <web-ui-radio value="s">Small</web-ui-radio>
        <web-ui-radio value="m">Medium</web-ui-radio>
        <web-ui-radio value="l">Large</web-ui-radio>
      </web-ui-radio-group>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-6">
    <web-ui-radio-group direction="horizontal" value="s">
      <web-ui-radio value="s">Small</web-ui-radio>
      <web-ui-radio value="m">Medium</web-ui-radio>
      <web-ui-radio value="l">Large</web-ui-radio>
    </web-ui-radio-group>

    <web-ui-radio-group direction="horizontal" class="[--wui-radio-group-gap:16px]" value="s">
      <web-ui-radio value="s">Small</web-ui-radio>
      <web-ui-radio value="m">Medium</web-ui-radio>
      <web-ui-radio value="l">Large</web-ui-radio>
    </web-ui-radio-group>
  </div>
</template>
```

### Group-level disabled and required {#disabled-required}

`disabled` turns off interaction for the whole group, and that disabled state is pushed down to the members; `required` makes native form validation block submission while the group has no value.

```tsx
export default function Demo() {
  return (
    <web-ui-radio-group name="plan" value="basic" required disabled>
      <web-ui-radio value="basic">Basic</web-ui-radio>
      <web-ui-radio value="pro">Pro</web-ui-radio>
    </web-ui-radio-group>
  )
}
```

```vue
<template>
  <web-ui-radio-group name="plan" value="basic" required disabled>
    <web-ui-radio value="basic">Basic</web-ui-radio>
    <web-ui-radio value="pro">Pro</web-ui-radio>
  </web-ui-radio-group>
</template>
```

## API

### Props

| Name              | Description                                                                                                              | Type                         | Default      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ------------ |
| `name`            | Form field name.                                                                                                         | `string`                     | `''`         |
| `disabled`        | Disables the whole group and pushes the disabled state down to the members; the group container exposes `aria-disabled`. | `boolean`                    | `false`      |
| `required`        | Required validation: blocks native submission while the group has no value; the group container exposes `aria-required`. | `boolean`                    | `false`      |
| `direction`       | Layout direction of the members, also the group container's `aria-orientation`.                                          | `'horizontal' \| 'vertical'` | `'vertical'` |
| `value`           | The currently selected value, and the single source of the members' selected state.                                      | `string`                     | `''`         |
| `aria-label`      | The group's accessible name.                                                                                             | `string \| null`             | `null`       |
| `aria-labelledby` | ID of the element that provides the group's accessible name.                                                             | `string \| undefined`        | —            |

### Events

| Name     | Description                                                                 |
| -------- | --------------------------------------------------------------------------- |
| `input`  | Fired when the selection changes; `currentTarget.value` is the new value.   |
| `change` | Dispatched together with `input`, semantically representing a confirmation. |

### Slots

| Name      | Description                                    |
| --------- | ---------------------------------------------- |
| `default` | The `<web-ui-radio>` members inside the group. |

### Behavior

`disabled` provides an inherited effective disabled state without rewriting each child's own `disabled` attribute. An invalid `direction` value falls back to `vertical`.

Set it on the group element itself, or on an ancestor within the same `<web-ui-theme>` scope.

The theme host declares that spacing step for its own subtree, so an override written outside the `<web-ui-theme>` element does not reach the group.

Its default now resolves through `--wui-space-2`, so overriding that step on the theme host also changes the member gap; an explicit assignment of this token still takes precedence over both.

```css
web-ui-radio-group {
  --wui-radio-group-gap: 16px;
}
```

### CSS Custom Properties

| Name                    | Description               | Default              |
| ----------------------- | ------------------------- | -------------------- |
| `--wui-radio-group-gap` | Gap between member radios | `var(--wui-space-2)` |

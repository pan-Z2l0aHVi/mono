---
component: checkbox-group
tag: web-ui-checkbox-group
---

A container for a group of `<web-ui-checkbox>`: it collapses the members' selected state into a `string[]`, dispatches `input` / `change` uniformly when it changes, and handles group-level disabling and required validation. As an attribute the value is a comma-separated string (`value="apple,cherry"`), while the JS side always reads an array.

## Samples

### Checkbox group

The group's `value` is the set of items that are selected; each member decides its own selected state by whether it is in the array.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [picked, setPicked] = useState(['banana'])

  return (
    <web-ui-checkbox-group name="fruit" value={picked} onInput={event => setPicked(event.currentTarget.value)}>
      <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
      <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
      <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
    </web-ui-checkbox-group>
  )
}
```

```vue
<template>
  <web-ui-checkbox-group name="fruit" :value="picked" @input="onInput">
    <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
    <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
    <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
  </web-ui-checkbox-group>
</template>

<script setup lang="ts">
import type { WebUiCheckboxGroup, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const picked = ref(['banana'])

function onInput(event: WebUiEvent<WebUiCheckboxGroup, 'input'>) {
  picked.value = event.currentTarget.value
}
</script>
```

### Direction

`direction` decides whether members are laid out horizontally or vertically, default `vertical`; invalid values also fall back to `vertical`.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap gap-8">
      <div className="flex flex-col gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">direction: vertical (default)</span>
        <web-ui-checkbox-group value={['apple']}>
          <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
          <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
        </web-ui-checkbox-group>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">direction: horizontal</span>
        <web-ui-checkbox-group direction="horizontal" value={['apple']}>
          <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
          <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
        </web-ui-checkbox-group>
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
      <web-ui-checkbox-group :value="['apple']">
        <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
        <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
      </web-ui-checkbox-group>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">direction: horizontal</span>
      <web-ui-checkbox-group direction="horizontal" :value="['apple']">
        <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
        <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
      </web-ui-checkbox-group>
    </div>
  </div>
</template>
```

### Member gap

The gap between members comes from `--wui-checkbox-group-gap`, which by default resolves through `--wui-space-2` to 8px; overriding it changes only the gap, not the layout direction. The two groups below share the same members and differ only in this variable.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-6">
      <web-ui-checkbox-group direction="horizontal" value={['apple']}>
        <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
        <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
        <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
      </web-ui-checkbox-group>

      <web-ui-checkbox-group direction="horizontal" className="[--wui-checkbox-group-gap:16px]" value={['apple']}>
        <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
        <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
        <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
      </web-ui-checkbox-group>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-6">
    <web-ui-checkbox-group direction="horizontal" :value="['apple']">
      <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
      <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
      <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
    </web-ui-checkbox-group>

    <web-ui-checkbox-group direction="horizontal" class="[--wui-checkbox-group-gap:16px]" :value="['apple']">
      <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
      <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
      <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
    </web-ui-checkbox-group>
  </div>
</template>
```

### Group-level disabled and required

`disabled` turns off interaction for the whole group, and that disabled state is pushed down to the members; `required` makes native form validation block submission while the group is empty.

```tsx
export default function Demo() {
  return (
    <web-ui-checkbox-group name="toppings" value={['cheese']} required disabled>
      <web-ui-checkbox value="cheese">Cheese</web-ui-checkbox>
      <web-ui-checkbox value="bacon">Bacon</web-ui-checkbox>
    </web-ui-checkbox-group>
  )
}
```

```vue
<template>
  <web-ui-checkbox-group name="toppings" :value="['cheese']" required disabled>
    <web-ui-checkbox value="cheese">Cheese</web-ui-checkbox>
    <web-ui-checkbox value="bacon">Bacon</web-ui-checkbox>
  </web-ui-checkbox-group>
</template>
```

## API

### Props

| Name        | Description                                                                 | Type                         | Default      |
| ----------- | --------------------------------------------------------------------------- | ---------------------------- | ------------ |
| `name`      | Form field name; each selected item occupies a field of the same name.      | `string`                     | `''`         |
| `disabled`  | Disables the whole group and pushes the disabled state down to the members. | `boolean`                    | `false`      |
| `required`  | Required validation: blocks native submission while the group is empty.     | `boolean`                    | `false`      |
| `direction` | Layout direction of the members.                                            | `'horizontal' \| 'vertical'` | `'vertical'` |
| `value`     | The currently selected set of values.                                       | `string[]`                   | `[]`         |

### Events

| Name     | Description                                                                  |
| -------- | ---------------------------------------------------------------------------- |
| `input`  | Fired when the selected set changes; `currentTarget.value` is the new array. |
| `change` | Dispatched together with `input`, semantically representing a confirmation.  |

### Slots

| Name      | Description                                       |
| --------- | ------------------------------------------------- |
| `default` | The `<web-ui-checkbox>` members inside the group. |

### Behavior

Synchronizes the `checked` state of child checkboxes. `disabled` provides an inherited effective disabled state without rewriting each child's own `disabled` attribute. Listens to child `change` events. An invalid `direction` value falls back to `vertical`.

Set it on the group element itself, or on an ancestor within the same `<web-ui-theme>` scope.

The theme host declares that spacing step for its own subtree, so an override written outside the `<web-ui-theme>` element does not reach the group.

Its default now resolves through `--wui-space-2`, so overriding that step on the theme host also changes the member gap; an explicit assignment of this token still takes precedence over both.

```css
web-ui-checkbox-group {
  --wui-checkbox-group-gap: 16px;
}
```

### CSS Custom Properties

| Name                       | Description                   | Default              |
| -------------------------- | ----------------------------- | -------------------- |
| `--wui-checkbox-group-gap` | Gap between member checkboxes | `var(--wui-space-2)` |

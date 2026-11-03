# Segmented Trigger

A segment button inside `<web-ui-segmented>`. `value` is the segment value it represents; the parent segmented writes the selected state back through `checked`; form submission is the parent's job.

A click or Enter / Space dispatches `change`. Inside a group the event does not bubble; the parent dispatches one group-level event instead. Outside a group it bubbles and crosses the component boundary.

## Samples

### Basic

`value` decides which trigger is the current one, and the parent segmented writes `checked` back to match. The text in the default slot is the button content.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [view, setView] = useState('day')

  return (
    <web-ui-segmented value={view} onInput={event => setView(event.currentTarget.value)}>
      <web-ui-segmented-trigger value="day">Day</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="week">Week</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="month">Month</web-ui-segmented-trigger>
    </web-ui-segmented>
  )
}
```

```vue
<template>
  <web-ui-segmented :value="view" @input="view = $event.currentTarget.value">
    <web-ui-segmented-trigger value="day">Day</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="week">Week</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="month">Month</web-ui-segmented-trigger>
  </web-ui-segmented>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const view = ref('day')
</script>
```

### Individual disabling

`disabled` on a trigger disables only that item: it stays in the track but cannot be selected, and keyboard navigation skips it. On `<web-ui-segmented>` it disables every trigger.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [view, setView] = useState('list')

  return (
    <web-ui-segmented value={view} onInput={event => setView(event.currentTarget.value)}>
      <web-ui-segmented-trigger value="list">List</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="grid" disabled>
        Grid
      </web-ui-segmented-trigger>
    </web-ui-segmented>
  )
}
```

```vue
<template>
  <web-ui-segmented :value="view" @input="view = $event.currentTarget.value">
    <web-ui-segmented-trigger value="list">List</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="grid" disabled>Grid</web-ui-segmented-trigger>
  </web-ui-segmented>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const view = ref('list')
</script>
```

## API

### Props

| Name         | Description                                                                                                | Type             | Default |
| ------------ | ---------------------------------------------------------------------------------------------------------- | ---------------- | ------- |
| `value`      | Segment value.                                                                                             | `string`         | `''`    |
| `checked`    | Currently selected; written back by the parent segmented, and setting it alone does not notify the parent. | `boolean`        | `false` |
| `disabled`   | Disables this trigger individually.                                                                        | `boolean`        | `false` |
| `aria-label` | Accessible name; required when the slot contains only an icon.                                             | `string \| null` | `null`  |

### Events

| Name     | Description                                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `change` | Dispatched when a click or Enter / Space activates a trigger that is not selected; not dispatched when it is already current. The event carries no `detail`. |

### Slots

| Name      | Description                                                                             |
| --------- | --------------------------------------------------------------------------------------- |
| `default` | Button content; the trigger has no label attribute, so this content is all it displays. |

### Behavior

It is not a form-associated component; the parent segmented handles form submission.

### CSS Custom Properties

| Name                                | Description                | Default                          |
| ----------------------------------- | -------------------------- | -------------------------------- |
| `--wui-segmented-trigger-px`        | Horizontal padding         | `12px`                           |
| `--wui-segmented-trigger-bg-hover`  | Trigger hover background   | `--wui-color-state-layer-hover`  |
| `--wui-segmented-trigger-bg-active` | Trigger pressed background | `--wui-color-state-layer-active` |

---
component: option
tag: web-ui-option
---

The option carrier for `<web-ui-select>` and `<web-ui-autocomplete>`: `value` is the value submitted when selected, `label` is the displayed text (defaulting to its own text content), and the `prefix` / `suffix` slots hold icons at either end.

It dispatches no events aimed at consumers—the registration handshake emitted on mount, update, and unmount is consumed only by the parent container; the selected state is written back by the container through `selected`.

## Samples

### Basic option {#basic}

`label` decides what is displayed inside the container, and `value` is the value the container dispatches.

```tsx
export default function Demo() {
  return (
    <web-ui-select placeholder="Select an option">
      <web-ui-option value="vue" label="Vue"></web-ui-option>
      <web-ui-option value="react" label="React"></web-ui-option>
      <web-ui-option value="svelte" label="Svelte"></web-ui-option>
    </web-ui-select>
  )
}
```

```vue
<template>
  <web-ui-select placeholder="Select an option">
    <web-ui-option value="vue" label="Vue"></web-ui-option>
    <web-ui-option value="react" label="React"></web-ui-option>
    <web-ui-option value="svelte" label="Svelte"></web-ui-option>
  </web-ui-select>
</template>
```

### Prefix and suffix icons {#prefix-suffix}

When `label` is omitted, `label` takes the text of the default slot; `prefix` and `suffix` do not take part in that text.

```tsx
import { lucideImage, lucideStar } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-select placeholder="Select an option">
      <web-ui-option value="photo">
        <web-ui-icon slot="prefix" size={14} icon={lucideImage}></web-ui-icon>
        Photos
      </web-ui-option>
      <web-ui-option value="starred">
        <web-ui-icon slot="prefix" size={14} icon={lucideStar}></web-ui-icon>
        Starred
      </web-ui-option>
    </web-ui-select>
  )
}
```

```vue
<template>
  <web-ui-select placeholder="Select an option">
    <web-ui-option value="photo">
      <web-ui-icon slot="prefix" :size="14" :icon="lucideImage"></web-ui-icon>
      Photos
    </web-ui-option>
    <web-ui-option value="starred">
      <web-ui-icon slot="prefix" :size="14" :icon="lucideStar"></web-ui-icon>
      Starred
    </web-ui-option>
  </web-ui-select>
</template>

<script setup lang="ts">
import { lucideImage, lucideStar } from '@greypan/web-ui/icons'
</script>
```

### Disabled items {#disabled}

A `disabled` item stays in the list but cannot be selected, and keyboard navigation skips it.

```tsx
export default function Demo() {
  return (
    <web-ui-select placeholder="Select an option">
      <web-ui-option value="vue" label="Vue"></web-ui-option>
      <web-ui-option value="svelte" label="Svelte (unavailable)" disabled></web-ui-option>
    </web-ui-select>
  )
}
```

```vue
<template>
  <web-ui-select placeholder="Select an option">
    <web-ui-option value="vue" label="Vue"></web-ui-option>
    <web-ui-option value="svelte" label="Svelte (unavailable)" disabled></web-ui-option>
  </web-ui-select>
</template>
```

## API

### Props

| Name       | Description                                                                                                    | Type      | Default |
| ---------- | -------------------------------------------------------------------------------------------------------------- | --------- | ------- |
| `value`    | Value submitted to the container when selected.                                                                | `string`  | `''`    |
| `label`    | Displayed text; defaults to the default slot's text content.                                                   | `string`  | `''`    |
| `disabled` | Disabled item: stays in the list but cannot be selected; keyboard navigation skips it.                         | `boolean` | `false` |
| `selected` | Selected state, written back by the container; setting the `selected` attribute does not notify the container. | `boolean` | `false` |

### Slots

| Name      | Description                                                |
| --------- | ---------------------------------------------------------- |
| `prefix`  | Icon or marker to the left of the text.                    |
| `default` | Option text; when `label` is empty this text is the label. |
| `suffix`  | Icon or marker to the right of the text.                   |

### Behavior

Not a form-associated component (the parent select submits uniformly).

### CSS Custom Properties

| Name                         | Description                              | Default |
| ---------------------------- | ---------------------------------------- | ------- |
| `--wui-option-check-display` | Display value of the selected check icon | `block` |

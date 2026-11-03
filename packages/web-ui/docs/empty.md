# Empty

An empty-state placeholder: `title` and `description` provide the copy, and the `icon` / `action` slots add a graphic and an action entry point. The component has no JavaScript properties; the sizes and colors of the graphic, the copy, and the whitespace all come from `--wui-empty-*` variables.

## Samples

### Basic

`title` and `description` are the two main copy slots, and writing both is the most common use of this empty state. The default graphic (`andrsrxn:inbox`) ships with the component, and its edge length and color each have a variable of their own.

```tsx
export default function Demo() {
  return <web-ui-empty title="No data yet" description="The list appears here once a record is created."></web-ui-empty>
}
```

```vue
<template>
  <web-ui-empty title="No data yet" description="The list appears here once a record is created."></web-ui-empty>
</template>
```

### Collapsing copy slots

Title, description, and action each decide whether to take space based on whether they have content. With only `title` there is no description line, with only `description` there is no title line, and with all three empty only the graphic area remains.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <web-ui-empty title="No permission"></web-ui-empty>
      <web-ui-empty description="This section only has a description, so no title space is reserved."></web-ui-empty>
      <web-ui-empty></web-ui-empty>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <web-ui-empty title="No permission"></web-ui-empty>
    <web-ui-empty description="This section only has a description, so no title space is reserved."></web-ui-empty>
    <web-ui-empty></web-ui-empty>
  </div>
</template>
```

### Action area

The `action` slot holds the recovery entry point. It has no corresponding property and only accepts slot content. An empty state usually needs just one primary action.

```tsx
export default function Demo() {
  return (
    <web-ui-empty title="No search results" description="Try another keyword, or loosen the filters a little.">
      <web-ui-button slot="action" variant="primary">
        Clear filters
      </web-ui-button>
    </web-ui-empty>
  )
}
```

```vue
<template>
  <web-ui-empty title="No search results" description="Try another keyword, or loosen the filters a little.">
    <web-ui-button slot="action" variant="primary">Clear filters</web-ui-button>
  </web-ui-empty>
</template>
```

### Slot content

The four slots replace the whole set of content: `icon` replaces the graphic, the default slot replaces the title, `description` replaces the description, and `action` replaces the action area. Slot content overrides the property of the same name, so once a slot is written there is no need for `title` / `description`. Put multiple actions in a container of your own; the action area only provides the gap above it.

```tsx
import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-empty className="[--wui-empty-icon-size:51px]">
      <web-ui-icon slot="icon" icon={lucideSearch} size={51}></web-ui-icon>
      <strong>No matching entries</strong>
      <span slot="description">Try a shorter keyword, or switch to another filter.</span>
      <div slot="action" className="flex items-center justify-center gap-3">
        <web-ui-button variant="secondary">Clear filters</web-ui-button>
        <web-ui-button variant="primary">Back to list</web-ui-button>
      </div>
    </web-ui-empty>
  )
}
```

```vue
<template>
  <web-ui-empty class="[--wui-empty-icon-size:51px]">
    <web-ui-icon slot="icon" :icon="lucideSearch" :size="51"></web-ui-icon>
    <strong>No matching entries</strong>
    <span slot="description">Try a shorter keyword, or switch to another filter.</span>
    <div slot="action" class="flex items-center justify-center gap-3">
      <web-ui-button variant="secondary">Clear filters</web-ui-button>
      <web-ui-button variant="primary">Back to list</web-ui-button>
    </div>
  </web-ui-empty>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### Size and color

There is no `size` property: the graphic's edge length, the two font sizes, the colors, and the whitespace are four independent groups of variables. To scale the whole empty state, write them together; enlarging only the graphic leaves whitespace that does not match the type.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <web-ui-empty
        className="[--wui-empty-icon-size:24px] [--wui-empty-title-font-size:14px] [--wui-empty-description-font-size:13px] [--wui-empty-min-height:120px] [--wui-empty-padding:20px_16px]"
        title="Compact empty state"
      ></web-ui-empty>
      <web-ui-empty title="Default empty state"></web-ui-empty>
      <web-ui-empty
        className="[--wui-empty-icon-size:64px] [--wui-empty-title-font-size:20px] [--wui-empty-icon-color:var(--wui-color-accent)] [--wui-empty-icon-opacity:1]"
        title="Emphasized empty state"
        description="Color and depth are two separate variables: replace the color, then bring the graphic back to its full color."
      ></web-ui-empty>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <web-ui-empty
      class="[--wui-empty-icon-size:24px] [--wui-empty-title-font-size:14px] [--wui-empty-description-font-size:13px] [--wui-empty-min-height:120px] [--wui-empty-padding:20px_16px]"
      title="Compact empty state"
    ></web-ui-empty>
    <web-ui-empty title="Default empty state"></web-ui-empty>
    <web-ui-empty
      class="[--wui-empty-icon-size:64px] [--wui-empty-title-font-size:20px] [--wui-empty-icon-color:var(--wui-color-accent)] [--wui-empty-icon-opacity:1]"
      title="Emphasized empty state"
      description="Color and depth are two separate variables: replace the color, then bring the graphic back to its full color."
    ></web-ui-empty>
  </div>
</template>
```

### Long copy

Title and description both wrap to the content width, and long words break with `overflow-wrap: anywhere`. A pasted URL or a long identifier therefore neither widens the box nor overflows into neighboring sections.

```tsx
export default function Demo() {
  return (
    <web-ui-empty
      title="This title is deliberately long, to confirm it wraps within the content width instead of widening the box"
      description="The description is long copy too, and holds an identifier that does not break naturally, https://example.com/a-very-long-shared-resource-path-that-does-not-fit, to show overflow-wrap."
    ></web-ui-empty>
  )
}
```

```vue
<template>
  <web-ui-empty
    title="This title is deliberately long, to confirm it wraps within the content width instead of widening the box"
    description="The description is long copy too, and holds an identifier that does not break naturally, https://example.com/a-very-long-shared-resource-path-that-does-not-fit, to show overflow-wrap."
  ></web-ui-empty>
</template>
```

### Overriding one variable at a time

A single variable can also be changed on its own: `--wui-empty-icon-size` is the edge length shared by the box and the graphic, while `--wui-empty-content-width` and the two section gaps can only be adjusted through variables.

```tsx
export default function Demo() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <web-ui-empty
        className="[--wui-empty-min-height:120px] [--wui-empty-padding:16px_12px]"
        title="Height and padding squeezed"
        description="These two are enough to squeeze the empty state from a placeholder block into a single hint."
      ></web-ui-empty>

      <web-ui-empty
        className="[--wui-empty-icon-size:56px] [--wui-empty-icon-color:var(--wui-color-accent)]"
        title="Graphic enlarged and recolored"
        description="Changing only the color leaves opacity alone, so the graphic keeps the default lighter step."
      ></web-ui-empty>

      <web-ui-empty
        className="[--wui-empty-content-width:300px] [--wui-empty-action-margin-top:4px]"
        title="Content width constrained to 300px"
        description="Title, description, and action area share this one width."
      >
        <web-ui-button slot="action" variant="secondary">
          Check the gaps
        </web-ui-button>
      </web-ui-empty>

      <web-ui-empty
        className="[--wui-empty-title-color:var(--wui-color-accent)] [--wui-empty-description-color:var(--wui-color-text-tertiary)] [--wui-empty-title-font-size:20px]"
        title="Title and description recolored separately"
        description="Color and font size are four unrelated channels."
      ></web-ui-empty>
    </div>
  )
}
```

```vue
<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <web-ui-empty
      class="[--wui-empty-min-height:120px] [--wui-empty-padding:16px_12px]"
      title="Height and padding squeezed"
      description="These two are enough to squeeze the empty state from a placeholder block into a single hint."
    ></web-ui-empty>

    <web-ui-empty
      class="[--wui-empty-icon-size:56px] [--wui-empty-icon-color:var(--wui-color-accent)]"
      title="Graphic enlarged and recolored"
      description="Changing only the color leaves opacity alone, so the graphic keeps the default lighter step."
    ></web-ui-empty>

    <web-ui-empty
      class="[--wui-empty-content-width:300px] [--wui-empty-action-margin-top:4px]"
      title="Content width constrained to 300px"
      description="Title, description, and action area share this one width."
    >
      <web-ui-button slot="action" variant="secondary">Check the gaps</web-ui-button>
    </web-ui-empty>

    <web-ui-empty
      class="[--wui-empty-title-color:var(--wui-color-accent)] [--wui-empty-description-color:var(--wui-color-text-tertiary)] [--wui-empty-title-font-size:20px]"
      title="Title and description recolored separately"
      description="Color and font size are four unrelated channels."
    ></web-ui-empty>
  </div>
</template>
```

## API

### Props

| Name          | Description       | Type     | Default |
| ------------- | ----------------- | -------- | ------- |
| `title`       | Title text.       | `string` | `''`    |
| `description` | Description text. | `string` | `''`    |

### Slots

| Name          | Description                                                 |
| ------------- | ----------------------------------------------------------- |
| `icon`        | Graphic area content, replacing the default icon.           |
| `default`     | Title content, overriding the `title` property.             |
| `description` | Description content, overriding the `description` property. |
| `action`      | Action area content, such as a primary button.              |

### Behavior

The graphic box and the graphic are the same size, so the distance between the graphic and the title is exactly `--wui-empty-title-margin-top` (`12px` by default).

Edge length, the two font sizes, colors, and whitespace are each a group of variables and do not move together. Scaling the whole empty state means writing several of them; writing only `--wui-empty-icon-size` gives an empty state with a very large graphic and a very small title.

The default graphic is `andrsrxn:inbox`, and its color is decided by `--wui-empty-icon-color` alone, never overridden by a fixed color inside the asset.

Color and depth are two variables: `--wui-empty-icon-color` sets a solid color, and the lighter result is handled by `--wui-empty-icon-opacity` (`0.75` by default). To bring the graphic back to full color, write `--wui-empty-icon-opacity: 1`.

`--wui-empty-icon-opacity` only affects the default graphic; content in the `icon` slot does not fade with it.

The three copy segments are decided separately: the title segment checks whether the default slot has content and then `title`; the description segment checks the `description` slot and then the `description` property; the action segment only accepts the `action` slot.

What is checked is "is there content", not "does the content render", so even a single `.sr-only` span makes that segment take space. The graphic area does not participate in this check and always takes space; an empty state with all three copy segments empty keeps only the graphic.

Multiple elements in the `action` slot do not lay themselves out in a row; the action area only provides the gap above it.

Graphics in the `icon` slot must carry their own size: the component only centers the slot content inside the `--wui-empty-icon-size` box, and neither measures nor scales it. The default edge length is `40px`; when swapping in a `web-ui-icon`, write its `size` to the same value, or adjust `--wui-empty-icon-size` along with it.

`title` is also shown as a native tooltip on hover. To avoid that hint, put the title in the default slot; the result is the same, it is just not treated as tooltip text.

### Size presets

`size` is not a supported property. The graphic, `min-height`, padding, and both font sizes are each controlled by their own variable. The presets below write the values that belong together.

Each item lists size step / graphic / `min-height` / padding / title / description:

- `40` / `29px` / `171px` / `23px 17px` / `14px` / `13px`
- `56` (default) / `40px` / `240px` / `32px 24px` / `16px` / `14px`
- `72` / `51px` / `309px` / `41px 31px` / `16px` / `14px`

### CSS Custom Properties

| Name                                | Description                                            | Default                      |
| ----------------------------------- | ------------------------------------------------------ | ---------------------------- |
| `--wui-empty-min-height`            | Minimum height                                         | `240px`                      |
| `--wui-empty-padding`               | Padding                                                | `32px 24px`                  |
| `--wui-empty-icon-size`             | Graphic edge length, shared by the box and the glyph   | `40px`                       |
| `--wui-empty-icon-color`            | Graphic color (solid, opaque)                          | `--wui-color-text-secondary` |
| `--wui-empty-icon-opacity`          | Overall depth of the graphic                           | `0.75`                       |
| `--wui-empty-content-width`         | Maximum width of the title / description / action area | `480px`                      |
| `--wui-empty-title-margin-top`      | Gap between the icon and the title                     | `12px`                       |
| `--wui-empty-title-font-size`       | Title font size                                        | `16px`                       |
| `--wui-empty-title-color`           | Title color                                            | `--wui-color-text`           |
| `--wui-empty-description-font-size` | Description font size                                  | `14px`                       |
| `--wui-empty-description-color`     | Description color                                      | `--wui-color-text-secondary` |
| `--wui-empty-action-margin-top`     | Gap above the action area                              | `20px`                       |

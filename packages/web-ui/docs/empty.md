---
component: empty
tag: web-ui-empty
---

empty state placeholder: `title` and `description` provide the copy, and the `icon` / `action` slots add graphics and an action entry point. The component exposes no JS knob—the sizes and colors of the graphic, the copy, and the whitespace all come from `--wui-empty-*` variables.

## Samples

### Basic

`title` and `description` are the two main copy slots; writing both is the most common shape of this empty state. The default graphic (`andrsrxn:inbox`) ships with the component, and its edge length and color each have a variable of their own.

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

Title, description, and action each decide whether to take space based on whether they have content: with only `title` there is no description line, with only `description` there is no title line, and with all three empty only the graphic area remains.

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

The `action` slot holds the recovery entry point; it has no corresponding property and only accepts slot content. An empty state usually needs just one primary action; with more buttons, switch to the composition below.

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

The four slots replace the whole set of content: `icon` replaces the graphic, the default slot replaces the title, `description` replaces the description, and `action` replaces the action area. Slot content overrides the property of the same name, so once a slot is written there is no need for `title` / `description`. Multiple actions go in a container of their own; the action area only provides the gap above it.

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

There is no `size` property: the graphic's edge length, the two font sizes, the colors, and the whitespace are four independent groups of variables. To scale the whole empty state, write them together—enlarging only the graphic leaves whitespace that does not match the type.

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

Title and description both wrap to the content width, and long words break with `overflow-wrap: anywhere`, so a pasted URL or a long identifier neither widens the box nor overflows into sibling sections.

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

The examples above spell out a few combinations; a single variable can also be changed on its own. `--wui-empty-icon-size` is the edge length shared by the box and the graphic (the graphic fills the box, so the two always move together), while `--wui-empty-content-width` and the two section gaps belong to no combination and are reachable only through variables.

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

The graphic box and the graphic are the same size: with the surface gone there is no invisible padding left, so the distance between the graphic and the title is exactly `--wui-empty-title-margin-top` (`12px` by default).

The layout channels do not move together—edge length, the two font sizes, colors, and whitespace are each a group of variables. Scaling the whole empty state means writing several of them; writing only `--wui-empty-icon-size` gives an empty state with a very large graphic and a very small title.

The default graphic is `andrsrxn:inbox` on a 24×24 canvas, and both its strokes and its fills use `currentColor`, so the color is decided by `color` alone and `--wui-empty-icon-color` is never overridden by a fixed color inside the asset.

Depth and hue live on two variables: `--wui-empty-icon-color` is a **solid** color, and the lighter step is handled by `--wui-empty-icon-opacity` (`0.75` by default). The two cannot be merged into "a color with alpha": the strokes of a line-art graphic already overlap at corners, endpoints, and fills, and a color carrying alpha composites a second time wherever they overlap, darkening those spots—it shows up as blackened strokes at the corners. Group opacity is applied once, after the whole graphic has been composited, so overlaps do not change. To bring the graphic back to full color, write `--wui-empty-icon-opacity: 1`.

`--wui-empty-icon-opacity` only affects the default graphic; content in the `icon` slot does not fade with it.

The three copy segments are decided separately: the title segment checks whether the default slot has content and then `title`; the description segment checks the `description` slot and then the `description` property; the action segment only recognizes the `action` slot.

What is checked is "is there content", not "does the content render", so even a single `.sr-only` span makes that segment take space; conversely, the graphic area does not participate in this check and always takes space—an empty state with all three copy segments empty keeps only the graphic.

Multiple elements in the `action` slot do not lay themselves out in a row; the action area only provides the gap above it.

Graphics in the `icon` slot must carry their own size: the component only centres the slot content inside the `--wui-empty-icon-size` box—it neither measures nor scales it. The default edge length is `40px`; when swapping in a `web-ui-icon`, write its `size` to the same value, or change `--wui-empty-icon-size` along with it.

`title` reuses the global `title` attribute and reflects it to the host, so the browser also draws that text as a native tooltip on hover. To avoid that hint, put the title in the default slot; that position is equivalent, it just is not treated as tooltip text.

### Migrating from the `size` property

`size` is gone. It used to be the single scaling knob, driving the graphic, `min-height`, padding, and both font sizes at once; each of those is now a variable of its own, so reproducing an old step means writing the values below together.

The columns are old size / graphic / `min-height` / padding / title / description:

- `40` / `29px` / `171px` / `23px 17px` / `14px` / `13px`
- `56` (default) / `40px` / `240px` / `32px 24px` / `16px` / `14px`
- `72` / `51px` / `309px` / `41px 31px` / `16px` / `14px`

### CSS Custom Properties

| Name                                | Description                                            | Default                      |
| ----------------------------------- | ------------------------------------------------------ | ---------------------------- |
| `--wui-empty-min-height`            | Minimum height                                         | `240px`                      |
| `--wui-empty-padding`               | Padding                                                | `32px 24px`                  |
| `--wui-empty-icon-size`             | Graphic edge length, shared by the box and the glyph   | `40px`                       |
| `--wui-empty-icon-color`            | Graphic color (solid, no alpha)                        | `--wui-color-text-secondary` |
| `--wui-empty-icon-opacity`          | Overall depth of the graphic                           | `0.75`                       |
| `--wui-empty-content-width`         | Maximum width of the title / description / action area | `480px`                      |
| `--wui-empty-title-margin-top`      | Gap between the icon and the title                     | `12px`                       |
| `--wui-empty-title-font-size`       | Title font size                                        | `16px`                       |
| `--wui-empty-title-color`           | Title color                                            | `--wui-color-text`           |
| `--wui-empty-description-font-size` | Description font size                                  | `14px`                       |
| `--wui-empty-description-color`     | Description color                                      | `--wui-color-text-secondary` |
| `--wui-empty-action-margin-top`     | Gap above the action area                              | `20px`                       |

---
component: empty
tag: web-ui-empty
---

empty state placeholder: `title` and `description` provide the copy, the `icon` / `action` slots add graphics and an action entry point, and `size` is the only scaling knob.

## Samples

### Basic {#basic}

`title` and `description` are the two main copy slots; writing both is the most common shape of this empty state. The graphic area first draws the default icon derived from `size`.

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

### Collapsing copy slots {#partial}

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

### Action area {#action}

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

### Slot content {#slots}

The four slots replace the whole set of content: `icon` replaces the graphic, the default slot replaces the title, `description` replaces the description, and `action` replaces the action area. Slot content overrides the property of the same name, so once a slot is written there is no need for `title` / `description`. Multiple actions go in a container of their own; the action area only provides the gap above it.

```tsx
import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-empty size={72}>
      <web-ui-icon slot="icon" icon={lucideSearch} size={31}></web-ui-icon>
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
  <web-ui-empty :size="72">
    <web-ui-icon slot="icon" :icon="lucideSearch" :size="31"></web-ui-icon>
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

### Sizes {#sizes}

`size` is the only scaling knob: it decides the graphic box, `min-height`, padding, and the font size of both copy lines together, so a large empty state is not just a bigger icon.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <web-ui-empty size={40} title="Empty state at 40"></web-ui-empty>
      <web-ui-empty size={56} title="Empty state at 56 (default)"></web-ui-empty>
      <web-ui-empty size={72} title="Empty state at 72"></web-ui-empty>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <web-ui-empty :size="40" title="Empty state at 40"></web-ui-empty>
    <web-ui-empty :size="56" title="Empty state at 56 (default)"></web-ui-empty>
    <web-ui-empty :size="72" title="Empty state at 72"></web-ui-empty>
  </div>
</template>
```

### Long copy {#long-copy}

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

### CSS variables {#css-vars}

The eight `--wui-empty-*` variables always override what is above: the items derived from `size` (icon box, `min-height`, padding, both font sizes) are overridden one by one, and the other three (content width and the two section gaps) do not follow `size` at all, so writing the variable is the only way to change them. When only a couple of metrics need tuning, override them individually instead of going back to `size`.

Note that `--wui-empty-icon-size` only changes the graphic box; the default glyph is still computed from `size`.

```tsx
export default function Demo() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <web-ui-empty
        className="[--wui-empty-min-height:120px] [--wui-empty-padding:16px_12px]"
        title="Overriding height and padding"
        description="These two are enough to squeeze the empty state into a single hint."
      ></web-ui-empty>

      <web-ui-empty
        className="[--wui-empty-icon-size:80px] [--wui-empty-title-margin-top:4px]"
        size={40}
        title="Graphic box stretched to 80px"
        description="The glyph is still drawn at 3/7 of size, so extra space appears around it."
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
        className="[--wui-empty-title-font-size:20px] [--wui-empty-description-font-size:12px]"
        title="Both font sizes can be changed separately"
        description="Font sizes only have two steps by default, and the variables always override the steps."
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
      title="Overriding height and padding"
      description="These two are enough to squeeze the empty state into a single hint."
    ></web-ui-empty>

    <web-ui-empty
      class="[--wui-empty-icon-size:80px] [--wui-empty-title-margin-top:4px]"
      :size="40"
      title="Graphic box stretched to 80px"
      description="The glyph is still drawn at 3/7 of size, so extra space appears around it."
    ></web-ui-empty>

    <web-ui-empty
      class="[--wui-empty-content-width:300px] [--wui-empty-action-margin-top:4px]"
      title="Content width constrained to 300px"
      description="Title, description, and action area share this one width."
    >
      <web-ui-button slot="action" variant="secondary">Check the gaps</web-ui-button>
    </web-ui-empty>

    <web-ui-empty
      class="[--wui-empty-title-font-size:20px] [--wui-empty-description-font-size:12px]"
      title="Both font sizes can be changed separately"
      description="Font sizes only have two steps by default, and the variables always override the steps."
    ></web-ui-empty>
  </div>
</template>
```

## API

### Props

| Name          | Description                                                                     | Type     | Default |
| ------------- | ------------------------------------------------------------------------------- | -------- | ------- |
| `title`       | Title text.                                                                     | `string` | `''`    |
| `description` | Description text.                                                               | `string` | `''`    |
| `size`        | Layout scale base (px); invalid values or non-positive numbers fall back to 56. | `number` | `56`    |

### Slots

| Name          | Description                                                 |
| ------------- | ----------------------------------------------------------- |
| `icon`        | Graphic area content, replacing the default icon.           |
| `default`     | Title content, overriding the `title` property.             |
| `description` | Description content, overriding the `description` property. |
| `action`      | Action area content, such as a primary button.              |

### Behavior

`size` is the single knob of the whole empty state: it drives the icon box, `min-height`, padding, and the title/description font sizes, so a large icon no longer comes with medium whitespace:

The columns are size / icon box / glyph / min-height / padding block/inline / title / description:

- `40` / `40px` / `17px` / `171px` / `23px/17px` / `14px` / `13px`
- `56` / `56px` / `24px` / `240px` / `32px/24px` / `16px` / `14px`
- `72` / `72px` / `31px` / `309px` / `41px/31px` / `16px` / `14px`

The derivation rules are `min-height: round(size * 30 / 7)`, `padding-block: round(size * 4 / 7)`, `padding-inline: round(size * 3 / 7)`, and the default glyph is `round(size * 3 / 7)`.

Font sizes have two steps rather than continuous scaling: below `56` the title is `14px` and the description `13px`; at `56` and above they are `16px` and `14px`. Larger empty states are opened up with whitespace rather than with bigger text.

`size` accepts only finite positive numbers: `NaN`, ±Infinity, `0`, negative numbers, and inputs that parse to no number such as `size="abc"` all fall back to the default edge length `56`, and the whole derived metric set returns to the default step, rather than computing invalid values from `NaN`.

Each one overrides the value derived from `size`, so the eight properties always win—including the two font sizes. The defaults are the values at the default `size` of `56`.

The three copy segments are decided separately: the title segment checks whether the default slot has content and then `title`; the description segment checks the `description` slot and then the `description` property; the action segment only recognizes the `action` slot.

What is checked is "is there content", not "does the content render", so even a single `.sr-only` span makes that segment take space; conversely, the graphic area does not participate in this check and always takes space—an empty state with all three copy segments empty keeps only the graphic.

Multiple elements in the `action` slot do not lay themselves out in a row; the action area only provides the gap above it.

Graphics in the `icon` slot must carry their own size: the default graphic's edge length is derived from `size` as `round(size * 3 / 7)`, and the component does not measure slot content, so when swapping the icon write its `size` at the same ratio (`size={40}` with 17, `72` with 31), or adjust `--wui-empty-icon-size` as well.

`title` reuses the global `title` attribute and reflects it to the host, so the browser also draws that text as a native tooltip on hover. To avoid that hint, put the title in the default slot; that position is equivalent, it just is not treated as tooltip text.

### Migrating from the 'small' | 'medium' | 'large' enum

`size` is now a number. The removed steps were hand-tuned values that these ratios can only approximate, not reproduce—`small` was `160px` high with `20px 16px` padding, and `large` was `320px` with `48px 32px`. Section gaps and content width never followed the steps.

The columns are old value / new value / default glyph:

- `small` / `40` / `17`
- `medium` / `56` / `24`
- `large` / `72` / `31`

### CSS Custom Properties

| Name                                | Description                                            | Default     |
| ----------------------------------- | ------------------------------------------------------ | ----------- |
| `--wui-empty-min-height`            | Minimum height                                         | `240px`     |
| `--wui-empty-padding`               | Padding                                                | `32px 24px` |
| `--wui-empty-icon-size`             | Icon container size, takes precedence over `size`      | `56px`      |
| `--wui-empty-content-width`         | Maximum width of the title / description / action area | `480px`     |
| `--wui-empty-title-margin-top`      | Gap between the icon and the title                     | `16px`      |
| `--wui-empty-title-font-size`       | Title font size                                        | `16px`      |
| `--wui-empty-description-font-size` | Description font size                                  | `14px`      |
| `--wui-empty-action-margin-top`     | Gap above the action area                              | `20px`      |

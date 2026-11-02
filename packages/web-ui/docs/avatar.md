# Avatar

avatar draws an image from `src`; when there is no image or the image fails to load, it falls back to the initials of `name`, and when `name` is also empty, to the default icon.

## Samples

### Image

`src` is the image URL, `alt` supplies both the image alternative text and the accessible name, and `size` sets the avatar's edge length (px).

```tsx
// The sample image is an inline SVG: the corpus ships no binary assets and does not depend on the network.
const photo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='96' height='96' fill='%234f46e5'/%3E%3Ccircle cx='48' cy='56' r='22' fill='%23c7d2fe'/%3E%3Ccircle cx='48' cy='92' r='26' fill='%23a5b4fc'/%3E%3C/svg%3E"

export default function Demo() {
  return (
    <div className="flex items-center gap-4">
      <web-ui-avatar src={photo} alt="Grey" size={40}></web-ui-avatar>
      <web-ui-avatar src={photo} alt="Grey" size={56}></web-ui-avatar>
      <web-ui-avatar src={photo} alt="Grey" size={80}></web-ui-avatar>
    </div>
  )
}
```

```vue
<template>
  <div class="flex items-center gap-4">
    <web-ui-avatar :src="photo" alt="Grey" :size="40"></web-ui-avatar>
    <web-ui-avatar :src="photo" alt="Grey" :size="56"></web-ui-avatar>
    <web-ui-avatar :src="photo" alt="Grey" :size="80"></web-ui-avatar>
  </div>
</template>

<script setup lang="ts">
// The sample image is an inline SVG: the corpus ships no binary assets and does not depend on the network.
const photo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='96' height='96' fill='%234f46e5'/%3E%3Ccircle cx='48' cy='56' r='22' fill='%23c7d2fe'/%3E%3Ccircle cx='48' cy='92' r='26' fill='%23a5b4fc'/%3E%3C/svg%3E"
</script>
```

### Initials fallback

Without `src`, no image is drawn and initials are taken from `name`: the name is split on whitespace, at most the first two words are used, and the first character of each is uppercased, so `Grey Pan` gives GP, `Ada` gives only A, and `John Michael Doe` is truncated to JM. `name` also serves as the accessible name.

```tsx
export default function Demo() {
  return (
    <div className="flex items-center gap-4">
      <web-ui-avatar name="Grey Pan" size={56}></web-ui-avatar>
      <web-ui-avatar name="Ada" size={56}></web-ui-avatar>
      <web-ui-avatar name="John Michael Doe" size={56}></web-ui-avatar>
    </div>
  )
}
```

```vue
<template>
  <div class="flex items-center gap-4">
    <web-ui-avatar name="Grey Pan" :size="56"></web-ui-avatar>
    <web-ui-avatar name="Ada" :size="56"></web-ui-avatar>
    <web-ui-avatar name="John Michael Doe" :size="56"></web-ui-avatar>
  </div>
</template>
```

### Icon fallback

When `src` and `name` are both empty and the `default` slot is empty too, it falls back to the built-in `<web-ui-icon>` person icon. That icon has no name to announce, so the whole avatar is treated as decorative content (see Behavior below).

```tsx
export default function Demo() {
  return (
    <div className="flex items-center gap-4">
      <web-ui-avatar size={40}></web-ui-avatar>
      <web-ui-avatar size={56}></web-ui-avatar>
      <web-ui-avatar size={80}></web-ui-avatar>
    </div>
  )
}
```

```vue
<template>
  <div class="flex items-center gap-4">
    <web-ui-avatar :size="40"></web-ui-avatar>
    <web-ui-avatar :size="56"></web-ui-avatar>
    <web-ui-avatar :size="80"></web-ui-avatar>
  </div>
</template>
```

### Sizes

`size` is the only size knob: it is written as the inline width and height of the square box and mirrored into `--wui-avatar-size` for use inside the shadow root, and the highlight radius of the circle shape is derived from half of it (the square shape is fixed at 12px).

Fallback content follows it: the initials font size is 40% of `size`, and the default icon is rounded at the same ratio.

The image is cropped into this square box with `object-fit: cover`, so a mismatched aspect ratio is center-cropped rather than stretched.

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <web-ui-avatar name="S" size={24}></web-ui-avatar>
      <web-ui-avatar name="M" size={32}></web-ui-avatar>
      <web-ui-avatar name="L" size={40}></web-ui-avatar>
      <web-ui-avatar name="XL" size={56}></web-ui-avatar>
      <web-ui-avatar name="XXL" size={80}></web-ui-avatar>
      <web-ui-avatar name="Huge" size={120}></web-ui-avatar>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-end gap-4">
    <web-ui-avatar name="S" :size="24"></web-ui-avatar>
    <web-ui-avatar name="M" :size="32"></web-ui-avatar>
    <web-ui-avatar name="L" :size="40"></web-ui-avatar>
    <web-ui-avatar name="XL" :size="56"></web-ui-avatar>
    <web-ui-avatar name="XXL" :size="80"></web-ui-avatar>
    <web-ui-avatar name="Huge" :size="120"></web-ui-avatar>
  </div>
</template>
```

### Square

`shape="square"` pulls the radius in to a 12px square, and image, initials, and the default icon all share this shape. Invalid values take no part in rendering and are normalized to `circle`.

```tsx
// The sample image is an inline SVG: the corpus ships no binary assets and does not depend on the network.
const photo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='96' height='96' fill='%234f46e5'/%3E%3Ccircle cx='48' cy='56' r='22' fill='%23c7d2fe'/%3E%3Ccircle cx='48' cy='92' r='26' fill='%23a5b4fc'/%3E%3C/svg%3E"

export default function Demo() {
  return (
    <div className="flex items-center gap-4">
      <web-ui-avatar src={photo} alt="Grey" shape="square" size={56}></web-ui-avatar>
      <web-ui-avatar name="Grey Pan" shape="square" size={56}></web-ui-avatar>
      <web-ui-avatar shape="square" size={56}></web-ui-avatar>
    </div>
  )
}
```

```vue
<template>
  <div class="flex items-center gap-4">
    <web-ui-avatar :src="photo" alt="Grey" shape="square" :size="56"></web-ui-avatar>
    <web-ui-avatar name="Grey Pan" shape="square" :size="56"></web-ui-avatar>
    <web-ui-avatar shape="square" :size="56"></web-ui-avatar>
  </div>
</template>

<script setup lang="ts">
// The sample image is an inline SVG: the corpus ships no binary assets and does not depend on the network.
const photo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='96' height='96' fill='%234f46e5'/%3E%3Ccircle cx='48' cy='56' r='22' fill='%23c7d2fe'/%3E%3Ccircle cx='48' cy='92' r='26' fill='%23a5b4fc'/%3E%3C/svg%3E"
</script>
```

### Load failure

After the image reports `error`, the component treats it as a fallback: initials if there is a `name`, otherwise the default icon, never a broken image. The fallback decision applies per `src`—replacing `src` clears the previous failure record.

```tsx
export default function Demo() {
  return (
    <div className="flex items-center gap-4">
      <web-ui-avatar src="/avatars/missing.png" name="Grey Pan" size={56}></web-ui-avatar>
      <web-ui-avatar src="/avatars/missing.png" size={56}></web-ui-avatar>
    </div>
  )
}
```

```vue
<template>
  <div class="flex items-center gap-4">
    <web-ui-avatar src="/avatars/missing.png" name="Grey Pan" :size="56"></web-ui-avatar>
    <web-ui-avatar src="/avatars/missing.png" :size="56"></web-ui-avatar>
  </div>
</template>
```

### Custom fallback content

The `default` slot replaces the initials or the default icon, for example to fill the spot with an employee ID or a rank marker. Slot content is judged by element children: a single element is enough to take effect, and it wins over `name`.

```tsx
export default function Demo() {
  return (
    <div className="flex items-center gap-4">
      <web-ui-avatar size={56}>
        <span className="text-sm font-bold text-(--wui-color-accent)">VIP</span>
      </web-ui-avatar>

      <web-ui-avatar name="Grey Pan" size={56}>
        <span className="text-lg">Guest</span>
      </web-ui-avatar>
    </div>
  )
}
```

```vue
<template>
  <div class="flex items-center gap-4">
    <web-ui-avatar :size="56">
      <span class="text-sm font-bold text-(--wui-color-accent)">VIP</span>
    </web-ui-avatar>

    <web-ui-avatar name="Grey Pan" :size="56">
      <span class="text-lg">Guest</span>
    </web-ui-avatar>
  </div>
</template>
```

## API

### Props

| Name    | Description                                             | Type                   | Default    |
| ------- | ------------------------------------------------------- | ---------------------- | ---------- |
| `src`   | Image URL; falls back when empty or when loading fails. | `string`               | `''`       |
| `alt`   | Image alternative text.                                 | `string`               | `''`       |
| `name`  | Display name, used for the initials fallback.           | `string`               | `''`       |
| `size`  | avatar edge length (px).                                | `number`               | `40`       |
| `shape` | Shape: `circle` (default) or `square`.                  | `'circle' \| 'square'` | `'circle'` |

### Slots

| Name      | Description                                                                    |
| --------- | ------------------------------------------------------------------------------ |
| `default` | Fallback content when the image fails to load, replacing the default initials. |

### Behavior

The three kinds of content are mutually exclusive, and the first one that can be drawn wins in the order `src` → `default` slot → initials from `name` → default icon: an image is drawn when `src` has a value and has not errored; when `src` is empty or reports `error` the component enters the fallback state, where any element child in the `default` slot suppresses both initials and icon, otherwise initials come from `name`, and when `name` is empty too the built-in `lucideUser` is drawn.

`shape` goes through a literal allowlist: only `circle` / `square` are accepted, and any other value (including an empty string) falls back to `circle` and the host attribute is corrected.

`size` has no such normalization. It is a numeric property reflected as-is, so input that does not parse to a number, such as `size="abc"`, is used as `NaN`; keeping its value in range is therefore up to the page.

The accessible name is taken in the order `alt` → `name`; only when one is found does it declare `role="img"` and write `aria-label`. When both are empty the avatar is treated as decorative: the shadow node is `role="presentation"` with `aria-hidden="true"`, so screen readers do not announce it.

So in the pattern where the avatar is the only visual and the name sits outside it, this avatar should not be announced in the first place.

Initials are the first character of the first two words of `name`, uppercased. Names that cannot be split on spaces, such as Chinese ones, therefore yield only the first character (`潘某某` yields `潘`); to get two characters, split the words yourself or switch to the `default` slot. The font size is 40% of `size` and the default icon is rounded at the same ratio, so small avatars still fit the text.

### Layout

The host is inline-block with `line-height: 0`; `size` sets the edge length of the square box, and the same value is written inline to `--wui-avatar-size` for use inside the shadow root.

The circle shape takes its radius from `--wui-radius-control` (pill by default) and the square shape uses 12px; `--wui-glass-corner-radius` follows these two cases as well, so the highlight gradient of the fallback state does not misalign with the box shape.

The fallback state carries the glass material, which supplies the blur, inner stroke ring, and shadow; the background uses `--wui-color-surface-raised`, while initials and the default icon use `--wui-color-text` and therefore follow theme switches. The image state has only the image itself.

The `default` slot box is absolutely positioned, filling the whole avatar and centered. It takes no part in deciding what to draw, so when `src` is set and the image loads successfully the slot content is layered on top of the image rather than hidden—fallback content and the image are alternatives, so do not supply both. The component exposes no CSS variable knobs; size and shape both belong to `size` / `shape`.

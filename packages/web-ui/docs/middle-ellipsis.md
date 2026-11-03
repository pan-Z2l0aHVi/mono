# Middle Ellipsis

Single-line middle ellipsis: keep both ends, drop the middle, for example `very-long-file-…-abcdefghij.txt`. Cuts always land on grapheme cluster boundaries and never split surrogate pairs, combining sequences, or ZWJ emoji.

## Samples

### Keep both ends

`text-overflow: ellipsis` can only preserve the head, so a long filename loses the extension that actually distinguishes it. Middle ellipsis keeps both head and tail. Both approaches require a single line with a definite inline size.

```tsx
const FILENAME = 'very-long-file-name-abcdefghij.txt'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">text-overflow: ellipsis</div>
        <div className="truncate">{FILENAME}</div>
      </div>
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">web-ui-middle-ellipsis</div>
        <web-ui-middle-ellipsis text={FILENAME}></web-ui-middle-ellipsis>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">text-overflow: ellipsis</div>
      <div class="truncate">{{ FILENAME }}</div>
    </div>
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">web-ui-middle-ellipsis</div>
      <web-ui-middle-ellipsis :text="FILENAME"></web-ui-middle-ellipsis>
    </div>
  </div>
</template>

<script setup lang="ts">
const FILENAME = 'very-long-file-name-abcdefghij.txt'
</script>
```

### Mixed CJK and ASCII

With CJK and ASCII mixed, cuts still land on grapheme cluster boundaries and never slice a character in half. The second line uses `marker-position: 80` to leave more room for the tail.

```tsx
const CJK_TITLE = '海外增长与留存复盘报告-2026年第二季度终稿-v3-final.docx'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">marker-position default 50</div>
        <web-ui-middle-ellipsis text={CJK_TITLE}></web-ui-middle-ellipsis>
      </div>
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">marker-position: 80</div>
        <web-ui-middle-ellipsis text={CJK_TITLE} marker-position={80}></web-ui-middle-ellipsis>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">marker-position default 50</div>
      <web-ui-middle-ellipsis :text="CJK_TITLE"></web-ui-middle-ellipsis>
    </div>
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">marker-position: 80</div>
      <web-ui-middle-ellipsis :text="CJK_TITLE" :marker-position="80"></web-ui-middle-ellipsis>
    </div>
  </div>
</template>

<script setup lang="ts">
const CJK_TITLE = '海外增长与留存复盘报告-2026年第二季度终稿-v3-final.docx'
</script>
```

### Long strings without spaces and grapheme clusters

Long strings without spaces are cut by width in the same way; ZWJ sequences (👩‍💻) and "base character + variation selector" pairs (⚠️) are kept whole, with no half emoji or stray joiner. Both strings are written as escapes because `U+200D` and `U+FE0F` are zero-width, so a literal copy would be unreadable.

```tsx
const NO_SPACE = 'a'.repeat(120)
const CLUSTERS = `${'\u{1F469}\u200D\u{1F4BB}'.repeat(16)}${'\u{26A0}\uFE0F}'.repeat(8)}`

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">Long string without spaces</div>
        <web-ui-middle-ellipsis text={NO_SPACE}></web-ui-middle-ellipsis>
      </div>
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">ZWJ and variation selectors</div>
        <web-ui-middle-ellipsis text={CLUSTERS}></web-ui-middle-ellipsis>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">Long string without spaces</div>
      <web-ui-middle-ellipsis :text="NO_SPACE"></web-ui-middle-ellipsis>
    </div>
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">ZWJ and variation selectors</div>
      <web-ui-middle-ellipsis :text="CLUSTERS"></web-ui-middle-ellipsis>
    </div>
  </div>
</template>

<script setup lang="ts">
const NO_SPACE = 'a'.repeat(120)
const CLUSTERS = `${'\u{1F469}\u200D\u{1F4BB}'.repeat(16)}${'\u{26A0}\uFE0F}'.repeat(8)}`
</script>
```

### Marker

`marker` replaces the ellipsis in the middle. An empty string means the text really is truncated but gives no visible signal, and the full original sits in `title`.

```tsx
const FILENAME = 'very-long-file-name-abcdefghij.txt'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">Default …</div>
        <web-ui-middle-ellipsis text={FILENAME}></web-ui-middle-ellipsis>
      </div>
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">marker is [..]</div>
        <web-ui-middle-ellipsis text={FILENAME} marker="[..]"></web-ui-middle-ellipsis>
      </div>
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">marker is an empty string</div>
        <web-ui-middle-ellipsis text={FILENAME} marker=""></web-ui-middle-ellipsis>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">Default …</div>
      <web-ui-middle-ellipsis :text="FILENAME"></web-ui-middle-ellipsis>
    </div>
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">marker is [..]</div>
      <web-ui-middle-ellipsis :text="FILENAME" marker="[..]"></web-ui-middle-ellipsis>
    </div>
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">marker is an empty string</div>
      <web-ui-middle-ellipsis :text="FILENAME" marker=""></web-ui-middle-ellipsis>
    </div>
  </div>
</template>

<script setup lang="ts">
const FILENAME = 'very-long-file-name-abcdefghij.txt'
</script>
```

### Marker position

`marker-position` is the horizontal ratio, from 0 to 100, at which the marker sits, default `50`. `0` keeps only the head, which is the same as end ellipsis; `100` keeps only the tail. When the head is path noise and the tail is the extension, use a value above 50.

```tsx
const FILENAME = 'very-long-file-name-abcdefghij.txt'
const POSITIONS = [0, 50, 80, 100]

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      {POSITIONS.map(position => (
        <div key={position} className="w-48">
          <div className="mb-1 text-xs text-(--wui-color-text-secondary)">marker-position: {position}</div>
          <web-ui-middle-ellipsis text={FILENAME} marker-position={position}></web-ui-middle-ellipsis>
        </div>
      ))}
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div v-for="position in POSITIONS" :key="position" class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">marker-position: {{ position }}</div>
      <web-ui-middle-ellipsis :text="FILENAME" :marker-position="position"></web-ui-middle-ellipsis>
    </div>
  </div>
</template>

<script setup lang="ts">
const FILENAME = 'very-long-file-name-abcdefghij.txt'
const POSITIONS = [0, 50, 80, 100]
</script>
```

### Container width

The width comes from the container and is recomputed when the container changes: narrower cuts harder, wider takes truncation back. Both boxes carry a width cap so they still overflow on a wide screen, and the truncation stays visible.

```tsx
const LONG_PATH = 'assets/images/screenshots/2026/06/very-long-file-name-abcdefghij.png'

export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="w-1/3 max-w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">1/3 of the container width (max 192px)</div>
        <web-ui-middle-ellipsis text={LONG_PATH}></web-ui-middle-ellipsis>
      </div>
      <div className="w-1/6 max-w-32">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">1/6 of the container width (max 128px)</div>
        <web-ui-middle-ellipsis text={LONG_PATH}></web-ui-middle-ellipsis>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col gap-3">
    <div class="w-1/3 max-w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">1/3 of the container width (max 192px)</div>
      <web-ui-middle-ellipsis :text="LONG_PATH"></web-ui-middle-ellipsis>
    </div>
    <div class="w-1/6 max-w-32">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">1/6 of the container width (max 128px)</div>
      <web-ui-middle-ellipsis :text="LONG_PATH"></web-ui-middle-ellipsis>
    </div>
  </div>
</template>

<script setup lang="ts">
const LONG_PATH = 'assets/images/screenshots/2026/06/very-long-file-name-abcdefghij.png'
</script>
```

## API

### Props

| Name              | Description                                                                                              | Type     | Default |
| ----------------- | -------------------------------------------------------------------------------------------------------- | -------- | ------- |
| `text`            | Full text; the component only reads it and never writes back.                                            | `string` | `''`    |
| `marker`          | Marker inserted between the two ends; an empty string truncates without a visible signal.                | `string` | `'…'`   |
| `marker-position` | Horizontal ratio from 0 to 100 where the marker sits; out-of-range values clamp, `NaN` falls back to 50. | `number` | `50`    |

### Behavior

`marker` and `marker-position` both are written back to attributes, so the current values can be read back from the DOM. The string on screen is the sliced combination, and `text` is not written back into the rendered result. `marker` treats `null` / `undefined` as `…` (an empty string stays empty), while `marker-position` clamps out-of-range values and falls back to 50 for `NaN`.

A container width or font metric change (a root font size change, a font finishing loading) re-cuts the ellipsis automatically.

`title` is attached to the text element only when the text is actually truncated, and removed once it fits. That is the only visible evidence that an empty marker still counts as truncation.

### Marker position values

The larger `marker-position`, the more room goes to the tail: `0` is equivalent to end ellipsis, and `100` leaves only the marker and the tail. The exact cut depends on the font and the container width.

### Joined-string recheck and convergence

When even the marker does not fit, the component lets it overflow and the container clips it, instead of falling back to the full text. Falling back would push the marker outside the box and the user would lose even the "this is truncated" signal.

When the host width is content-driven (flex main axis `auto`, or `width: fit-content`), truncation does not keep narrowing itself: it stops as soon as the current output fits.

### Known limitations: copy and assistive technology

The element contains the on-screen string, so selecting and copying, screen readers, and in-page find all hit the truncated text; the full original is provided through `title`.

The host must be `direction: ltr`; under `direction: rtl` the joined string is reordered by the bidi algorithm. The component has no events, no slots, and reads no `--wui-*` token: font, font size, color, and line height are all inherited from the host, so appearance is decided entirely by the surrounding container.

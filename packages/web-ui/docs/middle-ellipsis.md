---
component: middle-ellipsis
tag: web-ui-middle-ellipsis
---

Single-line middle ellipsis: keep both ends, drop the middle, `very-long-file-…-abcdefghij.txt`. Cuts always land on grapheme cluster boundaries and never split surrogate pairs, combining sequences, or ZWJ emoji.

## Samples

### Keep both ends {#basic}

The two lines are **the same string**; they differ only in the truncation mechanism. `text-overflow: ellipsis` can only preserve the head, so a long filename loses the extension that actually distinguishes it; middle ellipsis puts the ellipsis in the middle and keeps both head and tail. Both approaches require a single line with a definite inline size.

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

### Mixed CJK and ASCII {#cjk}

Han characters and ASCII mixed in one string is the norm: the head is a Chinese title and the tail is the extension. Each Han character is a full-width grapheme cluster, so the cut moves one cell at a time and never slices a character in half. Both lines are the same string; the second line uses `marker-position: 80` to give the budget to the tail.

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

### Long strings without spaces and grapheme clusters {#clusters}

The first line is 120 `a` characters with no spaces: no wrapping, and it is cut to exactly what the measured width can hold.

The second line consists entirely of ZWJ sequences (👩‍💻 = `U+1F469 U+200D U+1F4BB`) and "base character + variation selector" pairs (⚠️ = `U+26A0 U+FE0F`); wherever the cut lands, the whole cluster should be preserved, with no half emoji or stray joiner.

Both strings are written as escapes: `U+200D` and `U+FE0F` are zero-width, so a literal copy would be unreadable.

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

### Marker {#marker}

`marker` replaces the ellipsis in the middle. The third line uses an empty `marker`: it is really truncated, it just gives no visible signal—hover it and the `title` holds the full original text.

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

### Marker position {#marker-position}

`marker-position` is the horizontal ratio, 0–100, at which the marker sits, default `50`: `0` keeps only the head (equivalent to end ellipsis) and `100` keeps only the tail. When the head is path noise and the tail is the extension, use a value above 50.

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

### Container width {#container}

The width comes from the container and is recomputed when the container changes: narrower cuts harder, wider takes truncation back. The two boxes below have percentage widths, each with a cap—the cap guarantees overflow even on a wide screen, otherwise the whole string fits once the window is wide enough and nothing is visible in the box. Drag the window width to watch both lines re-cut.

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

| Name              | Description                                                                                      | Type     | Default |
| ----------------- | ------------------------------------------------------------------------------------------------ | -------- | ------- |
| `text`            | Full text; the component only reads it and never writes back.                                    | `string` | `''`    |
| `marker`          | Marker inserted between the two ends; an empty string truncates without a visible signal.        | `string` | `'…'`   |
| `marker-position` | Horizontal ratio 0–100 where the marker sits; out-of-range values clamp, `NaN` falls back to 50. | `number` | `50`    |

### Behavior

`marker` and `marker-position` both reflect, so the current values can be read back from the DOM; `text` does not reflect into the rendered result—the string on screen is the sliced combination, not `text`.

Of the three properties, only `text` is a direct `@property` field; the other two go through setters that normalize: `marker` turns `null` / `undefined` into `…` (an empty string stays empty), and `marker-position` goes through `normalizeNumber(value, 0, 100, 50)`, clamping out-of-range values and falling back to 50 for `NaN`.

Width measurement: `ElementWidthController` observes the **host** and takes `contentRect.width` (fractional), not the integer `clientWidth`—half a pixel is enough to make the binary search pick the wrong last grapheme cluster.

In the frame where a property has just changed and the observer callback has not arrived yet, `.root`'s `clientWidth` is measured synchronously as a stopgap, so the component does not paint one frame of the full text before cutting.

When the measured width is ≤ 0 (the host is not laid out yet, or jsdom), the component does nothing and keeps the "there is a pending fit" flag, waiting until it is laid out again before cutting.

Re-measurement: a container width change triggers re-cutting.

Font metric changes also trigger re-measurement—a change in the size of the full-text measuring element (a root font size change, for example) is detected by the `ResizeObserver`; the font loading event (`document.fonts`' `loadingdone`) covers the case where the total width of the full text stays the same but glyph widths are redistributed. The component stops listening after disconnect and refits against the current layout on reconnect.

Update timing: `willUpdate` first falls back to the full text for display (the previous cut was computed from the old text, and rendering the new text with it would show a string belonging to neither version), then `updated()` schedules the real re-cut in a microtask—completed before the same frame paints, so the user never sees that intermediate full-text state.

`title` is attached to the text element only when the text is **actually truncated**, and removed once it fits; that is the only visible evidence that "an empty marker still counts as truncation".

### Marker position values

Filename scenarios are tuned with `marker-position`. The two ends get `(1 - p)` and `p` times "available width minus the marker's actual width", and each is approximated by binary search over the measured widths of "the first i clusters / the last i clusters". The values below are illustrative rather than reproducible—the exact cut depends on the font—taken from 16px `system-ui` in a 240px box:

- `0` / `very-long-file-name-abcdefghi…`: the head takes everything, equivalent to end ellipsis.
- `50` (default) / `very-long-file-…-abcdefghij.txt`: both ends keep a slice.
- `80` / `very-l…file-name-abcdefghij.txt`: the budget goes to the tail.
- `100`: the head budget is 0, leaving only the marker and the tail.

### Joined-string recheck and convergence

The segment budget cannot see the letter spacing and ligatures at the two seams, `head|marker` and `marker|tail`, so the joined string may be wider than the sum of the two budgets.

After rendering, the component measures the **real box**: when it exceeds the tolerance by 0.5px, it reclaims budget by the excess and re-cuts, up to 3 rounds—3 rounds is pure defense, covering degenerate inputs such as "the caller makes the marker wider than the container"; the normal path triggers none.

When even the marker does not fit (budget ≤ 0), the marker is allowed to overflow and be clipped by `overflow: hidden` rather than falling back to the full text: falling back would push the marker outside the box and the user would lose even the "this is truncated" signal.

When the host width is content-driven (flex main axis `auto`, or `width: fit-content`), truncating itself makes the host measure narrower, which schedules the next size callback—this self-driven shrink can ratchet all the way down to the marker alone. The shrink direction therefore carries a convergence guard: the criterion is "the current output already fits", and if it fits there is no reason to re-cut, so it stops at the first step; the grow direction always re-cuts.

### Known limitations: copy and assistive technology

The element contains the on-screen string, so selecting and copying yields the truncated text, and screen readers and in-page find also hit the truncated string.

CSS `text-overflow` does not have these two problems (it never modifies the text node); this is the unavoidable cost of computing cuts in JS. The original text is provided through `title`.

For the alternative of keeping the full text in the DOM and its costs, see `docs/research/web-ui-middle-ellipsis-261007.md`.

The host must be `direction: ltr`; under `direction: rtl` the joined string is reordered by the bidi algorithm. The component has no events, no slots, and consumes no `--wui-*` token: font, font size, color, and line height are all inherited from the host, so appearance is decided entirely by the surrounding container.

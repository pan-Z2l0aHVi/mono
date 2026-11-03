# Grouped Text

Grouped display: spread a long digit or text string into visible groups while "select and copy" still yields the **original continuous string**. It fits continuous identifiers that have to stay usable after copying — bank card numbers, phone numbers, large amounts.

## Samples

### Card number

`groups="card"` makes one group every 4 characters. The gap is spread by letter-spacing, not written into the text: select the whole string and the clipboard still holds `6222021234567890`, and in-page find matches that exact string.

```tsx
const CARD = '6222021234567890'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">No grouping</div>
        <div className="font-mono">{CARD}</div>
      </div>
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">groups="card"</div>
        <web-ui-grouped-text className="font-mono" value={CARD} groups="card"></web-ui-grouped-text>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">No grouping</div>
      <div class="font-mono">{{ CARD }}</div>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">groups="card"</div>
      <web-ui-grouped-text class="font-mono" :value="CARD" groups="card"></web-ui-grouped-text>
    </div>
  </div>
</template>

<script setup lang="ts">
const CARD = '6222021234567890'
</script>
```

### Phone number

`groups="phone"` cuts 3-4-4. When the sizes run out and characters remain, the **last size** keeps repeating, so no character is dropped.

```tsx
const PHONE = '13800138000'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">11 digits: 3-4-4</div>
        <web-ui-grouped-text value={PHONE} groups="phone"></web-ui-grouped-text>
      </div>
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">
          With country code: the last size keeps repeating
        </div>
        <web-ui-grouped-text value={`+86${PHONE}`} groups="phone"></web-ui-grouped-text>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">11 digits: 3-4-4</div>
      <web-ui-grouped-text :value="PHONE" groups="phone"></web-ui-grouped-text>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">With country code: the last size keeps repeating</div>
      <web-ui-grouped-text :value="`+86${PHONE}`" groups="phone"></web-ui-grouped-text>
    </div>
  </div>
</template>

<script setup lang="ts">
const PHONE = '13800138000'
</script>
```

### Amount

`groups="amount"` groups by 3 from the right, and the decimal point stays with the fraction as its own group: `1234567.89` becomes `1 | 234 | 567 | .89`. The point is content, not typography decoration, so find works against the original string — searching with the point hits, searching without it misses.

```tsx
export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">With a fraction</div>
        <web-ui-grouped-text value="1234567.89" groups="amount"></web-ui-grouped-text>
      </div>
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">Whole number</div>
        <web-ui-grouped-text value="98765432" groups="amount"></web-ui-grouped-text>
      </div>
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">
          No fraction: the trailing dot belongs to the integer part
        </div>
        <web-ui-grouped-text value="123456." groups="amount"></web-ui-grouped-text>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">With a fraction</div>
      <web-ui-grouped-text value="1234567.89" groups="amount"></web-ui-grouped-text>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">Whole number</div>
      <web-ui-grouped-text value="98765432" groups="amount"></web-ui-grouped-text>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">
        No fraction: the trailing dot belongs to the integer part
      </div>
      <web-ui-grouped-text value="123456." groups="amount"></web-ui-grouped-text>
    </div>
  </div>
</template>
```

### Explicit group sizes

`groups` can also list the size of each group; as an attribute write `4,4,4,4` (space separated works too). Cuts always land on grapheme cluster boundaries, so surrogate pairs, combining sequences and ZWJ emoji are never split.

```tsx
const ID = '110101199003078888'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">groups="6,8,8"</div>
        <web-ui-grouped-text value={ID} groups="6,8,8"></web-ui-grouped-text>
      </div>
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">groups="4,4,4,4,4,4"</div>
        <web-ui-grouped-text value={ID} groups="4,4,4,4,4,4"></web-ui-grouped-text>
      </div>
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">Emoji kept whole: groups="2,2"</div>
        <web-ui-grouped-text value={'\u{1F469}\u200D\u{1F4BB}'.repeat(4)} groups="2,2"></web-ui-grouped-text>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">groups="6,8,8"</div>
      <web-ui-grouped-text :value="ID" groups="6,8,8"></web-ui-grouped-text>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">groups="4,4,4,4,4,4"</div>
      <web-ui-grouped-text :value="ID" groups="4,4,4,4,4,4"></web-ui-grouped-text>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">Emoji kept whole: groups="2,2"</div>
      <web-ui-grouped-text :value="EMOJI.repeat(4)" groups="2,2"></web-ui-grouped-text>
    </div>
  </div>
</template>

<script setup lang="ts">
const ID = '110101199003078888'
const EMOJI = '\u{1F469}\u200D\u{1F4BB}'
</script>
```

### Gap width

The gap is `--wui-grouped-text-gap`, defaulting to `0.25em`, one share per group boundary: 4 groups means 3 shares. It scales with font size — 4px at `16px`, 5px at `20px`.

```tsx
const CARD = '6222021234567890'
const GAPS = ['0px', '2px', '6px', '12px']

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      {GAPS.map(gap => (
        <div key={gap}>
          <div className="mb-1 text-xs text-(--wui-color-text-secondary)">--wui-grouped-text-gap: {gap}</div>
          <web-ui-grouped-text
            className="font-mono"
            style={{ '--wui-grouped-text-gap': gap }}
            value={CARD}
            groups="card"
          ></web-ui-grouped-text>
        </div>
      ))}
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div v-for="gap in GAPS" :key="gap">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">--wui-grouped-text-gap: {{ gap }}</div>
      <web-ui-grouped-text
        class="font-mono"
        :style="{ '--wui-grouped-text-gap': gap }"
        :value="CARD"
        groups="card"
      ></web-ui-grouped-text>
    </div>
  </div>
</template>

<script setup lang="ts">
const CARD = '6222021234567890'
const GAPS = ['0px', '2px', '6px', '12px']
</script>
```

## API

### Props

| Name     | Description                                                                                                                                                                                                       | Type                 | Default                       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------- |
| `value`  | The original continuous string to display. The component only reads it and never writes back; pass `Number` values as a string.                                                                                   | `string`             | `''`                          |
| `groups` | Group shape: a preset name — `'card'` (every 4), `'phone'` (3-4-4), `'amount'` (3 from the right) — or the cluster count per group, `[4, 4, 4, 4]`. The string form of a size list, `"4,4,4,4"`, is accepted too. | `string \| number[]` | `undefined`, i.e. no grouping |

### Behavior

`value` is the original text and grouping is only a rendering parameter: the groups join head to tail, rejoin to exactly `value`, and contain no filler characters between groups. The shadow tree therefore holds only the characters themselves, no separators.

An explicit size list advances from the left group by group; when the sizes run out and characters remain, the last size keeps repeating and the final group holds what is left, so no character is dropped and no group is empty. When `groups` is omitted, empty, or unreadable (`cards`, `4,0`, `card,4`), the whole string becomes one group, i.e. no grouping. That case deliberately does not guess a shape: cutting an ID number every 4 characters, or a large amount every 4, is a visibly wrong cut, and a wrong cut costs more than no grouping.

Cuts always land on grapheme cluster boundaries. Cutting by UTF-16 index would split surrogate pairs and ZWJ sequences down the middle, and half an emoji on screen is worse than "this group has one digit less".

The string spelling of `groups` is accepted on both the attribute and the property channel. Frameworks such as Vue assign the property directly once `'groups' in el` holds, so Lit's `fromAttribute` converter never runs and a template's `groups="4,4,4,4"` arrives as the raw string; both channels share one parse, so `groups="4,4,4,4"` and `:groups="[4, 4, 4, 4]"` produce the same groups.

### Gap

The gap hangs on the `letter-spacing` of each group's last grapheme cluster. Only the last cluster carries it, so the rest of the group is not widened, and the final group's last cluster carries none, so no spare gap is left at the line end. The spacing belongs to that character's own text fragment, so selecting the fragment paints the spacing too — which is how "groups are visible" and "highlight is continuous" are both obtained.

`--wui-grouped-text-gap` defaults to `0.25em` (3.5px at `14px`, 4px at `16px`, 5px at `20px`). Gaps are counted per boundary: `n` groups means `n - 1` shares. A 16-digit card number is about 192px in a 20px monospace font; with `groups="card"` and 3 shares of 5px it is about 207px.

### Copy, find and selection

Copying yields the original: select all and you get the whole string, select only the last group and you get those 4 digits. The component installs no `copy` listener — measured, one replaces even a "last group only" partial copy with the whole string, which is overreaching rewrite.

In-page find works against the original string. `window.find('6222021234567890')` hits (measured in Chromium: the browser search backend pierces open shadow roots) and continuous substrings crossing group boundaries hit as well. Searching an amount with its decimal point hits; dropping the point necessarily misses, because the original string contains it. Double-clicking any digit in a numeric run selects the whole run.

Selection highlight does not break between groups: measured pixel by pixel in Chromium, gaps made of `letter-spacing` sit entirely inside the highlight, with zero holes.

### Assistive technology

The component provides no `aria-label` and rewrites no text — a screen reader reads the characters themselves. Measured in Chromium: the 4 groups of a card number appear as 7 text nodes in the accessibility tree (the first 3 groups split into a head fragment and a last-character fragment, the final group stays one), identical to the same structure written in light DOM; wrap the component in a `<button>` and the button's computed accessible name is exactly `6222021234567890`. An `aria-label` fallback is therefore unnecessary and would flatten the whole block into a single label, throwing away per-character selection.

Whether VoiceOver and TalkBack pause between groups, or read digit by digit or as a number, was not measured.

### Typography

The component sets `font-variant-numeric: tabular-nums` on its own `:host`: Chromium is tabular by default, WebKit is not — in the same `0123456789` at 24px system font, `1` is about 4px narrower than `6`. Without this line, the alignment between groups differs across the two engines on the same page.

`white-space: nowrap` is set on `:host` as well: a narrow container makes the string overflow instead of wrapping. Letter-spacing gaps never introduce break opportunities, but placeholder elements, `::after` and `display: inline-block` do — see the next two sections.

Inside `text-align: justify` text flow the spacing gap is not treated as a justification opportunity: measured in Chromium, the line does stretch under `text-align-last: justify` while the component's own width and every group's width stay byte for byte unchanged.

### Known behavior: gaps made of `margin`

If you would rather not split the characters, the gap can fall back to `margin-inline-start` on each group's first element. The price is that selection highlight breaks at every group boundary with a hole exactly as wide as the gap — measured in Chromium, an 8px gap leaves exactly 3 holes of 8px for 4 groups. This follows from the shape and is not a bug: the blank that `margin` spreads sits outside both text fragments and belongs to neither, and `::selection` can only use properties that do not affect layout, so it cannot be patched. The component itself does not take this route.

### Shapes that must not be used

- Writing a separator into the text node (`U+0020`, `U+2009`, `U+202F`, `U+200B`): all four codepoints were measured going into the clipboard verbatim, and they break double-click word selection and in-page find.
- `display: inline-block` groups: in Chromium it makes `window.find` miss a continuous digit string outright — the only grouping shape that breaks in-page find.
- Empty placeholder `span` or `::after` gaps: the blank cannot carry highlight, and it creates extra break opportunities.
- A `copy` listener rewriting the selection, `user-select: none`, SVG `textLength`: the first overreaches, the second makes copying unusable, the third breaks highlight per glyph and stays out of normal text layout.

### Boundaries

Read-only display: no events, no slots, no form participation. Apart from `--wui-grouped-text-gap` the component reads no `--wui-*` token; font family, size, colour and line height all inherit from the host, and `groups` of `undefined` means no split.

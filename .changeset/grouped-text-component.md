---
'@greypan/web-ui': minor
---

Add `web-ui-grouped-text`, which spreads a long digit or text string into visible groups — bank card numbers, phone numbers, large amounts — while "select and copy" still yields the **original continuous string**. Grouping is only a rendering parameter: `value` stays the original text, the groups join head to tail back into it, and no separator character is written into any text node, so in-page find, double-click word selection and the clipboard all keep working on the original string.

`value` is a `string` (a 16-digit-plus card number loses precision through `Number`). `groups` takes a preset — `'card'` for one group every 4, `'phone'` for 3-4-4, `'amount'` for 3 from the right, where the decimal point stays with the fraction as its own group — or the cluster count per group (`[4, 4, 4, 4]`). The string spelling `"4,4,4,4"` is accepted on the attribute and the property channel alike, because frameworks such as Vue assign the property directly and the attribute converter never runs. An omitted or unreadable shape means no grouping rather than a guessed one. Cuts always land on grapheme cluster boundaries.

The gap hangs on the `letter-spacing` of each group's last cluster, so it sits inside that character's own text fragment and the selection highlight stays continuous across groups. `--wui-grouped-text-gap` defaults to `0.25em` and scales with the font size; `n` groups means `n - 1` shares. The component sets `font-variant-numeric: tabular-nums` and `white-space: nowrap` on itself, provides no `aria-label`, and installs no `copy` listener.

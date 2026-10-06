---
'@greypan/web-ui': major
---

Change `web-ui-empty`'s `size` from the `'small' | 'medium' | 'large'` enum to a `number` in px, defaulting to `56`. Like `<web-ui-button>`'s `size` it is a px length, but where button keeps a `string` property, `web-ui-empty` now takes a plain `number`. It is the one knob for the whole placeholder: it drives the icon container, `min-height`, padding, and the title/description font size, so a large icon no longer sits in medium-sized whitespace. The default glyph is `round(size * 3 / 7)` and the internal `--wui-internal-empty-icon-radius` default moves from `16px` to `18px`.

**Breaking changes:**

- The exported `EmptySize` type is removed; the attribute is a plain number. Values that are not finite positive numbers (`NaN`, `±Infinity`, `0`, negatives) fall back to the default `56` instead of the old `'medium'`.
- The `:host([size='small'])` and `:host([size='large'])` rules are gone; `size` is now the single source. The derived values are `min-height: round(size * 30 / 7)`, `padding-block: round(size * 4 / 7)`, and `padding-inline: round(size * 3 / 7)`, which keeps the default `56` on exactly the former `medium` metrics (`240px`, `32px 24px`) while `40` and `72` get `171px` / `23px 17px` and `309px` / `41px 31px`. Font size is one step rather than a scale: below `56` it is `14px` / `13px`, and from `56` up it is `16px` / `14px`, so a bigger placeholder reads through its whitespace rather than through bigger text.
- Every `--wui-empty-*` custom property still overrides what `size` derives, including the two font sizes, which are now overridable per instance without giving up the scale. Section margins and content width never followed the old tiers and still do not follow `size`.

**Migration:** `small` → `40`, `medium` → `56`, `large` → `72`. The old tiers were hand-tuned, so the ratios land near them rather than reproducing them — `small` used to be `160px` tall with `20px 16px` padding and `large` used to be `320px` with `48px 32px`. An invalid `size` now falls back to `56` for the whole metric set, not just for the icon box.

```html
<!-- before -->
<web-ui-empty size="large" title="No results"></web-ui-empty>
<!-- after -->
<web-ui-empty size="72" title="No results"></web-ui-empty>
```

The generated React and Vue types declare `size` as `number`, so pass a number rather than a string attribute in those frameworks — a static `size="72"` fails type checking.

```tsx
<web-ui-empty size={72} title="No results"></web-ui-empty>
```

```vue
<web-ui-empty :size="72" title="No results"></web-ui-empty>
```

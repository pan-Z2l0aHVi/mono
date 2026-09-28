---
'@greypan/web-ui': major
---

Change `web-ui-empty`'s `size` from the `'small' | 'medium' | 'large'` enum to a `number` in px, defaulting to `56`. Like `<web-ui-button>`'s `size` it is a px length, but where button keeps a `string` property, `web-ui-empty` now takes a plain `number`. It means the icon container edge length; the default glyph is `round(size * 3 / 7)`, so `56` renders the same 24px glyph as the old `medium` tier. The internal `--wui-internal-empty-icon-radius` default also moves from `16px` to `18px`.

**Breaking changes:**

- The exported `EmptySize` type is removed; the attribute is a plain number. Values that are not finite positive numbers (`NaN`, `±Infinity`, `0`, negatives) fall back to the default `56` instead of the old `'medium'`.
- `size` no longer scales `min-height`, `padding`, title/description font size, or block spacing — the `:host([size='small'])` and `:host([size='large'])` rules are gone and every instance uses the former `medium` metrics. Override the `--wui-empty-*` custom properties for those. `--wui-empty-icon-size` still takes precedence over `size` for the icon container.

**Migration:** `small` → `40`, `medium` → `56`, `large` → `72`.

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

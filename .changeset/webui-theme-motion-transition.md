---
'@greypan/web-ui': major
---

Remove the `transition` prop from `<web-ui-theme>`; whether an appearance change plays the View Transitions reveal is now decided by the existing `motion` prop alone (issue #156).

**Breaking:** the `transition` boolean attribute/property no longer exists. Writing it is a silent no-op instead of enabling the reveal, and the reveal is no longer opt-in: a theme scope animates by default now.

The three `motion` tiers own the decision:

- `motion="full"` always plays the circular reveal.
- `motion="reduced"` applies the new appearance immediately, with no reveal.
- `motion="system"` (the default) follows `prefers-reduced-motion`.

Everything else about the reveal is unchanged: a root theme reveals the whole page, a nested theme reveals only its own capture box, the origin is the last pointer-down position (falling back to the theme box or viewport center), the two directions are reversed, and unsupported browsers, reduced-motion scopes, zero durations and an in-flight request still commit the new appearance immediately. The window listeners that record the reveal origin are registered for as long as a theme is connected, instead of only while `transition` was set.

Migration:

```html
<!-- before: reveal opt-in through transition, motion left at its default -->
<web-ui-theme appearance="light" transition></web-ui-theme>
<!-- after: same reveal, motion="system" is now the switch -->
<web-ui-theme appearance="light"></web-ui-theme>

<!-- before: no reveal, because transition was absent -->
<web-ui-theme appearance="light"></web-ui-theme>
<!-- after: still no reveal, but it has to be stated -->
<web-ui-theme appearance="light" motion="reduced"></web-ui-theme>

<!-- before: transition forced the reveal on, motion kept it out of the way -->
<web-ui-theme appearance="light" transition motion="full"></web-ui-theme>
<!-- after: motion="full" is the whole switch -->
<web-ui-theme appearance="light" motion="full"></web-ui-theme>
```

The one combination that loses a distinct meaning is `transition` together with `motion="reduced"`: it never animated, and `motion="reduced"` on its own now describes it exactly, so dropping `transition` is the whole migration there.

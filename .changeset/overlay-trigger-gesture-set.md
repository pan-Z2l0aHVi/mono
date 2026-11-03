---
'@greypan/web-ui': minor
---

Make `trigger` a space-separated **set of gestures** on `<web-ui-popover>` and give `<web-ui-tooltip>` the same property. `trigger="hover focus"` accepts the pointer and the keyboard at once, so a component no longer has to pick one gesture. The modes are `click`, `hover`, `focus` and `manual`; unknown tokens are dropped, duplicated tokens count once, and a value that names no known gesture falls back to the component default — `click` for popover, `hover focus` for tooltip. `manual` anywhere in the value makes the whole value `manual`, because its contract is "no gesture moves this overlay".

Each gesture attaches its own listeners, so dropping it from the value removes the behavior: `hover` is the only mode that reads `show-delay` / `hide-delay`, `focus` opens on `:focus-visible` and closes once focus leaves the trigger and the panel, `click` toggles on the trigger and closes on a click outside, and `manual` accepts no automatic close — it still swallows Escape so the key does not reach an outer overlay. Escape is arbitrated by the overlay stack and is not mode-gated otherwise. A value naming a single gesture keeps its existing contract, including the popover defaults of closing on outside click and on losing focus.

`trigger` reads as `string` rather than a fixed union, and the property channel also takes an array of modes (`:trigger="['hover', 'focus']"`), which is how frameworks bind a set without writing the joined string.

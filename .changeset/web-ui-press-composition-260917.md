---
'@greypan/web-ui': patch
---

Finish the shared pressed composition of `switch`, `segmented` and `slider`: the pressed/dragged indicator of `segmented` and the pressed thumb of `slider` no longer paint a glass fill, so all three now render only the inset highlight stack and read as one flat lift.

- The release that flattened their pressed and dragging shadows to a single `0 2px 20px rgb(0 0 0 / 0.2)` layer described all three as sharing the same pressed composition, but `segmented` and `slider` still painted `background-color: var(--wui-color-surface-glass, …)`. Only `switch` had actually been moved to `transparent`.
- With the fill gone, the enlarged `scale(1.5)` indicator is a pure glass highlight over whatever sits behind it, matching the switch thumb's press state.
- CSS only; no API, token or event change.

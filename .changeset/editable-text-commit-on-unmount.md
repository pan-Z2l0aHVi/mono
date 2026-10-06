---
'@greypan/web-ui': minor
---

Add `commit-on-unmount` to `web-ui-editable-text` so an open editing session can end by committing when the element is unmounted.

Measured on Chromium and WebKit while scoping this, and the two engines **disagree** — which is the reason the property is worth having:

- Chromium dispatches `blur` on the editing layer when a component being edited is removed, so a plain commit already happens today. `blur` and the `change` it triggers land synchronously _after_ the unmount callback has run, so the commit arrives after whatever state the caller updates in response to the removal.
- WebKit (Safari, iOS) dispatches no `blur` at all: with the default `false` nothing is committed and the draft is dropped along with the element.
- Gecko (Firefox) is unverified — no Firefox build would start on the machine this was measured on, so nothing is claimed for it. Treat it as unknown rather than as matching either engine above.

With `commit-on-unmount` set, the unmount itself ends an open session by committing — the draft becomes the new value, edit mode exits, and `change` is dispatched exactly once, reusing the same `_commitEditing` path as `Enter` and `blur` rather than introducing a third commit semantic. On Safari and iOS this is the only thing that preserves the draft; in Chromium it moves the commit ahead of the removal-driven `blur`, which then early-exits because edit mode is already off, so the two sources still yield exactly one `change`.

Two deliberate differences from the `blur` path: an unmount carries no user intent, so the commit only fires when the draft really differs from the baseline captured when editing began (no empty `change`); and a `disabled` or `readonly` element dispatches no commit, matching `_onBlur`. An existing draft is treated differently in those two states — under `disabled` it stays on the element, while under `readonly` it is genuinely lost, because `readonly` does not retract earlier input and no `blur` remains at unmount to commit it. That path is reachable (enter editing while editable, type, flip to `readonly`, unmount) and is not treated as a cancel, since cancelling means restoring the baseline and there is no focus or host to hand a result to at unmount; the user sees their typing disappear with neither `change` nor `cancel`.

The commit fires from the unmount callback, so `change` travels the composed path and reaches listeners on the component or any ancestor, including ancestors being unmounted in the same turn: dispatching does not require an ancestor to still be in the document. Listeners must not assume the component is still connected. This reach does not extend to an unmount React drives from its own render, which never reaches React's delegated event root — the same caveat that already applies to `cancel`. Setting `display: none` on an ancestor is not a removal and is not covered.

No new event type is introduced and the existing `change` / `cancel` signatures are untouched.

---
'@greypan/web-ui': patch
---

fix(web-ui): let a form-associated control actually leave the disabled state

Re-enabling a control left it looking and behaving disabled: `<web-ui-button disabled>` with `disabled` set back to `false` kept the shadow `<button>` disabled, dimmed at 40% opacity and unclickable, while the host property, the host attribute and the component's own disabled getter all read `false`. Only a forced re-render cleared it. Lit reflects `disabled` _after_ it renders, and the browser delivers `formDisabledCallback` synchronously inside that reflection, so the follow-up `requestUpdate()` landed while `isUpdatePending` was still true and Lit dropped it — no second render ever came. `defineFormAssociation.setDisabled` now recognises that window and re-requests the update once the cycle ends, which covers every control that composes it (`web-ui-input`, `web-ui-textarea`, `web-ui-select`, the group controls and the rest), not just the button.

`web-ui-button` also stops mirroring the state on its own: it composes the same shared form-association lifecycle instead of holding a private `ElementInternals` and `_formDisabled` copy, so the timing rule lives in one place. Its form behaviour is unchanged — it still owns an outer form for `submit`/`reset` forwarding and contributes no value to `FormData`.

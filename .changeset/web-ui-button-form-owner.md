---
'@greypan/web-ui': patch
---

fix(web-ui): let `web-ui-button` drive its outer native form

`type="submit"` and `type="reset"` now forward through the component host's form owner after the composed `click` event finishes (on the next task), so an unprevented activation submits or resets the owning `<form>` while a `preventDefault()` on the click still cancels it. The host declares `static formAssociated = true` and reads its live owner from `ElementInternals`; the rendered button remains in Shadow DOM without a form owner of its own, so `SubmitEvent.submitter` is `null` and the button contributes no value to `FormData`.

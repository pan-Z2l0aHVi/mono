---
'@greypan/web-ui': patch
---

fix(web-ui): stop `web-ui-context-menu` from dimming slotted content while disabled

Setting `disabled` on `<web-ui-context-menu>` dropped everything a consumer put in the default slot to 40% opacity and switched the cursor to `not-allowed`. In `apps/interweave` that turned an empty library list into unreadable grey: the heading, its description and the icon wells all faded together.

`disabled` only suppresses menu behaviour — `contextmenu`, `openAt()` and the ContextMenu key all return early, so no menu is ever rendered. There is no menu surface of its own to dim, and the only thing a host-level `opacity` could reach was the consumer's own trigger content. Disabling the right-click menu is not the same as disabling the trigger, so the host rule is gone. Consumers that want a visibly disabled state now render it themselves, which both demo apps already did.

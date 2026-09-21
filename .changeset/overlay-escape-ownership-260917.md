---
'@greypan/web-ui': minor
---

Escape now closes only the innermost open overlay.

Previously every overlay component listened for Escape on its own — popover on `document`, select and autocomplete on the host, dropdown and context-menu through `handleMenuKeyboard`, drawer on its native `<dialog>` — with no shared notion of which one was innermost. Pressing Escape with a select open inside a drawer therefore closed the _outer_ drawer and left the select open: the inner panel is portalled into the drawer's `<dialog>`, so the host-level listener never saw the key, while the drawer's own guard only looked for `HTMLDialogElement` on the composed path and missed the portalled panel.

Escape is now arbitrated by a single shared owner:

- One `document`-level capture listener resolves the innermost open overlay and closes only that one. Because it runs in the capture phase, `stopPropagation()` keeps component-level handlers from closing a second overlay.
- `preventDefault()` also suppresses the native `<dialog>` close request, so `web-ui-dialog` — which previously relied on the `cancel` event — is covered by the same path.
- Innermost is resolved against `overlayComposition`'s logical tree, not the event path. That matters: with focus parked in the drawer while a listbox is open, the event path only reaches the drawer, and a path-based rule would again close the outer layer.
- Unrelated sibling overlays (neither containing the other) fall back to open order, so the most recently opened one closes.
- `controlled` and `no-escape-close` are preserved: components keep expressing their own close semantics, and `open-change` still goes through the same user-change channel.

The public API and event contract are unchanged.

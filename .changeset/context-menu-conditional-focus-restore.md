---
'@greypan/web-ui': patch
---

Fix `web-ui-context-menu` so closing it no longer steals focus back from a target the caller has already focused.

On close the menu unconditionally called `focus()` on whatever was focused when it opened, after the exit transition had finished. When a menu item's action opened something that takes focus — an inline rename editor, for example — the caller focused it in a microtask, while the unconditional restore ran later in a macro task and pulled focus back to the pre-open element. That blurred the new editor, and because `web-ui-editable-text` commits on blur, the still-unchanged value was submitted as a fresh edit.

The restore is now conditional: it runs only while the menu still holds focus. If focus has moved to a live element outside the menu, the menu leaves it alone. Ownership is read with `:focus-within` rather than `Node.contains(document.activeElement)` — the panel is mounted inside the overlay container's shadow root and menu items focus a control inside their own shadow root, so browsers report the shadow host and `contains` never matches.

Normal restore is unchanged: Escape, keyboard navigation and outside clicks that leave nothing focused all still return focus to the element that had it when the menu opened. No public API is added; the behaviour is now documented in the README.

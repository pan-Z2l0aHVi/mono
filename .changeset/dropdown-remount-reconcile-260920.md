---
'@greypan/web-ui': minor
---

Reconcile an open dropdown when its host is re-attached, so a remount while open no longer leaves the control stuck in an un-closable open state (issue #120).

`disconnectedCallback` tears the panel down and migrates the menu items back to the host, but `open` is a public property and is not rewritten by an unmount. Lit does not record `changedProperties` while a host is disconnected, so after a remount `updated()` never hits the `open` branch again: the host kept reflecting `open` and `aria-expanded="true"` while there was no layer for Escape or an outside click to close. A framework that re-creates the host while it is open — a `key` change, a `v-if` around an already-open menu, a list re-render — landed there permanently.

- Opening is now reconciled through a single entry point shared by the `open` branch of `updated()` and `connectedCallback()`, so panel, scroll lock, outside-click guard, hover bindings and menu focus converge on the same state on both paths.
- On re-attach the menu only takes focus back when focus has nowhere to go — i.e. it fell back to `document.body`/`documentElement`. If the user has since focused something else, the panel is rebuilt without stealing that focus.
- A closed host that is re-attached stays closed: reconciliation runs only while `open` is set, and only for a re-connect (`hasUpdated`), so the first connect remains `updated()`'s responsibility.
- Only the root layer is rebuilt; submenu panels opened from it are not resurrected, matching what a fresh open does.

The public API, the `open` property and the `open-change` contract are unchanged.

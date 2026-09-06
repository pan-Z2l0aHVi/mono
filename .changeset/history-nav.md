---
'@greypan/browser-kit': minor
---

Add `history-nav` module: track whether the user can go back/forward in real browser history, exposing a read-only subset of the Navigation API.

**`defineHistoryNav(options?)`:**

- Read-only subset: `canGoBack` / `canGoForward` / `currentEntry` / `entries()` / `currententrychange`
- Tracks `history.pushState` / `replaceState` via side-table patch (no state injection) and `popstate` traversals with an entry id/key stack
- Persists through `sessionStorage` (reuses the `storage` module) with `namespace` isolation; degrades to in-memory when storage is blocked
- Idempotent singleton with `dispose()` to restore the patched `history` methods

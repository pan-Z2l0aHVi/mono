---
'@greypan/web-ui': patch
---

Internal refactor: move tooltip and popover trigger gesture wiring (event routing, show/hide timers, instant-open bookkeeping, outside-click handling) into a shared `defineTriggerGestures` module, and unify the inside-host click predicate across tooltip, popover, select, autocomplete, and the menu outside-click guard. No public API or behavior change.

---
'@greypan/doc-demo-kit': patch
---

The demo sidebar nav items switch their background instantly between hover, pressed and selected states. `NAV_ITEM_CLASS` no longer carries a `transition`, so the active highlight lands on click without a fading trail.

The copy feedback of the shared codeblock controller now survives React StrictMode's setup → cleanup → setup cycle: `dispose()` only cancels the pending idle timer instead of detaching every listener, so a copy keeps publishing its success state after the simulated remount.

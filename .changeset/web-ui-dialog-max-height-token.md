---
'@greypan/web-ui': patch
---

Make the documented `--wui-dialog-max-height` custom property actually control `<web-ui-dialog>`. It has been listed in both READMEs as public API, but the dialog stylesheet never referenced it and hardcoded `max-height: min(90vh, 90dvh)` instead, so every consumer override was silently discarded. Consumers currently overriding it — the `AddDialog` and `RestoreDialog` in the Interweave frontend, which declare `min(82vh, 560px)` and `min(90vh, 640px)` — will now see those dialogs render at their declared height instead of the hardcoded viewport height.

Consumers that do not set the token are unaffected: the fallback resolves to the same value as before. The `dvh` enhancement moved into an `@supports (height: 100dvh)` block rather than staying a second plain declaration. That matters because a `var()` fallback is substituted at computed-value time: on an engine without `dvh` support the substituted value would be invalid at computed-value time and `max-height` would fall back to `none`, which is worse than not having a token at all. The plain two-declaration form discarded the unsupported declaration at parse time instead.

Both READMEs also now state the real default, `min(90vh, 90dvh)`, rather than `90vh`.

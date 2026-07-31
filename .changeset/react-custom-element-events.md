---
'@greypan/web-ui': minor
---

Correct React Custom Element event typings to use exact JSX keys such as `onopen-change` and `ontoast-close`.
The previously generated camel-cased keys such as `onOpenChange` did not match the event dispatched at runtime.

---
'@greypan/md-to-meta': minor
---

Export the generated-HTML contract (`LINE_NUMBER_CLASS`, `MDM_*` class constants, `lineCountOf`) from the new `./contract` subpath so hosts consume typed symbols instead of hard-coded class names, and add a headless `md-to-meta` bin (`md-to-meta check|write <app-dir>`) that owns the config import once; the repo check/regenerate scripts become thin forwarders and the Vite plugin resolves its check/write mode through an explicit parameter.

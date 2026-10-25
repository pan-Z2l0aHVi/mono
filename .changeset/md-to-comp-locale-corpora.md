---
'@greypan/md-to-comp': minor
---

Generate demo corpora per locale: each output now names the locale it renders, reading `<name>.CN.md` as the Chinese source and `<name>.md` as the translation.
Adds a `requireDemo` option that fails generation when an anchored sample would not produce a demo file.

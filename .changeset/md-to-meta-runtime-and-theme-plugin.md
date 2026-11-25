---
'@greypan/md-to-meta': minor
---

Add a browser runtime subpath `./runtime` and a theme plugin for runtime consumers, and make the parser's content hash and highlighter injectable.

`parseMarkdown` gains optional `hash` (content-addressing for code files; generation keeps pinning Node sha256, default is now a pure-JS 48-bit hash so browser callers never touch `node:crypto`) and `highlight` options (generation default unchanged, still throws on mismatch). The new `highlightRuntime` shares the generation dual-theme + line-number pipeline but falls back to plain text on any mismatch, unknown language, or language outside the caller's `allowedLangs`. `mdmThemePlugin({ darkSelector })` serves `virtual:mdm-theme.css` from the same `renderCss` that generation writes, so runtime consumers get identical `.mdm-*` styling at build time without hand-written CSS or runtime `document.head` injection. A module-graph test pins that `./runtime` never reaches `node:` builtins; generated artifacts are byte-identical.

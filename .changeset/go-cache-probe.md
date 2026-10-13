---
'@greypan/web-ui': patch
---

chore: add Go cache probe to share persistent cache across contexts

- .mise.toml: GOCACHE now probes default cache directories (macOS ~/Library/Caches/go-build, Linux ~/.cache/go-build) at runtime; falls back to $TMPDIR/greypan/go-build only when write fails
- herdr pane, claude/opencode threads, and manual shell now share the same persistent Go build cache (~800 MB)
- codex threads hit fallback as designed (sandbox only allows worktree + /tmp writes), no regression
- CI unaffected: no HERDR_ENV means template renders empty, Go uses platform default

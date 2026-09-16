---
---

Toolchain bump, no package contract change: `vite-plus` and the `vite` alias (`@voidzero-dev/vite-plus-core`) 0.3.0 -> 0.3.2, and Wails v3 3.0.0-beta.12 -> 3.0.0-beta.22 across `@wailsio/runtime`, the `wails3` CLI pin in `.mise.toml`, and `apps/interweave/go.mod`.

The three Wails pins move together on purpose: the JS runtime, the CLI that generates `frontend/bindings`, and the Go module must not drift. `.github/scripts/verify-wails.sh` only checks CLI against `.mise.toml`, so runtime and `go.mod` need to be kept in step by hand.

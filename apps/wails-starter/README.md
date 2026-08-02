# Wails Starter

Wails 3 desktop starter using a Go backend and a Vue WebView frontend.

## Commands

Run commands from the repository root:

```bash
mise install
pnpm dev:wails-starter
pnpm --filter @greypan/wails-starter build
pnpm --filter @greypan/wails-starter build:macos
pnpm --filter @greypan/wails-starter build:windows
```

Native artifacts are emitted to `apps/wails-starter/bin/`:

- On macOS, `build` creates both release artifacts below.
- `build:macos` creates `wails-starter.dmg` for macOS arm64.
- `build:windows` creates `wails-starter.exe` for Windows x64.
- On Windows, `build` creates `wails-starter.exe`; on Linux, it runs the WebView frontend build for CI validation without producing a desktop release artifact.

The WebView uses workspace dependencies from `packages/` through
`apps/wails-starter/frontend/`.

## Wails APIs

Use the official Wails 3 Chinese documentation for Wails APIs and configuration:

https://v3.wails.io/zh-cn/quick-start/installation/

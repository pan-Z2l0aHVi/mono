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

`pnpm dev:wails-starter` starts Wails and watches every buildable workspace
dependency of the WebView frontend. Adding a local workspace dependency does
not require changing the command. Restart the command after changing Vite
plugins, TypeScript configuration, or the workspace dependency graph.

## Releases

Desktop releases use Changesets without publishing this private workspace to npm.
Add a Changeset for `@greypan/wails-starter`; the Version Packages pull request
synchronizes the Wails build metadata. After that pull request merges to `main`,
GitHub Actions builds both native targets and creates a
`wails-starter-vX.Y.Z` GitHub Release containing the DMG, EXE, and SHA-256
checksums. The initial artifacts are not formally signed.

## Wails APIs

Use the official Wails 3 Chinese documentation for Wails APIs and configuration:

https://v3.wails.io/zh-cn/quick-start/installation/

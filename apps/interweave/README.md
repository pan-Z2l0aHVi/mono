# Interweave

Wails 3 desktop application using a Go backend and a Vue WebView frontend.

## Product baseline

The approved product scope and domain vocabulary are documented in
[`docs/product.md`](docs/product.md). Read it before changing Interweave's
product behavior, resource model, tag semantics, Map, or MCP roadmap.

## Commands

Run all commands from the repository root. Interweave is a private pnpm workspace
application: dependency installation, workspace-package builds, CI and release
orchestration are owned by the root pnpm and Turborepo commands.

```bash
mise install
pnpm install

# Start the Wails host after Turbo has built its WebView workspace dependencies.
pnpm dev:interweave

# Build the complete monorepo graph (the CI build entry point).
pnpm build

# Manually verify a native desktop target with the same preparation used in the
# Wails CI workflows.
pnpm exec turbo build --filter=@greypan/interweave-frontend^...
pnpm --filter @greypan/interweave build:macos
pnpm --filter @greypan/interweave build:windows
```

Do not install or build `apps/interweave/frontend` as an isolated npm, Yarn or
Bun project: it consumes workspace packages from `packages/*`. The app-local
scripts remain Turborepo targets and native packaging primitives, not a separate
build, CI or release pipeline.

Native artifacts are emitted to `apps/interweave/bin/`:

- On macOS, `build` creates both release artifacts below.
- `build:macos` creates `interweave.dmg` for macOS arm64.
- `build:windows` creates `interweave.exe` for Windows x64.
- On Windows, `build` creates `interweave.exe`; on Linux, it runs the WebView frontend build for CI validation without producing a desktop release artifact.

The WebView uses workspace dependencies from `packages/` through
`apps/interweave/frontend/`.

`pnpm dev:interweave` starts Wails and watches every buildable workspace
dependency of the WebView frontend. Adding a local workspace dependency does
not require changing the command. Restart the command after changing Vite
plugins, TypeScript configuration, or the workspace dependency graph.

## Releases

Desktop releases use Changesets without publishing this private workspace to npm.
Add a Changeset for `@greypan/interweave`; the Version Packages pull request
synchronizes the Wails build metadata. After that pull request merges to `main`,
GitHub Actions builds both native targets and creates a
`interweave-vX.Y.Z` GitHub Release containing the DMG, EXE, and SHA-256
checksums. The initial artifacts are not formally signed.

## Wails APIs

Use the official Wails 3 documentation for Wails APIs and configuration:

https://v3.wails.io/reference/overview/

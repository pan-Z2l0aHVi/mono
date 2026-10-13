# Interweave

Wails 3 desktop application using a Go backend and a Vue WebView frontend.

## Product baseline

There is no standalone product specification. Domain vocabulary is authoritative
in the "Interweave 产品与领域词汇" section of [`CONTEXT.md`](../../CONTEXT.md),
application-level boundaries and non-goals in [`AGENTS.md`](AGENTS.md), backend
and persistence decisions in
[ADR-0008](../../docs/adr/0008-interweave-backend-architecture.md) /
[ADR-0009](../../docs/adr/0009-interweave-sqlite-persistence-wal.md), and implemented
behavior in `backend/**` with its Go tests. Read them before changing Interweave's
product behavior, resource model, tag semantics, Map, or MCP roadmap.

## Commands

Run all commands from the repository root. Interweave is a private pnpm workspace
application: dependency installation, workspace-package builds, CI and release
orchestration are owned by the root pnpm and Turborepo commands.

```bash
mise install
pnpm install

# Start the Wails host; Turbo builds its WebView workspace dependencies first
# (`dev` dependsOn `^build`) and watches them alongside Wails.
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

- `build` is the developer default and only builds for the host platform:
  - On macOS it creates `interweave.app` for the host architecture (native
    binary, `.app` bundle, ad-hoc signature) and does **not** package a `.dmg`.
  - On Windows it creates `interweave.exe`; on Linux it runs the WebView
    frontend build for CI validation without producing a desktop artifact.
- `build:macos:app` creates `interweave.app` for the host architecture —
  identical to what `build` does on macOS.
- `build:macos` creates `interweave.dmg` for macOS arm64.
- `build:windows` creates `interweave.exe` for Windows x64.

`build:macos` and `build:windows` are the release shapes: the `macos-14` and
`windows-latest` entries of the `wails-verify.yml` and `wails-release.yml`
matrices invoke exactly these two scripts, each on its own native runner. The
developer default skips the cross-platform and `.dmg` packaging work because no
CI job runs the **macOS branch** of the aggregate script: `ci.yml` does run the
aggregate `build` on `ubuntu-latest`, where it takes the `build:frontend` branch
and compiles no Go. `scripts/ci-topology.test.mjs` asserts that premise, so a
future change that breaks it says so instead of quietly shipping. Run
`build:macos` or `build:windows` explicitly when you need the artifact CI would
ship.

The WebView uses workspace dependencies from `packages/` through
`apps/interweave/frontend/`.

`pnpm dev:interweave` starts Wails and watches every buildable workspace dependency of the WebView
frontend. Adding a local workspace dependency does not require changing the command. Restart the
command after changing Vite plugins, TypeScript configuration, or the workspace dependency graph.

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

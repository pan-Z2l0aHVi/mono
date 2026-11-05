# Interweave

A desktop app for collecting and revisiting resources you want to find again. It is built with Wails 3: a Go backend and a Vue WebView frontend.

Interweave references external content without taking it over. It does not copy, move, rename, or delete your files or web pages, and removing a resource only removes the library record. It has no accounts, cloud sync, full-disk scanning, or background availability polling.

## What it does

- **Resources**: each resource is one thing you want to keep, with its own title, short note, and semantic tags.
- **Sources**: a resource points at one or more external entries, such as a local file or a URL. One source is marked as preferred.
- **Tags**: flat content labels you add per resource. Tags have no hierarchy, aliases, or global management panel.
- **Map**: a browsing view derived from resources and their shared tags, for finding themes, bridges, and isolated items.

Domain vocabulary and product boundaries live in [`AGENTS.md`](./AGENTS.md). Backend and persistence decisions are in [ADR-0008](../../docs/adr/0008-interweave-backend.md) and [ADR-0009](../../docs/adr/0009-interweave-sqlite.md).

## Prerequisites

- Node.js and pnpm via `mise`
- Go toolchain
- Wails 3 CLI

## Commands

Run all commands from the repository root. Interweave is a private pnpm workspace app; dependency installation, workspace builds, and release packaging are owned by the root pnpm and Turborepo commands.

```bash
mise install
pnpm install

# Start the Wails host and watch its WebView workspace dependencies
pnpm dev:interweave

# Build the local monorepo graph
pnpm build
```

Build a native desktop target directly:

```bash
pnpm exec turbo build --filter=@greypan/interweave-frontend^...
pnpm --filter @greypan/interweave build:macos
pnpm --filter @greypan/interweave build:windows
```

Do not install or build `apps/interweave/frontend` as a standalone npm, Yarn, or Bun project. It consumes workspace packages from `packages/*` and is driven by the root commands.

## Native artifacts

Native builds are written to `apps/interweave/bin/`:

- `build`: builds only for the host platform. On macOS it produces `interweave.app` for the host architecture, with no `.dmg`. On Windows it produces `interweave.exe`. On Linux it validates the WebView build without producing a desktop artifact.
- `build:macos:app`: produces `interweave.app` for the host architecture.
- `build:macos`: produces `interweave.dmg` for macOS arm64.
- `build:windows`: produces `interweave.exe` for Windows x64.

`build:macos` and `build:windows` produce the release artifacts. Release builds are not formally signed.

## Releases

Add a Changeset for `@greypan/interweave`. Once the Version Packages pull request merges to `main`, GitHub Actions builds both native targets and creates an `interweave-vX.Y.Z` GitHub Release with the DMG, EXE, and SHA-256 checksums.

## Wails APIs

Use the official Wails 3 documentation:

https://v3.wails.io/reference/overview/

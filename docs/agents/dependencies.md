# Dependency Changes

Read this guide only after the user has explicitly authorized adding, removing, or changing a dependency.

## Placement

| Dependency type                            | Location                                                |
| ------------------------------------------ | ------------------------------------------------------- |
| Shared toolchain and Vite/Rolldown plugins | Root `devDependencies`                                  |
| Framework-specific test and type tooling   | Owning package `devDependencies`                        |
| Shared test infrastructure                 | Root `devDependencies`                                  |
| Runtime dependency                         | Owning package `dependencies`                           |
| Consumer-supplied dependency               | Owning package `peerDependencies` and `devDependencies` |

Use `catalog:` for managed dependency versions. A peer dependency may use a wider explicit range only when consumer compatibility requires it; optional peers need `peerDependenciesMeta.optional: true`.

Keep `@wailsio/runtime` pinned to a published version verified with the configured Wails CLI and Go module. Wails alpha version numbers do not necessarily match across the Go and npm release streams.

Changesets versions the private `@greypan/wails-starter` workspace so desktop releases share the monorepo's version review flow. It must remain private and is never published to npm; `privatePackages.tag` remains disabled because the Wails workflow creates its binary release tag only after both native builds succeed. Its nested `@greypan/wails-starter-frontend` WebView package remains a pnpm workspace for local dependencies but is ignored by Changesets because it has no independent release lifecycle.

Vite type-system plugins belong in root `devDependencies` to avoid divergent pnpm resolution. Framework-bound tools belong with the framework package.

## pnpm policy

The workspace uses `catalogMode: prefer`. Keep the existing `overrides` and `peerDependencyRules` policy unless the user explicitly authorizes changing dependency-management behavior.

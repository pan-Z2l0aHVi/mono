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

Vite type-system plugins belong in root `devDependencies` to avoid divergent pnpm resolution. Framework-bound tools belong with the framework package.

## pnpm policy

The workspace uses `catalogMode: prefer`. Keep the existing `overrides` and `peerDependencyRules` policy unless the user explicitly authorizes changing dependency-management behavior.

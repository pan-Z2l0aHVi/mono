# AGENTS.md

## Document maintenance

When your changes fall into any category below, update the corresponding docs:

| Change category       | Where to update                                                 | Trigger                                                                            |
| --------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Build scripts/flow    | `docs/agents/build.md`; also `AGENTS.md` for top-level commands | Changes to `package.json` scripts, `vite.config.ts` build config, turbo.json tasks |
| Package add/rename    | `docs/agents/build.md`                                          | Adding/removing/renaming a directory under `packages/` or `apps/`                  |
| Externalization       | `docs/agents/build.md`                                          | Changes to `vite.config.ts` `rollupOptions.external`                               |
| CI/CD workflow        | `docs/agents/build.md`                                          | Changes to files under `.github/workflows/`                                        |
| Code quality tools    | `docs/agents/linting.md`                                        | Changes to linter, formatter, stylelint, cspell config                             |
| Dependency management | `docs/agents/dependencies.md`                                   | Changes to `pnpm-workspace.yaml` catalog, changeset config                         |
| Runtime/toolchain     | This file (Toolchain)                                           | Changes to `.mise.toml`, `package.json` engines                                    |
| Test config           | `docs/agents/testing.md`                                        | Changes to `vite.config.ts` test config, test framework                            |
| Coding standards      | `.agents/rules/code-style.md`, affected package `AGENTS.md`     | Changes to naming, type safety, architecture patterns                              |
| Web UI components     | `packages/web-ui/AGENTS.md`, `docs/agents/web-ui.md`            | Changes to Lit components in `packages/web-ui`                                     |
| Icon system           | `docs/adr/0008-icon-system.md`, `docs/agents/web-ui.md`         | Changes to icon manifest, generator, or icon public API                            |
| Commit conventions    | `docs/agents/commit.md`                                         | Changes to commitlint config, commit workflow                                      |

Rules:

1. Read the relevant docs before making changes to confirm current documentation
2. Update documentation immediately after changes, never postpone
3. Check the mapped document first. Ask the user only if the scope remains ambiguous or needs unrelated documentation expansion.
4. Documentation updates should land in the same commit as code changes

---

## Repo overview

pnpm monorepo (`apps/**`, `packages/**`) using Turborepo. Packages published under `@greypan/*` to npm. Apps are private demos, never published.

## Toolchain

- **Package manager**: pnpm 10.33.0 (enforced via `engine-strict=true` in `.npmrc`)
- **Runtime**: Node 24 (managed via mise — run `mise install` if node/pnpm/go are missing; `engines` allows >=24.18.0)
- **Desktop CLI**: Wails 3 CLI 3.0.0-alpha2.122 (managed through mise's Go backend; use a published npm runtime version verified as compatible with this CLI and Go module)
- **Build/dev/lint/test/format**: all delegated to `vite-plus` (`vp`) — a Vite wrapper. Most per-package scripts call `vp build`, `vp pack`, `vp check`, `vp test run`, `vp lint`, `vp fmt`
- **Orchestration**: Turborepo (`turbo.json`) — `build` and `test` tasks depend on `^build` (upstream packages build first). Demo commands build upstream packages once, then use `turbo run dev` to start the persistent package-level watchers without Turbo's repository watcher.
- **Desktop artifacts**: `.github/workflows/wails-verify.yml` validates `wails-starter` natively on pull requests and uploads a DMG and EXE as GitHub Actions artifacts. `.github/workflows/wails-release.yml` rebuilds both installers from a merged Changesets version PR and creates the GitHub Release with SHA-256 checksums.
- **Language**: TypeScript 6, ES modules only (`"type": "module"` everywhere)

## Key commands

| Command                                           | What it does                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| `pnpm install`                                    | Install all deps (frozen lockfile in CI)                              |
| `pnpm build`                                      | Build all packages in dependency order                                |
| `pnpm test`                                       | Run all tests                                                         |
| `pnpm commit`                                     | Interactive conventional commit via cz-git                            |
| `bash scripts/commit.sh <type> <scope> <subject>` | Non-interactive commit (useful for agents)                            |
| `pnpm dev:react-web-ui-demo`                      | React demo with upstream build and package watchers                   |
| `pnpm dev:vue-web-ui-demo`                        | Vue demo with upstream build and package watchers                     |
| `pnpm run check:code`                             | Check formatting, lint, and types                                     |
| `pnpm run fix:code`                               | Auto-fix formatting/lint issues, then type-check                      |
| `pnpm clean`                                      | Remove generated outputs and caches, preserving Wails build templates |
| `pnpm clean --full`                               | Also remove `node_modules` and lockfile                               |
| `pnpm publish:new <package-dir>`                  | First publish of a new package (1.0.0)                                |
| `pnpm release:version`                            | Apply Changesets versions; synchronize Wails metadata only if changed |
| GitHub Actions `Version Packages`                 | Create or update a Changesets version pull request                    |
| GitHub Actions `Publish npm Packages`             | Build and publish public packages after a version PR merge            |
| GitHub Actions `Verify Wails Desktop`             | Build and upload Wails macOS/Windows validation artifacts             |
| GitHub Actions `Release Wails Desktop`            | Build and publish Wails installers after a version PR merge           |

## Build details

Read [docs/agents/build.md](docs/agents/build.md) before changing package scripts, Vite/Turbo configuration, package structure, externalization, or release flow. It contains the package graph, TypeScript profiles, build modes, and CI/release architecture.

## Agent constraints

Agents must follow these rules without exception:

- **Do not modify registry or mirror configuration in `.npmrc` or `.mise.toml`.**
- **Do not add npm dependencies, including devDependencies, unless explicitly requested by the user.**
- **Do not modify CI/CD configuration under `.github/workflows/` unless explicitly requested by the user.**
- **Do not modify `go.mod` or `go.sum`; the Go toolchain is only for auxiliary tooling, not core project code.**
- **Do not run `npm publish` directly; always use `pnpm publish:new`.**
- **Do not modify Git configuration, including `.gitconfig` and global Git config.**
- **Do not bypass Git hooks with `--no-verify` or `--no-gpg-sign`.**

## Generated / ignored files

These files are auto-generated and should not be edited manually:

- `**/routeTree.gen.ts` — TanStack Router route tree
- `**/auto-imports.d.ts` — auto-import type declarations
- `apps/wails-starter/frontend/bindings/**` — Wails 3 bindings
- `**/__screenshots__/` — Vitest browser mode test failure screenshots
- `**/.vitest-attachments/` — Vitest browser mode test attachments

They are excluded from linting, formatting, and spell-check.

## Other gotchas

- `.npmrc` uses an npmmirror registry (`registry=https://registry.npmmirror.com`). CI overrides this to the official registry.
- The `prepare` script runs `vp config` — this sets up vite-plus internal config on install.
- Go toolchain is also managed via mise (used by some tooling, not by the JS packages directly).

## Documentation

- `docs/agents/` — On-demand operating guides for build, testing, linting, package workflows, and issue tracking
- `docs/adr/` — Architecture Decision Records for significant technical decisions
- `docs/prd/` — Product Requirements Documents
- `docs/design/` — Design references, including screenshots and CSS implementations
- `CONTEXT.md` — Project architecture overview, including ADR index, package boundaries, and technical principles

## Agent reference docs

Read these as needed; they are not required for every conversation:

| File                                    | Purpose                                           | When to read                                                                     |
| --------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `docs/agents/testing.md`                | Test infrastructure, commands, and browser mode   | When test execution or configuration is unclear                                  |
| `docs/agents/linting.md`                | Toolchain, formatter, linter, and stylelint usage | When linting or formatting commands are unclear                                  |
| `docs/agents/issue-tracker.md`          | GitHub issue operations and `gh` CLI usage        | When creating, querying, or updating issues                                      |
| `docs/agents/domain.md`                 | Code exploration conventions, ADRs, and glossary  | When exploring an unfamiliar code area                                           |
| `docs/agents/build.md`                  | Build modes, package graph, externalization, CI   | When changing build, package, or release flow                                    |
| `docs/agents/web-ui.md`                 | Web UI implementation, tokens, overlays, testing  | When changing `packages/web-ui`                                                  |
| `docs/agents/dependencies.md`           | Dependency placement and catalog policy           | After dependency changes are authorized                                          |
| `docs/agents/commit.md`                 | Commit message and execution workflow             | After a commit is authorized                                                     |
| `docs/agents/review.md`                 | Review scope and reporting                        | When reviewing code                                                              |
| `.agents/skills/agent-browser/SKILL.md` | Browser automation CLI (manual invocation only)   | When the user invokes `/agent-browser` (e.g. chrome-devtools MCP is unavailable) |

## Instruction scopes

`AGENTS.md` and `.agents/rules/` define repository-wide constraints. Package-level `AGENTS.md` files add constraints only for changes inside that package. Files under `docs/agents/` are on-demand guides; read the matching guide before the scoped task.

### Web Platform API verification

When implementing against a Web Platform API that is unfamiliar, recently introduced, or has ambiguous cross-browser behavior, verify the API semantics and browser behavior through the MDN MCP server (`mdn`) before implementing — do not rely on model memory. This includes checking MDN compatibility data (BCD) when browser support is uncertain.

### Browser verification

Changes involving UI, UX, interaction, responsive behavior, or browser runtime behavior must be verified in a real browser. Use the chrome-devtools MCP as the primary layer when it is available — navigate to the local demo, interact with components, inspect console/network, and take screenshots. The `agent-browser` skill is a manual alternative: run it only when the user invokes `/agent-browser`, e.g. when MCP is unavailable or an isolated browser context is required.

What to verify per change type:

- **Interaction**: primary pointer interactions, keyboard operation, focus management, disabled states, close/cancel paths
- **Layout**: blank rendering, overflow, occlusion, misalignment, unexpected layout shifts (check desktop and mobile viewports)
- **Accessibility**: semantics, accessible names, keyboard reachability
- **Runtime**: console errors, page exceptions, behavior relying on browser features (jsdom is not a substitute)

Constraints:

- Before starting a local dev server, check whether the target port already has a responsive server for the required app. Reuse it when it is suitable; do not create a duplicate server merely because a verification task starts.
- Start a new server only when no suitable server is running, the existing one cannot serve the required current state, or an isolated environment is explicitly needed. Use an unused port in that case and record its exact PID.
- Only stop a server started by the current task. Never terminate a pre-existing server owned by the user or another task.
- When encountering a stale or unresponsive dev server on the target port, ask the user before killing it. Clean up only the servers started by the current task at the end of the session.
- Never attach to or control the user's existing Chrome session. Verify in the browser context owned by chrome-devtools MCP or `agent-browser`, isolated from the user's working Chrome.
- Ignore certificate errors only for local self-signed HTTPS demos; never relax certificate validation for external sites.
- Stop every dev server started for verification after it completes, unless the user asks to keep it running. Preserve or report the local URL for follow-up.

Fallback chain: chrome-devtools MCP → project browser-mode tests → component tests and HTTP/DOM checks. `agent-browser` is not part of the automatic chain — it runs only on manual invocation (`/agent-browser`). If no browser layer is available (MCP missing and no manual invocation), explicitly report why real-browser verification could not be completed and the resulting risk.

Final reports must state the verification URL, what was checked, and any gaps. Do not describe a successful build or passing jsdom tests as browser interaction verification.

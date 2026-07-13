# AGENTS.md

## Document maintenance

When your changes fall into any category below, update the corresponding sections of this document:

| Change category       | Sections to update                  | Trigger                                                                            |
| --------------------- | ----------------------------------- | ---------------------------------------------------------------------------------- |
| Build scripts/flow    | Build architecture, Key commands    | Changes to `package.json` scripts, `vite.config.ts` build config, turbo.json tasks |
| Package add/rename    | Package structure, Dependency graph | Adding/removing/renaming a directory under `packages/` or `apps/`                  |
| Externalization       | Externalization rules               | Changes to `vite.config.ts` `rollupOptions.external`                               |
| CI/CD workflow        | CI, Release                         | Changes to files under `.github/workflows/`                                        |
| Code quality tools    | Linting & formatting                | Changes to linter, formatter, stylelint, cspell config                             |
| Dependency management | Dependency management               | Changes to `pnpm-workspace.yaml` catalog, changeset config                         |
| Runtime/toolchain     | Toolchain                           | Changes to `.mise.toml`, `package.json` engines                                    |
| Test config           | Testing                             | Changes to `vite.config.ts` test config, test framework                            |

Rules:

1. Read the relevant sections before making changes to confirm current documentation
2. Update documentation immediately after changes, never postpone
3. If unsure whether a change requires documentation updates, **ask the user**
4. Documentation updates should land in the same commit as code changes

---

## Repo overview

pnpm monorepo (`apps/**`, `packages/**`) using Turborepo. Packages published under `@greypan/*` to npm. Apps are private demos, never published.

## Toolchain

- **Package manager**: pnpm 10.33.0 (enforced via `engine-strict=true` in `.npmrc`)
- **Runtime**: Node 24 (managed via mise — run `mise install` if node/pnpm/go are missing; `engines` allows >=24.18.0)
- **Build/dev/lint/test/format**: all delegated to `vite-plus` (`vp`) — a Vite wrapper. Most per-package scripts call `vp build`, `vp test run`, `vp lint`, `vp fmt`
- **Orchestration**: Turborepo (`turbo.json`) — `build` and `test` tasks depend on `^build` (upstream packages build first). `dev` task also depends on `^build` but is not cached and runs persistently.
- **Language**: TypeScript 6, ES modules only (`"type": "module"` everywhere)

## Key commands

| Command                                           | What it does                                  |
| ------------------------------------------------- | --------------------------------------------- |
| `pnpm install`                                    | Install all deps (frozen lockfile in CI)      |
| `pnpm build`                                      | Build all packages in dependency order        |
| `pnpm test`                                       | Run all tests                                 |
| `pnpm commit`                                     | Interactive conventional commit via cz-git    |
| `bash scripts/commit.sh <type> <scope> <subject>` | Non-interactive commit (useful for agents)    |
| `pnpm check:lockfile`                             | Verify lockfile has no duplicates             |
| `pnpm dev:react-app-demo`                         | Dev server for React app (with turbo watch)   |
| `pnpm dev:vue-app-demo`                           | Dev server for Vue app (with turbo watch)     |
| `pnpm run check:code`                             | Format + lint + type-check (what CI runs)     |
| `pnpm clean`                                      | Remove `dist/`, `.turbo/`, `.vite/`, `build/` |
| `pnpm clean --full`                               | Also remove `node_modules` and lockfile       |
| `pnpm publish:new <package-dir>`                  | First publish of a new package (1.0.0)        |

### Per-package commands

Each package has `build`, `test`, and usually `dev` (watch mode). Run with `pnpm --filter @greypan/<name> <script>`. Example: `pnpm --filter @greypan/js-kit test`.

All packages use sequential build: type-check first, then build. Libraries and Vue app use `vue-tsc --build && vp build`. React app uses `tsc -b && vp build`.

**Type-checker**: All packages (including non-Vue ones like `js-kit`, `browser-kit`) use `vue-tsc --build` for type-checking. React app uses `tsc -b`.

## Package structure

```
packages/
  js-kit          — JS utilities (base package, no workspace deps)
  browser-kit     — Browser utilities (depends on js-kit)
  test-kit        — Test infrastructure plugins for Vitest browser mode + MSW (depends on js-kit)
  web-ui          — Web components (Lit-based, depends on js-kit + browser-kit)
  unplugin-web-components — Unplugin for web components (depends on js-kit)
  vite-plugin-full-reload — Vite HMR plugin (depends on js-kit)
apps/
  react-app-demo  — React 19 + TanStack Router + Zustand (private)
  vue-app-demo    — Vue 3 + Vue Router + Pinia (private)
```

**Dependency graph**: `js-kit` is the leaf. `browser-kit` → `js-kit`. `test-kit` → `js-kit` (peer dep on `msw`). `web-ui` → both. Apps depend on the shared packages.

## Build architecture

### Library packages

- Use `vite.config.ts` with `lib` mode
- **`preserveModules: true`** for packages with sub-path exports (e.g., `js-kit`, `browser-kit`, `web-ui`)
- **Single-file output** (no `preserveModules`) for plugins and single-entry packages (e.g., `unplugin-web-components`, `vite-plugin-full-reload`)
- `.d.ts` files are generated by `vite-plugin-dts`

### Externalization rules

- **Workspace deps (`@greypan/*`) MUST be externalized** in `rollupOptions.external`. This is required for dev watch mode — without it, Rolldown fails to resolve workspace links on rebuild. It also prevents duplicate code in consumer bundles.
- **Third-party npm deps can be externalized or bundled** — depends on the package's design intent. If the package is designed to be consumed with zero config, bundle them. If the package expects consumers to install peer dependencies, externalize them.
- **Node built-in modules** (e.g., `node:path`) MUST be externalized — they can't be bundled.
- `web-ui` externalizes `lit` (along with workspace deps), so consumers must install `lit` as a dependency.

| Package                   | Externalized (workspace + builtin)                               | Bundled (third-party)     |
| ------------------------- | ---------------------------------------------------------------- | ------------------------- |
| `js-kit`                  | _(none)_                                                         | `remeda`                  |
| `browser-kit`             | `@greypan/js-kit`, `nanoid`, `remeda`, `copy-to-clipboard`       | _(none)_                  |
| `test-kit`                | `@greypan/js-kit`, `msw`, `msw/browser`                          | _(none)_                  |
| `web-ui`                  | `@greypan/browser-kit`, `@greypan/js-kit`, `iconify-icon`, `lit` | _(none)_                  |
| `unplugin-web-components` | `@greypan/js-kit`                                                | `change-case`, `unplugin` |
| `vite-plugin-full-reload` | `node:path`, `@greypan/js-kit`                                   | `unplugin`                |

### Apps

- `react-app-demo` uses `@vitejs/plugin-react` v4 with **React Compiler** (`babel-plugin-react-compiler`, target: 19)
- `react-app-demo` uses `@vitejs/plugin-legacy` for older browser support
- Both apps use `basicSsl()` for HTTPS dev server
- `fullReload` plugin watches library `dist/` dirs and triggers full page reload on changes

## Commit conventions

See `commitlint.config.js` and `.agents/rules/commit.md`. Use `bash scripts/commit.sh <type> <scope> <subject>`.

## CI / Release

- **CI** (`ci.yml`): lockfile check → changeset status → build → format+lint+type-check → test
- **Release** (`release.yml`): changesets with `changesets/action@v1`. Demo apps excluded from versioning.
- **New package first publish**: `pnpm publish:new <package-dir>` — builds and publishes 1.0.0 via `npm publish`. Requires `npm login` beforehand. After first publish, configure Trusted Publisher on npmjs.com so CI handles subsequent releases.

## Linting & formatting

- **Formatter**: `vp fmt` (Prettier-compatible via vite-plus config)
  - Single quotes, no semicolons, 120 char print width, no trailing commas, arrow parens avoided
  - Import sorting enabled (builtin → external → internal → parent → sibling → index)
- **Linter**: `vp lint` (oxlint via vite-plus, type-aware)
- **Spell check**: cspell on staged files
- **CSS linting**: stylelint for `.css`, `.vue` (uses Tailwind CSS, no SCSS)
- **Line endings**: LF enforced (`.gitattributes`: `* text=auto eol=lf`)

## Generated / ignored files

These files are auto-generated and should not be edited manually:

- `**/routeTree.gen.ts` — TanStack Router route tree
- `**/auto-imports.d.ts` — auto-import type declarations
- `**/.eslintrc-auto-import.js`
- `**/wailsjs/**` — Wails bindings (if present)
- `**/__screenshots__/` — Vitest browser mode test failure screenshots
- `**/.vitest-attachments/` — Vitest browser mode test attachments

They are excluded from linting, formatting, and spell-check.

## Testing

- **Framework**: Vitest (via `vite-plus`)
- **Run all tests**: `pnpm test`
- **Run one package**: `pnpm --filter @greypan/js-kit test` (which runs `vp test run`)
- **Test files**: `*.spec.ts`, `*.test.ts`, `*.spec.tsx`
- **Environment**: Most packages use Node environment. `browser-kit` uses Vitest Browser Mode with Playwright Chromium for real browser testing.
- **Network mocking**: `browser-kit` uses MSW (Mock Service Worker) via `@greypan/test-kit` for network request interception
- **Test infrastructure**: `@greypan/test-kit` provides composable plugins using js-kit's plugin system:
  - `defineMsw(handlers)` — MSW service worker lifecycle management (start/stop/reset)
  - `defineCapturedRequests()` — request capture and assertion utilities
  - Usage pattern: `defineMsw(handlers).use(defineCapturedRequests()).make()`
- **Browser mode config**: Browser-mode packages need `vite.config.ts` with `browser.provider: playwright()` from `vite-plus/test/browser-playwright`

## Dependency management

- **Catalog**: All dependencies versioned in `pnpm-workspace.yaml catalog:`. Use `catalog:` references in package.json to unify versions across the workspace.
- **Catalog mode**: `catalogMode: prefer` — pnpm prefers catalog versions when resolving workspace dependencies.
- **Lockfile**: After dependency changes, run `pnpm dedupe` then `pnpm check:lockfile` to avoid CI failures.
- **devDependencies / peerDependencies placement rules** refer to `.agents/rules/dep-management.md`.

## Other gotchas

- `.npmrc` uses an npmmirror registry (`registry=https://registry.npmmirror.com`). CI overrides this to the official registry.
- The `prepare` script runs `vp config` — this sets up vite-plus internal config on install.
- Go toolchain is also managed via mise (used by some tooling, not by the JS packages directly).

## Agent rules

Rules are stored in `.agents/rules/` and symlinked to `.claude/rules`:

- `testing.md` — test coverage, edge cases, degradation scenarios
- `code-style.md` — naming, comments, type safety, plugin Options conventions
- `review-checklist.md` — review checkpoints
- `commit.md` — commit conventions, workflow, anti-patterns
- `dep-management.md` — devDependencies/peerDependencies placement strategy

## Agent skills

### Issue tracker

Issues tracked on GitHub. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout (one `CONTEXT.md` + `docs/adr/` at repo root). See `docs/agents/domain.md`.

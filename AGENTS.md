# AGENTS.md

## Repo overview

pnpm monorepo (`apps/**`, `packages/**`) using Turborepo. Packages are published under `@greypan/*` to npm. Apps are private demos, never published.

## Toolchain

- **Package manager**: pnpm 10.33.0 (enforced via `engine-strict=true` in `.npmrc`)
- **Runtime**: Node 22+ (managed via mise — run `mise install` if node/pnpm/go are missing)
- **Build/dev/lint/test/format**: all delegated to `vite-plus` (`vp`) — a Vite wrapper. Most per-package scripts call `vp build`, `vp test run`, `vp lint`, `vp fmt`
- **Orchestration**: Turborepo (`turbo.json`) — `build` and `test` tasks depend on `^build` (upstream packages build first)
- **Language**: TypeScript 6, ES modules only (`"type": "module"` everywhere)

## Key commands

| Command                                           | What it does                                           |
| ------------------------------------------------- | ------------------------------------------------------ |
| `pnpm install`                                    | Install all deps (frozen lockfile in CI)               |
| `pnpm build`                                      | Build all packages in dependency order                 |
| `pnpm test`                                       | Run all tests                                          |
| `pnpm staged`                                     | Run lint-staged (cspell, stylelint, formatter, linter) |
| `pnpm commit`                                     | Interactive conventional commit via cz-git             |
| `bash scripts/commit.sh <type> <scope> <subject>` | Non-interactive commit (useful for agents)             |
| `pnpm check:lockfile`                             | Verify lockfile has no duplicates                      |
| `pnpm dev:react-app-demo`                         | Dev server for React app (with turbo watch)            |
| `pnpm dev:vue-app-demo`                           | Dev server for Vue app (with turbo watch)              |

### Per-package commands

Each package has `build`, `test`, and usually `dev` (watch mode). Run with `pnpm --filter @greypan/<name> <script>`. Example: `pnpm --filter @greypan/js-kit test`.

Some library packages (`js-kit`, `browser-kit`, `web-ui`, `unplugin-web-components`, `vite-plugin-full-reload`) have a two-step build: `run-p type-check "build-only {@}" --` — type-check and build run in parallel.

## Package structure

```
packages/
  js-kit          — JS utilities (base package, no workspace deps)
  browser-kit     — Browser utilities (depends on js-kit)
  web-ui          — Web components (Lit-based, depends on js-kit + browser-kit)
  unplugin-web-components — Unplugin for web components (depends on js-kit)
  vite-plugin-full-reload — Vite HMR plugin (depends on js-kit)
apps/
  react-app-demo  — React 19 + TanStack Router + Zustand (private)
  vue-app-demo    — Vue 3 + Vue Router + Pinia (private)
```

**Dependency graph**: `js-kit` is the leaf. `browser-kit` → `js-kit`. `web-ui` → both. Apps depend on the shared packages.

## Commit conventions

Conventional commits enforced by commitlint. Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`.

Allowed scopes: `root`, `apps`, `packages` (or specific names like `js-kit`, `browser-kit`, `web-ui`, `react-app-demo`, `vue-app-demo`, etc.). Multiple scopes allowed with comma separation.

Header max 200 chars. Subject must not be empty, must not end with `.`, must not be sentence-case/start-case/pascal-case/upper-case.

Agent-friendly commit command:

```
bash scripts/commit.sh feat js-kit "add url parser utility"
```

## Release

Uses **changesets**. Demo apps are excluded from versioning (`@greypan/react-app-demo`, `@greypan/vue-app-demo` in changeset ignore list).

- PRs to `main` require `pnpm changeset status --since=origin/main` to pass (CI checks this)
- Releases trigger on `v*` tags → `pnpm changeset publish` to npm

## Code style

- **Formatter**: `vp fmt` (Prettier-compatible via vite-plus config)
  - Single quotes, no semicolons, 120 char print width, no trailing commas, arrow parens avoided
  - Import sorting enabled (builtin → external → internal → parent → sibling → index)
- **Linter**: `vp lint` (ESLint via vite-plus, type-aware)
- **Spell check**: cspell on staged files
- **CSS linting**: stylelint for `.css`, `.scss`, `.vue`
- **Line endings**: LF enforced (`.gitattributes`: `* text=auto eol=lf`)

## Generated / ignored files

These files are auto-generated and should not be edited manually:

- `**/routeTree.gen.ts` — TanStack Router route tree
- `**/auto-imports.d.ts` — auto-import type declarations
- `**/.eslintrc-auto-import.js`
- `**/wailsjs/**` — Wails bindings (if present)

They are excluded from linting, formatting, and spell-check.

## Testing

- **Framework**: Vitest with jsdom environment (configured in root `vite.config.ts`)
- **Run all tests**: `pnpm test`
- **Run one package**: `pnpm --filter @greypan/js-kit test` (which runs `vp test run`)
- **Test files**: `*.spec.ts`, `*.test.ts`, `*.spec.tsx`

## Agent skills

### Issue tracker

GitHub Issues, PRs are also a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Default set (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. See `docs/agents/domain.md`.

## Other gotchas

- `.npmrc` uses a Tencent registry mirror (`registry=http://mirrors.cloud.tencent.com/npm/`). CI overrides this to the official registry.
- The `prepare` script runs `vp config` — this sets up vite-plus internal config on install.
- `pnpm clean` removes `dist/`, `.turbo/`, `.vite/`, `build/` dirs. `pnpm clean --full` also removes `node_modules` and the lockfile.
- Go toolchain is also managed via mise (used by some tooling, not by the JS packages directly).

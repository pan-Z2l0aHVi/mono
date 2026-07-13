# AGENTS.md

## 文档维护规则

**当你的改动涉及以下任一类别时，必须同步更新本文档对应章节：**

| 改动类别             | 需要更新的章节                      | 触发条件                                                                           |
| -------------------- | ----------------------------------- | ---------------------------------------------------------------------------------- |
| 构建脚本/流程        | Build architecture, Key commands    | 修改 `package.json` 的 `scripts`、`vite.config.ts` 的 build 配置、turbo.json tasks |
| 包增删重命名         | Package structure, Dependency graph | 添加/删除/重命名 `packages/` 或 `apps/` 下的目录                                   |
| Externalization 策略 | Externalization rules               | 修改 `vite.config.ts` 的 `rollupOptions.external`                                  |
| CI/CD workflow       | CI, Release                         | 修改 `.github/workflows/` 下的文件                                                 |
| 代码规范工具         | Linting & formatting                | 修改 linter、formatter、stylelint、cspell 配置                                     |
| 依赖管理方式         | Dependency management               | 修改 `pnpm-workspace.yaml` catalog、changeset 配置                                 |
| 运行时/工具链版本    | Toolchain                           | 修改 `.mise.toml`、`package.json` engines                                          |
| 测试配置             | Testing                             | 修改 `vite.config.ts` 的 test 配置、测试框架                                       |

**执行规则：**

1. 执行改动前，先读取相关章节，确认当前文档内容
2. 执行改动后，立即更新文档，不要留到以后
3. 如果不确定改动是否需要更新文档，**主动询问用户**
4. 文档更新应与代码改动在同一个 commit 中提交

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

- **Catalog**: All shared dependencies are versioned in `pnpm-workspace.yaml` under `catalog:`. Use `catalog:` references in package.json to pin versions centrally. Only truly package-specific deps (used by a single package) may keep hardcoded versions.
- **Lockfile**: After dependency changes, run `pnpm dedupe` then `pnpm check:lockfile` to avoid CI failures.
- **Adding new deps**: When adding a dependency used by multiple packages, always add it to the catalog first, then reference `catalog:` in each package.json.

## Other gotchas

- `.npmrc` uses an npmmirror registry (`registry=https://registry.npmmirror.com`). CI overrides this to the official registry.
- The `prepare` script runs `vp config` — this sets up vite-plus internal config on install.
- Go toolchain is also managed via mise (used by some tooling, not by the JS packages directly).

## Agent rules

Rules are stored in `.agents/rules/` and symlinked to `.claude/rules`:

- `testing.md` — test coverage, edge cases, degradation scenarios
- `code-style.md` — naming, comments, type safety, plugin Options 规范
- `review-checklist.md` — review checkpoints
- `commit.md` — commit conventions, workflow, anti-patterns

## Agent skills

### Issue tracker

Issues tracked on GitHub. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout (one `CONTEXT.md` + `docs/adr/` at repo root). See `docs/agents/domain.md`.

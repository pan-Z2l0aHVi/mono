# AGENTS.md

## Document maintenance

When your changes fall into any category below, update the corresponding docs:

| Change category       | Where to update                              | Trigger                                                                            |
| --------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| Build scripts/flow    | This file (Build architecture, Key commands) | Changes to `package.json` scripts, `vite.config.ts` build config, turbo.json tasks |
| Package add/rename    | This file (Package structure)                | Adding/removing/renaming a directory under `packages/` or `apps/`                  |
| Externalization       | This file (Externalization rules)            | Changes to `vite.config.ts` `rollupOptions.external`                               |
| CI/CD workflow        | This file (CI / Release)                     | Changes to files under `.github/workflows/`                                        |
| Code quality tools    | `docs/agents/linting.md`                     | Changes to linter, formatter, stylelint, cspell config                             |
| Dependency management | `.agents/rules/dep-management.md`            | Changes to `pnpm-workspace.yaml` catalog, changeset config                         |
| Runtime/toolchain     | This file (Toolchain)                        | Changes to `.mise.toml`, `package.json` engines                                    |
| Test config           | `docs/agents/testing.md`                     | Changes to `vite.config.ts` test config, test framework                            |
| Coding standards      | `.agents/rules/code-style.md`                | Changes to naming, type safety, architecture patterns                              |
| Commit conventions    | `.agents/rules/commit.md`                    | Changes to commitlint config, commit workflow                                      |

Rules:

1. Read the relevant docs before making changes to confirm current documentation
2. Update documentation immediately after changes, never postpone
3. If unsure whether a change requires documentation updates, **ask the user**
4. Documentation updates should land in the same commit as code changes

---

## Repo overview

pnpm monorepo (`apps/**`, `packages/**`) using Turborepo. Packages published under `@greypan/*` to npm. Apps are private demos, never published.

## Toolchain

- **Package manager**: pnpm 10.33.0 (enforced via `engine-strict=true` in `.npmrc`)
- **Runtime**: Node 24 (managed via mise — run `mise install` if node/pnpm/go are missing; `engines` allows >=24.18.0)
- **Build/dev/lint/test/format**: all delegated to `vite-plus` (`vp`) — a Vite wrapper. Most per-package scripts call `vp build`, `vp pack`, `vp check`, `vp test run`, `vp lint`, `vp fmt`
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
| `pnpm dev:react-app-demo`                         | Dev server for React app (with turbo watch)   |
| `pnpm dev:vue-app-demo`                           | Dev server for Vue app (with turbo watch)     |
| `pnpm run check:code`                             | Format + lint + type-check (what CI runs)     |
| `pnpm clean`                                      | Remove `dist/`, `.turbo/`, `.vite/`, `build/` |
| `pnpm clean --full`                               | Also remove `node_modules` and lockfile       |
| `pnpm publish:new <package-dir>`                  | First publish of a new package (1.0.0)        |

### Per-package commands

Each package has `build`, `test`, and usually `dev` (watch mode). Run with `pnpm --filter @greypan/<name> <script>`. Example: `pnpm --filter @greypan/js-kit test`.

Build scripts differ by package type:

- **Single-entry packages** (test-kit, unplugin-web-components, deps-reload): `vp pack` — tsdown-based, outputs `.mjs` + `.d.mts`
- **Sub-path export packages** (js-kit, browser-kit, web-ui): `vue-tsc --build && vp build` — Vite lib mode with `preserveModules`, outputs `.js` + `.d.ts`
- **React app**: `tsc -b && vp build`
- **tsconfig**: No build step — pure JSON config files, consumed via TypeScript `extends`

**Type-checker**: All packages (including non-Vue ones like `js-kit`, `browser-kit`) use `vue-tsc` for type-checking. React app uses `tsc`. Type-check runs in CI via `vp check`.

**web-ui specific**:

- `pnpm --filter @greypan/web-ui generate-icons` — Regenerate icon modules from `icons.used.json` (also runs automatically during `vp build` via Vite plugin)

## TypeScript configuration

Shared config profiles in `packages/tsconfig/` consumed via `"extends": "@greypan/tsconfig/<profile>.json"`:

| Profile      | Layer  | Used by                                     | Extends                            |
| ------------ | ------ | ------------------------------------------- | ---------------------------------- |
| `core.json`  | 1-纯JS | js-kit                                      | `./base.json`                      |
| `node.json`  | 2-Node | Node.js packages + all `tsconfig.node.json` | `@tsconfig/node24` + `./base.json` |
| `dom.json`   | 3-DOM  | Browser packages (browser-kit, web-ui)      | `./base.json`                      |
| `react.json` | 4-框架 | React app (react-app-demo)                  | `./dom.json`                       |
| `vue.json`   | 4-框架 | Vue app (vue-app-demo)                      | `@vue/tsconfig` + `./dom.json`     |

Each sub-package adds its own `include`, `paths`, and `tsBuildInfoFile`. The `tsconfig.node.json`, `tsconfig.app.json`, `tsconfig.vitest.json` split is kept for packages targeting multiple environments (DOM + Node configs + test). Pure Node packages merge into a single `tsconfig.json`.

## Package structure

```
packages/
  tsconfig        — Shared TypeScript configuration profiles (no build step)
  js-kit          — JS utilities (base package, no workspace deps)
  browser-kit     — Browser utilities (depends on js-kit)
  test-kit        — Test infrastructure plugins for Vitest browser mode + MSW (depends on js-kit)
  web-ui          — Web components (Lit-based, depends on js-kit + browser-kit)
  unplugin-web-components — Unplugin for web components (depends on js-kit)
  deps-reload — plugin for reload on local dependency update (depends on js-kit)
apps/
  react-app-demo  — React 19 + TanStack Router + Zustand (private)
  vue-app-demo    — Vue 3 + Vue Router + Pinia (private)
```

**Dependency graph**: `js-kit` is the leaf. `browser-kit` → `js-kit`. `test-kit` → `js-kit` (peer dep on `msw`). `web-ui` → both. Apps depend on the shared packages.

## Build architecture

### Library packages

Two build modes:

- **`vp pack` (tsdown)** — for single-entry packages. Configured via the `pack` block. Built-in dts generation (no `vite-plugin-dts`). Outputs `.mjs` + `.d.mts`. Auto-externalizes `dependencies`. Used by: `test-kit`, `unplugin-web-components`, `deps-reload`.
- **`vp build` (Vite lib mode)** — for packages with sub-path exports. Configured via `build.lib` + `preserveModules: true`. Uses `vite-plugin-dts` for declarations. Outputs `.js` + `.d.ts`. Used by: `js-kit`, `browser-kit`, `web-ui`.

### Externalization rules

- **Workspace deps (`@greypan/*`) MUST be externalized** — either manually via `rollupOptions.external` (Vite lib mode) or automatically by tsdown (`vp pack` auto-externalizes `dependencies`). Required for dev watch mode — without it, Rolldown fails to resolve workspace links on rebuild. Also prevents duplicate code in consumer bundles.
- **Third-party npm deps can be externalized or bundled** — depends on the package's design intent. If the package is designed to be consumed with zero config, bundle them. If the package expects consumers to install peer dependencies, externalize them.
- **Node built-in modules** (e.g., `node:path`) MUST be externalized — they can't be bundled.
- **Regex patterns preferred** — Use `/^@greypan\//` instead of listing individual workspace packages. Sub-path patterns (`/^lit($|\/)/`) catch deep imports.
- `web-ui` externalizes framework deps via regex (`/^lit($|\/)/`, `/^react($|\/)/`, `/^vue($|\/)/`, etc.), so consumers must install `lit` (required) as a dependency.

| Package                   | Externalization                                                 | Bundled (third-party) |
| ------------------------- | --------------------------------------------------------------- | --------------------- | ----------------- | --------------------- | --------------- | ----- | -------- |
| `js-kit`                  | `/^@greypan\//`, `remeda`, `nanoid`                             | _(none)_              |
| `browser-kit`             | `/^@greypan\//`, `nanoid`, `remeda`, `copy-to-clipboard`, `msw` | _(none)_              |
| `test-kit`                | Auto by tsdown (`@greypan/js-kit`, `msw`)                       | _(none)_              |
| `web-ui`                  | `/^@greypan\//`, `/^lit($                                       | \/)/`, `/^@lit($      | \/)/`, `/^react($ | \/)/`, `/^react-dom($ | \/)/`, `/^vue($ | \/)/` | _(none)_ |
| `unplugin-web-components` | Auto by tsdown (`@greypan/js-kit`, `change-case`, `unplugin`)   | _(none)_              |
| `deps-reload`             | Auto by tsdown (`node:*`, `@greypan/js-kit`, `unplugin`)        | _(none)_              |

### Apps

- `react-app-demo` uses `@vitejs/plugin-react` v4 with **React Compiler** (`babel-plugin-react-compiler`, target: 19)
- `react-app-demo` uses `@vitejs/plugin-legacy` for older browser support
- Both apps use `basicSsl()` for HTTPS dev server
- `depsReload` plugin watches library `dist/` dirs and triggers full page reload on changes

## CI / Release

- **CI** (`ci.yml`): changeset status → build → format+lint+type-check → test
- **Release** (`release.yml`): changesets with `changesets/action@v1`. Demo apps excluded from versioning.
- **New package first publish**: `pnpm publish:new <package-dir>` — builds and publishes 1.0.0 via `npm publish`. Requires `npm login` beforehand. After first publish, configure Trusted Publisher on npmjs.com so CI handles subsequent releases.

## Generated / ignored files

These files are auto-generated and should not be edited manually:

- `**/routeTree.gen.ts` — TanStack Router route tree
- `**/auto-imports.d.ts` — auto-import type declarations
- `**/.eslintrc-auto-import.js`
- `**/wailsjs/**` — Wails bindings (if present)
- `**/__screenshots__/` — Vitest browser mode test failure screenshots
- `**/.vitest-attachments/` — Vitest browser mode test attachments

They are excluded from linting, formatting, and spell-check.

## Other gotchas

- `.npmrc` uses an npmmirror registry (`registry=https://registry.npmmirror.com`). CI overrides this to the official registry.
- The `prepare` script runs `vp config` — this sets up vite-plus internal config on install.
- Go toolchain is also managed via mise (used by some tooling, not by the JS packages directly).

## Documentation

- `docs/agents/` — Agent 工作指南，包含 domain.md（代码探索规范）、issue-tracker.md（GitHub issue 工作流）、specs/（功能规格文档）
- `docs/adr/` — Architecture Decision Records（架构决策记录），记录重要技术决策
- `docs/prd/` — Product Requirements Documents（产品需求文档）
- `docs/design/` — 设计参考文件（截图、CSS 参考实现等）

## Agent reference docs

按需查阅，不要求每次对话都读：

| 文件                           | 用途                                        | 什么时候读                       |
| ------------------------------ | ------------------------------------------- | -------------------------------- |
| `docs/agents/testing.md`       | 测试基础设施（框架、命令、browser mode）    | 不知道怎么跑测试、配置测试环境时 |
| `docs/agents/linting.md`       | 工具链（formatter、linter、stylelint 命令） | 不知道怎么跑 lint/fmt 时         |
| `docs/agents/issue-tracker.md` | GitHub issue 操作（gh CLI 用法）            | 需要创建/查询/更新 issue 时      |
| `docs/agents/domain.md`        | 代码探索规范（ADR、术语表）                 | 探索不熟悉的代码区域时           |

## Agent behavioral rules

自动加载，每次对话生效：

| 文件                                | 管什么                              |
| ----------------------------------- | ----------------------------------- |
| `.agents/rules/code-style.md`       | 命名、注释、类型安全、架构模式      |
| `.agents/rules/commit.md`           | commit message 格式、工作流、反模式 |
| `.agents/rules/testing.md`          | 测试覆盖、AAA 模式、边界用例        |
| `.agents/rules/dep-management.md`   | devDeps/peerDeps 放置策略           |
| `.agents/rules/review-checklist.md` | code review 检查项                  |

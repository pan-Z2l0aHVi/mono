# Build and Release Architecture

Read this guide before changing package scripts, Vite/Turbo configuration, package structure, externalization, or CI/release flow. Update it in the same change when those details change.

## Per-package commands

Packages expose the commands they need: every buildable package has `build`, most have `dev` (watch mode), and only packages with maintained automated coverage expose `test`. Run them with `pnpm --filter @greypan/<name> <script>`; for example, `pnpm --filter @greypan/js-kit test`.

## Demo development

The root demo commands first build upstream workspace packages, then use `turbo run dev --filter=<demo>...` to start each package's persistent `dev` process. Do not use `turbo watch` for these commands: the package-level Vite and tsdown watchers already rebuild source changes, while `turbo watch` also observes Git control files and can restart all dev processes when editor or agent tooling updates Git worktrees.

Restart a demo command after changing the package graph, lockfile, or Turbo configuration. Normal source changes continue to be handled by the running package-level watchers.

Build scripts differ by package type:

- **Single-entry packages** (`test-kit`, `unplugin-web-components`, `deps-reload`): `vp pack`, which is tsdown-based and emits `.mjs` plus `.d.mts`.
- **Sub-path export packages** (`js-kit`, `browser-kit`, `web-ui`): `vp build`, using Vite library mode with `preserveModules` and emitting `.js` plus `.d.ts`.
- **React app**: `vp build`.
- **Vue app**: `vue-tsc --build && vp build`.
- **tsconfig**: no build step; it provides JSON files consumed through TypeScript `extends`.

Run `pnpm run check:code` at the workspace root for formatting, linting, and type checking. Run `pnpm run fix:code` to auto-fix formatting and lint issues before type-checking. Package build commands do not replace either command.

For `web-ui`, `pnpm --filter @greypan/web-ui generate-icons` regenerates icon modules from `icons.used.json`. The Vite plugin also runs it during `vp build`.

## TypeScript configuration

Shared profiles live in `packages/tsconfig/` and are consumed with `"extends": "@greypan/tsconfig/<profile>.json"`.

| Profile      | Layer        | Used by                                          | Extends                               |
| ------------ | ------------ | ------------------------------------------------ | ------------------------------------- |
| `core.json`  | 1: Pure JS   | `js-kit`                                         | `./base.json`                         |
| `node.json`  | 2: Node      | Node packages and all `tsconfig.node.json` files | `@tsconfig/node24` plus `./base.json` |
| `dom.json`   | 3: DOM       | `browser-kit`, `web-ui`                          | `./base.json`                         |
| `react.json` | 4: Framework | `react-web-ui-demo`                              | `./dom.json`                          |
| `vue.json`   | 4: Framework | `vue-web-ui-demo`                                | `@vue/tsconfig` plus `./dom.json`     |

Each package adds its own `include`, `paths`, and `tsBuildInfoFile`. Packages that target DOM and Node split their configurations into `tsconfig.node.json`, `tsconfig.app.json`, and `tsconfig.vitest.json`; pure Node packages use one `tsconfig.json`.

## Package structure

```text
packages/
  tsconfig                  Shared TypeScript profiles; no build step
  js-kit                    JS utilities; base package with no workspace dependencies
  browser-kit               Browser utilities; depends on js-kit
  test-kit                  Vitest browser-mode and MSW infrastructure; depends on js-kit
  web-ui                    Lit web components; depends on js-kit and browser-kit
  unplugin-web-components   Unplugin for web components; depends on js-kit
  deps-reload               Local dependency reload plugin; depends on js-kit
apps/
  react-web-ui-demo            React 19, TanStack Router, Zustand; private
  vue-web-ui-demo              Vue 3, Vue Router, Pinia; private
  wails-starter                Wails 3 desktop starter; Go backend plus Vue WebView frontend
```

`js-kit` is the leaf package. `browser-kit` depends on `js-kit`; `test-kit` depends on `js-kit` and has an `msw` peer dependency; `web-ui` depends on both. The apps depend on shared packages.

## Library build modes

`vp pack` uses tsdown for single-entry packages. It is configured with the `pack` block, generates declarations without `vite-plugin-dts`, and externalizes dependencies automatically. It is used by `test-kit`, `unplugin-web-components`, and `deps-reload`.

`vp build` uses Vite library mode for packages with sub-path exports. It is configured with `build.lib` and `preserveModules: true`, and uses `vite-plugin-dts` for declarations. It is used by `js-kit`, `browser-kit`, and `web-ui`.

## Externalization rules

- **Workspace dependencies** matching `@greypan/*` must be externalized. Vite library packages do this through `rollupOptions.external`; tsdown does it from dependencies. This keeps watch mode resolvable and avoids duplicate consumer code.
- **Node built-ins** such as `node:path` must be externalized.
- **Third-party dependencies** may be bundled when zero-config consumption is the design intent; externalize them when consumers are expected to provide them.
- Prefer regex patterns to lists of workspace packages. Match sub-path imports too, for example the Lit pattern `/^lit($|\/)/`.
- `web-ui` externalizes its framework dependencies, so consumers must install `lit` as a dependency.
- `wails-starter` has an outer Turbo workspace (`@greypan/wails-starter`) and a nested WebView workspace (`@greypan/wails-starter-frontend`). The Wails Taskfile owns the nested frontend process; use `pnpm dev:wails-starter` rather than Turbo's dependency expansion for development.
- The Wails Taskfile uses pnpm, generates `frontend/bindings/`, and embeds `frontend/dist/` into the Go binary. `bin/` is a Turbo build output for native artifacts.
- The Wails build assets intentionally support only darwin/arm64 and windows/amd64. On macOS, the package `build` script creates both `bin/wails-starter.dmg` and `bin/wails-starter.exe`; `build:macos` and `build:windows` build either target explicitly. On Windows, `build` creates the EXE. On Linux CI, it builds only the WebView frontend because neither desktop release target is native to the runner. Windows cross-compilation works from macOS without Docker, while macOS builds on a non-macOS host require Wails' Docker setup.
- `apps/wails-starter/build/` contains Wails Taskfiles, platform templates, icons, and packaging assets rather than disposable output. Both `pnpm clean` and `pnpm clean --full` preserve it; only `bin/`, `frontend/dist/`, generated bindings, caches, and dependencies are disposable.

| Package                   | Externalization                                                                        | Bundled third-party dependencies |
| ------------------------- | -------------------------------------------------------------------------------------- | -------------------------------- |
| `js-kit`                  | `@greypan/*`, `remeda`, `nanoid`                                                       | None                             |
| `browser-kit`             | `@greypan/*`, `nanoid`, `remeda`, `copy-to-clipboard`, `msw`                           | None                             |
| `test-kit`                | Automatic through tsdown: `@greypan/js-kit`, `msw`                                     | None                             |
| `web-ui`                  | `@greypan/*` plus framework regexes for `lit`, `@lit`, `react`, `react-dom`, and `vue` | None                             |
| `unplugin-web-components` | Automatic through tsdown: `@greypan/js-kit`, `change-case`, `unplugin`                 | None                             |
| `deps-reload`             | Automatic through tsdown: `node:*`, `@greypan/js-kit`, `unplugin`                      | None                             |

## Applications

- `react-web-ui-demo` uses `@vitejs/plugin-react` v4 with React Compiler (`babel-plugin-react-compiler`, target 19), plus `@vitejs/plugin-legacy` for older browser support. The React and Vue demo apps currently rely on browser verification rather than maintained unit-test suites.
- Both demo apps use `basicSsl()` for HTTPS development servers.
- `depsReload` watches library `dist/` directories and triggers a full page reload when a local dependency changes.
- The Wails WebView frontend follows the Vue demo's Vite plugin and local-package conventions, with the Wails Vite plugin responsible for generated Go bindings.

## CI and release

- CI in `ci.yml` runs changeset status, build, format/lint/type-check, and tests.
- Release in `release.yml` uses `changesets/action@v1`; demo apps are excluded from versioning.
- Deploy in `deploy.yml` is manually triggered and deploys every Deployable Demo in the job-level `DEMO_APPS` list through one `actions/deploy-pages` artifact. Each entry is an `apps/<name>` directory and is served at `/mono/<name>/`; build commands use pnpm's `{./apps/<name>}...` directory selector rather than an npm package name. The site has no root landing page.
- Every Deployable Demo must support History-route deep links. GitHub Pages routes an unmatched request to the root `404.html`; it validates the app name against `DEMO_APPS`, preserves the requested route in `redirect`, and loads the app root. In production, the app must restore `redirect` before creating its router. Unknown paths remain 404 responses.
- First publication must use `pnpm publish:new <package-dir>`, which builds then publishes version `1.0.0`. It requires `npm login`; configure npm Trusted Publisher afterwards for CI-driven releases.

# Build and Release Architecture

Read this guide before changing package scripts, Vite/Turbo configuration, package structure, externalization, or CI/release flow. Update it in the same change when those details change.

## Per-package commands

Packages expose the commands they need: every buildable package has `build`, most have `dev` (watch mode), and only packages with maintained automated coverage expose `test`. Run them with `pnpm --filter @greypan/<name> <script>`; for example, `pnpm --filter @greypan/js-kit test`.

Build scripts differ by package type:

- **Single-entry packages** (`test-kit`, `unplugin-web-components`, `deps-reload`): `vp pack`, which is tsdown-based and emits `.mjs` plus `.d.mts`.
- **Sub-path export packages** (`js-kit`, `browser-kit`, `web-ui`): `vp build`, using Vite library mode with `preserveModules` and emitting `.js` plus `.d.ts`.
- **React app**: `vp build`.
- **Vue app**: `vue-tsc --build && vp build`.
- **tsconfig**: no build step; it provides JSON files consumed through TypeScript `extends`.

Run `pnpm run check:code` at the workspace root for formatting, linting, and type checking. Package build commands do not replace this check.

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

## CI and release

- CI in `ci.yml` runs changeset status, build, format/lint/type-check, and tests.
- Release in `release.yml` uses `changesets/action@v1`; demo apps are excluded from versioning.
- Deploy in `deploy.yml` builds and deploys demo apps to GitHub Pages via `actions/deploy-pages`. SPA fallback (`404.html`) handles client-side routing.
- First publication must use `pnpm publish:new <package-dir>`, which builds then publishes version `1.0.0`. It requires `npm login`; configure npm Trusted Publisher afterwards for CI-driven releases.

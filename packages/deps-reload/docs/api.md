# API

English | [简体中文](./api.CN.md)

Complete configuration reference and path/extension matching rules for `@greypan/deps-reload`.

## Subpath exports

| Entry                          | Target bundler | Export                     |
| ------------------------------ | -------------- | -------------------------- |
| `@greypan/deps-reload/vite`    | Vite           | Default export (`deps =>`) |
| `@greypan/deps-reload/webpack` | Webpack        | Default export (`deps =>`) |

## `depsReload(deps)`

Creates the plugin instance for the selected bundler.

| Parameter | Type    | Description                           |
| --------- | ------- | ------------------------------------- |
| `deps`    | `Dep[]` | List of local or linked dependencies. |

## `Dep`

```ts
export interface Dep {
  /** npm package name, used to resolve packages without a local path */
  name: string
  /** Local package root directory, for monorepos or npm links */
  path?: string
  /** Build output directory relative to the package root */
  outputDir?: string
  /** File extensions in the build output that should trigger a reload */
  extensions?: string[]
}
```

| Property     | Type       | Default           | Description                                                                   |
| ------------ | ---------- | ----------------- | ----------------------------------------------------------------------------- |
| `name`       | `string`   | -                 | Package name. Used as `resolve('node_modules', name)` when `path` is omitted. |
| `path`       | `string`   | -                 | Relative or absolute path to the local package root (monorepo or `npm link`). |
| `outputDir`  | `string`   | `'dist'`          | Build output directory resolved relative to the package root.                 |
| `extensions` | `string[]` | `['.js', '.css']` | File extensions that trigger a reload in Vite.                                |

## Matching & normalization rules

- **Package root resolution**: If `path` is provided, `resolve(path)` is used; otherwise `resolve('node_modules', name)`.
- **Path comparison**: Separators are normalized to `/`, trailing slashes are stripped, and comparison is case-insensitive so minor casing differences (such as `../Packages/Foo` vs `packages/foo`) still match.
- **Extension normalization**: Leading dots and surrounding whitespace are normalized and lowercased—`'mjs'`, `'.mjs'`, and `' .MJS '` all normalize to `'.mjs'`. Empty entries are dropped.
- **Source maps ignored**: Any file ending in `.map` is always skipped in Vite even if `.map` is listed.

## Multi-package example

```ts
import depsReload from '@greypan/deps-reload/vite'

depsReload([
  {
    name: '@greypan/app-scrollbars',
    path: '../../packages/app-scrollbars',
    extensions: ['.mjs', '.css']
  },
  {
    name: '@greypan/web-ui',
    path: '../../packages/web-ui',
    outputDir: 'dist',
    extensions: ['.js', '.css']
  },
  {
    // Resolves to node_modules/my-linked-lib/build
    name: 'my-linked-lib',
    outputDir: 'build'
  }
])
```

```js
import depsReload from '@greypan/deps-reload/vite'

depsReload([
  {
    name: '@greypan/app-scrollbars',
    path: '../../packages/app-scrollbars',
    extensions: ['.mjs', '.css']
  },
  {
    name: '@greypan/web-ui',
    path: '../../packages/web-ui',
    outputDir: 'dist',
    extensions: ['.js', '.css']
  },
  {
    // Resolves to node_modules/my-linked-lib/build
    name: 'my-linked-lib',
    outputDir: 'build'
  }
])
```

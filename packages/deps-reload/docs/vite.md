# Vite

English | [简体中文](./vite.CN.md)

Watch local dependency build outputs in Vite dev mode and trigger a debounced full-page reload when compiled files change.

## Usage

Import the Vite entry from `@greypan/deps-reload/vite` and pass the dependencies you want to watch:

```ts
// vite.config.ts
import depsReload from '@greypan/deps-reload/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    depsReload([
      {
        name: '@greypan/web-ui',
        path: '../../packages/web-ui',
        extensions: ['.js', '.css']
      },
      {
        name: '@greypan/doc-demo-kit',
        path: '../../packages/doc-demo-kit',
        extensions: ['.mjs']
      }
    ])
  ]
})
```

```js
// vite.config.js
import depsReload from '@greypan/deps-reload/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    depsReload([
      {
        name: '@greypan/web-ui',
        path: '../../packages/web-ui',
        extensions: ['.js', '.css']
      },
      {
        name: '@greypan/doc-demo-kit',
        path: '../../packages/doc-demo-kit',
        extensions: ['.mjs']
      }
    ])
  ]
})
```

## How it works

- **Serve-only (`apply: 'serve'`)**: The Vite hook is active only during `vite dev` and has zero overhead in production builds.
- **Consumes real build artifacts**: Unlike source aliasing, your app keeps resolving the package's compiled `dist` output, catching export map and bundling issues early.
- **Module graph invalidation**: Build tools often rewrite `dist/` via atomic renames or directory rebuilds (`unlink`/`add` events instead of `change`), which Vite does not automatically invalidate. In `hotUpdate`, the plugin calls `environment.moduleGraph.onFileChange(ctx.file)` across all active environments before triggering a reload so the browser never reads stale cached modules.
- **Debounced full reload**: File bursts during a single rebuild are debounced (`waitMs: 300`, `maxWaitMs: 3000`) and flushed as one `full-reload` WebSocket message. Pending timers are automatically canceled when the dev server closes.
- **Noise filtering**: Source map files (`.map`) and changes inside `@greypan/deps-reload`'s own build directory are ignored.

## Monorepo & `fs.allow`

When watching workspace packages outside the app root, make sure Vite's dev server is allowed to read them:

```ts
// vite.config.ts
import { defineConfig, searchForWorkspaceRoot } from 'vite'

export default defineConfig({
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())]
    }
  }
})
```

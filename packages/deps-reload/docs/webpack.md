# Webpack

English | [简体中文](./webpack.CN.md)

Register dependency build output directories as Webpack watch dependencies so local package rebuilds trigger recompilation and live reload.

## Usage

Import the Webpack entry from `@greypan/deps-reload/webpack` and configure Webpack Dev Server for full-page live reload:

```ts
// webpack.config.ts
import depsReload from '@greypan/deps-reload/webpack'

export default {
  plugins: [
    depsReload([
      {
        name: '@greypan/web-ui',
        path: '../../packages/web-ui'
      }
    ])
  ],
  devServer: {
    hot: false,
    liveReload: true
  }
}
```

```js
// webpack.config.js
import depsReload from '@greypan/deps-reload/webpack'

export default {
  plugins: [
    depsReload([
      {
        name: '@greypan/web-ui',
        path: '../../packages/web-ui'
      }
    ])
  ],
  devServer: {
    hot: false,
    liveReload: true
  }
}
```

## How it works

- **`contextDependencies` registration**: On every `thisCompilation` hook, the plugin adds each resolved `outputPath` (`path.resolve(packageRoot, outputDir)`) to `compilation.contextDependencies`.
- **Preserves original path casing**: Path normalization is used only for comparison; `contextDependencies` always receives the original resolved path casing so case-sensitive filesystems work reliably.
- **Full reload with Dev Server**: Webpack's HMR runtime cannot hot-swap pre-bundled external artifacts cleanly, so disable `hot` and keep `liveReload: true` to reload the browser after recompilation.

## Differences from Vite

| Aspect              | Vite (`/vite`)                               | Webpack (`/webpack`)                                      |
| ------------------- | -------------------------------------------- | --------------------------------------------------------- |
| Watch mechanism     | `hotUpdate` + `moduleGraph.onFileChange`     | `compilation.contextDependencies.add(outputPath)`         |
| Extension filtering | Filters by `extensions` and ignores `.map`   | Directory-level watch handled by Webpack's watcher        |
| Reload trigger      | Debounced `ws.send({ type: 'full-reload' })` | Controlled by `devServer.liveReload: true` (`hot: false`) |

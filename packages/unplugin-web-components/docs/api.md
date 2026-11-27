# API

English | [简体中文](./api.CN.md)

Complete options reference and bundler adapter matrix for `@greypan/unplugin-web-components`.

## `unpluginWebComponents(options)`

```ts
export interface UnpluginWebComponentsOptions {
  tagPrefix: string
  packageName: string
  sideEffects?: boolean
  withStyle?: string
}
```

| Parameter             | Type      | Default | Description                                                                                    |
| --------------------- | --------- | ------- | ---------------------------------------------------------------------------------------------- |
| `options.tagPrefix`   | `string`  | -       | Custom element tag prefix, such as `'web-ui'` (regex metacharacters are safely escaped).       |
| `options.packageName` | `string`  | -       | Target npm package name, such as `'@greypan/web-ui'`.                                          |
| `options.sideEffects` | `boolean` | `false` | When `true`, emits side-effect imports (`import 'pkg/components/x'`); otherwise named imports. |
| `options.withStyle`   | `string`  | -       | Optional stylesheet filename imported alongside each component (`pkg/components/x/<file>`).    |

## Supported bundlers

Only `/vite` and `/webpack` subpath exports are published:

| Entry                                      | Module transforms                   | HTML injection                 |
| ------------------------------------------ | ----------------------------------- | ------------------------------ |
| `@greypan/unplugin-web-components/vite`    | Vue (`.vue`), React (`.tsx`/`.jsx`) | Vite HTML entry (`index.html`) |
| `@greypan/unplugin-web-components/webpack` | Vue (`.vue`), React (`.tsx`/`.jsx`) | -                              |

## Bundler setup examples

### Vite

```ts
// vite.config.ts
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    unpluginWebComponents({
      tagPrefix: 'web-ui',
      packageName: '@greypan/web-ui',
      sideEffects: true
    })
  ]
})
```

```js
// vite.config.js
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    unpluginWebComponents({
      tagPrefix: 'web-ui',
      packageName: '@greypan/web-ui',
      sideEffects: true
    })
  ]
})
```

### Webpack

```ts
// webpack.config.ts
import unpluginWebComponents from '@greypan/unplugin-web-components/webpack'

export default {
  plugins: [
    unpluginWebComponents({
      tagPrefix: 'web-ui',
      packageName: '@greypan/web-ui',
      sideEffects: true
    })
  ]
}
```

```js
// webpack.config.js
import unpluginWebComponents from '@greypan/unplugin-web-components/webpack'

export default {
  plugins: [
    unpluginWebComponents({
      tagPrefix: 'web-ui',
      packageName: '@greypan/web-ui',
      sideEffects: true
    })
  ]
}
```

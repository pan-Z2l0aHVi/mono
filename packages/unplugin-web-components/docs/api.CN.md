# API

[English](./api.md) | 简体中文

`@greypan/unplugin-web-components` 的完整选项参考与打包器适配说明。

## `unpluginWebComponents(options)`

```ts
export interface UnpluginWebComponentsOptions {
  tagPrefix: string
  packageName: string
  sideEffects?: boolean
  withStyle?: string
}
```

| 参数                  | 类型      | 默认值  | 说明                                                                          |
| --------------------- | --------- | ------- | ----------------------------------------------------------------------------- |
| `options.tagPrefix`   | `string`  | -       | 自定义元素标签前缀，例如 `'web-ui'`（内部自动转义正则元字符）。               |
| `options.packageName` | `string`  | -       | 目标 npm 包名，例如 `'@greypan/web-ui'`。                                     |
| `options.sideEffects` | `boolean` | `false` | 为 `true` 时生成副作用导入（`import 'pkg/components/x'`），否则生成命名导入。 |
| `options.withStyle`   | `string`  | -       | 可选，随每个组件一并导入的样式文件名（`pkg/components/x/<file>`）。           |

## 支持的打包器

仅发布 `/vite` 和 `/webpack` 两个子路径导出：

| 入口                                       | 模块转换                              | HTML 注入                      |
| ------------------------------------------ | ------------------------------------- | ------------------------------ |
| `@greypan/unplugin-web-components/vite`    | Vue（`.vue`）、React（`.tsx`/`.jsx`） | Vite HTML 入口（`index.html`） |
| `@greypan/unplugin-web-components/webpack` | Vue（`.vue`）、React（`.tsx`/`.jsx`） | -                              |

## 打包器接入示例

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

# @greypan/deps-reload

> 依赖构建产物变化时刷新页面。

[English](./README.md) | 简体中文

## 安装

```bash
# npm
npm install @greypan/deps-reload

# pnpm
pnpm add @greypan/deps-reload

# yarn
yarn add @greypan/deps-reload

# bun
bun add @greypan/deps-reload
```

## Vite

```ts
// vite.config.ts
import depsReload from '@greypan/deps-reload/vite'

export default defineConfig({
  plugins: [
    depsReload([
      {
        name: '@greypan/web-ui',
        path: '../../packages/web-ui',
        extensions: ['.js', '.css']
      }
    ])
  ]
})
```

`packages/web-ui/dist` 中的文件变化时，浏览器会刷新页面。

这个插件监听构建产物，不会把依赖指向源码，因此应用始终消费包的构建结果。

## Webpack

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

Webpack 插件会把每个输出目录加入 watch dependencies。要通过 Webpack Dev Server 获得整页刷新，请启用 live reload 并关闭 HMR。

## API

### `depsReload(deps)`

创建插件。

| 参数   | 类型    | 说明             |
| ------ | ------- | ---------------- |
| `deps` | `Dep[]` | 待监听的依赖列表 |

### `Dep`

| 属性         | 类型       | 默认值            | 说明                                      |
| ------------ | ---------- | ----------------- | ----------------------------------------- |
| `name`       | `string`   | -                 | 包名，用于 node_modules 路径。            |
| `path`       | `string`   | -                 | 本地包根目录，用于 monorepo 或 npm link。 |
| `outputDir`  | `string`   | `'dist'`          | 相对 `path` 的构建输出目录。              |
| `extensions` | `string[]` | `['.js', '.css']` | 待监听的文件扩展名。                      |

# @greypan/deps-reload

[![npm version](https://img.shields.io/npm/v/@greypan/deps-reload)](https://www.npmjs.com/package/@greypan/deps-reload)
[![npm downloads](https://img.shields.io/npm/dm/@greypan/deps-reload)](https://www.npmjs.com/package/@greypan/deps-reload)
[![node version](https://img.shields.io/node/v/@greypan/deps-reload)](https://www.npmjs.com/package/@greypan/deps-reload)
[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@greypan/deps-reload)](https://www.npmjs.com/package/@greypan/deps-reload)

> 依赖构建产物变化时刷新页面。

[English](./README.md) | 简体中文

**在线文档：** [Dev Kit Demo](https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/deps-reload/getting-started)

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

## 快速开始

### Vite

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

`packages/web-ui/dist` 中的文件变化时，浏览器会刷新页面。插件监听构建产物而非将依赖 alias 到源码，确保应用始终消费真实构建结果。

### Webpack

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

Webpack 插件会把每个产物目录加入 `compilation.contextDependencies`。要通过 Webpack Dev Server 触发整页刷新，请启用 `liveReload` 并关闭 `hot`。

## API

### `depsReload(deps)`

提供 `@greypan/deps-reload/vite` 与 `@greypan/deps-reload/webpack` 两个默认导出入口。

| 参数   | 类型    | 说明                     |
| ------ | ------- | ------------------------ |
| `deps` | `Dep[]` | 待监听的本地或链接依赖项 |

### `Dep`

| 属性         | 类型       | 默认值            | 说明                                                      |
| ------------ | ---------- | ----------------- | --------------------------------------------------------- |
| `name`       | `string`   | -                 | 包名；省略 `path` 时默认解析 `node_modules/<name>`。      |
| `path`       | `string`   | -                 | 本地包根目录，适用于 monorepo 或 `npm link`。             |
| `outputDir`  | `string`   | `'dist'`          | 相对包根目录的构建产物目录。                              |
| `extensions` | `string[]` | `['.js', '.css']` | Vite 下监听的文件扩展名（自动归一为小写并补齐前导 `.`）。 |

匹配说明：

- Vite 中路径匹配统一分隔符且忽略大小写，始终跳过 `.map` sourcemap 文件。
- 单次构建的连续文件写入会防抖合并（`300ms`，最长等待 `3000ms`）为一次整页刷新。

## 文档导航

- [Vite](./docs/vite.CN.md) — 模块图失效、防抖刷新机制与 monorepo `fs.allow`
- [Webpack](./docs/webpack.CN.md) — `contextDependencies`、Dev Server 配置与 Vite 差异

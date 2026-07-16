# @greypan/deps-reload

> 一个监听 dist 文件夹变化并触发全量刷新的 Vite 插件

[English](./README.md) | 简体中文

## 功能

- **全量刷新**：开发时依赖文件变更触发页面刷新
- **可配置监听**：自定义文件扩展名和输出目录
- **防抖刷新**：防止快速连续刷新
- **Monorepo 友好**：监听本地子包构建产物

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

```ts
// vite.config.ts
import depsReload from '@greypan/deps-reload/vite'

export default defineConfig({
  plugins: [
    depsReload([
      {
        name: '@greypan/web-ui',
        path: '../../packages/web-ui/dist',
        extensions: ['.js', '.css']
      }
    ])
  ]
})
```

当 `packages/web-ui/dist` 中的文件变更时，浏览器会自动刷新。

## API

### `depsReload(deps)`

创建用于监听依赖文件并触发全量刷新的 unplugin 实例。

| 参数   | 类型    | 默认值 | 说明             |
| ------ | ------- | ------ | ---------------- |
| `deps` | `Dep[]` | -      | 待监听的依赖列表 |

### `Dep`

| 属性         | 类型       | 默认值            | 说明                                  |
| ------------ | ---------- | ----------------- | ------------------------------------- |
| `name`       | `string`   | -                 | 包名（用于 node_modules 路径）        |
| `path`       | `string`   | -                 | 物理路径（用于 monorepo 或 npm link） |
| `outputDir`  | `string`   | `'dist'`          | 输出目录名                            |
| `extensions` | `string[]` | `['.js', '.css']` | 待监听的文件扩展名                    |

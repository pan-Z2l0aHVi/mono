# Vite

[English](./vite.md) | 简体中文

在 Vite 开发模式下监听本地依赖的构建产物，当编译文件更新时自动触发防抖整页刷新。

## 使用方式

从 `@greypan/deps-reload/vite` 导入 Vite 入口，并传入需要监听的依赖列表：

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

## 工作机制

- **仅在开发服务生效（`apply: 'serve'`）**：只在 `vite dev` 期间运行，不会影响生产构建。
- **直接消费真实构建产物**：不会把依赖 alias 到源码目录，应用始终走包的 `dist` 导出，可尽早暴露导出映射与打包问题。
- **显式失效模块图**：许多构建工具通过原子重命名或重建目录写盘，触发 `unlink`/`add` 而非 `change` 事件，导致 Vite 不会自动失效模块图缓存。插件在 `hotUpdate` 中主动遍历各环境调用 `environment.moduleGraph.onFileChange(ctx.file)`，确保刷新后拿到最新产物。
- **防抖整页刷新**：单次构建产生的大批文件写入会合并防抖（`waitMs: 300`、`maxWaitMs: 3000`），最终通过 WebSocket 下发一次 `full-reload`；开发服务器关闭时自动取消未触发的定时器。
- **噪音过滤**：自动忽略 `.map` sourcemap 文件，以及 `@greypan/deps-reload` 自身构建目录内的文件变动。

## Monorepo 与 `fs.allow`

当监听位于应用根目录之外的 workspace 包时，请确认 Vite 开发服务器允许访问工作区根目录：

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

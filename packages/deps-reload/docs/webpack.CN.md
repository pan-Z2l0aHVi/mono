# Webpack

[English](./webpack.md) | 简体中文

将依赖包的构建产物目录注册为 Webpack 的监听依赖，使本地包重新编译后自动触发重编译与页面刷新。

## 使用方式

从 `@greypan/deps-reload/webpack` 导入 Webpack 入口，并在 Webpack Dev Server 中开启整页 live reload：

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

## 工作机制

- **注册 `contextDependencies`**：插件在 `thisCompilation` 钩子中，将每个依赖解析后的产物目录 `outputPath`（`path.resolve(packageRoot, outputDir)`）加入 `compilation.contextDependencies`。
- **保留原始路径大小写**：大小写折叠仅用于匹配比较；写入 `contextDependencies` 的路径保留原始大小写，确保在大小写敏感的文件系统上稳定工作。
- **配合 Dev Server 整页刷新**：预打包的外部依赖产物通常无法安全热替换，建议配置 `hot: false` 并保持 `liveReload: true`，在重新编译完成后自动刷新浏览器。

## 与 Vite 入口的差异

| 对比项     | Vite（`/vite`）                             | Webpack（`/webpack`）                                       |
| ---------- | ------------------------------------------- | ----------------------------------------------------------- |
| 监听机制   | `hotUpdate` + `moduleGraph.onFileChange`    | `compilation.contextDependencies.add(outputPath)`           |
| 扩展名过滤 | 按 `extensions` 过滤并忽略 `.map`           | 由 Webpack 目录级监听器触发重编译                           |
| 刷新方式   | 防抖发送 `ws.send({ type: 'full-reload' })` | 由 `devServer.liveReload: true`（`hot: false`）控制整页刷新 |

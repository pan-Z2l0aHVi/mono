# deps-reload 包指令

- 一个 Unplugin，监听本地 workspace 包 `dist/` 目录变更并触发整页刷新，供开发期使用。
- 单入口包，使用 `vp pack`（tsdown）构建；外部化 `node:*`、`@greypan/js-kit`、`unplugin`。
- 使用 Node >=20.11 提供的 `import.meta.dirname` 定位插件自身目录，运行时仅面向 Node 环境。
- 公共 API 使用中文 JSDoc；包 README 提供中英双语，公共 API 变更时同步更新。
- 修改公共行为时通过公共 API 添加聚焦测试（`pnpm --filter @greypan/deps-reload test`）。

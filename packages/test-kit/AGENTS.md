# test-kit 包指令

- Vitest browser mode + MSW 测试基础设施插件，供其他包复用。
- 单入口包，使用 `vp pack`（tsdown）构建；`msw` 为 peer 依赖，不在包内打包。
- 修改 MSW 生命周期或 browser-mode 配置前，先阅读 `docs/agents/testing.md`。
- 公共 API 使用中文 JSDoc；包 README 提供中英双语，公共 API 变更时同步更新。
- 修改公共行为时通过公共 API 添加聚焦测试（`pnpm --filter @greypan/test-kit test`）。

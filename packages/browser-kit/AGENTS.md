# browser-kit 包指令

- 浏览器工具函数库（storage、tracking、环境检测等），子路径导出，使用 `vp build` 构建。
- 仅包含浏览器端代码，不依赖 Node 内置模块；依赖 `@greypan/js-kit`。
- 公共 API 使用中文 JSDoc，说明参数、返回值和副作用；避免 `any`。
- 包 README 提供中英双语，公共 API 变更时同步更新 `README.md` 与 `README.CN.md`。
- 修改公共行为时通过公共 API 添加聚焦测试（`pnpm --filter @greypan/browser-kit test`）。

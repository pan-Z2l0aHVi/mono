# unplugin-web-components 包指令

- Web Components 自动导入的 Unplugin，仅对 `.vue`、`.jsx` 和 `.tsx` 文件执行转换；不处理 vanilla `.js`、`.ts` 或 HTML 文件。
- 单入口包，使用 `vp pack`（tsdown）构建；外部化 `@greypan/js-kit`、`change-case`、`unplugin`。
- 公共 API 使用中文 JSDoc；包 README 提供中英双语，公共 API 变更时同步更新。
- 修改公共行为时通过公共 API 添加聚焦测试（`pnpm --filter @greypan/unplugin-web-components test`）。

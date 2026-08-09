# unplugin-web-components 包指令

- Web Components 自动导入的 Unplugin。对 `.vue`、`.jsx` 和 `.tsx` 文件执行模块转换；Vite 适配器额外通过 `vite.transformIndexHtml` 为 Vite 处理的 HTML 入口（`index.html` 等构建入口）注入组件导入脚本。不处理 vanilla `.js`/`.ts`，也不处理非构建 HTML（`public/` 静态文件、直接双击打开的文件）。
- HTML 注入是 Vite 专属能力；Webpack 适配器只做模块源码转换，不提供 HTML 注入。HTML 中仅识别 kebab-case 自定义元素（大小写不敏感，`<WEB-UI-BUTTON>` 归一到 `web-ui-button`），不支持驼峰/帕斯卡标签。
- 单入口包，使用 `vp pack`（tsdown）构建；外部化 `@greypan/js-kit`、`change-case`、`unplugin`。
- 公共 API 使用中文 JSDoc；包 README 提供中英双语，公共 API 变更时同步更新。
- 修改公共行为时通过公共 API 添加聚焦测试（`pnpm --filter @greypan/unplugin-web-components test`）。

# unplugin-web-components

- 模块转换支持 `.vue`/`.jsx`/`.tsx`，Vite 另经 `transformIndexHtml` 处理 Vite 构建入口 HTML；不扩展到 vanilla `.js`/`.ts` 或 `public/` 等非构建 HTML，除非先更新该边界的设计决策。
- HTML 注入只在 Vite；Webpack 只做源码转换。HTML 注入只识别 kebab-case（大小写归一化），模块源码转换同时识别 kebab-case 与 PascalCase；不要删掉源码侧的 PascalCase 支持。

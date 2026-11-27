# unplugin-web-components

- 模块转换支持 `.vue`/`.jsx`/`.tsx`，Vite 另经 `transformIndexHtml` 处理构建入口 HTML；不扩展到 vanilla `.js`/`.ts` 或 `public/` 等非构建 HTML。
- HTML 注入仅限 Vite（只认 kebab-case）；Webpack 只做源码转换（同时认 kebab-case 与 PascalCase，重构时保留 PascalCase 支持）。

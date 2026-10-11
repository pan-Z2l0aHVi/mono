# unplugin-web-components

- 模块转换支持 `.vue`/`.jsx`/`.tsx`，Vite 另经 `transformIndexHtml` 处理 Vite 构建入口 HTML；不扩展到 vanilla `.js`/`.ts` 或 `public/` 等非构建 HTML，除非先更新该边界的设计决策。
- HTML 注入只在 Vite；Webpack 只做源码转换。标签按 kebab-case 识别，大小写归一化，不支持驼峰/帕斯卡。

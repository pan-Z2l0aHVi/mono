# unplugin-web-components 包指令

- 模块转换支持 `.vue`、`.jsx`、`.tsx`；Vite 适配器另通过 `transformIndexHtml` 处理 Vite 构建入口 HTML。不要扩展到 vanilla `.js`/`.ts` 或 `public/` 等非构建 HTML，除非先更新该边界的设计决策。
- HTML 注入只属于 Vite；Webpack 只做模块源码转换。HTML 标签按 kebab-case 自定义元素识别，大小写归一化，不支持驼峰/帕斯卡标签。
- 公共行为通过公共 API 添加聚焦测试，并核对两种 bundler adapter 的边界。

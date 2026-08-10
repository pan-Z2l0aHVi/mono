# Lint 与格式化

- **格式化工具**：`vp fmt`（通过 vite-plus 配置兼容 Prettier）
  - 使用单引号、无分号、120 字符打印宽度、无尾逗号、省略箭头函数括号
  - 启用 Import 排序（内置 → 外部 → 内部 → 父级 → 同级 → index）
- **Linter**：`vp lint`（通过 vite-plus 使用 oxlint，支持类型感知）
- **拼写检查**：对暂存文件执行 cspell。自定义词典条目位于根目录 `cspell.json` 的 `words` 数组中；将工具/协议标识符添加到该处，而非使用行内 `cspell:disable` 注释。
- **CSS lint**：对 `.css`、`.vue` 使用 stylelint（项目使用 Tailwind CSS，不使用 SCSS）
- **CSS 嵌套**：web-ui 组件样式使用原生 CSS 嵌套语法（`vp build` 配置了 LightningCSS 转译），禁止扁平化写法
- **换行符**：强制使用 LF（`.gitattributes`：`* text=auto eol=lf`）

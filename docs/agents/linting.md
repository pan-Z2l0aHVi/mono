# Lint 与格式化

- **格式化工具**：`check:vp` 的 `vp check` 在 CI 中只读检查 Web 格式；提交 hook 的 `vp staged` 对全部暂存路径运行 `vp check --fix`，并额外对暂存的 `.go` 文件运行 `gofmt -w`。Go 格式化以 `gofmt` 任务为准，未作为独立 CI 门禁。
  - Vite Plus 使用单引号、无分号、120 字符打印宽度、无尾逗号、省略箭头函数括号
  - 启用 Import 排序（内置 → 外部 → 内部 → 父级 → 同级 → index）
- **Linter**：`check:vp` 运行 `vp check`（通过 vite-plus 使用 oxlint，支持类型感知），同时执行 Web 格式与 TypeScript 类型检查。
- **拼写检查**：对暂存文件执行 cspell。自定义词典条目位于根目录 `cspell.json` 的 `words` 数组中；将工具/协议标识符添加到该处，而非使用行内 `cspell:disable` 注释。
- **CSS lint**：对暂存的 `.css`、`.vue` 使用 stylelint（项目使用 Tailwind CSS，不使用 SCSS）；它由 `vp staged` 触发，不属于根 `vp check`。
- **Interweave Go**：`vp` 不处理 `.go`。提交 hook 使用 `gofmt -w` 格式化暂存的 Go 文件；根 `pnpm run check:go` 通过 Interweave workspace 运行整个 Wails Go module 的 `go vet ./...`。
- **CSS 嵌套**：web-ui 组件样式使用原生 CSS 嵌套语法（`vp build` 配置了 LightningCSS 转译），禁止扁平化写法
- **换行符**：强制使用 LF（`.gitattributes`：`* text=auto eol=lf`）

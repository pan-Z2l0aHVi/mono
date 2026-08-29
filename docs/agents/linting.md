# Lint 与格式化

- **格式化工具**：`vp check` 运行格式化、lint 与类型检查（通过 `fmt.ignorePatterns` 排除第三方 `.agents/skills/`）；提交 hook 的 `vp staged` 对暂存路径运行 `vp check --fix`，并额外对暂存的 `.go` 文件运行 `gofmt -w`、对 `.css/.vue` 运行 `stylelint --fix`。
  - **自动修复**：运行 `CI=true pnpm run fix:code` 一键执行全仓代码格式化、Go 格式化与样式修复（聚合 `vp check --fix` + `pnpm run fix:go` + `pnpm run fix:stylelint`）。在非交互环境/Agent 会话中指定 `CI=true` 可避免 `vp` 版本更新检查阻塞。
  - Vite Plus 使用单引号、无分号、120 字符打印宽度、无尾逗号、省略箭头函数括号
  - 启用 Import 排序（内置 → 外部 → 内部 → 父级 → 同级 → index）
  - 第三方 `.agents/skills/` 通过 `fmt.ignorePatterns` 排除格式化；更新或新增第三方 skill 时，通过 `npx skills@latest` 同步 lock。仓库自编写 skill 不在此例外内。
- **Linter**：`vp check` 运行 oxlint（支持类型感知）与 TypeScript 类型检查。`CI=true pnpm run check:code` 聚合 `check:cspell`、`vp check` 与 `check:go`。
- **拼写检查**：执行 `pnpm run check:cspell`。自定义词典条目位于根目录 `cspell.json` 的 `words` 数组中；将工具/协议标识符添加到该处，而非使用行内 `cspell:disable` 注释。
- **CSS lint**：对 `.css`、`.vue` 使用 stylelint（项目使用 Tailwind CSS，不使用 SCSS）；全量检查使用 `pnpm run check:stylelint`，自动修复使用 `pnpm run fix:stylelint`。提交时由 `vp staged` 增量触发。
- **Go**：`vp` 不处理 `.go`。提交 hook 使用 `gofmt -w` 格式化暂存的 Go 文件；`pnpm run check:go` 自动发现所有 `go.mod` 并运行 `go vet`；`pnpm run fix:go` 全量格式化。
- **CSS 嵌套**：web-ui 组件样式使用原生 CSS 嵌套语法（`vp build` 配置了 LightningCSS 转译），禁止扁平化写法
- **换行符**：强制使用 LF（`.gitattributes`：`* text=auto eol=lf`）

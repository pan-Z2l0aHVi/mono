# Lint 与格式化

- **格式化工具**：`vp check` 运行格式化、lint 与类型检查（通过 `fmt.ignorePatterns` 排除第三方 `.agents/skills/`）。格式化/修复的统一入口是 `CI=true pnpm run fix:code`，它的聚合项（`vp check --fix`、`fix:go`、`fix:stylelint`）也可单独运行；workflow 的 `freeze` 在快照前调用同一聚合（机制见 [`workflow.md`](workflow.md)）。代码生成器与 `release:version` 同样会改写文件，但不属 lint 管线，其入口见 [`build.md`](build.md) 的「生成物生命周期」与「CI 与发布」。提交 hook 的三条调用不带 fix 开关，也就不会改写文件：`.vite-hooks/pre-commit` 只跑 `pnpm task guard`（`commit-msg` 只跑 commitlint），而 guard 在提交边界跑的 `.agents/checks/format-clean` 只判定不修复——它拿暂存清单，检查这些文件的**工作区副本**是否干净（`vp check` 连 lint 与类型一起判），未通过就拒绝提交，修复由作者自己跑。旧的 `vp staged` 增量修复已随 ADR-0014 退役（退役理由见 [`workflow.md`](workflow.md)）。
- **自动修复**：运行 `CI=true pnpm run fix:code` 一键执行全仓代码格式化、Go 格式化与样式修复（聚合 `vp check --fix` + `pnpm run fix:go` + `pnpm run fix:stylelint`）。在非交互环境/Agent 会话中指定 `CI=true` 可避免 `vp` 版本更新检查阻塞。
- **代码风格**：由 `vite.config.ts` 的 Vite Plus / oxlint 配置与 `.editorconfig`（LF）强制；按配置输出，不手工对抗工具。
- **第三方 skills 排除**：`.agents/skills/` 整体通过 `fmt.ignorePatterns` 排除格式化（覆盖第三方与仓库自编写 skill）；更新或新增第三方 skill 时，通过 `npx skills@latest` 同步 lock。
- **Linter**：`vp check` 运行 oxlint（支持类型感知）与 TypeScript 类型检查。`CI=true pnpm run check:code` 聚合 `check:cspell`、`vp check`、`check:go` 与 `check:stylelint`。
- **Vue 模板盲区**：oxlint/shadcn 规则不解析 `.vue` 模板（oxc 上游架构限制，见 oxc#15761/#20465），只覆盖其 `<script>` 块——模板内的 class 与内联样式**没有 JS lint 覆盖**（stylelint 与格式化仍覆盖 `.vue`；不要用 `lint.ignorePatterns` 排除 `.vue`，那会连 script 块的 lint 一起丢掉）。需校验 Vue 模板类名时另行接入 ESLint + `eslint-plugin-better-tailwindcss`（未启用）。
- **拼写检查**：执行 `pnpm run check:cspell`。自定义词典条目位于根目录 `cspell.json` 的 `words` 数组中；将工具/协议标识符添加到该处，而非使用行内 `cspell:disable` 注释。检查只覆盖代码文件（不含 `.md`），所以为文档措辞扩词典没有意义，测试 fixture 的标识符也应优先取可拼写的词，别把个人用户名塞进共享词典。
- **CSS lint**：对 `.css`、`.vue` 使用 stylelint（项目使用 Tailwind CSS，不使用 SCSS）；全量检查使用 `pnpm run check:stylelint`（已并入 `check:code`，随 CI 运行），自动修复使用 `pnpm run fix:stylelint`。
- **CSS 嵌套**：web-ui 组件样式使用原生 CSS 嵌套语法（`vp build` 配置了 LightningCSS 转译），禁止扁平化写法
- **Go**：`vp` 不处理 `.go`。`pnpm run check:go` 先用 `gofmt -l .` 断言全仓无未格式化文件，再自动发现所有 `go.mod` 逐个 `go vet`；`pnpm run fix:go` 执行 `gofmt -w .` 并跑同一批 `go vet`。提交边界同样覆盖 Go：`.agents/checks/format-clean` 对暂存的 `.go` 跑 `gofmt -l`（只判定，`-l` 的结论走 stdout 而非退出码），所以 `-w` 只属于 `fix:go`。

# Lint 与格式化

格式化与 lint 交给工具链，agent 编写代码时无需手动格式化；检查与修复入口是根 [`package.json`](../../package.json) 的 `check-code` 与 `fix-code`；`CI=true` 用于关掉 vp 的交互提示（确认与 spinner），避免非交互会话被挂起。提交 hook 的 `check-pre-commit` 只判定、不改写文件（入口会先物化 `@greypan/monorepo-kit` 产物供判定读取）。

以下约束无法从工具与配置推导，需显式记住：

- **门禁构成**：`check-code` 依次跑 cspell、`vp check`（格式 + oxlint + 类型检查）、`check-go`（gofmt / go vet）与 stylelint；只跑 `vp check` 不等于过了 `check-code`。
- **warning 也是失败**：`vite.config.ts` 的 `lint.options.denyWarnings` 让 `warn` 级规则同样以非零退出；`reportUnusedDisableDirectives: 'error'` 让残留的 `oxlint-disable` / `eslint-disable` 注释直接报错，删改规则后要同步清理。
- **脚本也在 lint 范围内**：`scripts/**` 与 `.github/scripts/**` 不再被忽略；只有 skill 实体/软链面（`skills/**`、`.agents/skills/**`、`.claude/**`）和 demo 生成物不参与 lint。
- **未使用与相等比较**：`no-unused-vars` 为 error，以下划线开头的参数与变量可豁免；`eqeqeq` 用 `smart`，只放行 `== null` 与同类型字面量比较。`no-undef` 只对 JS 生效，TS 交给类型检查。
- **只作类型的导入与副作用**：`consistent-type-imports` 会把只出现在类型位置的绑定改成 `import type`。如果该模块的副作用是必需的（Lit 自定义元素注册、`sideEffects` 入口），必须另留一条显式副作用导入（如 `import '..'`）；否则元素不会升级，测试里表现为 `xxx is not a function` 或读不到 token。`import/no-duplicates` 会把同一模块的旁路导入合并进已存在的具名导入，语义不变。
- **Vue 模板盲区**：oxlint 与 shadcn 规则不解析 `.vue` 模板（oxc 上游限制，见 oxc#15761/#20465），只覆盖 `<script>` 块，模板内的 class 与内联样式没有 JS lint 覆盖。不要用 `lint.ignorePatterns` 排除 `.vue`，那会连 script 块的 lint 一起丢掉。
- **CSS**：`packages/web-ui` 的组件样式是原生 CSS，嵌套由 `vp build` 的 LightningCSS 转译，优先使用嵌套写法。

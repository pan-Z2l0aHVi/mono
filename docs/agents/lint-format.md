# Lint 与格式化

格式化与 lint 交给工具链，agent 编写代码时无需手动格式化；检查与修复入口是根 `package.json` 的 `check-code` 与 `fix-code`；`CI=true` 用于避免 vp 的版本更新检查阻塞非交互会话。提交 hook 的 `check-pre-commit` 只判定、不改写文件。

以下约束无法从工具与配置推导，需显式记住：

- **Vue 模板盲区**：oxlint 与 shadcn 规则不解析 `.vue` 模板（oxc 上游限制，见 oxc#15761/#20465），只覆盖 `<script>` 块，模板内的 class 与内联样式没有 JS lint 覆盖。不要用 `lint.ignorePatterns` 排除 `.vue`，那会连 script 块的 lint 一起丢掉。
- **CSS**：`packages/web-ui` 的组件样式是原生 CSS，嵌套由 `vp build` 的 LightningCSS 转译，优先使用嵌套写法。

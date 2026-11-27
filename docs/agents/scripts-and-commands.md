# 脚本边界与根命令规范

完整根命令面以根 [`package.json`](../../package.json) 为准；本文只记无法从配置推导的脚本分工、测试契约与命名边界。`.github/scripts/**` 归 CI workflow 管理，不适用本文。

## 根命令命名与 namespace

- 形状为 `{namespace}:{do}-{something}` 或无 namespace 基础命令；`namespace` 闭集为 `agent`（agent 自身工作流）/ `ci`（CI 编排）/ `dev`（本地起服务）。
- **不为单一需求新增根命令**：属于某个包的能力放进该包 `package.json`；skill 携带的 CLI 不在根 `package.json` 重复登记。
- 机检守护命令形状、namespace 闭集与带 namespace 的文档命令引用，但不覆盖无 namespace 裸单词引用（靠 review 发现）。

## 脚本分层与运行时选择

- **根 `scripts/` 执行面**：`checks/`（门禁与脚本测试薄入口）、`policies/`（本仓路径/包名策略事实）、`workflow/`（提交与发布辅助）、`maintenance/`（清理、环境体检与 skills 维护）、`lib/`（仅放 Node 启动前由 `.mise.toml` 求值的 bootstrap helper）。门禁原子能力全部住在 [`packages/monorepo-kit`](../../packages/monorepo-kit)（详见其 [`AGENTS.md`](../../packages/monorepo-kit/AGENTS.md)）。
- **全仓稀疏守卫**：`check-policy`、`check-context`、`test-scripts` 前置 `full-checkout` 检查，稀疏态下拒绝执行；`check-pre-commit` 允许稀疏树运行。
- **POSIX `sh` vs Node ESM**：系统探测与外部 CLI 串联优先 `sh`；结构化解析（JSON/YAML/Markdown）、代码生成、状态机或复用 `@greypan/monorepo-kit` 用 Node ESM。**禁止在 `sh` 里拼 `node -e` / heredoc JS，也禁止在 Node 里用 `sh -c` 完成可由 argv 表达的调用**（测试夹具除外）。
- **准入与授权**：仅在稳定高频复用且现有命令/配置无法表达时新增永久脚本；变更根脚本暴露的共享命令按 [`workflow.md`](./workflow.md#授权边界与-pr-自动跟进) 取得授权。

## 脚本测试契约

- 测试文件可选；一旦存在必须与被测文件**同目录同名**（`foo.{mjs,ts,sh}` → `foo.test.mjs`）。
- 全仓 tracked `*.test.mjs` 由 `pnpm run test-scripts` 自动发现；每个测试脚本成功时**必须在 stdout 打印一行 `<仓库相对路径>: all assertions passed`**（缺失或路径不匹配即失败）。`@greypan/monorepo-kit` 的 `*.spec.ts` 由包内 `vp test run` 执行，不在两处重复登记。
- 脚本必须非交互、从任意 cwd 可运行（仓库级用 `import.meta.dirname` 定位根，Git/任务级用 `git rev-parse --show-toplevel`）。

# Mono Agent Entry

pnpm + Turborepo monorepo：发布 `@greypan/*` 工具包与 Lit Web Components（`@greypan/web-ui`），维护 React/Vue 文档站与桌面集成应用（Interweave）。实现以源码、`package.json`、配置和测试为准；文档只补代码读不出的硬边界。

## 不可绕过的仓库边界

- **禁止手写或手改入库生成物**：只允许运行对应 generator 产生 diff；清单与重生入口见 [`generated-artifacts.md`](docs/agents/generated-artifacts.md)。
- **禁止改动工具链与敏感配置**：不得读写 `.env*`/凭证，不得改写 `.npmrc`、`.mise.toml` 的 registry/mirror 或任何 Git 配置（`apps-sparse-checkout` 管理 worktree sparse config 除外）。
- **任务 worktree 隔离**：一个可变任务对应一个独立 worktree；不得在共享主工作区执行 `git switch`、`git checkout`、`git stash`、`git reset` 或 `git clean`。
- **测试证据不入库**：`**/__screenshots__/` 与 `**/.vitest-attachments/` 非源码产物，除非任务明确要求更新视觉基线，否则不创建、不提交。
- **指令文档语言**：根与包级 `AGENTS.md`、`docs/adr/`、`docs/agents/`、`.agents/rules/` 与自撰 skill 用中文；技术术语、命令、路径与包名保留英文。第三方 `.agents/skills-vendored/` 保持上游原文，冲突时以本仓为准。
- **工具链外壳**：未激活 mise 的 shell 中，执行 turbo 或调用被钉工具（node/pnpm/go/wails3）须用 `mise exec --` 包装；`pnpm run agent:env-doctor` 例外须裸跑。

## 自主执行与授权边界

独立任务 worktree 内的只读调查、以及非破坏性本地构建、测试、lint、类型检查与源码修复闭环无生产副作用，可直接自主推进并修复至验证通过，无需每步请示；**禁止为让失败检查变绿而擅自调大任何 timeout 或重试上限**。

外部/不可逆高风险操作（首次创建 PR、合并 PR、force-push、发布、改依赖或 CI workflow、不可逆删除）的授权边界，以及**PR 创建后的自动跟进、核实、修复推送与误判回复闭环**见 [`workflow.md`](docs/agents/workflow.md#授权边界与-pr-自动跟进)。

## 核心工程原则

- **Plugin over inheritance**：共享状态与行为通过 [`packages/js-kit/src/plugin-system/`](packages/js-kit/src/plugin-system/) 函数组合实现，不以 class 继承层级承载。
- **Acyclic workspace graph**：工作区依赖保持有向无环，`@greypan/js-kit` 是运行时基础包。

## 按任务加载

<!-- prettier-ignore -->
| 任务场景 | 先读 |
| --- | --- |
| 构建、打包、demo dev、lint 盲区、CI 缓存与门控 | [build.md](docs/agents/build.md)、[ci.md](docs/agents/ci.md) |
| 入库生成物清单、重新生成与审查滤除 | [generated-artifacts.md](docs/agents/generated-artifacts.md) |
| 本地验证、全量 check 门、浏览器/原生冒烟与资源回收 | [verification.md](docs/agents/verification.md)、[test-authoring](.agents/skills/test-authoring/SKILL.md) |
| 跨包公共契约与影响面分析 | [monorepo-change-impact](.agents/skills/monorepo-change-impact/SKILL.md) |
| 工作流、授权边界、提交规范、PR 自动跟进与审查、发布 | [workflow.md](docs/agents/workflow.md)、[review.md](docs/agents/review.md)、[release.md](docs/agents/release.md) |
| Worktree 初始化、mise/缓存、依赖放置与脚本/根命令规范 | [environment.md](docs/agents/environment.md)、[scripts-and-commands.md](docs/agents/scripts-and-commands.md) |

作用域规则（Claude Code 按 `paths:` 自动注入，Codex 按需读取）：[ui-style.md](.agents/rules/ui-style.md)、[docs-style.md](.agents/rules/docs-style.md)。

架构地图与 ADR：[ARCHITECTURE.md](ARCHITECTURE.md)、[docs/adr/README.md](docs/adr/README.md)；按需物理隔离 `apps/*` 见 [apps-sparse-checkout](.agents/skills/apps-sparse-checkout/SKILL.md)。

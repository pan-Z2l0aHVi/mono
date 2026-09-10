# 贡献与 Agent 工作流

本文件是仓库协作流程的短入口；代码事实以源码、manifest、配置和测试为准。详细规则按根 `AGENTS.md` 的任务路由按需加载。

## 开始前

1. 查看 `git status --short --branch`，不要覆盖已有工作区变更。
2. 阅读 `AGENTS.md`；进入 `apps/` 或 `packages/` 后再阅读最近的包级 `AGENTS.md`。
3. 只读调查可以按需加载 rule/guide；任何实施前必须读取 [`docs/agents/workflow.md`](docs/agents/workflow.md)，创建 task state，并完成 `pnpm agent:workflow check --task <task-id> --phase edit`。
4. 需要全局拓扑时阅读 [`ARCHITECTURE.md`](ARCHITECTURE.md)；需要跨包原则、术语或 ADR 时再阅读 [`CONTEXT.md`](CONTEXT.md)。
5. 对源码任务只加载命中的 rule/guide，避免把整个 instruction system 预加载进上下文；需要快速建立全局模型时优先看 `ARCHITECTURE.md`，不要默认加载全部 ADR。
6. 对含有多个可观察阶段的任务，在 ACP 提供计划界面时创建并维护 plan；每完成分析、实施、验证或已获授权的提交阶段，立即同步其状态。最终答复前必须将已完成步骤标为 `completed`，避免客户端显示过期的“执行中”状态。plan 仅反映当前会话进度，不替代 Git、源码或验证证据，也不写入持久化 `agent-state`。

## 角色会话

Role Contract 位于 `.agents/agents/`，只定义当前会话的职责、边界和协作；仓库约束仍以 `AGENTS.md`、目标目录 `AGENTS.md`、rules、skills 和实现事实为准。角色分工、编排路由和 handoff 契约见根 [`AGENTS.md`](AGENTS.md) 的「多 Agent 编排」节与 [`docs/agents/workflow.md`](docs/agents/workflow.md)。

当前 Harness 不会自动选择 Role。新会话先用一条消息初始化 Role：

```text
本会话担任 <role>。读取并遵循 `.agents/agents/<role>.md`，将其作为本会话的角色与协作规范。
```

`<role>` 为 `manager`、`designer`、`lib-coder`、`biz-coder` 或 `reviewer`。Role 在本会话内持续生效；任务可在之后分次提供，且不与某一个 task 绑定。

本仓库使用默认执行体绑定：

| 角色      | 执行体                                               |
| --------- | ---------------------------------------------------- |
| manager   | Claude Code                                          |
| designer  | Claude Code                                          |
| lib-coder | Claude Code                                          |
| biz-coder | Codex CLI                                            |
| reviewer  | Codex CLI（主审）；高风险变更加 Claude Code 二次审查 |

执行体绑定是默认分工：任一执行体在技术上都能承担任一 Role，但偏离默认绑定必须由 Manager 在 task packet 中记录替代执行体与理由。无论由哪个执行体承担，角色目录边界（lib-coder 只写 `packages/*`，biz-coder 只写 `apps/*`）与结构化 handoff 要求都不变。

## 定位和影响分析

- 先从目标 workspace 的 `package.json`、`src/`、测试和 README 定位。
- 变更路径明确后使用仓库内查询工具（`find:usages` / `inspect:contract` / `diff:contract`）做影响分析；工具语义与参数见 [`docs/agents/context.md`](docs/agents/context.md)。
- 不把 `dist/`、`.turbo/`、生成 bindings、route tree 或测试附件当作源码入口。

## 变更分级

变更分级、需先读的文档与最小充分验证以根 [`AGENTS.md`](AGENTS.md) 的「按任务加载」表为权威；最小 context 组合见 [`docs/agents/context.md`](docs/agents/context.md) 的「最小 context 组合」。

## 提交

- 人类交互式提交运行 `pnpm commit`（git-cz + cz-git，按 prompt 选择 type 与 scope），commit message 由 commitlint 校验。
- Agent 与非交互场景使用 `bash scripts/commit.sh`，约束与 AI 署名规则见 [`docs/agents/commit.md`](docs/agents/commit.md)。

## AI 协作署名

- 仅当 AI agent 对某项变更有实质贡献时，才记录署名；不要为展示署名创建空提交或伪造身份。
- Agent 直接创建提交时，author 与 committer 使用该 agent 的官方身份，不再叠加同名 `Co-authored-by` 尾注。
- AI agent 参与人类 author 的提交时，通过 Git trailers 机制追加共同作者尾注：

  ```text
  Co-authored-by: Codex <noreply@openai.com>
  Co-authored-by: Claude <noreply@anthropic.com>
  Co-authored-by: Gemini CLI <218195315+gemini-cli@users.noreply.github.com>
  ```

- 人类提交者仍对需求、设计、审查、测试和最终合并承担全部责任。
- 共同作者尾注用于公开记录协作；GitHub 是否将其显示为独立 Contributors 条目取决于该邮箱能否被 GitHub 识别和归属。

## 交付前

报告：改动文件、影响 workspace、验证命令及结果、workflow task id、当前 phase、未验证的风险和需要用户决定的事项。未经授权不要提交、暂存或重写 Git 历史；关闭任务前必须有通过的验证记录。

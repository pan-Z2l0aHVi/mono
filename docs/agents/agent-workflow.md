# Agent 工作协议

本指南定义 Codex 与 Claude Code 在本仓库中的共享任务协议。它只规定任务阶段、升级边界和交付证据；目录事实、公共契约和当前行为仍以源码、manifest、配置和测试为准。

## 何时加载

- 用户要求实现、修复、重构、审查或验证代码时加载。
- 只做翻译、摘要或不涉及仓库状态的写作时不加载。
- instruction system、仓库拓扑或架构任务还要加载 [`context.md`](context.md)、[`CONTEXT.md`](../../CONTEXT.md) 和相关 ADR。

## 阶段

1. **探索**：检查工作区状态、目标文件、最近的 `AGENTS.md`、manifest、现有测试和当前 diff；不要修改用户已有的未提交工作。
2. **计划**：说明目标、范围、影响面、验证命令和仍需决策的取舍。低风险局部任务不要求长计划。
3. **实现**：只修改允许范围；遵守生成文件、依赖、Git 和包级边界。
4. **独立审查**：涉及公共 API、跨包、UI/UX、浏览器运行时或高风险逻辑时，使用独立 reviewer；实施者不同时担任最终 reviewer。
5. **验证**：按受影响契约选择聚焦测试、根测试、构建、真实浏览器或组合验证；记录命令、结果和缺口。
6. **交付**：报告修改文件、行为变化、验证证据、未解决风险和未执行验证的原因。

涉及独立 review 时，reviewer 必须在不同 worktree 中读取同一实现快照，并在 reviewer worktree 产出 evidence artifact。使用 `pnpm check:agent-review -- --evidence <file> --implementation-worktree <path> --reviewer-worktree <path>` 检查 worktree、身份和快照绑定。

## 自主与升级边界

agent 可以自主完成：

- 非破坏性的探索、搜索和静态分析；
- 影响范围明确的局部实现；
- 与变更直接对应的测试、lint、类型检查和构建；
- 不改变用户工作区的普通报告和评审。

以下情况先暂停并提出方案：

- 公共 API、事件、导出、跨框架适配或依赖方向变化；
- workspace dependency、构建、CI、发布、迁移或版本策略变化；
- 需要删除行为、修改生成流程、终止未知进程或执行破坏性 Git 操作；
- 需求与当前源码、测试、ADR 或其他 agent 的未提交工作冲突。

## 工作区隔离

并行 agent 必须使用不同的 branch/worktree。不得为了切换任务而在共享工作区执行 `git switch`、`git checkout`、`git stash`、`git reset` 或 `git clean`。启动 dev server 前检查端口；只停止当前任务启动的进程。

## 最低交付证据

```md
修改：

- <文件和行为变化>

验证：

- `<命令>`：<通过/失败及关键结果>
- 浏览器：<URL、视口、操作；不适用则说明原因>

风险与缺口：

- <残余风险或未执行验证>
```

## Review evidence

独立 review 必须在 reviewer worktree 中保存 evidence artifact。没有独立 reviewer 能力时明确写 `verification status: not executed`，不得把 profile 被加载当作 review 已完成。

```md
reviewer identity/client: <独立 reviewer 的 client/model 或 agent id>
implementation agent: <实施 agent 的 client/model 或 agent id>
implementation worktree: <绝对路径>
reviewer worktree: <绝对路径>
working-tree-snapshot sha256: <实现 worktree 当前完整 implementation snapshot（HEAD、index、worktree、tracked/untracked 文件及 symlink target）的 SHA-256>
changed files:

- <相对实现 worktree 的文件>
  findings:
- <Block / Should fix / Nit；无问题写“未发现可验证问题”>
  verification status: <executed / not executed / blocked>
  verification evidence:
- <命令、URL、操作和结果>
  residual risks:
- <缺口或无>
```

`implementation worktree` 与 `reviewer worktree` 必须使用绝对路径；检查器会解析 symlink 后与对应 CLI 参数逐一比对。

在交付前运行：

```sh
pnpm check:agent-review -- \
  --evidence <reviewer-worktree>/<run>/review.md \
  --implementation-worktree <implementation-worktree> \
  --reviewer-worktree <reviewer-worktree>
```

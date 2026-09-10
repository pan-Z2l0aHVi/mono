# ADR-0010: Agent 角色编排与执行体绑定

- **Date**: 2026-09-10
- **Status**: 已接受
- **Supersedes**: ADR-0004「角色实施补充（2026-09-01）」中“Role 不与模型、CLI 或固定会话绑定”的结论

## 背景

仓库已通过 ADR-0004 建立共享的 Session Role 层（`manager`、`designer`、`lib-coder`、`biz-coder`、`reviewer`）与 task state 状态机。但角色只定义了身份与边界，没有规定由哪个执行体承担，也没有把“谁编排、何时并行、如何交接、目录边界在哪”写成可执行的流程。

实际协作中出现三个问题：

1. **编排路径不固定**：产品/设计需求与纯技术需求没有区分，Designer 是否参与依赖临时判断。
2. **交接信息不完整**：自由文本交接容易遗漏验收标准、测试命令和未决问题。
3. **目录边界没有落到流程上**：`packages/*` 与 `apps/*` 的角色归属只写在文档表里，没有与角色、worktree 和 handoff 绑定。

## 决策

### 1. 执行体默认绑定

| 角色      | 执行体                                               |
| --------- | ---------------------------------------------------- |
| Manager   | Claude Code                                          |
| Designer  | Claude Code                                          |
| Lib Coder | Claude Code                                          |
| Biz Coder | Codex CLI                                            |
| Reviewer  | Codex CLI（主审）；高风险变更加 Claude Code 二次审查 |

绑定是默认分工，不限制执行体的技术能力；偏离绑定必须由 Manager 在 task packet 中记录替代执行体与理由。执行体绑定不改变状态机、gate 和证据要求。

### 2. 扁平编排与两条路由

Manager 统一接收需求并编排，不引入 Integrator 或其他中间层级；release 聚合与集成验证由 Manager 直接协调。

- **产品/设计需求**：Manager → Designer → 并行 Lib Coder + Biz Coder → Reviewer → Manager 总结。
- **纯技术需求**：Manager → 并行 Lib Coder + Biz Coder → Reviewer → Manager 总结。

是否启用 Designer 由 Manager 判断，判据是需求是否涉及产品设计/UI，而不是改动大小。

### 3. 目录边界即角色边界

Lib Coder 只写 `packages/*`，Biz Coder 只写 `apps/*`；任何角色不得跨边界修改。跨边界需求拆成独立 task 与 worktree，契约通过 handoff 传递，而不是由单个角色越界完成；每个角色使用独立 worktree，或在同一 task worktree 内严格目录隔离。

### 4. 结构化 handoff

角色之间统一使用固定字段的 handoff：`Goal（目标）`、`Scope（范围）`、`Acceptance（验收标准）`、`Test commands（测试命令）`、`Open decisions（未解决决策）`，缺少任一项不得进入实施或验收。完整模板与 Task Packet 格式以 [`docs/agents/task-packet.md`](../agents/task-packet.md) 为权威。

流程权威集中在 [`docs/agents/workflow.md`](../agents/workflow.md) 的「角色与执行体」「编排模式」两节；根 [`AGENTS.md`](../../AGENTS.md) 的「多 Agent 编排」节只保留不可绕过的分工、边界与禁止事项，不复制处方。

## 后果

- `scripts/agent-workflow.mjs` 的角色集合移除 `integrator`，与“不新增层级”一致；集成与 release 由 Manager 承担。
- `scripts/validate-context.mjs` 增加对「多 Agent 编排」「角色与执行体」「编排模式」章节及 handoff 字段名的校验，避免文档与流程漂移。
- `.agents/agents/*` 增加执行体声明与目录边界；`CLAUDE.md`、`GEMINI.md` 只声明客户端默认绑定与加载顺序，不复制共享规则正文。
- 跨包需求的最小执行单元从“一条 vertical slice worktree”收紧为“按 `packages/*` 与 `apps/*` 拆分的 task，或在同一 worktree 内严格目录隔离”，代价是交接次数增加。

## 替代方案

- **不做执行体绑定，保持“任一模型/CLI 承担任一角色”**：灵活，但无法为固定协作链路（Codex 主审、Claude 编排）建立稳定预期；不采用。
- **保留 Integrator 独立层级**：能分担 release 工作，但增加一层编排与状态，违背“保持 Manager 扁平化”；不采用。
- **把 handoff 模板复制进根 `AGENTS.md` 与 `CLAUDE.md`**：看似更易发现，但会产生多处副本并漂移；改为单一权威加根入口字段清单。

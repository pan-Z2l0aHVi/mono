# ADR-0010: Agent 角色编排与执行体绑定

- **Date**: 2026-09-10
- **Status**: 已接受
- **Supersedes**: ADR-0004「角色实施补充（2026-09-01）」中「Role 不与模型、CLI 或固定会话绑定」的结论
- **Amended by**: [ADR-0015](0015-role-contracts-in-herdr-agents-skill.md)、[ADR-0016](0016-implementation-supervision.md)

## 背景

ADR-0004 建立了共享的 Session Role 层和 task state 状态机，但没有说明由哪个执行体承担角色，也没有规定编排、并行、交接和目录边界。

当时有三个问题：

1. **编排路径不固定**：产品/设计需求与纯技术需求没有区分，Designer 是否参与依赖临时判断。
2. **交接信息不完整**：自由文本交接容易遗漏验收标准、测试命令和未决问题。
3. **目录边界没有落到流程上**：`packages/*` 与 `apps/*` 的角色归属只写在文档表里，没有与角色、worktree 和 handoff 绑定。

## 决策

### 1. 执行体默认绑定

Role 到执行体的默认绑定、启动参数和 Reviewer 路由见 [`.agents/skills/herdr-agents/SKILL.md`](../../.agents/skills/herdr-agents/SKILL.md)。这是默认分工，不限制执行体的技术能力；Manager 改用其他执行体时，在 Task Packet 记录理由。绑定本身不改变状态机、gate 和证据要求。

### 2. 扁平编排与两条路由

Manager 统一接收需求并编排，不引入 Integrator 或其他中间层级；release 聚合与集成验证由 Manager 直接协调。

- **产品/设计需求**：Manager → Designer → 并行 Lib Coder + Biz Coder → Reviewer → Manager 总结；不启用实施期 Supervisor。
- **技术需求**：Manager → 并行 Lib Coder + Biz Coder → Reviewer → Manager 总结；按 ADR-0016 的评分决定是否加入 Supervisor。

是否启用 Designer 由 Manager 根据需求是否涉及产品设计或 UI 来判断，不按改动大小决定。Role 派发、handoff、Supervisor 和 pane 时序见 herdr-agents skill。

### 3. 目录边界即角色边界

Lib Coder 只写 `packages/*`，Biz Coder 只写 `apps/*`。Supervisor 可以共享实施 worktree，但只读；实施角色不得跨边界修改。跨边界需求拆成独立 task，各自使用 task worktree，契约通过 handoff 传递。

### 4. 结构化 handoff

角色之间使用固定的 handoff 字段：`Goal（目标）`、`Scope（范围）`、`Acceptance（验收标准）`、`Test commands（测试命令）` 和 `Open decisions（未解决决策）`，缺少任一项不得进入实施或验收。完整模板、Supervisor 检查点和 pane 协作格式见 [`.agents/skills/herdr-agents/SKILL.md`](../../.agents/skills/herdr-agents/SKILL.md)；Task Packet 只保存任务主合同和可选 Coordination 摘要。

task 级别、状态机、review/approval 和验证证据见 [`docs/agents/workflow.md`](../agents/workflow.md)；根 [`AGENTS.md`](../../AGENTS.md) 只保留 skill 路由和不可绕过的 task/worktree 边界。

## 后果

- `scripts/agent-workflow.mjs` 的角色集合移除 `integrator`，与「不新增层级」一致；集成与 release 由 Manager 承担。
- `scripts/validate-context.mjs` 只检查通用 context 能力，不再维护 Role 绑定表、固定 Role 集合或 handoff 字段的镜像。
- Role Contract 位于 `.agents/skills/herdr-agents/roles/`；绑定、启动参数、Supervisor 和 pane 时序位于同一 skill 的 `SKILL.md`。`CLAUDE.md` 保持一行 `@AGENTS.md` import，不复制共享规则正文。
- `scripts/task.mjs` 不再把 Role 写入 task state；`pnpm task assign --roles` 明确拒绝，旧 v1 state 仅作兼容读取。
- 跨包需求可以按 `packages/*` 与 `apps/*` 拆成多个 task，也可以在同一 worktree 内严格隔离目录；代价是交接次数增加。

## 替代方案

- **不做执行体绑定，保持「任一模型/CLI 承担任一角色」**：灵活，但无法为固定的角色-执行体协作链路建立稳定预期；不采用。
- **保留 Integrator 独立层级**：能分担 release 工作，但增加一层编排与状态，违背「保持 Manager 扁平化」；不采用。
- **把 handoff 模板复制进根 `AGENTS.md` 与 `CLAUDE.md`**：看似更易发现，但会产生多处副本并漂移；改为单一权威加根入口字段清单。

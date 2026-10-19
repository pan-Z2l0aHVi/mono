# ADR-0028: Task 分级与记账提取为通用 skill

- **Date**: 2026-10-19
- **Status**: 已接受
- **Amends**: [ADR-0014](0014-task-system-v2.md) 的 task 载体、[ADR-0018](0018-task-state-in-tmpdir.md) 的物理落点、[ADR-0024](0024-task-tiering-v3.md) 的级别判据载体与 [ADR-0025](0025-pr-review-flow.md) 的 schema/命令面
- **Relates to**: [ADR-0027](0027-script-execution-surfaces.md)（根 `scripts/` 的执行面分类）、[ADR-0004](0004-progressive-agent-context-architecture.md)（skill 与 instruction 体系）

## 背景与取舍

Task 分级与本地记账描述的是所有仓库共有的工作方式：先按风险定级，再用一条可丢失的本地记录承载归属与进度。它们不依赖本仓的包图、发布面或 CI 拓扑。此前两者由 `docs/agents/task-levels.md`、`docs/agents/task-ledger.md` 与根 `scripts/workflow/task-ledger.mjs` 承担，文档和实现都只服务本仓，换一个项目就要复制一套并重新维护。

实现里还沉积了与「分级 + 记账」无关的宿主策略：强制工作区干净、task 与 worktree 一对一、GitHub URL 校验、`greypan` 命名空间、owner 最小长度，以及 v1/v2 schema 迁移。这些规则在本仓成立，但不是通用契约；把它们带进 skill 会让别的项目继承本仓的编排假设。

本仓的收益同样明确：删掉两份 task 文档和两个 CLI 后，根 `scripts/` 只保留提交辅助，agent context 少一层复制，命令面从 `task` 的全部相位收敛为纯粹的登记动作。

## 决策

### 1. 只提取分级与记账

本仓自撰 skill `skills/task-ledger/` 承载两件事：风险分级判据，以及本地台账的 CLI、测试与存储契约。worktree 初始化、review、提交、发布与授权流程留在宿主仓库；skill 只声明自己在这些流程里的位置，不复制它们的规则。

skill 以仓库自撰形式存放，实体在 `skills/task-ledger/`，经 `.agents/skills/task-ledger` 软链进入客户端发现面。文档用中文，技术术语、命令与路径保留英文。

### 2. 分级不绑路径

按 T2 → T0 → T1 的顺序判断，先命中即定级：

- T2：非可执行内容，或行为与公共契约都不变的整理。
- T0：公共契约、跨模块运行时行为、根级脚本与共享配置、构建与 CI、依赖、发布、权限或基础设施。
- T1：只位于单个模块内、未命中 T0 的可执行行为。

判据不再引用具体目录或包名。验证深度由宿主仓库的规则决定，skill 只给出最低限度的方向。

### 3. 台账收敛为通用记录

状态目录为 `<系统临时目录>/agent-task-ledger/<repo-id>/`，`repo-id` 由 Git common directory 的物理路径派生，使同一仓库的 worktree 共享记录、不同仓库互相隔离。`AGENT_TASK_ROOT` 与 `AGENT_TASK_STATE_DIR` 只用于隔离和 fixture。

schema 收敛为 v1，状态为 `open`、`active`、`closed`、`dropped`。命令收为 `new`、`start`、`status`、`ref`、`close`、`drop` 与 `help`；`ref` 接受任意 kind/value，不校验引用类型。删除与通用记录无关的检查：干净工作区前提、worktree 分配唯一性、GitHub URL 格式、命名空间、owner 最小长度和旧 schema 迁移。

`new` 记录当前 Git 上下文，不要求工作区干净，也不接管 worktree 分配。`closed` 与 `dropped` 只是本地记录的终态，不表示 review、测试、CI、merge 或发布成功。

### 4. 本仓只留集成面

- 不新增根命令：`AGENTS.md` 与 workflow 类文档直接路由到 skill，命令与调用方式由 SKILL.md 给出；根 `package.json` 不保留转发层。
- 删除 `scripts/workflow/task-ledger.mjs`、`scripts/workflow/task.mjs` 及其测试，删除 `docs/agents/task-levels.md` 与 `docs/agents/task-ledger.md`。
- `workflow.md`、`review.md`、`commit.md`、`release.md` 与 `agent-context.md` 改为直接引用 skill，不复制级别表、命令或恢复处方。
- context 语料检查把 `task-ledger` 纳入自撰 skill 清单，并断言根 `AGENTS.md` 仍路由到 skill。

### 5. 一次性清理旧记录

台账是系统临时目录里的可丢失工作记忆，旧 schema 的 `$TMPDIR/greypan/tasks/` 记录不迁移、不归档，随本次迁移删除。需要保留的交付结论应写入 PR、ADR 或持久文档，而不是台账。

## 后果

正向：

- 分级与记账可以在其他仓库直接复用，不必复制文档或 CLI。
- 本仓指令面与根脚本各少一份本仓专属实现；task 命令面只表达登记动作。
- 存储契约以 GitHub 无关的 repo-id 隔离，不再依赖宿主命名空间。

代价与风险：

- 本仓专用的干净起点、worktree 归属和引用格式校验不再由台账执行，改由宿主流程、review 与 CI 承担。
- 旧 schema 记录与事件历史不做迁移；依赖它们的查询或恢复脚本需要改用新命令重新建账。
- skill 内的 CLI 不运行检查、构建或 Git 写操作，因此不能证明任何质量结论；这是刻意保留的边界。

## 备选方案

- **保留在本仓，其他项目复制**：实现继续携带本仓假设，每个副本都会独立漂移；不满足跨项目复用的目标。
- **发布为 npm package**：台账不是运行时依赖，安装与版本管理成本高于一个自包含脚本；本仓也没有第二个运行时消费者。
- **做成可配置的通用引擎**：配置项会把宿主策略重新带回 skill，并让行为随项目分叉；当前只保留最小契约。

## 验收

- `node skills/task-ledger/ledger.test.mjs` 通过，覆盖分级字段、状态迁移、引用、隔离、损坏记录与非 Git 目录。
- 从 skill 目录可直接运行 `new/start/status/ref/close/drop`，`assign`、`issue`、`pr` 等旧命令被拒绝；根 `package.json` 没有 task 转发命令。
- 根 `AGENTS.md`、`workflow.md`、`review.md`、`commit.md`、`release.md` 与 `agent-context.md` 不再链接已删除的 task 文档。
- `check-context`、`check-policy`、`ci:test-scripts` 与 skill layout 测试通过。

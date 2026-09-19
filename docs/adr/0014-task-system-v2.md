# ADR-0014: Task 体系 v2

- **Date**: 2026-09-18
- **Status**: 已接受
- **Supersedes**: [ADR-0010](0010-agent-role-orchestration.md) 的任务状态机与 mode 词汇、[ADR-0012](0012-instruction-risk-tiering-and-pre-authorized-operations.md) 的风险分级表
- **Amends**: [ADR-0011](0011-agent-model-binding-and-effort.md)（角色默认模型与思考强度分档取消，模型与思考强度由用户会话设置或 Manager 按任务指定）

## 背景

旧 task 体系（ADR-0010/0012）经 89 个 task state 的量化审计后确认：证据链（baseSha/diffHash/review/approval/verify）与提交门禁零故障，但存在四类残余问题——mode 字段名不副实（`orchestrated` 实际是风险档，27/27 单角色；`release`/`hotfix` 在脚本中零行为分支）、post-merge close gate 与 squash merge 结构性冲突、状态残留与快照丢失只能手写 `forcedClose` JSON、`affectedWorkspaces`/`allowedPaths` 是无写入者的 schema 残留字段。用户决定推翻重来：重建一套脱离具体业务的抽象 task 内核，级别只表达 workflow 严格程度，软件迭代操作（release/hotfix）降级为 playbook 文档。

## 决策

### 1. 级别词汇 T0/T1/T2，取代 mode 与风险分级

task 唯一的分档字段是 `level`（t0/t1/t2，T0 最严格），只表达 workflow 严格程度，不再以"风险等级"为主要维度。旧分级判据（跨 workspace、公共契约、多 worktree、instruction system 等）保留为分档规则。P2 的 skip review 场景由 T2 档位吸收（免审、允许当前 worktree 直接修改、guard 只要求 active）；`--review skip` 开关删除。

### 2. 状态机与终态

```text
open -> active -> frozen -> reviewed -> approved -> done
（任何未完结状态可 -> dropped，需 --reason）
```

- `dropped` 是带 reason 的强制终态，取代手写 `forcedClose`/`closedReason` 与残留 task 的手工 JSON 清理。
- review `fail` 使 task 回到 `active`，修复后重新 freeze。
- freeze 可从 `frozen/reviewed/approved` 重入（重算 hash、重置 review/approval），stale 恢复不需要独立 reopen 命令。
- post-merge（集成后验证）gate 删除：合并后正确性交给 CI 兜底。
- committed/integrated/verified/closed 等中间相位删除：验证是证据记录而非相位。

### 3. 证据与事件

- 状态存 `<git-common-dir>/tasks/<task-id>.json`，跨 worktree 共享，schema 单版本。
- `events[]` append-only 事件日志记录全部状态转换（含重 freeze、drop 原因、被跳过的 gate），取代 `manualInterventions` 手工补记。
- 快照指纹沿用 baseSha + 工作区内容的确定性 hash；commit 前后同一内容 hash 不变，guard 与 done 的「hash 一致」校验横跨 commit 边界。

### 4. 归一化与政策检查分离

- freeze 归一化：`git add -A` → `CI=true pnpm run fix:code` → 重新 staging → 计算 diffHash。pre-commit 只保留 `pnpm task guard`，不运行任何 fixer，结构性消除「commit 期改写导致冻结失效」竞态（旧体系的 `vp staged` 双管线收敛方案随之退役）。
- 仓库级政策通过 `.agents/checks/` 可执行检查挂载，freeze 在取快照前执行、非零退出即中止；检查进程经环境变量拿到 task id、level 与 baseSha。内核因此零业务词汇；本仓的 `changeset-required` 检查是第一条政策，对全部级别无豁免（release 聚合 diff 对 base 天然包含被聚合 task 的 changeset）。

### 5. review 拓扑与绑定表

- T0 强制独立 reviewer 会话；T1 强制 review、允许 Manager 派 fresh subagent；T2 免审或 coder 自派 fresh subagent。全程禁止同一会话自审。reviewer id 校验 `^[A-Za-z0-9][A-Za-z0-9._-]{3,39}$` 且必须 ≠ owner。
- 角色 → 执行体绑定表只保留 role 与 executor 两列；默认模型与思考强度分档取消（amends ADR-0011）。绑定表适用于主工作流（herdr + Claude Code / Codex CLI）；任何其他执行体（zcode、workbuddy、pi 等）可承担任一角色，目录边界、task gate、reviewer ≠ owner、handoff 字段等机器强制约束不变；T0/T1 在 task packet 记录替代执行体。
- 编排派发按受影响 workspace 数据驱动：单 workspace 单 coder，跨 workspace 拆 handoff，Designer 按需。

### 6. 测试约定

`scripts/` 采用 Go 风格对称约定：每个脚本一个 `<name>.test.mjs`，`test:scripts` 以 glob 执行全部 `scripts/*.test.mjs`，新增测试文件零注册。

### 7. 载体与迭代

内核实现于 `scripts/task.mjs`（`pnpm task`），不抽独立 package（等第二个消费者出现）；workflow 自迭代维持 prose 政策 + `validate:context` + ADR 流程，不引入 policy 配置引擎。

## 后果

- `scripts/agent-workflow.mjs` 与 `agent-workflow.test.mjs` 删除，`agent:workflow` script 由 `task` 取代；`.vite-hooks/pre-commit` 只剩 `pnpm task guard`。
- 旧 task state 目录 `agent-workflow/` 清空后，`<git-common-dir>/tasks/` 是唯一执行真相。
- release/hotfix 不再是 task 体系概念；release.md 改述为 release playbook，hotfix 独立成 playbook，各自声明如何满足级别 gate（workflow 文档重建阶段落地）。
- 跨包集成损坏不再有 post-merge gate 兜底，依赖 CI；`fix:code` 依赖 node_modules，冷 worktree 需先安装依赖。
- instruction 预算基线（`scripts/instruction-budget.json`）随 `audit:instructions` 一并退役，不再维护。

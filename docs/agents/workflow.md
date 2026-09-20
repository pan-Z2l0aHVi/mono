# 开发与协作工作流

本文件是 monorepo 所有实施任务的必经流程。它定义任务级别、状态机、变更证据和角色交接；内核实现见 [`scripts/task.mjs`](../../scripts/task.mjs)（`pnpm task`），worktree 细节见 [`worktrees.md`](worktrees.md)，release playbook 见 [`release.md`](release.md)、hotfix playbook 见本文「Playbook」节，任务交接包见 [`task-packet.md`](task-packet.md)。Herdr、Claude、Codex 等只是执行适配层，不改变本流程的状态和 gate。任务体系的完整决策见 [ADR-0014](../adr/0014-task-system-v2.md)。

## 先建立任务

<!-- invariant:workflow-states -->

所有实施任务（判据见「任务级别」）必须先完成以下 preflight：

1. 查看 `git status --short --branch`，确认当前工作区和目标 worktree 的已有变更归属。
2. 读取根 `AGENTS.md`、本文件和命中的 rule/guide；进入 workspace 后读取最近的包级 `AGENTS.md`。
3. 为任务选择唯一、不可变的 task id 和级别（T0/T1/T2，T0 最严格）。
4. 在目标 worktree 执行（新 worktree 先跑一次 `pnpm install && pnpm run build`，判据见 [`worktrees.md`](worktrees.md)「创建和复用」）：

   ```sh
   pnpm task new --task <task-id> --level t0|t1|t2 --issue <issue-url|N/A>
   pnpm task assign --task <task-id> --roles <role,...> --worktree <path>
   pnpm task start --task <task-id>
   ```

5. 记录范围、验收标准和所需验证；推荐写入 task packet。GitHub issue 是可选追踪镜像，创建时经 `--issue` 记入 task state；`status` 会对缺失 issue 的 task 打 stderr 提示，事后补挂用 `issue` 子命令。issue 只作追踪镜像，不是执行真相，本地 task state 不能依赖外部服务。

## 任务级别

<!-- invariant:risk-tiering -->

级别代号 T0/T1/T2（T0 最严格），只表达 workflow 严格程度。判据全部可从变更路径、manifest 和 `pnpm find:usages` 输出查证，不依赖主观的「大改/小改」判断；判据本身描述的是变更的影响半径，不是任务的价值排序。

| 级别 | 判据（命中任一即属该级）                                                                                                                                                                                         | worktree                 | review                                       | approval | done 前 ≥1 条 pass 验证 | commit gate（guard） |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | -------------------------------------------- | -------- | ----------------------- | -------------------- |
| T0   | 跨 workspace 的公共 API/exports/事件/类型契约；依赖、catalog、lockfile、构建配置或 CI；聚合发布或多 worktree 并行                                                                                                | 专属 task worktree       | 强制，独立 reviewer 会话（reviewer ≠ owner） | 必须     | 是                      | approved + hash 一致 |
| T1   | 跨多个 workspace（`apps/*` / `packages/*`）但不改 T0 所列契约；公共导出变更但消费者仍在同一 workspace；改动 instruction system、`.agents/` 或根 `scripts/*.mjs` 的行为                                           | 专属 task worktree       | 强制，允许 Manager 派 fresh subagent         | 必须     | 是                      | approved + hash 一致 |
| T2   | 改动全部落在一个 workspace 内，或只落在 `docs/` 等仓库根文档目录；且不改依赖字段与 lockfile、不改 CI 与 workspace 配置、不改被其它 workspace 消费的导出符号、不改 instruction system 与根 `scripts/*.mjs` 的行为 | 允许当前 worktree 直接改 | 免审（可自派 fresh subagent）                | 不要求   | 推荐不作强制            | active 即可提交      |

多级同时命中取最高级（T0 > T1 > T2）。级别判定可机器查证：`pnpm find:usages -- <paths...>` 只输出一个受影响 workspace 时，T2 的单 workspace 条件成立。本表是每级严格程度的唯一权威，「状态机」节不复制。

release playbook 与 hotfix playbook 是普通 task 在特定场景下的操作程序（见「Playbook」节），它们不是 task 体系的概念。

## 预授权操作

<!-- invariant:pre-authorized-ops -->

以下操作属于已知安全的工作流，直接执行并修复本次改动导致的问题即可，不必逐步请示：

- 运行仓库既有测试与校验命令：`pnpm test`、`pnpm run test:scripts`、`pnpm run test:affected`、包级 `test`、`pnpm run check:code`、`pnpm run check:cspell`、`pnpm run validate:context`。
- 修复本次改动导致的失败并重跑受影响的测试。
- 包级 build 与 `pnpm run build`、`pnpm run build:affected`。
- 只读查询：`pnpm find:usages`、`pnpm inspect:contract`、`pnpm diff:contract`、`pnpm task status`、`git status`、`git diff`、`git log`。
- 在目标 worktree 内读取任意文件。

以下操作仍必须逐次获得用户明确授权：commit、push、merge、tag、publish、release；依赖、catalog、lockfile 的任何改动；`.npmrc`、`.mise.toml` 与 Git 配置；凭证、密钥与 `.env` 的读写；破坏性 git 操作（`reset --hard`、`push --force`、`clean`、`stash`）。

## 状态机

任务状态保存在 Git common dir 的 `tasks/<task-id>.json`，不进入工作树版本控制。状态只能按以下顺序推进：

```text
open -> active -> frozen -> reviewed -> approved -> done
                                                    （任何未完结状态可 -> dropped，需 --reason）
```

实际命令与状态的关系：

| 阶段       | 必要条件                                                     | 命令或交接          |
| ---------- | ------------------------------------------------------------ | ------------------- |
| `open`     | 有 task id、level、base SHA、branch、worktree                | `pnpm task new`     |
| `active`   | 已完成 preflight，允许实施                                   | `pnpm task start`   |
| `frozen`   | 变更路径和内容已形成稳定快照                                 | `pnpm task freeze`  |
| `reviewed` | reviewer 对冻结 hash 给出 `pass`；`fail` 使 task 回到 active | `pnpm task review`  |
| `approved` | 对同一个 hash 批准并记录 approver                            | `pnpm task approve` |
| `done`     | 交付结论已记录，验证 gate 通过                               | `pnpm task done`    |
| `dropped`  | 任务终止或残留清理，强制 `--reason`                          | `pnpm task drop`    |

以下 gate 是硬条件：

- 未 `new` 不得实施；未 freeze 不得 review；review 和 approval 必须绑定同一个 `diffHash`。
- 冻结 `diffHash` 的 canonical 口径是 `scripts/task.mjs` 的快照哈希（sha256 依序吸收 baseSha 与每个快照文件的路径、mode、内容，覆盖 tracked+untracked），不是 git diff 的摘要；reviewer 核验冻结一致性以 `pnpm task status --task <id>` 的 `live` 比对（hash 一致 + 非 stale）为准，不要用 `git diff | shasum` 自制配方复算。
- freeze、review 或 approval 后任何文件变化都会使证据 stale；必须重新 freeze（重算 hash 并重置 review/approval），再重复 review、approve。
- `pnpm task verify` 只接受非 stale 的结果，pass 验证还要求工作区干净（验证必须覆盖已提交内容）；`done`（T0/T1）要求最新一条验证为 pass 且快照与验证时一致。
- T2 的快速通道：`new → start → 修改 → done`，guard 只要求提交发生在 active task 内。

常用命令：

```sh
pnpm task status --task <task-id>
pnpm task freeze --task <task-id>
pnpm task review --task <task-id> --result pass --reviewer <reviewer-id>
pnpm task approve --task <task-id> --approver <manager-or-user-id>
pnpm task verify --task <task-id> --name "pnpm test"
pnpm task issue --task <task-id> --ref <issue-url|N/A>
pnpm task done --task <task-id>
pnpm task drop --task <task-id> --reason <reason>
```

freeze 自身执行归一化管线：`git add -A` 全量 staging（快照语义本就覆盖全部 tracked+untracked 文件），运行 `CI=true pnpm run fix:code`，把归一化后的内容计入 `diffHash`。归一化是强制的。声明了 `fix:code` 的仓库若依赖未安装，freeze 直接失败；先在 worktree 里执行 `pnpm install && pnpm run build` 再重试。只有不含 `fix:code` 脚本的仓库（测试 fixture、纯 git 仓库）才跳过。pre-commit 只保留 guard、不运行任何 fixer，因此不存在 commit 期改写文件导致冻结失效的竞态。freeze 在取快照前还会执行 `.agents/checks/` 下的可执行政策检查（本仓为 changeset 必带检查），失败即中止并保留可观察原因。

提交边界由受版本控制的 `.vite-hooks/pre-commit` 再次检查。它通过 `pnpm task guard` 自动发现当前 worktree 的 active task；T0/T1 只有 `approved` 且冻结 diff 未变化时才允许提交，T2 只要求 active。提交 hook 保护的是 commit 边界，不能替代实施前的 `new` 和 `start`。

每次状态转换、重 freeze 和 drop 都会追加到 state 的 `events[]` 时间线（含旧 hash 与原因），供事后审计，不需要任何手工补记。

## 角色与执行体

角色定义会话身份、职责边界和协作方式，与单个 task 解耦；执行体是承担该角色的 CLI/agent。角色 → 执行体的唯一权威绑定表在根 [`AGENTS.md`](../../AGENTS.md) 的「多 Agent 编排」节，本文件不复制表格；模型与思考强度由用户会话设置或 Manager 按任务指定，不设角色默认（见 ADR-0014）。

- 绑定表适用于主工作流（herdr + Claude Code / Codex CLI）；任何其他执行体（zcode、workbuddy、pi 等）可承担任一角色，目录边界、task gate、reviewer ≠ owner、handoff 字段等机器强制约束不变。T0/T1 在 task packet 记录替代执行体与理由。
- Reviewer 独立于实施者，以冻结的 `diffHash` 为审查对象；拓扑见「review 拓扑」。

## 编排模式

<!-- invariant:orchestration-routing -->

Manager 统一接收需求并编排，保持扁平，不引入 Integrator 或其他中间层级。coder 数量按影响面数据驱动派发，不按 mode 或默认编队：

1. 受影响 workspace 是一个（以 `pnpm find:usages` 输出为准）→ 单 coder 实施。
2. 受影响 workspace 跨 `packages/*` 与 `apps/*` → Manager 拆成两个 task、两个 worktree，契约通过 handoff 传递。
3. 需求涉及产品设计/UI → 先经 Designer（判据是需求性质，不是改动大小），结论与理由写入 task packet。

- 目录边界固定：Lib Coder 只在 `packages/*` 写入，Biz Coder 只在 `apps/*` 写入。
- 每个角色一个独立 worktree（或严格目录隔离）与唯一 owner；同一 worktree 同时只服务一个可变 task。
- 角色之间统一使用结构化 handoff，五个必填字段以 [`task-packet.md`](task-packet.md) 的模板为权威；缺少任一项不得进入实施或验收。
- 集成与发布聚合由 Manager 直接协调（见「Playbook」节），不设独立编排角色。

## review 拓扑

- **T0**：独立 reviewer 会话（新起的 claude/codex 进程，与实施角色同等权限但不参与实施），不接收实施者的叙述，只审冻结 diff 与证据。
- **T1**：强制 review，Manager 派 fresh subagent 即可（subagent 只接收冻结 diff 与证据，独立性接近独立会话）。
- **T2**：免审；若要审，coder 自派 fresh subagent。
- **任何级别禁止同一会话自审**：实施者复核自己的 diff 不构成 review。
- reviewer id 使用 `^[A-Za-z0-9][A-Za-z0-9._-]{3,39}$` 形式（如 `claude-code-reviewer-45a5b9eb`），必须 ≠ owner。

报告以按严重程度排列的具体发现开头（`Block` / `Should fix` / `Nit`），每条带文件与行号；未发现缺陷时说明测试缺口和残余风险。检查项：公共行为与向后兼容性、聚焦测试覆盖、边界与失败情况、类型与错误处理、竞态或资源泄漏、用户输入安全风险、文档变更；重构须把完成的变更与变更前的行为清单对照。浏览器相关的 review 必须按 [`browser-verification.md`](browser-verification.md) 的三档核实证据，修复类变更的 handoff 必须携带「已证实机制」（见 [`task-packet.md`](task-packet.md) 字段约束）；未给出已证实根因的方案性返工本身就是 review 发现项。

## 角色和边界

- **Manager**：建立 task，拆解任务，分配 owner，按「编排模式」派发，维护依赖，汇总证据，组织 review 和交付判断；直接协调 release 聚合与集成验证，不新增 Integrator 层级。
- **实施 Agent**：只在被分配的 task worktree 工作（T2 允许当前 worktree），遵守 handoff 声明的 Scope 与角色目录边界，保持变更待 review，不擅自 commit、push、merge 或关闭任务。
- **Reviewer**：独立审查冻结的目标 diff 和验证证据（与实施角色同等权限，但不参与实施、不直接修改被审查代码），结果绑定 `diffHash`；发现问题交回实施 Agent，修复后重新 freeze/review。
- **Designer**：仅在产品/设计需求下启用，输出可实现的交互、视觉和验收决策，不修改 `packages/*` 与 `apps/*` 生产代码，不改变代码归属和状态 gate。

## 并发原则

- 一个可变任务对应一个 task worktree 和一个 owner；同一 worktree 不得被两个实施任务同时写入（T2 在当前 worktree 快速实施时同样遵守：先结束或 drop 当前 task，再开下一个）。
- package worktree 可以作为缓存或验证 lane，但不能作为任务身份；跨包 vertical slice 使用任务级 worktree，并按「编排模式」做严格隔离；无法严格隔离时必须拆成独立 task 与独立 worktree。
- 角色目录边界即 worktree 内的写入边界：同一 worktree 中，任一角色不得修改对方目录下的文件；需要对方改动时通过 handoff 派发，而不是越界编辑。
- Reviewer 不在持续变化的实施 worktree 上复用旧结论；review 前冻结，修复后重新冻结。
- 并行编排可使用 Herdr，也可使用其他 harness；用 Herdr 起多角色会话的开机时序见 [`herdr-agents/SKILL.md`](../../.agents/skills/herdr-agents/SKILL.md)，pane、tab、workspace 的命令与生命周期规则见上游 [`herdr/SKILL.md`](../../.agents/skills/herdr/SKILL.md)，均不在本文件重复。
- 并行派发多个互不依赖的 task 时，派单命令本身不要阻塞等待某个 agent 的结果：先把全部 handoff 提交出去，再分别监听各 agent 的进度；等待放在派发全部完成之后。

## Playbook

release 和 hotfix 不是 task 体系的概念；它们是普通 task 在软件迭代场景下的操作程序，各自声明如何满足级别 gate：

- **release playbook**（[`release.md`](release.md)）：聚合已批准 task、确认 changeset、集成验证、PR 与合并后验证。聚合 task 按 T0 建。
- **hotfix playbook**：线上紧急修复仍按 `pnpm task new --task hotfix-<slug> --level t0|t1 --playbook workflow.md#playbook` 建 task，T0/T1 的全部 gate 一项不免，紧急性不删除证据链。与普通 task 的差异只有三条：分支基线取生产状态而不是 dev lane 最新 head，合并节奏与 release playbook 一致；diff 保持最小，不顺手重构、不扩大范围；验证聚焦回归——修复点加受影响契约的聚焦测试，只有涉及浏览器运行时行为时才按 [`browser-verification.md`](browser-verification.md) 的证据档位执行。review 可以先于其他任务排期，但 reviewer 独立性要求不变。

## 失败和恢复

- 命令失败时保留 task state 和工作树，先用 `pnpm task status --task <task-id>` 判断当前 phase，不要重建或覆盖状态文件。
- 需要终止或清理残留 task（agent 结束后遗留的 active task、快照无法物化的 task）时用 `pnpm task drop --task <task-id> --reason <reason>`；drop 是唯一合法的强制终态，不手工编辑 state JSON。
- session、Herdr 或 harness 重启后，从 task state 的 `phase`、`worktree`、`baseSha`、`events[]` 和 live stale 结果恢复，不从聊天记忆猜测进度。
- GitHub issue 不可用时继续本地流程，最终报告注明“未同步”；issue 只作追踪镜像，不是执行真相。
- release CI 失败时，机械性修复可由 Manager 直接处理；逻辑或测试修复回到原 task owner，并在聚合 diff 变化后重新 review。

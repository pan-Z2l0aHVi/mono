# 开发与协作工作流

本文件是 monorepo 所有实施任务的必经流程。它定义任务状态、变更证据和角色交接；工具命令见 [`agent-workflow.mjs`](../../scripts/agent-workflow.mjs)，worktree 细节见 [`worktrees.md`](worktrees.md)，release 细节见 [`release.md`](release.md)，任务交接包见 [`task-packet.md`](task-packet.md)。Herdr、Claude、Codex 等只是执行适配层，不改变本流程的状态和 gate。

## 先建立任务

<!-- invariant:workflow-states -->

档 1 与档 2 的任务（判据见「变更风险分级」）必须先完成以下 preflight：

1. 查看 `git status --short --branch`，确认当前工作区和目标 worktree 的已有变更归属。
2. 读取根 `AGENTS.md`、本文件和命中的 rule/guide；进入 workspace 后读取最近的包级 `AGENTS.md`。
3. 为任务选择唯一、不可变的 task id 和模式：`direct`、`orchestrated`、`release` 或 `hotfix`。
4. 在目标 worktree 执行：

   ```sh
   pnpm agent:workflow init --task <task-id> --mode <mode> --issue <issue-url|N/A>
   pnpm agent:workflow assign --task <task-id> --role <role> --worktree <path>
   pnpm agent:workflow check --task <task-id> --phase edit
   ```

5. 记录范围、验收标准和所需验证；推荐写入 task packet。GitHub issue 在任务确认时创建并经 `--issue` 记入 task state；`status` 会对缺失 issue 的 task 打 stderr 提示，事后补挂用 `issue` 子命令。issue 只作追踪镜像，不是执行真相，本地 task state 不能依赖外部服务。

## 变更风险分级

<!-- invariant:risk-tiering -->

分级判据全部可从变更路径、manifest 和 `pnpm find:usages` 输出查证，不依赖主观的「大改/小改」判断。

| 档                     | 判据（命中任一即属该档）                                                                                                                                                                                                                          | task state          | 独立 review | approval |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ----------- | -------- |
| 档 0（免 task state）  | 改动全部落在一个 workspace 内，或只落在 `docs/` 等仓库根文档目录；且不改依赖字段与 lockfile、不改 CI 与 workspace 配置、不改被其它 workspace 消费的导出符号、不改 instruction system 与根 `scripts/*.mjs` 的行为；也不属于 release 或 hotfix 流程 | 不需要              | 不需要      | 不需要   |
| 档 1（`direct`）       | 跨多个 `apps/*`；公共导出变更但消费者仍在同一 workspace；改动 instruction system、`.agents/` 或根 `scripts/*.mjs` 的行为                                                                                                                          | 需要，模式 `direct` | 按风险决定  | 必须     |
| 档 2（`orchestrated`） | 跨 workspace 的公共 API/exports/事件/类型契约；依赖、catalog、lockfile、构建配置或 CI；release 或 hotfix；多 worktree 并行                                                                                                                        | 需要，用对应模式    | 必须独立    | 必须     |

多档同时命中时取最高档（档 2 > 档 1 > 档 0）。`commit` 本身不参与分档：档 0 的改动提交时同样走正常提交流程，只是不需要先建 task state。

判据的机器可查部分：`pnpm find:usages -- <paths...>` 输出的受影响 workspace 只有一个时，档 0 的单 workspace 条件成立；输出含 2 个以上 workspace 且涉及公共导出时进入档 2。

档 0 不建 task state，提交 hook 的 `guard-commit` 找不到 active task 时直接放行。需要独立 review 时脚本要求显式提供不同于 owner 的 reviewer id；纯文档或低风险测试基建可以用 `init --review skip`，但必须在 task packet 记录跳过理由，且仍须有 approval 与验证证据。高风险变更的 review 由 Claude Code 主审，独立小功能快速迭代可由 Codex CLI 审核。

## 预授权操作

<!-- invariant:pre-authorized-ops -->

以下操作属于已知安全的工作流，直接执行并修复本次改动导致的问题即可，不必逐步请示：

- 运行仓库既有测试与校验命令：`pnpm test`、`pnpm run test:scripts`、`pnpm run test:affected`、包级 `test`、`pnpm run check:code`、`pnpm run check:cspell`、`pnpm run validate:context`、`pnpm run audit:instructions`。
- 修复本次改动导致的失败并重跑受影响的测试。
- 包级 build 与 `pnpm run build`、`pnpm run build:affected`。
- 只读查询：`pnpm find:usages`、`pnpm inspect:contract`、`pnpm diff:contract`、`pnpm agent:workflow status`、`git status`、`git diff`、`git log`。
- 在目标 worktree 内读取任意文件。

以下操作仍必须逐次获得用户明确授权：commit、push、merge、tag、publish、release；依赖、catalog、lockfile 的任何改动；`.npmrc`、`.mise.toml` 与 Git 配置；凭证、密钥与 `.env` 的读写；破坏性 git 操作（`reset --hard`、`push --force`、`clean`、`stash`）。

## 状态机

任务状态保存在 Git common dir 的 `agent-workflow/<task-id>.json`，不进入工作树版本控制。状态只能按以下顺序推进：

```text
initialized -> assigned -> editing -> frozen -> reviewed -> approved
                                                        -> committed -> integrated -> verified -> closed
```

实际命令与状态的关系：

| 阶段            | 必要条件                                                     | 命令或交接                                     |
| --------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| `initialized`   | 有 task id、mode、base SHA、branch、worktree                 | `init`                                         |
| `assigned`      | 有唯一 owner、worktree 和至少一个 role                       | `assign`                                       |
| `editing`       | 已完成 preflight，允许实施                                   | `check --phase edit`                           |
| `frozen`        | 变更路径和内容已形成稳定快照                                 | `freeze`                                       |
| `reviewed`      | reviewer 对冻结 hash 给出 `pass`；可选任务可记录 `skip`      | `review --result pass --reviewer <id>`         |
| `approved`      | 用户或授权 Manager 对同一个 hash 批准，并记录 approver       | `approve --approver <id>`                      |
| `committed`     | commit 包含完整冻结快照且工作区干净                          | `check --phase integrate` 自动确认             |
| `integrated`    | 已通过聚合/集成前检查                                        | `check --phase integrate`                      |
| `verified`      | 至少一条通过的测试、构建或浏览器验证证据                     | `verify --name <evidence>`                     |
| post-merge 证据 | 合并结果在整合 worktree 上再次验证（证据条目，不推进 phase） | `verify --post-merge --worktree <integration>` |
| `closed`        | 交付结论已记录，验证 gate 通过                               | `close`                                        |

以下 gate 是硬条件：

- 未 `init` 不得实施；未 `assign` 不得 freeze。
- 未 freeze 不得 review；review 和 approval 必须绑定同一个 `diffHash`。
- freeze、review 或 approval 后任何文件变化都会使证据 stale；必须重新 freeze、review、approve。
- `check --phase edit` 只允许 `assigned` 或 `editing` 状态；冻结、review 或 approval 后不能把旧状态当作继续编辑许可。
- `check --phase commit` 是提交前 gate；approval 必须记录 approver；实施 Agent 默认不擅自 commit、push、merge。
- `check --phase integrate` 会核对 commit 已发生、冻结快照仍一致且工作区干净，然后记录 `integrated`。
- `verify` 只接受已完成 `integrated` gate 且工作区干净的结果；不能从 `committed` 直接跳过集成检查，失败验证不能推进到 `verified`。
- `verify --post-merge` 在整合 worktree（如 release 分支）上验证合并结果：要求整合 worktree 干净、task 已有通过的 task-scope 验证，并以 `merge-base --is-ancestor` 证明 task 验证点真实进入整合 head（squash merge 不产生祖先关系，不受支持）。
- `close` 与 `check --phase close` 共享同一硬校验：最近一条 task-scope 验证必须 `pass`、task diff 与验证时一致且工作区干净；`orchestrated` 模式额外要求至少一条 `pass` 的 post-merge 验证（`direct`/`hotfix`/`release` 豁免——release 的合并目标是 main，由 release.md 的两段验证覆盖）。
- 建 changeset、跑格式化必须在 `freeze` 之前完成。`freeze` 之后的任何文件变化——包括新建 empty changeset、`vp staged` 重排表格——都会让冻结 diff 失效，必须重新 freeze、review、approve。
- `closed` 不是“脚本跑完”的同义词；必须能追溯到 task id、base SHA、diff hash、review、approval 和验证证据。

常用命令：

```sh
pnpm agent:workflow status --task <task-id> --json
pnpm agent:workflow freeze --task <task-id>
pnpm agent:workflow review --task <task-id> --result pass --reviewer <reviewer-id>
pnpm agent:workflow approve --task <task-id> --approver <manager-or-user-id>
pnpm agent:workflow check --task <task-id> --phase commit
pnpm agent:workflow check --task <task-id> --phase integrate
pnpm agent:workflow verify --task <task-id> --name "pnpm test"
pnpm agent:workflow verify --task <task-id> --name "post-merge pnpm test" --post-merge --worktree <integration-worktree>
pnpm agent:workflow issue --task <task-id> --ref <issue-url|N/A>
pnpm agent:workflow close --task <task-id>
```

freeze 自身会执行与 commit 相同的归一化管线：先 `git add -A` 全量 staging（快照语义本就覆盖全部 tracked+untracked 文件），再运行 staged 修复（与 pre-commit 的 `vp staged` 同一 fixer 集），并把归一化后的内容计入 `diffHash`。因此 commit 时的 staged 格式化是收敛确认（幂等 no-op），不会再改写已冻结的 diff；若 commit 时 staged 仍产生变化（fixer 非幂等等罕见情形），guard-commit 会以 stale 拒绝提交，此时重新 freeze（自动重新归一化并 staging）并重新 review/approve 即可。staged 修复管线失败（如拼写检查不通过）时 freeze 直接失败并保留可观察原因，修复后重新 freeze。

提交边界由受版本控制的 `.vite-hooks/pre-commit` 再次检查。它通过 `guard-commit` 自动发现当前 worktree 的 active task；若存在 task，只有 `approved` 且冻结 diff 未变化时才允许提交。提交 hook 保护的是 commit 边界，不能替代实施前的 `init` 和 `check --phase edit`。

## 角色与执行体

角色定义会话身份、职责边界和协作方式，与单个 task 解耦；执行体是承担该角色的 CLI/agent。角色 → 执行体 → 推荐模型/思考强度的唯一权威绑定表在根 [`AGENTS.md`](../../AGENTS.md) 的「多 Agent 编排」节，本文件不复制表格。执行体不可用时由 Manager 在 task packet 中记录替代执行体与理由。

- Role Contract 位于 [`.agents/agents/`](../../.agents/agents/)，只定义职责、边界和协作；仓库约束仍以 `AGENTS.md`、包级 `AGENTS.md`、rules、skills 和实现事实为准。
- 执行体绑定不改变状态机、gate 和证据要求；任一执行体承担角色后都必须遵守同一套 handoff、worktree 和 review 规则。
- Reviewer 独立于实施者，以冻结的 `diffHash` 为审查对象；执行体按风险路由（高风险 → Claude Code 主审，独立小功能快速迭代可由 Codex CLI 审核），路由清单见根 `AGENTS.md`「多 Agent 编排」。
- 默认模型与思考强度是推荐分档，表达角色适用的推理深度起点；Manager 可按任务直接调整模型或档位，调整是常规操作而非流程偏离，推荐在 task packet 的 `Effort` 字段留痕。各档位的取值理由与常见调整场景见 [ADR-0011](../adr/0011-agent-model-binding-and-effort.md)，本文件不复制。

## 编排模式

<!-- invariant:orchestration-routing -->

Manager 统一接收需求并编排，保持扁平，不引入 Integrator 或其他中间层级。模式按需求是否涉及产品设计/UI 分流：

1. **产品/设计需求**：Manager → Designer → 并行 Lib Coder + Biz Coder → Reviewer 验收 → Manager 总结汇报。
2. **纯技术需求**：Manager → 并行 Lib Coder + Biz Coder → Reviewer 验收 → Manager 总结汇报。

- 是否启用 Designer 由 Manager 判断（判据见根 `AGENTS.md`「多 Agent 编排」）；判断结论、理由和范围写入 task packet。
- 路由只决定是否启用 Designer。Lib Coder 与 Biz Coder 之间没有实质依赖时必须并行，不串行化。
- 目录边界固定：Lib Coder 只在 `packages/*` 写入，Biz Coder 只在 `apps/*` 写入。跨边界需求拆成两个独立 task、两个 worktree，由 Manager 通过 handoff 传递契约。
- 每个角色一个独立 worktree（或严格目录隔离）与唯一 owner；同一 worktree 同时只服务一个可变 task。
- 角色之间统一使用结构化 handoff，五个必填字段以 [`task-packet.md`](task-packet.md) 的模板为权威；缺少任一项不得进入实施或验收。
- 集成与 release 聚合由 Manager 直接协调（见「Release 和 hotfix」），不再拆出独立编排角色。

## 角色和边界

- **Manager**：建立 task state，拆解任务，分配 owner，按「编排模式」选择路径并派发，维护依赖，汇总证据，组织 review 和交付判断；直接协调 release 聚合与集成验证，不新增 Integrator 层级。
- **实施 Agent**：只在被分配的 task worktree 工作，遵守 handoff 声明的 Scope 与角色目录边界，保持变更待 review，不擅自 commit、push、merge 或关闭任务。
- **Reviewer**：只读审查冻结的目标 diff 和验证证据，结果绑定 `diffHash`；发现问题交回实施 Agent，修复后必须重新 freeze/review。执行体按风险路由（见根 `AGENTS.md`「多 Agent 编排」）。
- **Designer**：仅在产品/设计需求下启用，输出可实现的交互、视觉和验收决策，不修改 `packages/*` 与 `apps/*` 生产代码，不改变代码归属和状态 gate。

Reviewer 是否必需由「变更风险分级」判定；`init --review skip` 只用于纯文档或低风险测试基建，且仍须有 approval 与验证证据。

## 并发原则

- 一个可变任务对应一个 task worktree 和一个 owner；同一 worktree 不得被两个实施任务同时写入。
- package worktree 可以作为缓存或验证 lane，但不能作为任务身份；跨包 vertical slice 使用任务级 worktree，并按「编排模式」固定的目录边界做严格隔离；无法严格隔离时必须拆成独立 task 与独立 worktree。
- 角色目录边界即 worktree 内的写入边界：同一 worktree 中，任一角色不得修改对方目录下的文件；需要对方改动时通过 handoff 派发，而不是越界编辑。
- Reviewer 不在持续变化的实施 worktree 上复用旧结论；review 前冻结，修复后重新冻结。
- 共享主工作区不用于并行实施；不得在其中执行 `git switch`、`git checkout`、`git stash`、`git reset` 或 `git clean`。
- 并行编排可使用 Herdr，也可使用其他 harness；Herdr 的 pane、tab、workspace 生命周期规则见 [`herdr/SKILL.md`](../../.agents/skills/herdr/SKILL.md)，不在本文件重复。

## Release 和 hotfix

正常 release 必须从最新 `origin/main` 创建独立 release worktree，聚合已批准 task，确认 changeset、运行集成验证，然后创建 PR。PR 合并和 main/版本发布后的两段验证完成后，才能清理 release worktree 和对应编排资源。完整操作见 [`release.md`](release.md)。

`hotfix` 仅用于线上紧急修复：可以跳过长期 dev lane，但仍必须有 task state、独立 worktree、冻结 diff、review/approval、验证和交付记录，不能把紧急性当作删除证据链的理由。

## 失败和恢复

- 命令失败时保留 task state 和工作树，先用 `status --json` 判断当前 phase，不要重建或覆盖状态文件。
- session、Herdr 或 harness 重启后，从 task state 的 `phase`、`worktree`、`baseSha` 和 live stale 结果恢复，不从聊天记忆猜测进度。
- GitHub issue 不可用时继续本地流程，最终报告注明“未同步”；issue 只作追踪镜像，不是执行真相。task state 缺失 issue 引用时用 `issue` 子命令补挂，不要为绕过 `status` 提示而填写假引用。
- release CI 失败时，机械性修复可由 Manager 直接处理；逻辑或测试修复回到原 task owner，并在聚合 diff 变化后重新 review。

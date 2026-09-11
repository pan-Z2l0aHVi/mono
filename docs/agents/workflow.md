# 开发与协作工作流

本文件是 monorepo 所有实施任务的必经流程。它定义任务状态、变更证据和角色交接；工具命令见 [`agent-workflow.mjs`](../../scripts/agent-workflow.mjs)，worktree 细节见 [`worktrees.md`](worktrees.md)，release 细节见 [`release.md`](release.md)，任务交接包见 [`task-packet.md`](task-packet.md)。Herdr、Claude、Codex 等只是执行适配层，不改变本流程的状态和 gate。

## 先建立任务

凡会写入仓库的任务都必须先完成以下 preflight，不能以“改动很小”跳过：

1. 查看 `git status --short --branch`，确认当前工作区和目标 worktree 的已有变更归属。
2. 读取根 `AGENTS.md`、本文件和命中的 rule/guide；进入 workspace 后读取最近的包级 `AGENTS.md`。
3. 为任务选择唯一、不可变的 task id 和模式：`direct`、`orchestrated`、`release` 或 `hotfix`。
4. 在目标 worktree 执行：

   ```sh
   pnpm agent:workflow init --task <task-id> --mode <mode>
   pnpm agent:workflow assign --task <task-id> --role <role> --worktree <path>
   pnpm agent:workflow check --task <task-id> --phase edit
   ```

5. 记录范围、影响 workspace、允许路径、验收标准和所需验证；推荐写入 task packet。GitHub issue 是可选同步镜像，本地 task state 不能依赖外部服务。

## 状态机

任务状态保存在 Git common dir 的 `agent-workflow/<task-id>.json`，不进入工作树版本控制。状态只能按以下顺序推进：

```text
initialized -> assigned -> editing -> frozen -> reviewed -> approved
                                                        -> committed -> integrated -> verified -> closed
```

实际命令与状态的关系：

| 阶段          | 必要条件                                                | 命令或交接                             |
| ------------- | ------------------------------------------------------- | -------------------------------------- |
| `initialized` | 有 task id、mode、base SHA、branch、worktree            | `init`                                 |
| `assigned`    | 有唯一 owner、worktree 和至少一个 role                  | `assign`                               |
| `editing`     | 已完成 preflight，允许实施                              | `check --phase edit`                   |
| `frozen`      | 变更路径和内容已形成稳定快照                            | `freeze`                               |
| `reviewed`    | reviewer 对冻结 hash 给出 `pass`；可选任务可记录 `skip` | `review --result pass --reviewer <id>` |
| `approved`    | 用户或授权 Manager 对同一个 hash 批准，并记录 approver  | `approve --approver <id>`              |
| `committed`   | commit 包含完整冻结快照且工作区干净                     | `check --phase integrate` 自动确认     |
| `integrated`  | 已通过聚合/集成前检查                                   | `check --phase integrate`              |
| `verified`    | 至少一条通过的测试、构建或浏览器验证证据                | `verify --name <evidence>`             |
| `closed`      | 交付结论已记录，验证 gate 通过                          | `close`                                |

以下 gate 是硬条件：

- 未 `init` 不得实施；未 `assign` 不得 freeze。
- 未 freeze 不得 review；review 和 approval 必须绑定同一个 `diffHash`。
- freeze、review 或 approval 后任何文件变化都会使证据 stale；必须重新 freeze、review、approve。
- `check --phase edit` 只允许 `assigned` 或 `editing` 状态；冻结、review 或 approval 后不能把旧状态当作继续编辑许可。
- `check --phase commit` 是提交前 gate；approval 必须记录 approver；实施 Agent 默认不擅自 commit、push、merge。
- `check --phase integrate` 会核对 commit 已发生、冻结快照仍一致且工作区干净，然后记录 `integrated`。
- `verify` 只接受已完成 `integrated` gate 且工作区干净的结果；不能从 `committed` 直接跳过集成检查，失败验证不能推进到 `verified`。
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
pnpm agent:workflow close --task <task-id>
```

提交边界由受版本控制的 `.vite-hooks/pre-commit` 再次检查。它通过 `guard-commit` 自动发现当前 worktree 的 active task；若存在 task，只有 `approved` 且冻结 diff 未变化时才允许提交。提交 hook 保护的是 commit 边界，不能替代实施前的 `init` 和 `check --phase edit`。

## 角色与执行体

角色定义会话身份、职责边界和协作方式，与单个 task 解耦；执行体是承担该角色的模型/CLI。本仓库使用默认绑定，执行体不可用时由 Manager 在 task packet 中记录替代执行体与理由：

| 角色      | 执行体            | 负责范围                                         |
| --------- | ----------------- | ------------------------------------------------ |
| Manager   | Claude Code       | 需求接收、扁平编排、任务分解、依赖管理、最终总结 |
| Designer  | Claude Code       | 产品设计、UI/UX、交互与状态设计                  |
| Lib Coder | Claude Code       | `packages/*`：共享库与基础包                     |
| Biz Coder | Codex CLI         | `apps/*`：业务包实现                             |
| Reviewer  | Codex CLI（主审） | 独立验收；高风险变更加 Claude Code 二次审查      |

- Role Contract 位于 [`.agents/agents/`](../../.agents/agents/)，只定义职责、边界和协作；仓库约束仍以 `AGENTS.md`、包级 `AGENTS.md`、rules、skills 和实现事实为准。
- 执行体绑定不改变状态机、gate 和证据要求；任一执行体承担角色后都必须遵守同一套 handoff、worktree 和 review 规则。
- Reviewer 主审与二次审查都必须独立于实施者，并以同一个冻结 `diffHash` 为审查对象；二次审查不替代主审，只在主审通过后追加。

## 编排模式

Manager 统一接收需求并编排，保持扁平，不引入 Integrator 或其他中间层级。模式按需求是否涉及产品设计/UI 分流：

1. **产品/设计需求**：Manager → Designer → 并行 Lib Coder + Biz Coder → Reviewer 验收 → Manager 总结汇报。
2. **纯技术需求**：Manager → 并行 Lib Coder + Biz Coder → Reviewer 验收 → Manager 总结汇报。

- 是否启用 Designer 由 Manager 判断；判据是需求是否涉及产品设计/UI，而不是改动大小。判断结论、理由和范围写入 task packet。
- 路由只决定是否启用 Designer。Lib Coder 与 Biz Coder 之间没有实质依赖时必须并行，不串行化。
- 目录边界固定：Lib Coder 只在 `packages/*` 写入，Biz Coder 只在 `apps/*` 写入。跨边界需求拆成两个独立 task、两个 worktree，由 Manager 通过 handoff 传递契约。
- 每个角色一个独立 worktree（或严格目录隔离）与唯一 owner；同一 worktree 同时只服务一个可变 task。
- 角色之间统一使用结构化 handoff：`Goal（目标）`、`Scope（范围）`、`Acceptance（验收标准）`、`Test commands（测试命令）`、`Open decisions（未解决决策）`；模板见 [`task-packet.md`](task-packet.md)。缺少任一项不得进入实施或验收。
- 集成与 release 聚合由 Manager 直接协调（见「Release 和 hotfix」），不再拆出独立编排角色。

## 角色和边界

- **Manager**：建立 task state，拆解任务，分配 owner，按「编排模式」选择路径并派发，维护依赖，汇总证据，组织 review 和交付判断；直接协调 release 聚合与集成验证，不新增 Integrator 层级。
- **实施 Agent**：只在被分配的 task worktree 工作，遵守允许路径和角色目录边界，保持变更待 review，不擅自 commit、push、merge 或关闭任务。
- **Reviewer**：只读审查冻结的目标 diff 和验证证据，结果绑定 `diffHash`；发现问题交回实施 Agent，修复后必须重新 freeze/review。高风险变更由 Manager 追加二次审查。
- **Designer**：仅在产品/设计需求下启用，输出可实现的交互、视觉和验收决策，不修改 `packages/*` 与 `apps/*` 生产代码，不改变代码归属和状态 gate。

Reviewer 是否必需按风险决定：跨 workspace、公共 API/exports、UI 行为、构建/release 和高风险迁移必须独立 review，并在主审通过后追加 Claude Code 二次审查；纯文档或低风险测试基建可以用 `init --review skip` 并在 task packet 中记录跳过理由，但仍须有用户/Manager approval 和验证证据。需要独立 review 时，脚本要求显式提供不同于 owner 的 reviewer id。

## 并发原则

- 一个可变任务对应一个 task worktree 和一个 owner；同一 worktree 不得被两个实施任务同时写入。
- package worktree 可以作为缓存或验证 lane，但不能作为任务身份；跨包 vertical slice 使用任务级 worktree，并在其中以严格目录隔离区分写入范围（Lib Coder 仅 `packages/*`，Biz Coder 仅 `apps/*`）；无法严格隔离时必须拆成独立 task 与独立 worktree。
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
- GitHub issue 不可用时继续本地流程，最终报告注明“未同步”；issue 只作追踪镜像，不是执行真相。
- release CI 失败时，机械性修复可由 Manager 直接处理；逻辑或测试修复回到原 task owner，并在聚合 diff 变化后重新 review。

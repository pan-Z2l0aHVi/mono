# 开发与协作工作流

本文件是 monorepo 所有实施任务的必经流程。它定义任务状态、变更证据和角色交接；工具命令见 [`agent-workflow.mjs`](../../scripts/agent-workflow.mjs)，worktree 细节见 [`worktrees.md`](worktrees.md)，release 细节见 [`release.md`](release.md)，任务交接包见 [`task-packet.md`](task-packet.md)。Herdr、Claude、Codex、Gemini 等只是执行适配层，不改变本流程的状态和 gate。

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

## 角色和边界

- **Manager**：建立 task state，拆解任务，分配 owner，维护依赖，汇总证据，组织 review 和交付判断；不以个人口头记录替代状态。
- **实施 Agent**：只在被分配的 task worktree 工作，遵守允许路径，保持变更待 review，不擅自 commit、push、merge 或关闭任务。
- **Reviewer**：只读审查冻结的目标 diff 和验证证据，结果绑定 `diffHash`；发现问题交回实施 Agent，修复后必须重新 freeze/review。
- **Integrator**：只在 release worktree 聚合已批准任务，解决聚合冲突并运行集成验证；聚合后的新 diff 必须重新 review/approve。
- **Designer**：输出可实现的交互、视觉和验收决策，不改变代码归属和状态 gate。

Reviewer 是否必需按风险决定：跨 workspace、公共 API/exports、UI 行为、构建/release 和高风险迁移必须独立 review；纯文档或低风险测试基建可以用 `init --review skip` 并在 task packet 中记录跳过理由，但仍须有用户/Manager approval 和验证证据。需要独立 review 时，脚本要求显式提供不同于 owner 的 reviewer id。

## 并发原则

- 一个可变任务对应一个 task worktree 和一个 owner；同一 worktree 不得被两个实施任务同时写入。
- package worktree 可以作为缓存或验证 lane，但不能作为任务身份；跨包 vertical slice 使用任务级 worktree。
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
- release CI 失败时，机械性修复可由 integrator 处理；逻辑或测试修复回到原 task owner，并在聚合 diff 变化后重新 review。

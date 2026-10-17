# 开发与协作工作流

本文件是 task 的执行主干：Task Packet 契约、预授权边界、状态机与失败恢复。级别判定与准入见 `task-levels.md`；冻结之后的 review、approval 与测试验收见 [`review.md`](review.md)；拿到 worktree 之后怎么把它变成可执行环境见 [`worktree.md`](worktree.md)；提交边界的授权口径与 hook 绕过禁令见 [`commit.md`](commit.md)。

实现见 [`scripts/task.mjs`](../../scripts/task.mjs)（`pnpm agent:task`）。需求怎么拆成多个 task、并行度多大、worktree 与 branch 怎么分配，由编排层（herdr-projects）决定，仓库只保留 task 级的判定与门禁（划界见 [ADR-0021](../adr/0021-orchestration-layer-moved-to-herdr-projects.md)）。Claude、Codex 或其他客户端只是执行适配层，不改变本流程的状态和 gate。决策背景见 [ADR-0014](../adr/0014-task-system-v2.md)。

<!-- invariant:pre-authorized-ops -->

## 预授权操作

以下操作无需逐次确认，可以直接执行；本次改动造成的失败也可以直接修复：

- 运行仓库既有测试与校验命令：`pnpm test`、`pnpm run ci:test-scripts`、包级 `test`、`pnpm run check-code`、`pnpm run check-cspell`、`pnpm run ci:validate-context`。
- 修复本次改动导致的失败并重跑受影响的测试。
- 包级 build 与 `pnpm run build`。
- 只读查询：`pnpm agent:find-usages`、`pnpm agent:inspect-contract`、`pnpm agent:diff-contract`、`pnpm agent:task status`、`git status`、`git diff`、`git log`。
- 在目标 worktree 内读取任意文件。

以下操作仍须逐次获得用户明确授权：commit、push、merge、tag、publish、release；依赖、catalog、lockfile 的任何改动；`.npmrc`、`.mise.toml` 与 Git 配置；凭证、密钥和 `.env` 的读写；破坏性 git 操作（`reset --hard`、`push --force`、`clean`、`stash`）。

### 怎么取得这个授权

**用交互式问答弹窗，不要用纯文本提问。** 本仓各客户端会话里用的是宿主提供的那个问答弹窗工具。若它已带推荐项标注与自定义输入框，直接用；否则按下面的形状自己补齐，不要因为工具没有内建就跳过其中一项。 把待决事项做成选项，每一项标注哪一项是推荐项，并始终保留一个自定义输入项，让用户能给出上面清单之外的答案。三个要求一起成立才算合规：选项化、推荐项有标注、自定义输入项存在。

弹窗只是把选择摆出来，不代替授权本身——用户点了推荐项才是授权，弹窗自己返回不算。环境不提供弹窗时（例如非交互式 harness），把待决事项和推荐项写进正文，然后停下等指示；**没有回答不等于同意**，不得因为拿不到弹窗就把推荐项当成已授权。

这条是全文所有「需用户明确授权」「先询问用户」的唯一机制来源：其他文档只声明该处需要授权并指向这里，不复述这个形状。唯一的例外是操作系统的权限对话框——那种授权发生在系统设置里，不走本流程；`runtime-verification.md` 的 macOS 辅助功能与屏幕录制授权属于那一类。

<!-- invariant:workflow-states -->

## 状态机

任务状态保存在 `$TMPDIR/greypan/tasks/<task-id>.json`（Task Packet 的 `.md` 与 `evidence/` 同目录），不进入工作树版本控制。这是本地工作记忆，可丢失：跨 worktree 共享，但不跨仓库列举，也不跨重启存续（见「失败和恢复」与 [ADR-0018](../adr/0018-task-state-in-tmpdir.md)）。状态只能按以下顺序推进：

```text
open -> active -> frozen -> reviewed -> approved -> done
                                                    （任何未完结状态可 -> dropped，需 --reason 与 --by）
```

| 阶段       | 必要条件                                                                    | 命令或交接                |
| ---------- | --------------------------------------------------------------------------- | ------------------------- |
| `open`     | 有 task id、level、base SHA、branch、worktree                               | `pnpm agent:task new`     |
| `active`   | 由 `open` 进入时 preflight 已完成，且（T0/T1）worktree 干净（无未提交改动） | `pnpm agent:task start`   |
| `frozen`   | 变更路径和内容已形成稳定快照                                                | `pnpm agent:task freeze`  |
| `reviewed` | reviewer 对冻结 hash 给出 `pass`；`fail` 使 task 回到 active                | `pnpm agent:task review`  |
| `approved` | 对同一个 hash 批准并记录 approver（与 review 成对）                         | `pnpm agent:task approve` |
| `done`     | 交付结论已记录，验证 gate 通过                                              | `pnpm agent:task done`    |
| `dropped`  | 任务终止或残留清理，强制 `--reason` 与 `--by`                               | `pnpm agent:task drop`    |

以下 gate 是硬条件：

- 未 `new` 不得实施；未 freeze 不得 review；review 和 approval 必须绑定同一个 `diffHash`。T0 与 T1 都必须走完 `reviewed` 与 `approved` 两格：review 是两档共同的强制环节，approval 与它成对，**没有停在 `frozen` 的免审捷径**；T2 没有这两个相位，走快速通道。
- `new` 与 `start`（仅 `open → active` 这一次）对 T0/T1 要求 worktree 干净，T2 豁免：freeze 用 `git add -A` 归一化整个 worktree，实施起点没有别人的在制品，冻结 diff 才只含本 task 的改动。豁免只到 start：T2 若主动 freeze，freeze 自己要求干净起点（`live.clean` 把未跟踪文件也算在内，所以实际上要先把改动 commit 掉再 freeze）。review `fail` 回到 active 后不复查干净度。
- 变异实验、对照实验和临时接线都可以留在工作区，但收尾必须还原；探针与临时脚本写 `/tmp`，不落在 worktree 里，否则会被 freeze 的 `git add -A` 卷进冻结快照。
- 冻结 `diffHash` 的 canonical 口径是 [`scripts/task.mjs`](../../scripts/task.mjs) 的快照哈希，覆盖 tracked+untracked，不是 git diff 的摘要；reviewer 核验冻结一致性以 `pnpm agent:task status --task <id>` 的 `live` 比对（hash 一致 + 非 stale）为准，不要自制 `git diff | shasum` 配方复算。
- freeze、review 或 approval 后任何文件变化都会使证据 stale；必须重新 freeze（重算 hash 并重置 review/approval），再重复 review、approve。
- owner、reviewer、approver、drop 署名人共用同一套 id 形状；内核强制的「互不相等」约束与比对对象以 [`review.md`](review.md) 的「身份形状」一节为权威。
- `pnpm agent:task verify` 必须显式给出 `--result pass|fail`；它只记录证据、不执行任何命令，省略结果不等于通过。verify 只接受非 stale 的结果，pass 验证还要求工作区干净（验证必须覆盖已提交内容）；`done`（T0/T1）按 kind 各取最新一条 pass，**且该条快照与冻结时一致**，所需 kind 见 `task-levels.md` 的级别表。
- 上面那个「快照一致」不是 verify 的检查，重复记录也不为过：`verify` 只在**记录那一刻**断言 live 与 `state.diffHash` 一致，然后把 `state.diffHash` 抄进这条记录；`verify` 自己不会再复检这条记录——唯一的复检点是 `done`。而 `verification[]` **不会在重新 freeze 时被清空**——freeze 只重置 review 与 approval。所以「freeze → verify test → 再 freeze（重 review / approve 之后）→ 只补记 acceptance → done」这条路径里，`latestOf('test')` 取到的是重新 freeze 之前的旧记录，只有 `done` 时那次比对能拦住它。判断某条证据是否覆盖当前快照，看它记录的 `diffHash` 与 `agent:task status` 的 `diffHash` 是否相同，不要只看 `live.stale`——那量的是「绑定的证据 vs 当前工作区」，不检查任何一条验证记录。
- T2 快速通道：`new → start → 修改 → done`，guard 不要求快照证据，也不要求 worktree 干净，但仍跑 `.agents/checks/` 政策检查。代价是这一档的提交内容等于当时的 index，别人的在制品一旦被 `git add` 进来就会一起提交，T2 不提供 diff 边界。什么时候该升档，见 `task-levels.md`。

常用命令：

```sh
pnpm agent:task status --task <task-id>
pnpm agent:task freeze --task <task-id>
pnpm agent:task verify --task <task-id> --name "pnpm test" --result pass
pnpm agent:task verify --task <task-id> --name "manual acceptance" --kind acceptance --result pass
pnpm agent:task issue --task <task-id> --ref <issue-url|N/A>
pnpm agent:task done --task <task-id>
pnpm agent:task drop --task <task-id> --reason <why> --by <your-agent-id>
```

`review` 与 `approve` 的用法见 [`review.md`](review.md)。每次状态转换都追加到 state 的 `events[]` 时间线，不需要手工补记；被取代的旧 hash 由后一条带 hash 的事件与 `live` 比对隐含。

freeze 会强制重写工作区：先全量 staging，跑 `CI=true pnpm run fix-code`，再把归一化后的内容计入 `diffHash`，归一化不可跳过。声明了 `fix-code` 的仓库若依赖未安装，freeze 直接失败，先在 worktree 里 `pnpm install && pnpm run build` 再重试；只有不含 `fix-code` 脚本的仓库（测试 fixture、纯 git 仓库）才跳过。commit 边界只保留 guard、不再跑 fixer，所以冻结后工作区不会再被工具改写。

`.agents/checks/` 下的可执行政策检查在 `freeze` 取快照前与 `guard` 放行提交前各触发一次，任一非零退出即中止。

每个检查的判定口径、跑哪些、为什么挂在 guard 上、没有 active task 时为什么只跑一部分、以及输出长什么样，全部由 [`commit.md`](commit.md) 承担——那里是提交边界的唯一权威。本文件只说明触发相位。

## Task Packet

Task Packet 是单个 task 的主合同，记录目标、范围、验收、验证和交付边界，新会话据此恢复工作。每项实施任务在进入实施或验收前都要写清：

- `taskId`、级别（T0/T1/T2）、owner、worktree 和 base SHA。
- 目标、非目标、验收标准和所需的最小充分验证。
- 依赖、公共契约、changeset、浏览器验证和 review 要求。
- release 场景适用的 playbook。
- 交付物、失败恢复方式和交接时机。

推荐格式：

```text
Task: <task-id>
Level: t0 | t1 | t2
Issue: <issue-url | N/A>
Playbook: <release.md | N/A>
Owner: <owner-id>
Worktree: <absolute path>
Base: <sha>
Goal: <observable outcome>
Non-goals: <explicit exclusions>
Acceptance: <observable pass conditions>
Verification: <commands and evidence required>
Review: <required topology or not required>
Handoff: <what is returned and when>
```

`Owner`、`Worktree`、`Base` 由编排层提供：worktree 路径与 base SHA 来自它交付 task 时的工作树，owner 标识承接这条 task 的线程。packet 只如实记录，不自行推导、不改写；归属变更由编排层重新 assign 并同步。

Packet 不重复 `pnpm agent:task` 在 state 里维护的机器记录（`diffHash`、review、approval、verification 与 `events[]`）；落点与生命周期见「状态机」。

## Playbook

release playbook（[`release.md`](release.md)）说明如何在 release 场景下满足对应的级别 gate：changeset 逐个校验、集成验证、PR 等 CI 与 approval、合并后验证，以及有版本变更时的发布链验证。流程本身（拆 task、PR 跟进、合并后回收）不属本仓，权威是编排层的 skill；它不自带级别，各 task 按自身影响面定级。

## 失败和恢复

- 命令失败时保留 task state 和工作树，先用 `pnpm agent:task status --task <task-id>` 判断当前 phase，不要重建或覆盖状态文件。命令被客户端权限挡住时见 [`environments.md`](environments.md)。
- 需要终止或清理残留 task（agent 结束后遗留的 active task、快照无法物化的 task）时用 `pnpm agent:task drop --task <task-id> --reason <why> --by <your-agent-id>`；`--by` 与 reviewer/approver 同一套 id 形状。drop 是唯一合法的强制终态，不手工编辑 state JSON。
- session、客户端或 harness 在同一台机器、同一个用户内续作时（含客户端重启，只要没有重启机器），读取顺序是先 Task Packet、再 `$TMPDIR/greypan/tasks/<task-id>.json`，然后按 `phase`、`worktree`、`baseSha`、`events[]` 与 live stale 结果恢复，不从聊天记忆猜测进度。换机、换用户或重启机器都不承诺恢复，那些情况从 commit 历史重建。
- task state 在 task 进行中被清空（机器重启即清，见 [ADR-0018](../adr/0018-task-state-in-tmpdir.md)）时，用同一个 task-id 重新 `agent:task new`，重走 freeze / review / approve；此时 commit 还没发生，重建的证据链与新建 task 等价。重建 Task Packet、聊天消息或过程报告都不能替代这一步。`new` 对 T0/T1 的干净起点要求不变：先恢复干净工作区再重建。
- 级别在建 task 时选错是硬约束级别的错误，不能就地改——`level` 是不可变字段。改正的办法是 `drop` 掉建错的 task，用同一个理由重新 `new` 一个正确级别的，并写明改判依据。级别本身是软判断（哪些算「可执行内容」不由脚本枚举），所以这条路径会被真正用到。
- GitHub issue 不可用时在最终报告注明「未同步」。
- 某个 PR 的 CI 失败时，机械性修复由该 PR 对应 task 的 owner 直接处理，逻辑或测试修复回到原 task owner；修复提交会让该 PR 已冻结的证据失效。

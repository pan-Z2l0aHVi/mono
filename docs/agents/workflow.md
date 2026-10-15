# 开发与协作工作流

本文件规定 monorepo 实施任务的级别、状态机、Task Packet 主合同、变更证据、验证和 review/approval。实现见 [`scripts/task.mjs`](../../scripts/task.mjs)（`pnpm agent:task`），决策见 [ADR-0014](../adr/0014-task-system-v2.md) 与 [ADR-0024](../adr/0024-task-tiering-v3.md)。

worktree 的边界、初始化与共享缓存见 [`build.md`](build.md)。需求怎么拆成多个 task、并行度多大、worktree 与 branch 怎么分配，由编排层（herdr-projects）决定，仓库只保留 task 级的判定与门禁（划界见 [ADR-0021](../adr/0021-orchestration-layer-moved-to-herdr-projects.md)）。Claude、Codex 或其他客户端只是执行适配层，不改变本流程的状态和 gate。

## 先建立任务

<!-- invariant:workflow-states -->

所有实施任务（判据见「任务级别」）先完成以下 preflight：

1. 查看 `git status --short --branch`，确认编排层交付的 worktree 干净：没有别人的在制品，也没有上一轮留下的未提交变更。
2. 读取根 `AGENTS.md`、本文件和命中的 rule/guide；进入 workspace 后读取最近的包级 `AGENTS.md`。
3. 为任务选择唯一、不可变的 task id 和级别（T0/T1/T2）。
4. 在目标 worktree 执行（新 worktree 先跑一次 `mise install`、`pnpm install` 和 `pnpm run build`，判据见 [`build.md`](build.md)「Worktree 与共享缓存」）：

   ```sh
   pnpm agent:task new --task <task-id> --level t0|t1|t2 --issue <issue-url|N/A>
   pnpm agent:task assign --task <task-id> --owner <owner-id> --worktree <path>
   pnpm agent:task start --task <task-id>
   ```

5. 按本文「Task Packet」写下范围、验收标准和验证命令。GitHub issue 只是可选的追踪镜像，用 `--issue` 记入 task state，事后可用 `issue` 子命令补挂；issue 不可用时本地流程照常推进，持久审计由 commit message、changeset 与 git 历史承担。

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

## 任务级别

<!-- invariant:risk-tiering -->

级别代号 T0/T1/T2（T0 最严格），只表达 workflow 严格程度，描述的是变更的影响半径，不是任务的价值排序。判据沿两个轴，逐档判定，先命中先定级，T2 是纯兜底：

- 可执行与否：可执行内容指会影响运行时或工具行为的文件，含源码、脚本、配置、构建与 CI 定义、依赖清单；文档、注释、纯格式化改动和二进制产物属于非可执行内容。这是实施 agent 依据改动内容做的软判断，不由脚本枚举。
- 路径落在哪里：workspace 的边界是 [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) 里的 `apps/**` 与 `packages/**`；不属于其中任何一条的路径就是「根」，例如仓库根配置、`scripts/`、`.github/`、`.agents/` 与根 `docs/`。

| 级别 | 判据（逐档命中先定级，T2 兜底）                                                                                        | worktree                             | freeze | review               | approval | done 前验证                      | commit gate（guard）               |
| ---- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------ | -------------------- | -------- | -------------------------------- | ---------------------------------- |
| T0   | 触及可执行内容，且满足任一：路径不在任何 workspace 之下；跨 workspace 的公共 API/exports/事件/类型契约；含任何依赖变更 | 专属（编排层分配）                   | 必须   | 必须（独立于实施者） | 必须     | test 与 acceptance 各 ≥1 条 pass | approved + hash 一致 + checks 通过 |
| T1   | 触及可执行内容，且路径落在某个 workspace 之下，且未命中 T0                                                             | 专属（编排层分配）                   | 必须   | 必须（独立于实施者） | 必须     | test ≥1 条 pass                  | approved + hash 一致 + checks 通过 |
| T2   | 只触及非可执行内容（文档、注释、纯格式、二进制产物）                                                                   | 允许当前 worktree 直接改，不要求干净 | 可选   | 不用                 | 不要求   | 不强制                           | active + checks 通过               |

本表是各级严格程度的权威。`pnpm agent:find-usages -- <paths...>` 只用于核实「跨 workspace 的公共契约」这一条，输出只涉及一个 workspace 时该条不成立。`checks` 指 [`.agents/checks/`](../../.agents/checks/) 下的仓库政策检查，三个级别在提交前都要通过；检查清单与各自口径以该目录下脚本自身的注释为权威，本表不枚举。

release playbook 是普通 task 在 release 场景下的操作程序（见「Playbook」节），不是 task 体系的概念。

## 预授权操作

<!-- invariant:pre-authorized-ops -->

以下操作无需逐次确认，可以直接执行；本次改动造成的失败也可以直接修复：

- 运行仓库既有测试与校验命令：`pnpm test`、`pnpm run ci:test-scripts`、包级 `test`、`pnpm run check-code`、`pnpm run check-cspell`、`pnpm run ci:validate-context`。
- 修复本次改动导致的失败并重跑受影响的测试。
- 包级 build 与 `pnpm run build`。
- 只读查询：`pnpm agent:find-usages`、`pnpm agent:inspect-contract`、`pnpm agent:diff-contract`、`pnpm agent:task status`、`git status`、`git diff`、`git log`。
- 在目标 worktree 内读取任意文件。

以下操作仍须逐次获得用户明确授权：commit、push、merge、tag、publish、release；依赖、catalog、lockfile 的任何改动；`.npmrc`、`.mise.toml` 与 Git 配置；凭证、密钥和 `.env` 的读写；破坏性 git 操作（`reset --hard`、`push --force`、`clean`、`stash`）。

## 状态机

任务状态保存在 `$TMPDIR/greypan/tasks/<task-id>.json`（Task Packet 的 `.md` 与 `evidence/` 同目录），不进入工作树版本控制。这是本地工作记忆，可丢失：跨 worktree 共享，但不跨仓库列举，也不跨重启存续（见「失败和恢复」与 [ADR-0018](../adr/0018-task-state-in-tmpdir.md)）。状态只能按以下顺序推进：

```text
open -> active -> frozen -> reviewed -> approved -> done
                                                    （任何未完结状态可 -> dropped，需 --reason 与 --by）
```

T0 与 T1 都必须走完 `reviewed` 与 `approved` 两格：review 是两档共同的强制环节，approval 与它成对，没有停在 `frozen` 的免审捷径；T2 没有这两个相位，走快速通道。

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

- 未 `new` 不得实施；未 freeze 不得 review；review 和 approval 必须绑定同一个 `diffHash`。
- `new` 与 `start`（仅 `open → active` 这一次）对 T0/T1 要求 worktree 干净，T2 豁免：freeze 用 `git add -A` 归一化整个 worktree，实施起点没有别人的在制品，冻结 diff 才只含本 task 的改动。豁免只到 start：T2 若主动 freeze，freeze 自己要求干净起点（`live.clean` 把未跟踪文件也算在内，所以实际上要先把改动 commit 掉再 freeze）。review `fail` 回到 active 后不复查干净度。
- 变异实验、对照实验和临时接线都可以留在工作区，但收尾必须还原；探针与临时脚本写 `/tmp`，不落在 worktree 里，否则会被 freeze 的 `git add -A` 卷进冻结快照。
- 冻结 `diffHash` 的 canonical 口径是 [`scripts/task.mjs`](../../scripts/task.mjs) 的快照哈希，覆盖 tracked+untracked，不是 git diff 的摘要；reviewer 核验冻结一致性以 `pnpm agent:task status --task <id>` 的 `live` 比对（hash 一致 + 非 stale）为准，不要自制 `git diff | shasum` 配方复算。
- freeze、review 或 approval 后任何文件变化都会使证据 stale；必须重新 freeze（重算 hash 并重置 review/approval），再重复 review、approve。
- owner、reviewer、approver、drop 署名人共用同一套 id 形状；内核强制的「互不相等」约束与比对对象以「review 拓扑」节为权威。
- `pnpm agent:task verify` 必须显式给出 `--result pass|fail`；`--kind` 取 `test`（默认）或 `acceptance`。它只记录证据、不执行任何命令，省略结果不等于通过。verify 只接受非 stale 的结果，pass 验证还要求工作区干净（验证必须覆盖已提交内容）；`done`（T0/T1）按 kind 各取最新一条 pass，且该条快照与冻结时一致（所需 kind 见「任务级别」表）。
- T2 快速通道：`new → start → 修改 → done`，guard 不要求快照证据，也不要求 worktree 干净，但仍跑 `.agents/checks/` 政策检查。代价是这一档的提交内容等于当时的 index，别人的在制品一旦被 `git add` 进来就会一起提交，T2 不提供 diff 边界。需要可整笔回滚的 diff 边界升 T1，需要完整 review 与 approval 证据链的升 T0。

常用命令：

```sh
pnpm agent:task status --task <task-id>
pnpm agent:task freeze --task <task-id>
pnpm agent:task review --task <task-id> --result pass --reviewer <reviewer-id>
pnpm agent:task approve --task <task-id> --approver <approver-id>
pnpm agent:task verify --task <task-id> --name "pnpm test" --result pass
pnpm agent:task verify --task <task-id> --name "manual acceptance" --kind acceptance --result pass
pnpm agent:task issue --task <task-id> --ref <issue-url|N/A>
pnpm agent:task done --task <task-id>
pnpm agent:task drop --task <task-id> --reason <why> --by <your-agent-id>
```

`--approver` 不得等于本轮 reviewer（见「review 拓扑」）。每次状态转换都追加到 state 的 `events[]` 时间线，不需要手工补记；被取代的旧 hash 由后一条带 hash 的事件与 `live` 比对隐含。

freeze 会强制重写工作区：先全量 staging，跑 `CI=true pnpm run fix-code`，再把归一化后的内容计入 `diffHash`，归一化不可跳过。声明了 `fix-code` 的仓库若依赖未安装，freeze 直接失败，先在 worktree 里 `pnpm install && pnpm run build` 再重试；只有不含 `fix-code` 脚本的仓库（测试 fixture、纯 git 仓库）才跳过。commit 边界只保留 guard、不再跑 fixer，所以冻结后工作区不会再被工具改写。

`.agents/checks/` 下的可执行政策检查在 freeze 取快照前、guard 放行提交前各跑一次，任一非零退出即中止并回显该检查的 stdout 与 stderr。挂在 guard 上是必要的：T2 一般不 freeze，政策若只跟着 freeze 走就对最常见的 T2 形同不存在。有 active task 时目录下所有可执行检查都跑；没有 task 时只跑内核登记的白名单。绕过提交 hook 的禁止清单见 [`commit.md`](commit.md)。检查清单回显在 `guard` 与 `freeze` 输出的 `checks` 里。

提交边界由受版本控制的 `.vite-hooks/pre-commit` 把关：它通过 `pnpm agent:task guard` 自动发现当前 worktree 的 active task，按「任务级别」表的 commit gate 放行，并在放行前跑上述政策检查。没有 active task 时 task gate 放行（政策检查仍跑），并在 stderr 写下 `task gate: not enforced` 同时给出 `pnpm agent:task new` 的入口。这道门禁的强制力止于留痕与拦下一次提交：它管不到没有 active task 的 worktree 要不要 task、改动归谁，上游也保留 `HUSKY=0` / `VP_GIT_HOOKS=0` / `VITE_GIT_HOOKS=0` 旁路。因此「不得绕过提交 hook」是 [`commit.md`](commit.md) 的授权口径，不是机器保证；CI 里 `changeset-version.yml` 的 `git commit` 也走这同一条 hook。

## review 拓扑

- **T0**：必须 review。要求是一条不变量：reviewer 独立于实施者，不参与实施，也不接收实施者的叙述，只审冻结 diff、任务主合同与证据。用哪个执行体提供这份独立性不构成 gate——编排层另起的独立线程、owner 自己派的 fresh subagent、独立会话，都算数；换执行体时按 skill 记录理由。
- **T1**：必须 review，独立性要求与 T0 相同。
- **T2**：不用 review，这一档没有 review 相位。
- **任何级别禁止同一执行体自审**：实施者复核自己的 diff 不构成 review。这条由文档与角色纪律承担，不由内核强制。残余风险：reviewer 与实施者同模型、同源上下文时可能共享盲点，内核查不出来。
- owner、reviewer、approver、drop 署名人共用 id 形状 `^[A-Za-z0-9][A-Za-z0-9._-]{3,39}$`（如 `claude-code-reviewer-45a5b9eb`）。owner 由登录名兜底时不受该形状约束。内核强制的「互不相等」约束只剩一条：approver 不能等于本轮 reviewer。reviewer 和 approver 都不要求换掉 owner 身份，所以单 agent 工作流的最小身份组合是 owner 实施 + subagent review + owner approve。

审查报告先列具体发现，再按 `Block`、`Should fix`、`Nit` 排序，每条带文件和行号；没有缺陷时也要说明残余风险。检查项包括公共行为与向后兼容性、边界与失败情况、类型与错误处理、竞态或资源泄漏、用户输入安全风险和文档变更。重构要对照变更前后的行为清单。reviewer 报告、实施者叙述和聊天记录都不能替代冻结 diff 或验证证据。

## 测试验收

测试验收是流程收尾的功能验证环节，以测试工程师的视角独立执行功能层验证，例如真机操作、浏览器交互或压测，证据记在 `pnpm agent:task verify --kind acceptance` 上。它不改状态机相位：验证是证据记录而非相位（[ADR-0014](../adr/0014-task-system-v2.md)）。`test` 与 `acceptance` 的分工是实施阶段自证对照脱离实施叙述的独立验收，后者关注实际功能、浏览器行为与边界情况；浏览器证据按 [`runtime-verification.md`](runtime-verification.md) 采集。

## Playbook

release playbook（[`release.md`](release.md)）说明如何在 release 场景下满足对应的级别 gate：changeset 逐个校验、集成验证、PR 等 CI 与 approval、合并后验证，以及有版本变更时的发布链验证。流程本身（拆 task、PR 跟进、合并后回收）不属本仓，权威是编排层的 skill；它不自带级别，各 task 按自身影响面定级。

## 失败和恢复

- 命令失败时保留 task state 和工作树，先用 `pnpm agent:task status --task <task-id>` 判断当前 phase，不要重建或覆盖状态文件。Codex 沙箱权限拒绝时的处理方法见 [`build.md`](build.md)「Codex 沙箱边界与提权」。
- 需要终止或清理残留 task（agent 结束后遗留的 active task、快照无法物化的 task）时用 `pnpm agent:task drop --task <task-id> --reason <why> --by <your-agent-id>`；`--by` 与 reviewer/approver 同一套 id 形状。drop 是唯一合法的强制终态，不手工编辑 state JSON。
- session、客户端或 harness 在同一台机器、同一个用户内续作时（含客户端重启，只要没有重启机器），读取顺序是先 Task Packet、再 `$TMPDIR/greypan/tasks/<task-id>.json`，然后按 `phase`、`worktree`、`baseSha`、`events[]` 与 live stale 结果恢复，不从聊天记忆猜测进度。换机、换用户或重启机器都不承诺恢复，那些情况从 commit 历史重建。
- task state 在 task 进行中被清空（机器重启即清，见 [ADR-0018](../adr/0018-task-state-in-tmpdir.md)）时，用同一个 task-id 重新 `agent:task new`，重走 freeze / review / approve；此时 commit 还没发生，重建的证据链与新建 task 等价。重建 Task Packet、聊天消息或过程报告都不能替代这一步。`new` 对 T0/T1 的干净起点要求不变：先恢复干净工作区再重建。
- GitHub issue 不可用时在最终报告注明「未同步」。
- 某个 PR 的 CI 失败时，机械性修复由该 PR 对应 task 的 owner 直接处理，逻辑或测试修复回到原 task owner；修复提交会让该 PR 已冻结的证据失效。

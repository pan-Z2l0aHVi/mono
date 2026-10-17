# 任务分级与准入

本文件回答「这个 task 是什么级别、准入条件是什么」。状态机、Task Packet 契约、政策检查与失败恢复由 [`workflow.md`](workflow.md) 承担；冻结之后的 review、approval 与测试验收由 `review.md` 承担。拿到一个 worktree 之后怎么把它变成可执行的环境见 [`worktree.md`](worktree.md)。决策背景见 [ADR-0024](../adr/0024-task-tiering-v3.md)。

<!-- invariant:risk-tiering -->

## 级别代号

级别代号 T0/T1/T2（T0 最严格），只表达 workflow 严格程度，描述的是变更的影响半径，不是任务的价值排序。判据沿两个轴，逐档判定，先命中先定级，T2 是纯兜底：

- 可执行与否：可执行内容指会影响运行时或工具行为的文件，含源码、脚本、配置、构建与 CI 定义、依赖清单；文档、注释、纯格式化改动和二进制产物属于非可执行内容。这是实施 agent 依据改动内容做的软判断，不由脚本枚举。
- 路径落在哪里：workspace 的边界是 [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) 里的 `apps/**` 与 `packages/**`；不属于其中任何一条的路径就是「根」，例如仓库根配置、`scripts/`、`.github/`、`.agents/` 与根 `docs/`。

| 级别 | 判据（逐档命中先定级，T2 兜底）                                                                                        | worktree                             | freeze | review               | approval | done 前验证                      | commit gate（guard）               |
| ---- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------ | -------------------- | -------- | -------------------------------- | ---------------------------------- |
| T0   | 触及可执行内容，且满足任一：路径不在任何 workspace 之下；跨 workspace 的公共 API/exports/事件/类型契约；含任何依赖变更 | 专属（编排层分配）                   | 必须   | 必须（独立于实施者） | 必须     | test 与 acceptance 各 ≥1 条 pass | approved + hash 一致 + checks 通过 |
| T1   | 触及可执行内容，且路径落在某个 workspace 之下，且未命中 T0                                                             | 专属（编排层分配）                   | 必须   | 必须（独立于实施者） | 必须     | test ≥1 条 pass                  | approved + hash 一致 + checks 通过 |
| T2   | 只触及非可执行内容（文档、注释、纯格式、二进制产物）                                                                   | 允许当前 worktree 直接改，不要求干净 | 可选   | 不用                 | 不要求   | 不强制                           | active + checks 通过               |

本表是各级严格程度的权威。`pnpm agent:find-usages -- <paths...>` 只用于核实「跨 workspace 的公共契约」这一条，输出只涉及一个 workspace 时该条不成立。`checks` 指 [`.agents/checks/`](../../.agents/checks/) 下的仓库政策检查，三个级别在提交前都要通过；检查清单与各自口径以该目录下脚本自身的注释为权威，本表不枚举。

「可执行与否」是 T0 与 T1 的前置闸门，不是并列的一条：纯文档、纯注释改动不管落在哪个路径都够不到 T0，也够不到 T1，只能落 T2。这一轴由实施者做软判断，不由脚本枚举，所以判断错了级别就错了——需要可整笔回滚的 diff 边界升 T1，需要完整 review 与 approval 证据链的升 T0。

release playbook 是普通 task 在 release 场景下的操作程序，不是 task 体系的概念；它在哪一节、怎么用，见 `workflow.md` 的「Playbook」。

## 准入：先建立任务

所有实施任务先完成以下 preflight：

1. 查看 `git status --short --branch`，确认编排层交付的 worktree 干净：没有别人的在制品，也没有上一轮留下的未提交变更。
2. 读取根 [`AGENTS.md`](../../AGENTS.md)、[`workflow.md`](workflow.md) 和命中的 rule/guide；进入 workspace 后读取最近的包级 `AGENTS.md`。
3. 为任务选择唯一、不可变的 task id 和级别（T0/T1/T2）。
4. 在目标 worktree 执行（新 worktree 先跑一次 `mise install`、`pnpm install` 和 `pnpm run build`，判据见 [`worktree.md`](worktree.md#新-worktree-的三步准备)）：

   ```sh
   pnpm agent:task new --task <task-id> --level t0|t1|t2 --issue <issue-url|N/A>
   pnpm agent:task assign --task <task-id> --owner <owner-id> --worktree <path>
   pnpm agent:task start --task <task-id>
   ```

5. 按 [`workflow.md`](workflow.md)「Task Packet」写下范围、验收标准和验证命令。GitHub issue 只是可选的追踪镜像，用 `--issue` 记入 task state，事后可用 `issue` 子命令补挂；issue 不可用时本地流程照常推进，持久审计由 commit message、changeset 与 git 历史承担。

第 4 步的三步准备不能省：`mise install` 幂等且必须排第一，缺 workspace `dist` 会让 `vp check` 报出成片假 `TS2307`。

T0 与 T1 的 `new` 与 `start` 要求 worktree 干净，T2 豁免——这条 gate 与豁免的边界归 `workflow.md` 的硬条件清单，本文件不重复。

## 变更影响与验证命令的选择

判定 T0 的「跨 workspace 公共契约」一条时，用 `pnpm agent:find-usages -- <paths...>` 核实，参数与语义见 `agent-context.md`。改动该跑哪些验证不在本文件，由 [`verification.md`](verification.md) 承担。

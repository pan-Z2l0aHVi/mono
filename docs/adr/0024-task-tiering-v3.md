# ADR-0024: Task 分级 v3 与流程阶梯

- **Date**: 2026-10-11
- **Status**: 已接受
- **Amends**: [ADR-0014](0014-task-system-v2.md) §1 的分级判据与 §5 的 review 拓扑、[ADR-0021](0021-orchestration-layer-moved-to-herdr-projects.md) §2 的 T0 判据面
- **Relates to**: [ADR-0018](0018-task-state-in-tmpdir.md)（task state 落点，与本 ADR 无冲突）

## 背景

ADR-0014 把 task 分档收敛为 `level`（t0/t1/t2），但判据仍是一份按类别枚举的清单：跨 workspace、公共契约、多 worktree、instruction system、构建配置、CI、依赖……ADR-0021 §2 删掉了其中唯一描述编排形态的「聚合发布或多 worktree 并行」，判据面收窄成若干条契约与制度类条目。

枚举有两个问题。每出现一类新的根级配置或新的变更面，就要往清单里补一条，清单与真实仓库之间必然漂移；而「构建配置或 CI」这类条目只指到了「根」，可它与 workspace 内的源码用的是同一批代码，真正的分界并不在类别名上。

流程后半段此前也是分叉的：T0 双强制，T1 的 review 可选，由实施 agent 视情况决定。可选的代价是「记了 review 就必须 approve、没记则两者都不要求」两条路径同时存在，一条内容完整但没人审的 diff 也能一路走到提交，这与「review 是独立验收」的目标相悖。

## 决策

### 1. 判据改沿两个轴，不再枚举类别

判据沿两个轴展开，逐档判定，先命中先定级，T2 是纯兜底：

- **可执行与否**：可执行内容指会影响运行时或工具行为的文件，包括源码、脚本、配置、构建与 CI 定义、依赖清单；非可执行内容包括文档、注释、纯格式化改动和二进制产物。这是软判断，由实施 agent 依据改动内容判断，不由脚本枚举。
- **路径落在哪里**：workspace 的边界就是 [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) 里的 `apps/**` 与 `packages/**`；不属于其中任何一条的路径就是「根」，例如仓库根配置、`scripts/`、`.github/`、`.agents/` 与根 `docs/`。

| 级别 | 判据                                                                                                                   |
| ---- | ---------------------------------------------------------------------------------------------------------------------- |
| T0   | 触及可执行内容，且满足任一：路径不在任何 workspace 之下；跨 workspace 的公共 API/exports/事件/类型契约；含任何依赖变更 |
| T1   | 触及可执行内容，且路径落在某个 workspace 之下，且未命中 T0                                                             |
| T2   | 只触及非可执行内容（文档、注释、纯格式、二进制产物）                                                                   |

不把根目录下每个配置文件名登记成一份判据清单：那会在仓库迭代时变成注定漂移的副本，软判断配合 `pnpm agent:find-usages` 足够。`find-usages` 只用于核实「跨 workspace 的公共契约」这一条，输出只涉及一个 workspace 时该条不成立。

依赖变更一律归 T0，无论单包还是多包：lockfile 的路径归属本身有歧义，按「命中即 T0」避免判据漂移。

### 2. 流程阶梯单调成本递增

| 级别 | worktree | freeze | review | approval | done 前验证                      |
| ---- | -------- | ------ | ------ | -------- | -------------------------------- |
| T0   | 专属     | 必须   | 必须   | 必须     | test 与 acceptance 各 ≥1 条 pass |
| T1   | 专属     | 必须   | 必须   | 必须     | test ≥1 条 pass                  |
| T2   | 不要求   | 可选   | 不用   | 不要求   | 不强制                           |

T1 的 review 由可选改回强制，approval 与它成对，两条分叉合一。T0 与 T1 因此都必须走完 `reviewed` 与 `approved` 两格，没有停在 `frozen` 的免审捷径。T2 的快速通道不变。严格程度逐档递增，成本也逐档递增。

### 3. 测试验收复用 `verify` 的 `--kind`，不新增相位

`pnpm agent:task verify` 增加 `--kind`，取 `test`（默认）或 `acceptance`。前者是实施阶段自证的功能测试，后者是以测试工程师视角对功能层做的独立验收。

`kind` 只落在证据记录里，不改变状态机：ADR-0014 §2 已确定「验证是证据记录而非相位」。`done` 因此按 `kind` 各取最新一条 `pass` 要求，T1 要 `test`，T0 再加 `acceptance`。某类验证的最新一条若是 `fail`，它推翻同 `diffHash` 上更早的 `pass`，保留原有的 fail-fast 语义。两种错误写法都不会静默回落到默认值：漏值的 `--kind` 被 `parseArgs` 记成布尔 `true`，逐项比对直接拒绝；等号形式 `--kind=<value>` 被 `parseArgs` 存成独立键，也被显式拒绝。

## 后果

- `docs/agents/workflow.md` 的分级表、状态机 gate 与 review 拓扑按本 ADR 重写；`scripts/task.mjs` 的 `review.required` 由 `level === 't0'` 改为 `level !== 't2'`，`done` 按 `kind` 校验验证，`guard` 对 T0/T1 一律要求 `approved`。
- T1 的 diff 从「可免审」变为必经 review 与 approval；既有 T1 task state 里 `review.required: false` 是建 task 时的历史快照，内核判定一律读 `level`，不再读它，旧 task 不会按已废止的免审口径被放行。
- 判据不再随根目录配置文件增删而失效，代价是 T0/T1/T2 的「可执行与否」依赖实施 agent 的判断，不设脚本兜底。这是明确接受的：把它做成清单只会得到一份会漂移的副本。

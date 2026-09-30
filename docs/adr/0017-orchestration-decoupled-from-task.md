# ADR-0017: 编排与 task 体系解耦

- **Date**: 2026-09-28
- **Status**: 已接受
- **Supersedes**: [ADR-0010](0010-agent-role-orchestration.md)、[ADR-0011](0011-agent-model-binding-and-effort.md)、[ADR-0014](0014-task-system-v2.md)、[ADR-0016](0016-implementation-supervision.md) 中把编排事实绑定到 task 的部分
- **Amends**: [ADR-0015](0015-role-contracts-in-herdr-agents-skill.md)（skill 仍只由 `/herdr-agents` 触发，拆分与解耦都不新增 skill）
- **Relates to**: [ADR-0004](0004-progressive-agent-context-architecture.md)
- **Amended by**: [ADR-0018](0018-task-state-in-tmpdir.md)（下文的 `<git-common-dir>/tasks/` 是本 ADR 决策当时的位置；task state 现在的落点是 `$TMPDIR/greypan/tasks/`。决策本身不变）、[ADR-0019](0019-agent-to-manager-report-channel.md)（B 组的「工作单元只写在文件名里」升为报告文件名的硬规则；C 组的巡检数据源增加一条独立的报告信号）

## 背景

ADR-0010 建立 Role 编排时，编排与 task 体系是一起长出来的：编排要改仓库，所以先过 task gate，于是「先有 task，再有编排」被写进了每一步。后来 ADR-0014 把 task 收敛成纯 workflow 严格度的状态机，ADR-0016 又明确 Role、Supervisor 和 coordination 不进 task state——编排事实和 task 事实在 schema 上分开了，但**在前提上仍然绑着**：

1. coordination id 的构造是 `herdr-agents/<task-id>`，没有 task 就没有 id。
2. 参与者、启用理由、检查点结论和未决事项的落点是 Task Packet 的 Coordination 区，那是一个 task 文档。
3. 巡检 `patrol.mjs` 的数据源是 `<git-common-dir>/tasks/*.json`，编排单元和 task 一一对应。
4. 适用范围一节列的五类排除场景里没有「编排早于 task」，于是「task 已经在」成了隐含前提而不是被声明的边界。
5. 评分刻度用「并行 task 数量」、`Evidence:` 枚举里混着 `task status`、会话恢复锚在 Task Packet——都是同一根线的末梢。

这根线的代价不只是措辞。Manager 实测有两个上下文膨胀来源：长输出回流，和自己承担调研设计。前者由「结论 + 证据路径 + 关键数字」的回报契约和派 research 通道收口，后者由体量阀值收口；而编排元数据散在多个 task 文档里，正是长输出最容易回流的地方。编排层不解耦，这两条规则下次还会长回来。

同时实测到一个副作用值得记下来：巡检的 `ALL_DONE` 要求「没有活跃 task」，而 `<git-common-dir>/tasks/` 里长期躺着 phase 为 `approved` 的历史 task（它们既不是 `done` 也不是 `dropped`），所以 `ALL_DONE` 在真实环境里几乎不会触发。根因是「编排单元 = task」这个等式让残留 task 直接污染了编排的终态判定。

## 决策

解耦的是**编排层**：skill 的编排流程、coordination、编排元数据与巡检不再以 task 存在为前提。task 体系本身、workflow 的级别与状态机、证据要求一字未动。

### A 组：coordination id 不再从 task 派生

Manager 在**编排开始时**生成一个自由标签 `herdr-agents/<主题slug>`。有 task 时可以把 task id 作为附注写进编排记录，但 id 本身不依赖它。同一条 id 贯穿 handoff、Observation Report 和编排记录；pane 名称与 pane id 仍然只用于寻址，顶替不了 coordination id。

### B 组：编排元数据落 `$TMPDIR/herdr-agents/reports/`

参与者、启用理由、检查点结论和未决事项的权威落点是 `$TMPDIR/herdr-agents/reports/<主题slug>.json`。Task Packet 的可选 Coordination 区退化成指针，只留 `Coordination id` 和 `Record` 路径两行。

固定根是 `$TMPDIR/herdr-agents/`，固定子目录是 `reports/`、`browser/`、`commands/`。**目录结构是 skill 的一部分，永远存在，不依赖任何 key**；工作单元只写在文件名里，不进目录结构。不复用仓库内 `temp/`：同一相对路径在多个 worktree 下是不同的物理目录，「reviewer 在 A worktree、coder 在 B worktree」取不到对方产物，而 `$TMPDIR` per-user、跨 worktree 共享、跨重启稳定，且不会被 `git add -A`、`vp check`、`cspell`、`turbo` 或 `stylelint` 扫到。

### C 组：巡检按编排单元枚举

`patrol.mjs` 的数据源从 task state 换成编排记录：每个 manifest 提供 `coordination`（行 id）、`roots`（要盯的工作目录，可多于一个）、`participants`（live agent 名）和可选 `taskId`。`taskId` 存在时把该 task 的 phase 附在行尾**作参考**，不参与任何判定——单元的存续由 manifest 自己的 `status` 决定，两者是不同的生命周期。`STALL` 的武装条件从「该 task 的 owner 在 working」放宽为「该单元的任一 participant 在 working」。

### F 组：范围门显式排除「编排早于 task」

适用范围一节把编排早于 task 列为独立场景，编排流程第 1 步相应改成「先定 coordination id，需要改仓库时再进 task gate」。

### G 组：隐式耦合

评分刻度的「并行 task 数量」改为「并行工作单元」；`Evidence:` 枚举里的 `task status` 降为「编排有 task 时可附」；会话恢复的证据来源从 Task Packet 扩到工作区 `git status`、编排记录与 Task Packet（有的话）；Role 初始化 prompt 本身不含 task，而各 Role 契约里的 task 引用经 A、B 两组后只剩实施期必需的那部分。

### 刻意保留的实施期交互

解耦的是编排层，不是证据链。以下全部保留：

- 建 task、worktree 边界、task 级别路由、freeze / review / approve / done / drop 完整链路、task 级 guard 与只读边界的成立性判据。
- Task Packet 作为**任务主合同**：Manager 派发前把目标、范围、验收、验证和 review 要求写进 Task Packet，实施期这是必需的。
- 「聊天记录替代不了 task state」这条证据纪律，以及 Reviewer 只读冻结 diff、任务主合同与验证证据。
- Supervisor 启用的判定对象（仍是实施工作单元）、三个检查点与 `disputed` / `escalated` 裁决、pane 与 Herdr 机制本体。Role 与执行体的关系已由 [ADR-0020](0020-role-executor-not-bound.md) 重新定义（执行体是每轮编排的输入，落本轮编排记录）。

## 行为变化

- **coordination id 不再可从 task 反推**。看到一条 `herdr-agents/<slug>`，要回编排记录才能找到它对应的 task。
- **`ALL_DONE` 的判据变了**：从「无活跃 task 且无 agent 在跑」变成「无活跃编排单元且无 agent 在跑」。它现在会真的触发——编排记录由 Manager 显式标记 `finished`，不再被历史残留 task 挡住。
- **巡检 state 换格式，不再逐字段迁移**。`$TMPDIR/herdr-agents-monitor/state` 的首行加了版本号 `v2`，`TASKS` 段改为 `UNITS`。旧文件解不开也不迁移：单元 id、参与者来源和 churn 定义（多 root 求和 vs 单 worktree）全都变了，逐字段搬运等于凭空造出一个从未观测过的基线——要么首轮误报一次 `CHURN_CHANGED` / `STALL`，要么在字段恰好撞上时对一个没测过的轮次武装 STALL。版本不匹配就当没有基线，输出里显式给一行 `baseline: no matching state version`。代价是升级后第一轮多一次信号轮；这是「我没有可比的基线」的真实信号，下一轮自愈。`stall` 计数器按单元 id 键，随基线一起丢弃。
- **编排记录成为巡检的前置条件**。Manager 忘了写 manifest 时，`ALL_DONE` 仍受 `running` 一侧兜底（有 agent 在跑就不会误判），但这一路进展的 churn 与 `STALL` 不会被观察到。

## 后果

- 编排可以在没有任何 task 的场景使用：只读调查、多会话调研、跨会话的方案收敛。
- 编排元数据有了单一落点，Manager 的上下文回流从「散在多个 task 文档」变成「按路径定点读一份 JSON」。
- `patrol.mjs` 的数据源与 task 体系解耦，task state 目录（决策当时是 `<git-common-dir>/tasks/`，[ADR-0018](0018-task-state-in-tmpdir.md) 起为 `$TMPDIR/greypan/tasks/`）只剩 workflow 需要它的那部分用途。
- ADR-0010 / 0011 / 0014 / 0016 的原文保留不动，它们记录的是各自当时为何那么定；本 ADR 只声明其中「把编排事实绑定到 task」的部分不再现行。

## 替代方案

- **把 task 内核也解耦，让编排完全不感知 task**：会让「改仓库前过 gate」这条不可绕过的边界从编排层消失，编排就能在没有 task 的情况下改代码；不采用。
- **保留 `herdr-agents/<task-id>` 构造，没有 task 时允许留空**：coordination id 在无 task 时退化成空串，报告之间无法互相定位，Supervisor 复用的寻址纪律也就跟着松了；不采用。
- **让巡检从 herdr pane 反推编排单元**：herdr 只提供 agent 列表，不提供「哪些 agent 属于同一轮编排」这层分组，等于要靠 cwd 猜；不采用。
- **删掉 `$TMPDIR/herdr-agents-monitor/state` 让它重建**：省掉版本判断，但老格式与新格式的字段没有对应关系，重建出来的是同一个未测基线；版本号 + 丢弃是同一件事的显式写法，还能让代价在输出里看得见。

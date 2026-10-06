# ADR-0021: 需求拆分与 task 派发移交编排层

- **Date**: 2026-10-03
- **Status**: 已接受
- **Amends**: [ADR-0014](0014-task-system-v2.md) §5 的「跨 workspace 的拆分按 `agent:find-usages` 的受影响 workspace 决定」一行——拆分与派发不再由仓库内的 agent 承担，改由编排层决定
- **Relates to**: [ADR-0018](0018-task-state-in-tmpdir.md)（task state 落点与可丢失定位，与本 ADR 无冲突）

## 背景

2026-10-03 的 `6d7e1694` 删掉了仓库自研的多 agent 编排层：`.agents/skills/herdr-agents/`（五个角色契约、Manager/Supervisor 派发逻辑、Handoff 模板、Supervisor 协议）、七篇编排 ADR（0010/0011/0015/0016/0017/0019/0020）、Task Packet 的 Coordination 区域。删除的理由与证据记在那次 commit 与对应 changeset 里，本 ADR 不重复。

删除之后，「一个需求拆成几条 task、并行度多大、每条 task 用哪个 worktree、reviewer 从哪来、CI 挂了怎么回灌」这一层在仓库文档里留下了几处悬空表述：`AGENTS.md` 仍要求 agent「按影响面拆成独立 task」，`worktrees.md` 仍在教怎么手工 `git switch -C`、怎么复用 package worktree，`release.md` 还在向一个已不存在的 Manager 角色派活。这些句子描述的是一个已经没有人执行的层。

现在这一层由外部的 herdr-projects 承担：一个 Herdr 项目（slug `mono`）的协调者接收需求、拆成多个线程、决定并行度、用 `herdr-projects thread start` 给每条线程开独立的 git worktree 与分支、跟进 PR，并在 CI 失败或收到 review 时按 `pr-followup` 例行规则把问题回灌给对应线程。协调者从不亲自写代码，编排产物不进本仓版本控制（见下文「不写进仓库的原因」）。

## 决策

### 1. 仓库只保留 task 级别门禁，拆分与派发整体移交

编排层负责：需求拆分、线程（= task）派发、并行度、worktree 与 branch 的分配与创建、reviewer 线程的开立、PR 跟进与失败回灌、worktree 的清理。

仓库保留：级别判定（T0/T1/T2）、状态机、冻结证据（`diffHash` 与 stale 判定）、review/approval 的独立性要求、验证门禁、`.agents/checks/` 的政策检查、Playbook。判据见 [`docs/agents/workflow.md`](../../docs/agents/workflow.md)「任务级别」与「状态机」，本文不复制。

分界线是「谁因它失效」：拆分错了、派发重了，是编排层的流程失效；一条 task 的级别判错、证据不完整、review 缺位，是仓库门禁失效。前者不再写进仓库文档。

`docs/agents/worktrees.md` 相应收缩为只描述仓库侧边界：一个可变 task 一个 owner 一个实施 worktree、收到新 worktree 后必须先 `pnpm install && pnpm run build` 的理由、turbo 共享缓存，以及 Git 与 review 边界。**注意分工**：编排层交付 worktree，装依赖与初始化 task state 由收到 worktree 的执行者完成，不由编排层代劳——后者要能改仓库状态，而 task 体系的前提是执行者本人对自己的 diff 负责。

### 2. T0 判据删除「聚合发布或多 worktree 并行」

原 T0 判据的最后一项是「聚合发布或多 worktree 并行」。删除它，判据表的其余文字不动。

理由是这一项描述的是**编排形态**，不是变更的影响半径，而表头自己写明判据「描述的是变更的影响半径，不是任务的价值排序」。把「有 N 条 task 并行跑」当作升 T0 的条件，等于让一次编排决定绕过整张风险表：三条互不相干的 T2 文档改动并行，就变 T0；同样三条改动串行跑，就是 T2。同一份 diff 的严格程度取决于它被排在哪一档，与它本身的风险无关。

删掉之后 T0 由纯粹的契约面定义：跨 workspace 的公共 API/exports/事件/类型契约，依赖、catalog、lockfile、构建配置或 CI。这五类都有可机械查证的判据。聚合发布仍然按 T0 建 task——但依据是它聚合的 task 里至少有一条 T0，而不是「它是一次聚合」。

### 3. T0 的 reviewer 由编排层另起独立线程，不进入 owner 的 worktree

T0 必须 review 的要求不变，形态改变：编排层为 review 开一条独立线程，该线程有自己的 worktree，从 owner 的分支检出（`--base <owner 分支>`）。

这条形态解决了两个原本互相拉扯的要求。「同一会话禁止自审」要求 reviewer 与实施者分离；但 owner 的 diff 在冻结时可能还没 push（本仓 push 需逐次授权），reviewer 要读它就得能访问 owner 的 worktree，于是「reviewer 进 owner 的 worktree」与「owner 为 review 提前 push」都被推到实施者身上——前者是共享工作区里的并发写入，后者是把逐次授权的门禁降级成惯例。

按分支检出把两者都解掉：reviewer 读的是 owner 分支在远端可得的快照，不共享工作区，owner 也不必为了 review 多做一次 push。代价是 review 只能覆盖 owner 分支上**已提交**的内容，冻结 diff 里尚未 commit 的部分不在其中——这正是编排层的职责边界：review 是针对 PR 内容的，而 task 体系的冻结 diff 证据是提交前的、另一回事。两者都要留痕，互不替代。

`workflow.md`「预授权操作」清单因此**不动**：push 仍需逐次授权，编排层不能因为要开 review 线程就替 owner push。

### 4. 不把编排层写进仓库，也不在仓库里复活它

编排层的实现、角色契约与派发协议留在 herdr-projects 侧，不进本仓版本控制。仓库文档只写它承担的职责与它交付到仓库边界上的那几个值（worktree 路径、base SHA、owner 标识），不复制它的实现。

同时明确不复活的清单：角色契约（Manager/Supervisor/Reviewer 等）、Handoff 模板、pane 时序、执行体启动参数，以及已删除 ADR 的编号。ADR 编号不复用——0010/0011/0015/0016/0017/0019/0020 永久空缺，下一个可用编号是 0021。列这份清单是为了不让它们被当成待办重新写回来，指向它们的内容仍然只留在 `6d7e1694` 的 diff 与 changeset 里。

## 为什么不让仓库继续自己拆分

一个替代方案是保留仓库内的拆分规则，只把 worktree 创建交给编排层。否掉的理由是它要求每个承接线程的执行者先做一次「这个需求该拆成几条 task」的判断——这个判断的输入是全局调度信息（还有哪些线程在跑、哪些 PR 挂着 CI、reviewer 有没有空闲），只有协调者看得到。让线程各自判断，实际结果是每个线程都倾向于认为自己的那条 task 边界正好，于是拆分退化成一个必然得到「一条 task」的仪式，同时把调度知识复制到每条线程的 context 里。

保留仓库内拆分的唯一好处是可离线执行（不接编排层也能按同一规则拆）。这个好处是真的，但代价是把一份必然与真实调度脱节的规则固化进永久文档，而实际拆分本来就允许跨 workspace——ADR-0014 §5 已经把这条按「该行原为编排派发规则」标注过，这次只是让它落到实际承担者手里。

## 行为变化

- **仓库文档不再教手工编排**。`worktrees.md` 的路径约定、`git switch -C`、`--unset-upstream`、package worktree 复用规则删除；`AGENTS.md` 的手工路径约定删除；`release.md` 的 Manager 角色表述改为聚合 task 的 owner。
- **一个 worktree 的初始化责任人明确为执行者**，不是编排层。
- **T0 判据表少一项**，其余单元格、表头结构与「多级同时命中时取最高级」一条不变。级别对应的 freeze/review/approval/验证/commit gate 一项不减。
- **review 拓扑的 T0 一条改写**，T1/T2 的表述原样保留；「同一会话禁止自审」与 id 形状规则不变。
- **`task-packet.md` 增加一条字段来源说明**：`Owner`、`Worktree`、`Base` 由编排层提供，packet 只如实记录。
- **预授权操作清单、状态机、`diffHash` 口径、`alwaysOnChecks` 白名单、`.agents/checks/` 的两条检查、Playbook 与 hotfix 规则全部未动**。

## 后果

- 仓库的文档面更小，但多了一份外部依赖：不在 herdr-projects 侧的人无法从本仓文档得知一条 task 是怎么被拆出来和派下去的。这是有意接受的——这份信息在编排层才是真相，把它复制进仓库只会得到第二份会过期的副本。
- 门禁强度不变。拆分权移出仓库不降低任何一条 task 内部的严格程度，因为级别判据本身没有被放宽，被删的那一项从来就不是影响面判据（见 §2）。
- `pnpm agent:task` 的全部子命令语义与 `scripts/task.mjs` 的实现**一字未改**。这是本 ADR 存在的意义所在：编排层换了，仓库的门禁必须是同一个。
- 已删除的七篇编排 ADR 仍在 [ADR-0014](0014-task-system-v2.md) 与 [ADR-0012](0012-instruction-risk-tiering-and-pre-authorized-operations.md) 的头部注记里以「已删除」形态被引用，本 ADR 是这条注记的延续，不是它们的替代。

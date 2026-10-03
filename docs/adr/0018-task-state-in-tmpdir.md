# ADR-0018: Task state 落在系统临时目录

- **Date**: 2026-09-28
- **Status**: 已接受
- **Amends**: [ADR-0014](0014-task-system-v2.md) §3 的状态落点（「状态存 `<git-common-dir>/tasks/<task-id>.json`，跨 worktree 共享」）与「后果」节「`<git-common-dir>/tasks/` 是唯一执行真相」一句
- **Relates to**: 已删除的编排层 ADR（编排已与 task 解耦；evidence 不进 task state）——两者均随多 Agent 编排层于 2026-10-03 整体移除

## 背景

ADR-0014 把 task state 定在 `<git-common-dir>/tasks/<task-id>.json`。这个位置在多 worktree 并行时是必要的：21 个 worktree 各自持有 `HEAD`、index 与 `ORIG_HEAD`，只有 common dir 里的目录是同一份物理文件，reviewer 在 A worktree 冻结、coder 在 B worktree 读到的必须是同一个 state。实测规模（2026-09-28）也支持「高频写」这件事是真的：241 个 state 文件、1563 条事件，同期全仓 403 个 commit。

问题出在同一个目录被当成了两样东西。它在**文件系统**上是 per-user 的临时工作区，在**定位**上却被文档称为「唯一执行真相」——一个会被删掉的东西被写成永久审计的载体，于是产生了三条没人真正核对过的承诺：

1. **它不在版本控制里，也不受版本控制保护**。`.git` 只是路径巧合，不享有 object DB 的任何保证（可达性、`gc` 保护、push/fetch）。`git clone` 拿不到它，`git worktree remove` 之后它还在，仓库目录整个删掉它也还在——它是孤儿，不是历史。
2. **它没有归档机制**。1.6 MB、241 个文件，无上限增长、无清理策略，`done` 之后与 `drop` 之后一律留着。
3. **它挡在提交路径上**。`guard` 在 `.vite-hooks/pre-commit` 里要求 T0/T1 已 approved，于是「state 存在哪」这件事从落点选择变成了 gate 的前置条件。

本轮先评估了「把状态搬进 Git 记录」（git notes / commit trailer / task-per-branch / 混合），结论是全部否掉，论据见调研报告 `docs/research/task-system-git-persistence-260928.md`（只读研究，本 ADR 不复制其内容）：状态机频率比 commit 高一个量级（1563 事件 vs 403 commit），`guard` 在 pre-commit 要求 approved 形成循环依赖（approve 事件必须早于那个 commit 存在，只能挂 HEAD 或 staged tree，两者都判死），而本仓 squash-only 合并会把挂在 task 分支 commit 上的一切换成新 sha。用户在这些方案之外给出另一条：既然 `.git` 也只是「一个不进版本控制的本地目录」，那就连它一起不要——**搬进系统临时目录，接受重启即清**。

这条选择的前提是先把定位说准：task state 不是审计链。审计链是 commit message、changeset 与 git 历史，它们在仓库里、在 review 里、在 CI 里。`guard` 保的是「提交前经过 review 与 approval」，不是「永远可查的逐次状态记录」。前者是提交边界上的门禁，后者是这份设计一直假装提供、实际从未提供的东西。

## 决策

### 1. 落点改为 `$TMPDIR/greypan/tasks/`

state 目录是 `$TMPDIR/greypan/tasks/`，Task Packet 的 `.md` 与 `evidence/` 与它同处一个 task 的目录下（它们是一条 task 的完整记录，不是两类东西）。目录不挂在任何编排 skill 名下：task 体系是根级设施，把落点放进某个 skill 的命名空间会让基础设施的归属跟着 skill 走。

`$TMPDIR` 本身一定存在（系统保证），`$TMPDIR/greypan/` 与 `tasks/` 不一定，所以创建只发生在写路径上（`saveState` 的 recursive mkdir）。读路径上目录不存在是合法状态，含义是「本机还没有任何 task」，返回空集而不是报错。

跨 worktree 共享的性质**原样保留**：reviewer 在 A worktree、coder 在 B worktree 读写的仍是同一份物理文件。改变的是跨**仓库**——落点现在是 per-user 共享的，同一台机器上所有仓库的 state 在同一个目录里，所以列举侧必须按 state 自带的 `commonDir` 过滤。

### 2. 列举侧只认当前仓库

仓库删了、state 还在的那种孤儿 state 是搬家的直接产物：`$TMPDIR` 不随仓库生命周期消失。`list` 类操作（`activeStates()`，即 worktree 占用检查与 `guard` 的候选筛选）按 `state.commonDir === 当前仓库的 commonDir` 过滤，别处的 state 既不列也不删，更不该在别人的 `guard` 上刷警告。

定向命令不受这条过滤影响：`status` / `freeze` / `review` 按 task id 直接读文件，读到了就交给 `liveState` 的 `commonDir` 比对硬失败（「belongs to another Git repository」）。列举过滤是为了不让别人的 state 参与本仓库的判定，定向失败是为了让「你拿到的是哪个仓库的 state」永远有明确回答——两条都不可省。

### 3. 干净切断，不迁移、不回退读取

`scripts/task.mjs` **只认新路径**：不回退读 `<git-common-dir>/tasks/`，不双写，不做迁移脚本。`<git-common-dir>/tasks/` 里已有的 241 个 state 与 55 个 packet 从此不可见，旧目录原地保留（删它是一次独立的清理动作，不夹带在这次迁移里）。

回退读取看起来是零成本的容错，实际是把「找不到 state」和「读到旧位置的 state」变成两种可能结果——同一个 task id 在两个位置都存在时，读到哪一份取决于内核内部实现，使用者无从判断。干净切断让「state 不存在」只有一个含义：重新建。

### 4. 三个被明确接受的后果

1. **重启即清**。macOS 的 `$TMPDIR`（`/var/folders/<hash>/T/`）在重启时被清空：本机实测本次启动后新增 2006 条、启动前 0 条。清它的不是 `tmp_cleaner`（它的 `daily_clean_tmps_dirs` 只覆盖 `/tmp`），但结果是实的。
2. **恢复规则限定为本机、本用户、会话续作**。换机、换用户不承诺恢复；那种情况从 commit 历史重建（`git log`、冻结 diff、changeset 都还在仓库里）。文档里「重启后从 task state 恢复」的读法相应收窄为「同机同用户的会话续作」。
3. **state 在 task 进行中被清 → 用同一个 task-id 重新 `agent:task new`**，重走 freeze / review / approve。此时 commit 还没发生，冻结 diff 与 approval 一起重建，仓库里没有错误代码可以流出去。这条恢复路径与 T0/T1 的干净起点要求相容：重新建 task 前先把工作区恢复干净（或在另一份干净副本上重建），而不是在脏工作区上绕过 `new`。

### 5. 保留的部分

级别 T0/T1/T2、状态机与相位集合、`events[]` append-only 时间线、`diffHash` 的 canonical 口径、`verify` 的显式 `--result`、`drop` 的 `--reason`/`--by`、`guard` 与 `.agents/checks/` 的两个边界、freeze 的归一化管线——全部一字未动。`saveState` 的「原子写 + 无跨进程锁、单 owner 串行化」边界照旧（ADR-0014 自认的边界，迁移没有改变它的成立条件）。

## 为什么不用 git notes / commit trailer

三条硬冲突，每条各自独立致命，详见调研报告：

- **频率不匹配**：一个 task 3–24 次状态写入（实测中位 4、p90 10），trailer 只能随 commit 落一次。让它承载 `assign` / `review fail` 回 active / re-freeze / `verify` 追加，就等于为每次状态变更造一个 commit，把 git 历史变成日志文件。
- **循环依赖**：`freeze` 的 `diffHash` 覆盖的是尚未存在的工作区快照，而 `guard` 在 pre-commit 要求它已 approved。approve 事件若在 commit 里，必须早于那个 commit 存在；挂 HEAD 描述的是上一个 commit，挂在 staged tree 上则 `git write-tree` 在 pre-commit 有副作用且与「pre-commit 只读」的定位冲突。
- **squash-only 合并**：本仓 main 是 squash-only，挂在 task 分支 commit 上的 note / trailer 在进 main 时被换成一个新 sha 失效。这与 ADR-0014 背景里「post-merge close gate 与 squash merge 结构性冲突」是同一个病。

git notes 还有一条实测结论：它不在任何 refspec 里，不被 push 也不被 fetch，`clone` 下来的副本读不到。它看起来「像在版本控制里」，实际不是——而这次搬家要解决的正是「看起来像」与「实际是」的落差，把审计押在它上面只会换一个更隐蔽的落差。

一个 238 条历史不迁移的对照：v1 → v2 那次 schema 迁移便宜，是因为载体没变（还是 JSON 文件），只换 schema；这次同时换载体和定位，历史数据即使搬过去也失去了「恢复依据」的资格——旧 phase 与新流程的 gate 已经不是同一套。逐条重写一份兼容映射的成本，高于从 commit 历史重建。

## 行为变化

- **`<git-common-dir>/tasks/` 不再被读也不再被写**。它还在那儿，但那 241 个 state 与 55 个 packet 从此对新内核不可见。
- **`guard` 的候选集合按仓库过滤**。同一台机器上别的仓库有 active task 时，本仓库的提交不再被它们挡住，反之亦然。
- **「执行真相」这个措辞从文档里消失**。state 现在是本地工作记忆，可丢失；`task-packet.md` 的恢复规则随之限定为本机本用户的会话续作。
- **新增 fixture 注入点 `AGENT_TASK_STATE_DIR`**。它与既有的 `AGENT_TASK_ROOT`（换默认 worktree）同类：只换落点，不换语义，生产路径不读它。测试用它把 state 隔离到私有目录，否则整份 `scripts/task.test.mjs` 会直接读写真机上真实 task 的目录。
- **`patrol.mjs` 的 `taskRef()` 指向新路径**，行为不变：仍是附在单元行尾的参考列，不参与任何判定。它按 state 的 `commonDir` 认仓库，认不出归属与读不到文件一样落回既有的 `unreadable` 哨兵，不新增输出形状。

## 后果

- task 体系的门禁强度不变，但**可查询性下降**：task 进行中的逐次状态在重启后不存在。这是有意接受的代价，换来的是 state 不再假装是审计链。
- `guard` 的边界没有被削弱。state 丢失时它放行的形状是「无 active task」（stderr 明确写 `task gate: not enforced` 并给出 `agent:task new` 入口），而不是静默把旧 task 当成没发生过；发现它的是 review 与 CI，不是这条门禁。
- 多仓库并行时 `$TMPDIR/greypan/tasks/` 里的 state 会混在一起。列举侧按 `commonDir` 过滤，孤儿 state 不会被清理——清理是使用者的事，内核不删不属于当前仓库的文件。

## 替代方案

- **继续留在 `<git-common-dir>/tasks/`**：这是被推翻的现状。问题不在落点本身，而在于文档把它称作「执行真相」——不搬目录、只改定位措辞也是可行选项，但那样 state 会继续与 `git worktree remove`、仓库目录一起消失，而文档已经不再承诺任何持久性，两边对不齐的状态比搬家更难解释。用户选择一次性把位置和定位都对齐。
- **搬到仓库内的 `temp/`**：被否。同一相对路径在多个 worktree 下是不同的物理目录，「reviewer 在 A worktree、coder 在 B worktree」立刻取不到对方产物。
- **迁到 `$XDG_STATE_HOME` 或 `~/Library/Application Support/`**：不重启即清，与「本地工作记忆」的定位更贴，但它是 per-user 的**持久**目录，`commonDir` 过滤之外还要处理同机多用户的可见性；`$TMPDIR` 已经是 per-user 且被系统清理，够用且少一条自建清理策略。
- **只改定位措辞、不动代码**：见上，位置与定位会长期不一致。

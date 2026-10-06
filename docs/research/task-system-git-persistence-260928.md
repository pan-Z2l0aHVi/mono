# Task 体系能否改用 Git Commit 记录承载状态

- 日期：2026-09-28
- 类型：调研报告（只读研究，不含实施代码变更）
- 范围：`scripts/task.mjs`、`.vite-hooks/`、`.agents/checks/`、`scripts/task.test.mjs`、`docs/adr/0014-task-system-v2.md`、`docs/agents/{workflow,task-packet,worktrees,build,commit}.md`、`.agents/skills/herdr-agents/patrol.mjs`
- 方法：每条论断带 `路径:行号` 或可复现命令输出。git notes 的行为结论来自 2026-09-28 在本机隔离 fixture（`/tmp/notes-exp`、`/tmp/squash-exp`）的实测，**未向本仓写入任何 ref、note 或文件**。

## 结论（TL;DR）

1. **不推荐把 task state 迁到 commit 记录**。核心障碍不是实现难度，而是三条硬冲突：状态机频率远高于 commit（一个 task 生命周期 3–24 次状态写入，实测中位数 4、p90 10）；`freeze` 的 `diffHash` 覆盖的是**尚未存在**的工作区快照，而 `guard` 在 **pre-commit** 里要求它已 approved——循环无法在 commit 内部闭合；本仓是 squash-only 合并（`docs/agents/build.md:123`、`docs/agents/release.md:10`），挂在 commit 上的任何证据都会在进 main 时被换成一个新 sha 而失效。
2. **推荐维持现状 D**（`<git-common-dir>/tasks/<task-id>.json`），它是唯一同时满足「跨 worktree 立即可见」「pre-commit 可读」「不被合并策略改写」「单文件原子替换」四项的载体。
3. **唯一值得做的增量是 F：给 commit message 加 `Task: <task-id>` trailer 做单向镜像**，state 仍是唯一执行真相。它把「commit 归属哪个 task」这个今天完全丢失的信息补上，代价是 `scripts/commit.sh` 与 commitlint 各改一行量级的配置，不触碰任何 gate。

## 一、现状：task state 今天怎么存

### 1.1 落点与形状

- 目录与文件名：`stateDirectory()` 返回 `path.join(commonDir, 'tasks')`，`stateFile()` 返回 `<commonDir>/tasks/<task-id>.json`（`scripts/task.mjs:110-116`）。文件模式 `0o600`，目录 `0o700`（`scripts/task.mjs:173`）。
- `commonDir` 的来源：`resolveWorktree()` 先取 `--show-toplevel`，再对该 toplevel 取 `--git-common-dir` 并 `realpathSync`（`scripts/task.mjs:102-108`）。
- schema：单版本 `SCHEMA_VERSION = 1`（`scripts/task.mjs:14`），`parseStateFile()` 校验 `phase` 在白名单、`taskId` 是字符串、`version` 匹配（`scripts/task.mjs:149-152`）；相位集合 `open/active/frozen/reviewed/approved/done/dropped`（`scripts/task.mjs:12`）。
- state 形状（`newTask`，`scripts/task.mjs:377-396`）：`version / taskId / level / phase / createdAt / updatedAt / commonDir / baseSha / branch / worktree / owner / issue / playbook / diffHash / review / approval / verification[] / events[]`。
- 文档口径一致：`docs/agents/workflow.md:58`「任务状态保存在 Git common dir 的 `tasks/<task-id>.json`，不进入工作树版本控制」；`docs/adr/0014-task-system-v2.md:35`「状态存 `<git-common-dir>/tasks/<task-id>.json`，跨 worktree 共享，schema 单版本」。

**为什么是 git common dir**：代码注释直接给出理由——「状态存 git common dir 下的 tasks/，跨 worktree 共享」（`scripts/task.mjs:4`）。实测确认这一共享性质：21 个 worktree 的 `git rev-parse --path-format=absolute --git-common-dir` 全部解析到同一个 `/Users/bopan/VibeCoding/mono/.git`，而各自的 `--git-dir` 是 `/Users/bopan/VibeCoding/mono/.git/worktrees/<name>`。所以 `<common>/tasks/` 对所有 worktree 是同一份物理目录，而 `HEAD`、index、`ORIG_HEAD` 这些 per-worktree 状态在 `.git/worktrees/<name>/` 下互不共享。

同一设计在仓库里已有先例且被明确记录：`.mise.toml` 的 `TURBO_CACHE_DIR` 也用 `--git-common-dir` 锚定，理由是「主仓与全部 task worktree 共享同一份本地 turbo 缓存……git common dir 不受 `git gc` / worktree 清理影响」（`docs/agents/worktrees.md:15`）。

### 1.2 一个生命周期里 state 被写多少次、由谁写

`saveState()` 只有 10 个调用点，全部在 `scripts/task.mjs` 内，全部由 `pnpm agent:task` 子命令触发：

| 子命令    | 写入点                 | 改动的字段                                                                                                     |
| --------- | ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| `new`     | `scripts/task.mjs:398` | 建文件，`phase: open`，`events += new`                                                                         |
| `assign`  | `:413`                 | `worktree`/`owner`，`events += assign`                                                                         |
| `start`   | `:437`                 | `phase: active`，`events += start`                                                                             |
| `freeze`  | `:478`                 | `diffHash`、重置 `review`/`approval`、`phase: frozen`、`events += freeze{diffHash,reFreeze,normalized,checks}` |
| `review`  | `:509`                 | `review{result,diffHash,reviewer,at}`、`phase: reviewed                                                        | active` |
| `approve` | `:529`                 | `approval{granted,diffHash,approver,at}`、`phase: approved`                                                    |
| `verify`  | `:549`                 | `verification[] += {name,result,at,headSha,diffHash}`                                                          |
| `done`    | `:580`                 | `phase: done`                                                                                                  |
| `drop`    | `:602`                 | `phase: dropped`，`events += drop{reason,by}`                                                                  |
| `issue`   | `:623`                 | `issue`                                                                                                        |

`saveState()` 是「写临时文件 + rename」的原子替换，**明确不加跨进程锁**，注释把这条边界写了下来：「同一 task 的读-改-写由『单 owner』使用模型串行化，并发执行同一 task 的两条命令仍可能丢事件，这是接受的边界」（`scripts/task.mjs:170-177`）。

实测规模（2026-09-28T20:08:06+0800，`/Users/bopan/VibeCoding/mono/.git/tasks`）：

```text
241 个 state 文件；phase: done 211 / dropped 14 / approved 13 / frozen 1 / active 2
level: t0 18 / t1 102 / t2 121；events[] 合计 1563 条
事件类型分布: new 241, start 241, freeze 266, review 140, approve 111,
              verify 133, done 211, assign 205, drop 14, migrated 1
每 task 事件数: min 3 / p25 4 / 中位 4 / p75 8 / p90 10 / max 24
≥6 个事件的 task: 115 个
```

也就是说：**一半以上的 task 在生命周期里被写 6 次以上**（115/241），而同期整个仓库只有 403 个 commit（`git rev-list --count HEAD`，其中 non-merge 308、merge 95）。两个数量级接近，意味着「每次状态变更配一个 commit」不是给 git 历史增加一点噪声，而是把它变成一个日志文件。

事件日志是 append-only 且不需要手工补记（`scripts/task.mjs:183-185`、`docs/agents/workflow.md:110`），`events[]` 取代了旧体系的 `manualInterventions`（`docs/adr/0014-task-system-v2.md:36`）。这意味着它不是「可裁剪的历史」，而是当前唯一的状态真相载体之一。

### 1.3 `freeze` 的 diffHash 怎么算、依赖什么

`currentSnapshot(worktree, baseSha)`（`scripts/task.mjs:190-216`）：

1. `git diff --name-only -z <baseSha> --` 取相对 baseSha 变更的 tracked 文件（`:191`）；
2. `git ls-files --others --exclude-standard -z` 取未跟踪文件（`:192`）；
3. 两者合并去重排序（`:193`）；
4. `sha256` 依序吸收 `baseSha`，然后对每个文件吸收「路径 \0 + mode \0 + 内容/类型标记 \0」；符号链接记 `[symlink]` + `readlink`，子目录递归取其自身 `HEAD`（`:194-214`）。

关键性质：**它是对工作区字节的哈希，不是对 commit 的哈希**。`baseSha` 来自 `new` 时的 `git rev-parse HEAD`（`scripts/task.mjs:385`），`freeze` 之前先 `git add -A` → `CI=true pnpm run fix-code` → 再 `git add -A`（`normalizeWorktree`，`scripts/task.mjs:265-285`），所以快照内容等于 index 内容。文档明确「commit 后 `git diff baseSha` 仍覆盖已提交内容，因此同一份内容在 commit 前后 hash 不变」（`scripts/task.mjs:187-189`、`docs/adr/0014-task-system-v2.md:38`）。

`liveState()`（`scripts/task.mjs:218-233`）在每次 `status`/`review`/`approve`/`verify`/`done`/`guard` 时重算这个哈希，并用 `state.approval.diffHash ?? state.review.diffHash ?? state.diffHash` 作为绑定值判定 `stale`（`:223`、`:230`）。也就是说 **diffHash 的语义是「baseSha 之后工作区的全部内容」**，跨任意多个 commit 都成立——实测中 102 个有验证记录的 task，从 `baseSha` 到最终已验证 `headSha` 之间的 non-merge commit 数是 `{1: 94, 2: 4, 3: 3, 4: 1}`，即一个 task 通常只产生一个 commit，但 diffHash 并不假设这件事。

口径的权威表述在 `docs/agents/workflow.md:83`：「冻结 `diffHash` 的 canonical 口径是 `scripts/task.mjs` 的快照哈希（sha256 依序吸收 baseSha 与每个快照文件的路径、mode、内容，覆盖 tracked+untracked），不是 git diff 的摘要」。

### 1.4 `guard` 在 pre-commit 里的位置

- 唯一入口：`.vite-hooks/pre-commit` 全文是 `mise exec -- pnpm agent:task guard`。`core.hooksPath` 指向 `.vite-hooks/_`（`git config --get core.hooksPath`），`_/pre-commit` 只是 `. "$(dirname "$0")/h"` 转发到受版本控制的 `.vite-hooks/pre-commit`。
- `guard` 的判定（`scripts/task.mjs:627-687`）：按 `resolveWorktree()` 找 commonDir → `activeStates()` 扫全部 state 文件、过滤 `phase !== done && !== dropped`（`:118-134`）→ 只保留 `worktree === 当前 worktree` 的（`:630`）→ 多于一个直接 fail（`:650-651`）。
- T0/T1 的门：先查 `branchDrift`（`:655-658`），再查 `live.stale`（`:675-678`），最后 `approvalRequired(state)` 为真时要求 `phase === 'approved'` 且 `approval.diffHash === state.diffHash`（`:681-686`）。T2 只要求 `active/frozen/reviewed/approved`（`:668-674`）。
- 无 active task 时**不静默放行**：跑 `alwaysOnChecks`（`scripts/task.mjs:305`，当前只有 `format-clean`）并在 stderr 写 `task gate: not enforced`（`:639-649`）。
- `runChecks()` 在 freeze 取快照前和 guard 放行提交前各跑一次 `.agents/checks/` 下所有可执行文件，task 上下文经 `AGENT_TASK_ID` / `AGENT_TASK_LEVEL` / `AGENT_TASK_BASE_SHA` 注入（`scripts/task.mjs:307-316`）。`.agents/checks/changeset-required` 因此能按 `AGENT_TASK_BASE_SHA` 对 index 做 diff（`.agents/checks/changeset-required:14`）。
- 测试把这条边界钉成契约：`scripts/task.test.mjs:14-21` 断言 pre-commit 必须含 `pnpm agent:task guard`、不得含 `vp staged` / `--no-verify` / `HUSKY=0` / `VP_GIT_HOOKS=0` / `VITE_GIT_HOOKS=0`。

### 1.5 读写方清单（除 `scripts/task.mjs` 之外）

| 位置                                                                                                                                                                                          | 行为                                                               | 证据                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------- |
| `.vite-hooks/pre-commit`                                                                                                                                                                      | 只读调用 `guard`                                                   | 文件全文一行                  |
| `.vite-hooks/commit-msg`                                                                                                                                                                      | 只跑 commitlint，与 task 无关                                      | 文件全文一行                  |
| `.agents/checks/changeset-required`                                                                                                                                                           | 只读 `AGENT_TASK_BASE_SHA` 与 index                                | `:14`、`:41`                  |
| `.agents/checks/format-clean`                                                                                                                                                                 | 与 task 无关，读 `git diff --cached`                               | `docs/agents/workflow.md:106` |
| `.agents/skills/herdr-agents/patrol.mjs`                                                                                                                                                      | 只读 `<commonDir>/tasks/<id>.json` 取 phase 作参考展示，不参与判定 | `:23-26`、`:78-85`            |
| `scripts/task.test.mjs`                                                                                                                                                                       | 直接读写 fixture 的 `.git/tasks/*.json`                            | `:147-151`、`:916-921`        |
| `AGENTS.md:16`、`docs/agents/context.md:36`、`docs/adr/0014:35,64`、`docs/adr/0017:15,21,69`、`docs/agents/task-packet.md:48`、`docs/research/monorepo-for-agents-benchmark-260918.md:88,132` | 文档引用                                                           | 逐条 grep                     |

**没有任何仓库外消费者**：没有 backup/archive 脚本碰这个目录（`grep -rn "tasks" scripts/*.mjs scripts/*.sh` 除 `task.mjs`/`task.test.mjs` 外零命中），CI workflow 里也没有（`.github/workflows/*.yml` 对 `agent:task` 零命中）。这让迁移的「调用方面」比看起来小——真正的难点全在语义上（第四节）。

### 1.6 `ci:test-scripts` 覆盖了什么

`package.json:23` 的 `ci:test-scripts` 是 `for f in scripts/*.test.mjs; do node "$f" || exit 1; done`，即 glob 全部 `scripts/*.test.mjs`（`docs/adr/0014-task-system-v2.md:55` 的 Go 风格对称约定）。task 相关覆盖：

- `scripts/task.test.mjs`（937 行）：覆盖 pre-commit 边界契约、T0/T1/T2 三条完整路径、freeze 归一化与 re-freeze、stale 判定横跨 commit 边界（`:290-295`、`:391-393`）、review/approve 身份形状与 `approver ≠ reviewer`（`:258-269`）、`verify` 显式 `--result`（`:277-289`）、`drop` 门槛与参数顺序（`:433-466`）、`.agents/checks/` 两个边界（`:479`、`:493`、`:515-518`）、`changeset-required` 逐条内容规则（`:535-690`）、`format-clean` 三条提交路径（`:755-757`、`:826`、`:859`）、损坏 state 容错（`:916-926`）、worktree 隔离与 branch drift（`:900-911`）。
- `scripts/ci-topology.test.mjs`、`scripts/command-conventions.test.mjs`：与 task state 无关，但会把 `agent:task` 作为根命令的形状与存在性钉住（`package.json:17`）。
- `scripts/validate-context.mjs:52-60`：断言 `docs/agents/workflow.md` 存在且含 `pnpm agent:task new`、`.vite-hooks/pre-commit` 含 `pnpm agent:task guard`、`CONTRIBUTING.md` 含 `pnpm agent:task start --task <task-id>`。**这条意味着任何改动 task 命令名的迁移都会同时打断 `ci:validate-context`。**
- 注意 `docs/research/**` 明确不在 `validate-context` 的扫描面内（`scripts/validate-context.mjs:334-336` 的注释），所以本文件引用命令不受存在性检查约束。

## 二、worktree 现实

- 当前 `git worktree list` 有 **21 条**，全部共享 `/Users/bopan/VibeCoding/mono/.git`（`--git-common-dir` 实测三条抽样一致）。这个数字在调研期间还在变：两次采样之间新增了 `clean-default-full` 与 `interweave-list-focus-tab` 两个 worktree 及其 task state——并发实施是常态而非例外。
- task state 靠 common dir 跨 worktree 共享的具体机制：`activeStates(commonDir)` 扫整个目录（`scripts/task.mjs:118-134`），`assertWorktreeAvailable()` 据此拒绝「同一 worktree 挂两个 active task」（`:158-161`），`guard` 据此在当前 worktree 找唯一 active task（`:630`）。
- reviewer/coder 跨 worktree 的形态被明确支持：`docs/agents/task-packet.md:48` 要求重启后读 `<git-common-dir>/tasks/<task-id>.json`；`docs/adr/0017:15` 记录巡检曾以 task state 为数据源；`.agents/skills/herdr-agents/patrol.mjs:83` 仍在只读它。同一个判据在 `0a14f464` 的 commit message 里被再次表述——「repo-local temp/ 目录被拒绝，因为同一相对路径在每个 worktree 里是不同的物理目录，这会打断 reviewer-in-A、coder-in-B 的場景」（原文英文，此处为译文）。
- **换成 commit 记录后这个性质是否成立？** 分载体回答：notes 的 `refs/notes/*` 存在 object DB 里、由所有 worktree 共享（见 3.1 实测），所以共享性成立；但共享的只是 ref，不是「立即可见的写入」——两个 worktree 同时 append 同一个 ref 会静默丢事件（见 3.1 实测）。

## 三、方案逐一评估

### 3.1 方案 A：git notes（`refs/notes/tasks`）

**机制**：`git notes --ref=tasks add -m <json> <sha>`，note 内容是任意文本，可以把整个 state JSON 或单个事件塞进去；读取用 `git notes --ref=tasks show <sha>` 或 `git log --show-notes=tasks`。

**优点**

- 跨 worktree 可见：note 挂在 `refs/notes/tasks`，这是 object DB 里的 ref，所有 worktree 共享。实测：在 worktree `wt` 里 `git notes --ref=tasks add`，在主仓 `repo` 里 `git notes --ref=tasks show` 直接读到同一内容。
- 不改 commit 内容，因此不与 commitlint、squash 的内容审查冲突（至少在 commit 生成阶段）。
- 与 commit 的对应关系由 git 自己维护，不需要额外的指针文件。

**缺点 / 硬约束**

- **不被 push、不被 fetch**。本仓 `remote.origin.fetch` 是 `+refs/heads/*:refs/remotes/origin/*`（`git config --get-all remote.origin.fetch`），notes ref 不在任何 refspec 里。实测：`git push origin main side` 之后 `git --git-dir=remote.git for-each-ref refs/notes` 为空；`git clone` 下来的副本 `git notes --ref=tasks show` 报 `no note found`。要带上必须显式加 `+refs/notes/*:refs/notes/*` 的 fetch refspec 与 push 配置——这是**修改 Git 配置**，落在 AGENTS.md「需要逐次授权」的清单里（`.npmrc`/`.mise.toml`/Git 配置）。**注意：这条对现状 D 同样成立**（clone 拿不到 `.git/tasks/`），所以它不是 A 的独有劣势，但 A 让它更显眼，因为 notes 看起来「像在版本控制里」。
- **squash 合并会摧毁它**。本仓 main 是 squash-only：`docs/agents/build.md:123`「本仓是 squash-only 合并，main 上 `push` 那一次落在**新 sha** 上、树却与已经验过的 PR head 相同」；`docs/agents/release.md:10`「合并方式按仓库策略执行，默认 squash」。实测：在 `task-x` 分支的 HEAD 上挂 note，`git merge --squash` + commit 后，新 commit 上 `git notes show` 报 `no note found`，旧 commit 变成 `git merge-base --is-ancestor` = NO 的不可达对象。**这意味着所有 task 证据在进入 main 的那一刻失效**——与 ADR-0014 背景里「post-merge close gate 与 squash merge 结构性冲突」（`docs/adr/0014-task-system-v2.md:12`）是同一个病，v2 正是靠「删除 post-merge gate」绕开的。
- **amend / rebase / `switch -C` 都会孤儿化 note**。实测：`git commit --amend` 后旧 sha 仍有 note、新 sha 没有。本仓的既定流程里有 amend：`docs/agents/commit.md:34` 明确要求「提交后用 `git commit --amend --author=…`」与「`git commit --amend --trailer 'Co-authored-by: …'`」；`docs/agents/worktrees.md` 的 worktree 复用流程是 `git switch -C <branch> origin/main`，会整段抛弃分支上的独有提交。
- **并发 append 丢事件**。实测 10 个进程同时 `git notes --ref=conc append -m "event-$i" HEAD`，最终 note 里只剩 1 行。这是 read-modify-write 无锁，与 `saveState` 同级（`scripts/task.mjs:170-171` 已承认），但 notes 多一层 ref 更新竞争，且失败时不一定有可观察输出。
- **pre-commit 时 commit 不存在**，无法把 note 挂在「即将产生的 commit」上。唯一的规避是挂在 staged tree 上（实测 `git write-tree` 得到的 tree sha 可以挂 note），但 tree sha 无法从 `git log` 遍历发现、多个 commit 可共享同一 tree、且 index 一变 tree 就变——等于要维护一张 tree→task 的表，又回到了外部索引。

**已知坑（本仓特有）**

- `.vite-hooks/` 只跟踪了 `commit-msg` 与 `pre-commit` 两个文件（`git ls-files .vite-hooks`），`_/` 被 `.vite-hooks/_/.gitignore`（内容 `*`）整体忽略、由 `prepare: vp config`（`package.json:7`）生成。要加 `post-commit` 必须新增受版本控制的 `.vite-hooks/post-commit`，并让 21 个 worktree 各自重跑 install/config 才会生效。
- `migrated` 事件说明历史上做过一次 state 迁移（`<git-common-dir>/tasks/task-system-v2-260918.json` 的 `events[]` 里有一条 `event: "migrated"`，detail 为 "P1/direct state from agent-workflow/ mapped to level t1 under the v2 kernel (ADR-0014 bootstrap)"）。notes 方案没有等价的「迁移」位置——旧 note 挂旧 sha，新方案要重新逐 commit 挂一遍。

### 3.2 方案 B：commit trailer / message 约定

**机制**：把 `Task: <id>`、`Diff-Hash: <sha256>`、`Reviewed-By: <id>` 等写进 commit message 的 trailer 区。

**优点**

- 零基础设施：就是 commit message，任何 clone/push/fetch 都带着走。
- 天然抗 squash：squash 时 trailer 有机会（取决于合并工具与 PR 流程是否保留）进新 commit 的 message——`changesets/action` 走的是自己的 `commit-message` 配置（`.github/workflows/changeset-version.yml` 的 `commit-message: 'chore: version packages'`），本仓的 squash 由 GitHub PR 界面执行，trailer 是否保留未经实测。
- `commitlint.config.js` 已有 trailer 规则可依托（`footer-leading-blank`、`footer-max-line-length: 100`），`docs/agents/commit.md:22-28` 已经在用 `Co-authored-by:` trailer。

**缺点 / 硬约束**

- **频率不匹配是结构性的**：一个 task 有 3–24 次状态写入（第一节实测），而 trailer 只能随 commit 落一次。`assign` 换 worktree、`review fail` 回 active、re-freeze、`verify` 追加、`drop` 带 reason——这些都不对应任何 commit。要让 trailer 承载它们，就得为每次状态变更造一个 commit，那是把 git 历史变成日志文件。
- **immutable**：trailer 写进去就改不了，要改只能 amend，而 amend 会换 sha（见 3.1）。task state 的高频更新正好是它最不该放的地方。
- **`freeze` 的 diffHash 指向谁**：diffHash 是「baseSha 之后工作区全部内容」的哈希（`scripts/task.mjs:190-216`）。写在 commit trailer 里时，那个 commit 正是被哈希的内容本身——自指。更糟的是 freeze 发生在 commit **之前**（freeze 只 `git add -A`，不 commit，见 `scripts/task.mjs:266`、`:283`），所以 trailer 里不可能记 freeze 时的 hash。
- **信息密度与可读性冲突**：`header-max-length: 200`、`footer-max-line-length: 100`（`commitlint.config.js`）。reviewer id、approver id、diffHash（64 hex）、verification name/result 全塞进去会超限或把 message 变成机器字段堆。
- 本仓 commit message 现在**不携带 task 归属**。实测（2026-09-28）：309 个 non-merge commit 的 subject+body 与 241 个已知 task id 做子串匹配，命中 **0**。`git log --oneline -400 | grep -ciE "task[- :]"` 的 3 个命中全部来自 `Merge branch 'task/...'` 的分支名而非 trailer。

**已知坑**：`scripts/commit.sh` 只支持 `-b "<body line>"`（`scripts/commit.sh:31-35`），没有 trailer 参数；要用 trailer 得走 `git commit --trailer` 或把 trailer 写成 body 行，两条路都要改脚本。

### 3.3 方案 C：task-per-branch

**机制**：每个 task 一个分支（本仓其实已经接近这个形态：worktree 路径约定就是 `<仓库目录名>-worktrees/<task-id>`，见 `docs/agents/worktrees.md:3`；「每个实施 task 使用一个 worktree」见同文件 `:10`；21 个 worktree 的分支列表见第二节），用分支名、merge-base、分支上的 commit 序列承载状态。

**优点**

- 多数 worktree 的分支名与 task id 同名（21 个 worktree 里 17 个在 `task/*` 分支上，其余是 `main` / `release/260925` / `interweave-style` 与 1 个 detached HEAD），`git branch --show-current` 因此可以当 task 标识用；`liveState()` 已经在读分支并做 drift 校验（`scripts/task.mjs:221`、`:229`）。
- squash 合并时分支名通常会进 PR 标题/commit message，保留一层可追溯性。

**缺点 / 硬约束**

- **分支是共享可变 ref，不是 append-only 日志**。`docs/agents/worktrees.md` 的复用流程 `git switch -C <branch> origin/main` 会重置分支；`git reset` / `push --force` 在 AGENTS.md 里属于需授权的破坏性操作，但依然可能发生。任何一次重置都抹掉证据。
- **reviewer 在 A worktree、coder 在 B worktree 时，双方要写同一个 task 的 state**。分支只能有一个 HEAD，reviewer 无法在不干扰 coder 的情况下往同一个分支追加事件。这正是 task state 放 common dir 而不是放分支的原因。
- **跨 worktree 可见性退化为「谁先 push/fetch」**。分支 ref 虽在 object DB 里共享，但两个 worktree 同时在同一分支上 commit 会直接冲突（`git commit` 检查 index），而现在的 `saveState` 只是文件替换。
- 状态机与分支生命周期是两个维度：`dropped` 的 task 没有分支也可存在；`done` 之后分支被合并删除，state 还要可读（`activeStates` 已经排除 done/dropped，但 `status`/`drop` 仍要读，`scripts/task.mjs:606-615`、`:589-604`）。
- **分支删除即证据消失**：`git worktree remove` + `git branch -d` 之后，未合并的 commit 变成不可达对象，与 3.1 的 squash 问题同构。

**已知坑**：`/private/tmp/wui-baseline` 是一个 detached HEAD 的 worktree（`git worktree list` 第 2 条，`fdab6b93 (detached HEAD)`），它没有任何分支可承载状态——`newTask` 对这种情况直接 fail（`scripts/task.mjs:373-374`「task worktree must be attached to a branch」）。所以分支承载天生覆盖不了全部 worktree 形态。

### 3.4 方案 D：现状 `<git-common-dir>/tasks/`（基线）

**优点**

- 跨 worktree 立即可见、无同步步骤（`scripts/task.mjs:4`、`:118-134`）。
- pre-commit 可读：`guard` 就在 pre-commit 里跑，读的是普通文件，没有任何「commit 还不存在」的问题。
- 原子替换（`scripts/task.mjs:172-177`），单文件可读可写，`activeStates` 对单个损坏文件降级为警告而不阻塞其他 worktree（`:126-131`，测试钉在 `scripts/task.test.mjs:916-926`）。
- 不受合并策略影响：squash 只动 commit，不动 `.git/tasks/`。
- 已通过 89 个 task state 的量化审计，证据链与提交门禁零故障（`docs/adr/0014-task-system-v2.md:12`）。

**缺点**

- **不在 object DB 里**：`git fsck` / `git gc` 不知道它，`git clone` 不带它，换机器就丢。这一点和 notes 一样，但 notes 至少是「看起来在版本控制里」而实际不是，现状是诚实的「就是一个私有目录」。
- 无跨进程锁（`scripts/task.mjs:170-171` 自认边界）。
- 目录会无限增长：1.6 MB / 241 个文件，没有任何归档机制（grep 无 backup 脚本）。
- 「`.git` 里」是个容易误解的表述：它只是路径巧合，不享有 object DB 的任何保证（可达性、gc 保护、push/fetch）。

### 3.5 方案 E：混合（commit 承载已发生事件 + `.git/tasks/` 留指针或不留）

**机制**：`froze` / `reviewed` / `approved` / `done` 各是一次性事件，各挂一个 note 或在 trailer 里记一行；高频的 `assign`/`start`/`issue`/`verify` 继续留在 `.git/tasks/`。

**优点**

- 把「不可变的终局事实」与「可变的进行中状态」分开，前者天然适合 commit。
- 即使 notes 因 squash 丢失，`.git/tasks/` 仍是执行真相，证据链不依赖 git 对象。

**缺点 / 硬约束**

- **两套真相来源**：`docs/agents/workflow.md:110` 说「每次状态转换都会追加到 state 的 `events[]` 时间线，不需要任何手工补记」，`docs/adr/0014-task-system-v2.md:64` 说 `<git-common-dir>/tasks/` 是**唯一**执行真相。混用立刻产生「哪一份算数」的问题，而 `task-packet.md:48` 的恢复规则是单一读取路径。
- `done` 之后 squash 掉分支，note 挂的 sha 不可达（3.1 实测），于是「已发生的事件」在最需要它的时候（集成后审计）恰好不可见。
- 维护成本高于收益：需要新增 post-commit hook（见 3.1 已知坑）、notes refspec 配置、以及一份「哪些事件进 commit、哪些不进」的规则文档——而规则本身又会成为新的 instruction surface。

## 四、五个核心问题的回答

### Q1 频率不匹配：把高频状态机塞进 commit 记录意味着什么？

意味着**每一次 `freeze` 都要先产生一个 commit**，否则无处安放状态。具体后果：

- `freeze` 现在只 `git add -A` + 归一化 + 算 hash，不 commit（`scripts/task.mjs:266`、`:276`、`:283`、`:462`）。若改成「commit 后才算 freeze」，`verify` 的 `headSha`（`scripts/task.mjs:546`）与 `done` 的 `live.clean`（`:573`）语义都要重定义，而它们现在依赖「freeze 之后可以连续多次 commit 而 hash 不变」这个性质（`scripts/task.mjs:187-189`）。
- **diffHash 指向谁**：diffHash 是 `baseSha` 之后工作区内容的哈希。如果它要写进 commit，那个 commit 就是被哈希的对象——自指。而且 re-freeze 是高频动作（实测 266 次 freeze 对 241 个 task，即平均每个 task 冻结 1.1 次，最多的 task 有 24 个事件），每次 re-freeze 都要求重置 review/approval（`scripts/task.mjs:468-469`），对应就要 amend 前一个 commit，sha 变化又让已写的 note/trailer 孤儿化。
- 数量级对照：241 个 task / 1563 个事件 / 403 个 commit。按 commit 承载，commit 数要变成现在的约 4 倍（1563/403 ≈ 3.9），且新增的那些大多是「状态推进」而非「语义变更」，`commitlint` 的 `subject-empty: never`、`type-enum`（`commitlint.config.js`）会被迫接受一批没有语义的 commit。

### Q2 循环依赖：pre-commit 时那个 commit 还不存在，怎么破？

破不了，而且这个循环比表面更深：

1. `guard` 在 **pre-commit** 里跑（`.vite-hooks/pre-commit`），要求 T0/T1 已 `approved`（`scripts/task.mjs:681-686`）。
2. `approve` 事件若存在 commit 里，它必须早于该 commit 存在——只能挂在 **HEAD（上一次提交）** 上。
3. 但 HEAD 上的 note 描述的是上一个 commit 的状态。多个 task 在同一分支上串行时，HEAD 是同一个，note 无法区分；并行 worktree 各有各的 HEAD，coder 在 B worktree 根本看不到 reviewer 在 A worktree 写的东西——除非 push/fetch，而那又回到 3.1 的 refspec 问题。
4. 退一步挂在 **staged tree** 上（实测可行：`git write-tree` 的 tree sha 可以挂 note）能绕过「commit 不存在」，但 tree sha 不可从 `git log` 发现、index 一变就失效、且 `.agents/checks/changeset-required` 是按 `AGENT_TASK_BASE_SHA` 对 index 做 diff 的（`.agents/checks/changeset-required:14`），它要在 guard 里读 tree 上的 note 就得先 `write-tree`——这在 pre-commit 里是一个有副作用的操作，且与 `guard` 当前「只读」的定位冲突（`docs/agents/workflow.md:108` 说 pre-commit 只剩 guard、不运行任何 fixer，结构性消除 commit 期改写）。
5. 唯一干净的时序是 **post-commit**：commit 先生成，再把 note 挂上去。但那就意味着「approve 发生在 commit 之后」——guard 却要求 commit 之前已 approved。顺序被倒置，gate 失效。

结论：**task state 必须在 commit 之前就可读可写**，这一条单独判死了 A/B/C/E 中所有「state 存在 commit 里」的变体。

### Q3 跨 worktree：reviewer 在 A、coder 在 B，commit 记录能提供这个吗？

部分能，但不够：

- notes 的 ref 在 object DB 里、跨 worktree 共享（3.1 实测），所以**读**的一侧没问题。
- **写**的一侧有问题：10 个进程并发 `git notes append` 丢 9 个事件（3.1 实测）；`git notes add` 不加 `-f` 会在已有 note 时报错退出（实测 9/10 失败），加 `-f` 则静默覆盖。对比现状：`saveState` 也是无锁 read-modify-write（`scripts/task.mjs:170-171`），但它是单文件 rename，且 `activeStates` 对单点损坏有降级路径（`:126-131`）。
- trailer 方案更糟：coder 在 B worktree commit，reviewer 在 A worktree 没有任何东西可写——trailer 属于 commit message，只能由 committer 写。
- 分支方案（C）直接不成立：一个分支一个 HEAD，两个人无法同时追加。
- 现状 D 是唯一「双方读写同一份物理目录、无需同步协议」的方案，这也是 `docs/adr/0017` 与 `0a14f464` 的 commit message 反复强调的判据（repo-local temp 目录因「同一相对路径在不同 worktree 是不同物理目录」被否）。

### Q4 可恢复性与审计：换成 commit 后证据链怎么保证？

保证不了，有三处具体断裂：

1. **diffHash 的口径**。`docs/agents/workflow.md:83` 规定 canonical 口径是 `currentSnapshot` 的 sha256，覆盖 tracked + untracked，且要求 reviewer 用 `pnpm agent:task status` 的 `live` 比对、「不要用 `git diff | shasum` 自制配方复算」。commit 只能表达 tracked 且已提交的内容——**untracked 文件在 commit 里没有位置**，而 `currentSnapshot` 明确把它们纳入哈希（`scripts/task.mjs:192`）。`freeze` 之所以能先 `git add -A`（`:266`）正是因为 untracked 也必须进快照。
2. **聊天/pane 输出不可替代的约定会失去承载物**。`docs/agents/task-packet.md:48`（该文件当前共 50 行，这句在 `:48`）写「聊天消息、Herdr pane label、模型输出和 Supervisor 报告都不能替代 task state、冻结 diff 或验证记录。重启后，先读 Task Packet，再读 `<git-common-dir>/tasks/<task-id>.json>`」；`docs/agents/workflow.md:120` 同义。这些约定的前提是「有一个可读的 state 文件」；commit 记录在 squash 之后不可达（3.1 实测），恢复路径会断。
3. **验证记录与 commit 的绑定会松**。`verify` 记 `headSha` 与 `diffHash`（`scripts/task.mjs:546`），`done` 核对 `live.current.hash !== lastVerification.diffHash`（`:574-575`）。若 state 进 commit，`headSha` 指向的正是承载 state 的那个 commit，自指使「验证覆盖的是哪一次提交」变得不可判定。

### Q5 迁移成本：现有 241 个 state 怎么办？

- 现状快照（2026-09-28T20:08:06+0800）：241 个文件，`done` 211、`dropped` 14、`approved` 13、`frozen` 1、`active` 2；level `t0` 18 / `t1` 102 / `t2` 121；`events[]` 合计 1563 条。
- **`done` 的 211 个**：它们的 `baseSha` 与各次 `headSha` 大多已被 squash 进 main（main 是 squash-only，`docs/agents/build.md:123`），原 commit 对象不可达。要迁到 notes 就得为每一个历史 task 重新构造一个可挂靠的 commit——不存在这样的 commit。
- **13 个 `approved` + 1 个 `frozen` + 2 个 `active`**：正在进行中的 task，迁移期间必须双写或停机，而 AGENTS.md 的并行实施边界是「一个可变 task 只能有一个实施 worktree 和 owner」，没有停机窗口这个概念。
- **14 个 `dropped`**：`drop` 是不可逆终态，事件带 `reason` 与 `by`（`scripts/task.mjs:589-604`）。这些是纯审计记录，没有任何 commit 与它们对应（task 被丢弃时往往一个 commit 都没产生）。
- 历史先例说明迁移是可行的但昂贵：v1 → v2 做过一次，形式是在 state 里插一条 `migrated` 事件（`<git-common-dir>/tasks/task-system-v2-260918.json`）。那次迁移之所以便宜，是因为**载体没变**（还是 JSON 文件），只换了 schema。换成 commit 记录等于同时换载体和换 schema。
- 还有一个隐性成本：`scripts/validate-context.mjs:52-60` 钉死了 `pnpm agent:task new` / `guard` / `start` 的字面出现位置，`scripts/task.test.mjs` 有 6 处直接拼接 `.git/tasks/` 路径（`:147`、`:916-921`、`:929-930`）。任何载体变更都要重写这些测试，而它们是 `ci:test-scripts` 的强制项。

## 五、结论与推荐

### 推荐：维持 D，加一个 F 增量

**推 D（`<git-common-dir>/tasks/<task-id>.json`）**，理由是它在四项硬约束上全部合格，而其它方案各有一项硬失败：

| 硬约束                       | A notes                | B trailer | C branch | D 现状 | E 混合 |
| ---------------------------- | ---------------------- | --------- | -------- | ------ | ------ |
| commit 之前可读可写（Q2）    | 否（只能挂 HEAD/tree） | 否        | 否       | 是     | 部分   |
| 跨 worktree 双向即时（Q3）   | 读是／写丢事件         | 否        | 否       | 是     | 部分   |
| 覆盖 untracked（Q4）         | 否                     | 否        | 否       | 是     | 部分   |
| 不被 squash/amend 摧毁（Q4） | 否                     | 部分是    | 否       | 是     | 部分   |

**F 增量（可选，低风险）**：给 commit message 加 `Task: <task-id>` trailer，state 不变。它只解决今天真实存在的一个缺口——309 个 non-merge commit 与 241 个 task id 做子串匹配命中 0，没有任何一条能反查归属（3.2 实测）。落地形状：`scripts/commit.sh` 增一个 `--task <id>` 转 `--trailer`，`commitlint.config.js` 的 `footer-max-line-length: 100` 已容得下；`guard` 可以在 `runChecks` 之后顺带校验 trailer 与 active task 一致（不改任何 gate 语义）。**它不承担任何状态，只是把指针补进对象库。**

### 不推什么

- **不推 A（git notes）**：squash-only 合并是单点硬失败（3.1 实测 + `docs/agents/build.md:123`），且需要改 Git 配置（refspec）才可能跨 clone 传播。
- **不推 B（trailer 承载状态）**：immutable + 频率不匹配 + diffHash 自指，三条各自独立致命。
- **不推 C（task-per-branch）**：分支是单 HEAD 可变 ref，与「reviewer 在 A、coder 在 B」直接冲突；且 detached HEAD worktree 无分支可挂（`scripts/task.mjs:373-374`）。
- **不推 E（混合）**：制造第二真相源，直接违反 `docs/adr/0014-task-system-v2.md:64` 的「唯一执行真相」与 `docs/agents/workflow.md:110` 的「不需要任何手工补记」。

### 如果未来仍要往对象库方向走，前置条件是什么

按代价从低到高，任一条件不满足就不该开始：

1. 合并策略从 squash-only 改为 merge commit 或 rebase-and-merge，且 note 随合并保留——这是 `docs/agents/build.md:123` 与 `docs/agents/release.md:10` 的策略变更，超出 task 体系自身。
2. `currentSnapshot` 的口径能收窄到「已提交内容」，即放弃对 untracked 的覆盖——这等于放弃 `freeze` 的 diff 边界保证（`docs/agents/workflow.md:83`）。
3. `guard` 能从 pre-commit 移到 post-commit 而不丧失 gate 语义——目前看不出路径（Q2 第 5 点）。
4. 给 `saveState` / notes append 加真正的跨进程锁，替代当前自认的「单 owner 串行化」边界（`scripts/task.mjs:170-171`）。

## 附：证据来源与复现

**仓库文件**（均以 `路径:行号` 引用）：`scripts/task.mjs`、`scripts/task.test.mjs`、`.vite-hooks/pre-commit`、`.vite-hooks/commit-msg`、`.vite-hooks/_/h`、`.vite-hooks/_/.gitignore`、`.agents/checks/changeset-required`、`.agents/checks/format-clean`、`package.json`、`commitlint.config.js`、`scripts/commit.sh`、`scripts/validate-context.mjs`、`.agents/skills/herdr-agents/patrol.mjs`、`AGENTS.md`、`docs/adr/0014-task-system-v2.md`、`docs/adr/0017-orchestration-decoupled-from-task.md`、`docs/agents/{workflow,task-packet,worktrees,build,commit,release,context}.md`。

**本机实测（2026-09-28，隔离 fixture，未触本仓 ref）**：

```sh
# worktree 与 common dir
git worktree list                                            # 21 条，全部共享 /Users/bopan/VibeCoding/mono/.git
git rev-parse --path-format=absolute --git-common-dir         # 各 worktree 一致
git rev-parse --git-dir                                       # .git/worktrees/<name>（per-worktree）

# task state 规模
ls /Users/bopan/VibeCoding/mono/.git/tasks/*.json | wc -l     # 241
# events[] 分布与 phase/level 直方图（见 1.2、Q5）

# notes 跨 worktree 可见、不随 push/clone 传播、squash 后孤儿化、并发 append 丢事件
# fixture: /tmp/notes-exp（repo + worktree wt + bare remote + clone）、/tmp/squash-exp
git notes --ref=tasks add -m "task-1: approved" <sha>         # 在 wt 写，主仓可读
git push origin main side; git --git-dir=remote.git for-each-ref refs/notes   # 空
git merge --squash task-x; git commit -m "feat: task-x work (#42)"
git notes --ref=tasks show <new-sha>                          # no note found
git merge-base --is-ancestor <old-sha> HEAD                   # 否
for i in $(seq 1 10); do git notes --ref=conc append -m "event-$i" HEAD & done; wait
git notes --ref=conc show HEAD                                # 只剩 1 行
git write-tree; git notes --ref=tasks add -m "..." <tree>     # tree 可挂 note（Q2 第 4 点）
```

# 评测记录：herdr-cos

`herdr-cos` 是 `herdr-centralization` 的一个副本，带两处改动：每个成员被接入自己的 git worktree，且成员可以持有一个来自 `../roles/` 契约的具名角色。本文件记录**这份**副本跑过与没跑过什么。在把两个 skill 的任何数字当作对方的引用之前，先读这里。

## 本目录继承了什么，且不可当作本 skill 自己的成绩

- `scenarios.json` 从 `herdr-centralization` **实质未改**地继承：同样六个场景、同样的断言，只改了身份 token（`hc`→`cos`、`hca`→`cosa`、`HERDR_CENTRAL_HOME`→`HERDR_COS_HOME`）。它的场景早于 worktree 隔离与角色契约——没有任何场景 exercising 这两者。
- 那些场景实际跑过的记录——2026-09-30 的 40 试次批次（四场景 × 5 试次 × 2 臂）、herdr session `hc-l3` 里的活体 L3 循环、`/tmp/hc-mut` 的变异驱动、`/tmp/hc-eval` 的一次性评测驱动，以及全部书面记录——住在 `herdr-centralization` 的 `evals/README.md`。继承的数字以那份文件为准。
- **那些运行测量的每一个都是 `hc.mjs`，其字节与 `cos.mjs` 不同。**它们无法靠抄数字在 `herdr-cos` 上复跑，这里也不认领它们的任何数字。

## herdr-cos 实际跑过什么

一样东西：单元测试套件。

```bash
node --test skills/herdr-cos/tests/cos.test.mjs   # 78 用例，全绿，2026-10-01
```

78 个之中：

- **70 个是祖先的用例**，改名且断言内容未变。它们仍覆盖账本：五条结构不变量、六种故障注入、成员状态阶梯、门铃、打印路径的序号边界，以及四个进程级用例（一个 peer 在第二个进程里驱动渲染的契约、该 peer 在带空格与撇号的安装路径下、八个并发发送者、以及仅按退出状态裁决的裸 pane 门铃）。
- **8 个是为两处借用新写的**：
  - **Worktree 隔离，6 用例。**五个注入假 git 端口并断言 `cos join` 对它做什么——成员的 pane 在 `<root>/worktrees/<slug>/<label>` 打开；两个成员得到两棵树；成员文件记录 `worktree` 与 `branch`；非 git 的 lead 收到 note 并共享树；失败的 `git worktree add` 在任何 pane 切分之前止住 join。第六个在一次性仓库里跑**真 git**，证明 `cos` 传的 argv 是 git 接受的、pane 拿到的是存在的目录——只有假端口只能证明 `cos` 调用了它。
  - **角色契约，2 用例。**渲染的契约对全部五个角色点名 `roles/<name>.md`；且每份随附角色文件携带固定小节（`Identity`、`Mission`、`Responsibilities`、`Boundaries`、`Collaboration`、`Done when`）并重述「角色是账本记录的名字，不是它强制的权限」。
  - **Join 回滚，2 用例。**worktree carve 之后被拒的 `pane move`（另有一条被拒的 `pane split`）会回滚树与分支、点名多余的切分 pane（move 情形）、不注册任何成员、不启动任何 agent；假 git 端口为这些应答 `worktree remove` 与 `branch -d`。
- 四个进程级用例现在传 `--no-worktree`，因为它们从仓库自己的工作目录 spawn 真程序，不能留下真实的 worktree 或分支。因此 worktree 创建没有跨进程边界的 exercise；上面那个真 git 用例是唯一跑真 `git` 的——它在 `$TMPDIR` 下造一次性仓库、add 一个 worktree 和分支、再把两者移除，`$TMPDIR` 里只留下一次性仓库目录。

## 未覆盖的部分（明说）

- **没有任何 eval 试次对 `cos.mjs` 跑过。**两条新轴——worktree 隔离与角色契约——只有单元测试，此外没有。没有场景在 agent 之下端到端 exercise `cos join` 的 worktree 路径，也没有场景让成员读自己的角色文件并照它行动。关于 agent 如何使用这两者的任何声明，不属于这里记录的任何一次运行。
- **新代码没有做过变异测试。**祖先的十六驱动器（`/tmp/hc-mut/mutate-all.mjs`）与其角色/kind 驱动器（`mutate-role.mjs`）是针对 `hc.mjs` 建的；两者都没有重新指向 `cos.mjs`，所以八条新用例今天只被它们自己的断言钉住。
- **没有时延数字。**`240s` 与 `30s` 仍是测量前的估算，与祖先完全一样——`cos` 打印节奏但不强制。
- 祖先的其他保留意见原样沿用：`without` 臂不是干净对照，实现者同时是评分者，peer-decision 场景没有让 peer 真正决策的宿主。完整表述见祖先的 README。

## 引用 lint

`PROTOCOL.md`、`SKILL.md`、`RECOVERY.md` 与本文件中的每一条 `cos.mjs:NNN` 引用，由一个一次性 lint（`/tmp/cos-cites.mjs`，未提交，形态与祖先的 `hc-cites.mjs` 相同）检查：它提取 `cos.mjs:NNN` 与裸 `` `:NNN` `` 两种形式并打印各自指向的行。worktree 与角色改动之后的那次运行打印 **22 条引用，无一越界，针对 656 行的 `cos.mjs`**。join 回滚的编辑又挪动了六个锚点；其后的运行打印同样的 22 条引用，无一越界，针对 673 行的 `cos.mjs`。worktree 代码挪动了祖先的每一个锚点，所以全部是重算的而非照抄的——文件与 `hc.mjs` 当年同一尺寸档，但没有一个行号在搬迁后原样幸存。lint 检查数字，不检查解读：一条引用可以落在正确的行上，而周围的句子把它描述错。

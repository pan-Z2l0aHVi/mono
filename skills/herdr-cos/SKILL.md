---
name: herdr-cos
description: 一份共享账本，让多个 herdr pane 互派工作而不丢一条消息。
disable-model-invocation: true
---

# herdr-cos

一个 lead pane 加 N 个 worker pane——每个 pane 是一个持有 agent 的 herdr pane——共享磁盘上的同一份账本目录。一条消息是一个文件。投递是 herdr 敲进接收方 pane 的一行门铃（doorbell）。消费是一个 ack 文件，对一条消息而言，ack 文件是唯一的凭证。一个 pane 是否存活由 herdr 说了算，账本不下结论。任何 pane 都不等待另一个 pane。每个成员被接入自己的 git worktree，并可以持有一个来自 `roles/` 契约的具名**角色**。

`PROTOCOL.md` 载有字段语义、消息与成员状态表，以及修改 `scripts/cos.mjs` 时要守住的不变量；`RECOVERY.md` 载有中断分支；`roles/*.md` 是成员被告知自己持有什么角色时读的契约。程序是 `scripts/cos.mjs`，以 `node <本 skill 目录>/scripts/cos.mjs` 运行，背后只有 node stdlib、`herdr` 和 `git`。

## Gate

- 先跑 `herdr status`：server 必须在运行。这里点名的大多数命令与 flag 来自上游 [`herdr` skill](../herdr/SKILL.md)；有两个不是，之所以单独点名，是因为读者无法自行区分「文档化的表面」与「借来的表面」。`pane move --new-tab` 在上游文档里没有携带该 flag 的行，而 **`pane get` 根本不在那份 214 行的上游文档里**。`cos` 以两种形态用到它：一次在 `cos new` 里，那正是对本 pane 的查找；另一次是 reconcile 期间对每个成员执行，且只在 `agent list` 没有点名该 pane 时才跑——对一个裸 pane 而言这是常态，这一趟把「还在启动」与「已经没了」区分开。两者都是在 2026-09-29 从已安装的 herdr 0.9.1 二进制的 `strings` 里读出、并在 2026-09-30 由一个活着的 0.9.1 server 应答过的——当时在一个独立命名的 session 里完整跑通了一轮：`new`、两次 `join`、`send`、一个 peer 从渲染出的契约应答、`reconcile`、`close`、`poll`。那次编队里每个成员都是裸 pane（它的 `join` 行写的是 `agent (bare pane)`），所以它的 reconcile 报告 `ready` 依据的是 `pane get` 而非 agent list。未文档化即未冻结：在任何其他版本上，先读 `herdr pane get --help` 再相信 reconcile 打印的成员状态。实测基线是 **herdr 0.9.1, private protocol 22**，读自 2026-09-30 的 `herdr --session <name> status server`——这两个数里只有 0.9.1 在这里还可复核（Homebrew 安装路径说明了它）；protocol 读数只打印过一次且未存档，当作「有人报告过」而非工件对待。在任何其他版本上，先读每条命令自己的 help 再相信某个 flag。
- `command -v node` 必须在你打算变成成员的每个 pane 里成功：peer 要跑同一个程序来 ack。`cos join` 不检查这件事，所以你自己检查。
- `git` 必须在 `PATH` 上，且如果你想要下文描述的 worktree 隔离，`cos new` 必须在一个 git 仓库内运行；在仓库外运行时，`cos join` 会共享你的工作树并明确说明。
- `cos new` 把调用方 pane 注册为 lead；`HERDR_PANE_ID` 未设置时会退回到聚焦的 pane，那可能是人类的 pane，所以要读它打印的 `lead pane` 行。
- 账本根：每条命令从 `HERDR_COS_HOME`（绝对路径，且只允许 `[A-Za-z0-9._:/-]`，因为门铃行会直接进 shell）或 `$TMPDIR/herdr-cos` 解析出一个候选值。只有 `cos new` **记录**它；其余每条命令都与记录比对，不一致即停，这样 `$TMPDIR` 不同的 peer 就不会悄悄开出一个第二份空编队。因此这里打印或渲染的每一行都带 `HERDR_COS_HOME=<recorded root>`——复制它，不要手打。

## Steps

1. **认领编队。** `cos new <slug>` 打印 `claimed fleet … at <abs>`；那个路径就是账本，旁边的 `peer-contract.md` 是 worker 需要的东西。你是成员 `lead`：你的记录写 `from: lead`，回复抵达 `channels/<worker>->lead/`。第二次 `cos new` 以退出码 1 拒绝——除非什么都还没认领（manifest 存在、`members/` 下没有 `*.json`、没有契约），此时它会完成那次被打断的认领，而不是烧掉这个名字。
2. **添加成员。** 需要人手时，跑 `herdr agent`（无子命令）看已安装的 kind，问用户用哪个，然后对每个 worker 跑 `cos join <slug> <right|down> <kind> [role]`，连 lead 计六个上下；超过后 `cos` 警告但继续。只在新成员确有必要时才问——同 kind 的空闲成员优先复用，而不是再起一个，因为提问会把你的派发停在等人的一次往返上（编队其他成员继续干活）。第四个可选词是成员的角色：`manager`、`planner`、`coder`、`supervisor`、`tester` 之一——即本目录里的契约，由成员在读到自己的文件时加载。角色与 kind 一起被记录并显示在 `MEMBER` 行上，仅此而已——它是给人看的名字，不是权限（语义见 `PROTOCOL.md`）。join 会切分一个 pane、把它移到自己的 tab、启动一个名为 `cos-<label>-<slug>` 的 agent、发布 `members/<label>.json`，并自己分配 label——`m1`、`m2`……按加入顺序，打印在 `joined` 行上，不由你选。**它还会为成员 carving 出自己的 git worktree**，位于 `<root>/worktrees/<slug>/<label>`，分支 `cos/<slug>/<label>`，并把 pane 在那里打开，所以两个成员永远不会共享一棵工作树；join 打印 `worktree <path> (branch <branch>)`。传 `--no-worktree` 则共享你的树（在仓库外它本来就如此，并附说明）。kind 传给 `herdr agent start --kind`，并按 `scripts/cos.mjs` 里的 `AGENT_ARGS` 追加该 kind 的启动参数（目前只有 codex 带 `--approve-for-me`；`claude` 有意不在表里，理由见 PROTOCOL.md）——不带它，codex 成员会卡在一个自己答不了的审批对话框上，而卡在对话框的成员读到的是 `blocked`，门铃被扣下而不是投递（未列出的 kind 照旧走该 CLI 自己的默认值）。拼错的 kind 在 herdr 处失败：成员保持已注册但无绑定，`join` 退出码 1，pane 读作裸 pane，发给它的门铃被敲进一个 shell，而 shell 找不到名叫 `cosa` 的命令。该绑定是写一次的，reconcile 修不了它：重新 `cos join` 一个新成员，把活再交给它。更早一步的失败——split，或把 pane 移到自己 tab 的 move——会被回滚：刚 carving 出的 worktree 和分支被删掉，并点名那个多余的 pane 让人来关，什么都没注册，同一个 `cos join` 可以直接重跑。
3. **派活。** `cos send <slug> m1,m2 "<text>" [re]` 为每个接收者发布一条记录并敲响各自门铃——*一份正文给 N 个接收者*，所以 N 份不同的简报就是 N 次 `cos send`；一次扇出的成本是一次 `agent list` 加 N 次 prompt，外加对 list 没点名的每个成员各一次 `pane get`——这就是把「正在启动的成员」与「已消失的成员」区分开的办法。要移交文件而不是打字：`cos send <slug> m1 - < report`。那份拷贝是逐字的，不是摘要或链接；超过 1500 字节的正文落进 `artifacts/`，记录携带路径，门铃保持一行短句。
4. **观察。** `cos poll <slug>` 做 reconcile 并为等待你的内容打印 `NEW <from> <seq> <type> <preview>`，以及 `RUN …`——ack 行，可逐字运行。在你每次能动的机会都拉一次：门铃是加速器，拉取才是正确性的来源。一个只派发不拉取的 pane 正是停滞所在，所以一直拉，直到你自己的 `OUT …` 行清空。**那个 30s 不是你能做到的动作**——`cos` 强制不了调用者的间隔，所以它连这个数都不再打印（`PROTOCOL.md`「拉取节奏曾经以 `30s` 出现在渲染的契约与 `poll` 输出里……已被删掉」）。你不连续运行，所以要给自己挂一个周期唤醒（`/loop` 之类）在空闲时回来拉；唤醒只是把你叫回来，拉到之后还得读 pane、判断、派下一步——这也是 `MEMBER … failed` 或 `UNANSWERED …` 报告抵达的方式。一次往返耗时以分钟和若干次工具调用计，不是瞬间（估算来自协议自己的步骤数：唯一一次实跑的往返里，peer 是脚本化的；脚本那一半——读渲染的契约、`poll`、跑契约打印的 ack 行——端到端约一秒，所以那几分钟属于模型回合，账本不在其中；形态见 `PROTOCOL.md`）。`sent …` 只证明发布：`cos send` 以 `doorbells N of M` 收尾——M 是本次调用发布的记录数，N 是本次调用真正敲给已注册 agent 的门铃数（裸 pane 通知计入 M，不计入 N），所以重试某条更早的欠账记录两边都不计入——`cos reconcile` 给出它整趟的 `doorbells N, re-sent N`，而 `cos poll` 两者都不打印。
5. **Ack。** 在工作真实发生后运行 `RUN` 行，`<seq>` 用纯数字。ack 是消费的唯一正面凭证：它让重试停止、让写方回收记录；在你跑它之前，同一条 `NEW` 行会一直回来。
6. **回复到它抵达的信道。** `cos send <slug> <from> "<answer>" "<from>-><me>#<seq>"`。peer 之间直接对话；lead 不当中继。
7. **关闭。** `cos close <slug>` 停止门铃、重试与回收，此后除 `ack` 和 `close` 外的每条命令都拒绝这个 slug——迟到的 peer 仍能证明自己消费过什么，因为 ack 是证据而非工作。账本保持可读，`close` 会打印它在哪里，想留过 temp 清理就把它拷去持久的地方。没有导出命令：账本的第二份拷贝就是第二份事实来源。

## The seven commands

```
cos new       <slug>                                     claim a fleet, render the contract
cos join      <slug> <right|down> [agent-kind] [role] [--no-worktree]   add a member pane, in its own worktree
cos send      <slug> <to>[,<to>...] <text|-> [re]        publish, then doorbell each
cos poll      <slug>                                     reconcile, print NEW and RUN lines
cos ack       <slug> <from> <seq>                        consumption proof
cos reconcile <slug>                                     recompute states, retry what is due
cos close     <slug>                                     stop ringing, retrying, recycling; poll refuses
```

仅位置参数，`join` 末尾的 `--no-worktree` 除外。`re` 是 `<from>-><to>#<seq>`。`-` 作为 text 表示从 stdin 读正文。

## Member state，每次调用都重算

`creating`——`members/<label>.json` 存在，pane 活着，herdr 尚未列出它的 agent。`ready`——三元组解析成功，无论是 herdr 归类的 agent 还是一个活着的裸 pane；一个以不同 pane id 应答的*具名* agent 是同一名成员并会被重新绑定，这只在该名字唯一时有效。`gone`——没有这个 pane、终端 id 换了、记录的名字匹配不到任何东西也没有继任者持有它、herdr 报告 `unknown`，或成员文件无法解析。`failed`——仍可解析的成员连续两趟无进展：对 `creating` 而言是 agent 始终没出现，对 `ready` 而言是一条仍欠它的记录过了 ack 期限，绝不会是一个不欠任何东西的 `ready` 成员，也绝不会是 `gone`（它的缺席本身就是报告），且只在编队仍开启时；行尾的 `(<reason>)` 是那一趟三元组所说的话，所以 `the agent is not visible to herdr yet` 是从未出现的情形，而没有尾巴（或一条 re-binding 备注）是解析成功后归于沉默的情形。计数在 `no-progress=2` 处停止*落盘*——这是写入的上限，不是读取的，所以有人手工做的标记会打印出更大的数。
由 `cos poll` 和 `cos reconcile` 报告；此外没有任何地方打印 `MEMBER` 行。一个 pane 恰好扮演它持有的 pane id 对应的那个 `ready` label：两个认领者解析不出任何 label，此时 `send` 和 `ack` 拒绝、reconcile 提出警告，而不是某一趟猜一个。什么都不存储，所以重启不需要任何记账。

## Non-blocking

绝不 `--wait`，绝不阻塞式读取：一次等待中的派发会拖住整个编队。派发是一次 `agent list` 加 N 次 prompt，外加对 list 未点名的每个成员各一次 `pane get`。敲给 `working` 成员的门铃照常提交——上游文档说的是「文本加回车」的提交而非队列，所以被保证的是记录与 ack，而不是 agent 何时看它——且它工作期间 `cos` 不再敲第二次。敲给 `blocked` 成员的会被扣下，因为审批对话框会吞掉它；敲给 `creating` 或 `gone` 成员的会被扣下、记录保持悬挂，直到有人把那个 pane 带回来。你自己的 pane 忙时什么都不拉，所以长时间前台工作后记得 poll。

## herdr surface this skill uses

`agent`（裸命令，取已安装 kind 列表——lead 跑它，`cos` 从不跑）、`agent list`、`agent prompt`、`agent start`、`pane get`、`pane run`、`pane split`、`pane move`——外加 `status` 和 `pane read`，这两条只有人类运行（gate 检查、清除审批）。这里只启动两种东西，各自固定在一条 argv 端口后面，别无其他：`herdr`，以及为成员 carving worktree 的 `git`。本程序由 `node` 启动。

## Roles

`roles/` 有五份契约——`manager`、`planner`、`coder`、`supervisor`、`tester`——格式统一：`Identity`、`Mission`、`Responsibilities`、`Boundaries`、`Collaboration`、`Done when`。成员读 `members/<label>.json` 里写的那一份；`cos` 本身从不读它们，也不按角色强制任何事（文件里写明了这一点），所以契约的约束力只到成员自愿遵守为止。`manager` 通常是 `lead` pane。

何时再 join 一个 `supervisor`（通用启发式，逐维 0–2 分，总分 5–8 时才值得，涉及产品/UI 的任务不启用）：任务的**影响半径**（会动几个消费方、多少不可再生的产物）；**契约与不可逆性**（公共接口、数据迁移、对外承诺越多分越高）；**方案不确定性**（计划里留了多少未决问题）；**验证成本**（tester 复现需要的环境与时间）。低分任务让 `tester` 兜底即可，不必为一个见证者多占一个 pane。

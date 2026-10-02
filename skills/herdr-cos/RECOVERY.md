# Recovery

每一次中断的形状都相同：读账本，问 herdr 什么还活着，对没有 ack 的东西重敲门铃，把歧义的情形交给人，而不是重放工作。`cos poll <slug>` 是入口——没有 resume 命令，因为「恢复」就是 poll 在编队离开一段时间后做的事。

## 你处在哪个分支

| 你看到什么 | 含义 | 该做什么 |
|---|---|---|
| `no ledger at …` | 这个根没有这样的编队：temp 被清理了，或 `$TMPDIR` 不同 | 停。如果编队存在于别处，把 `HERDR_COS_HOME` 指向那个根再 poll。绝不用 `cos new` 找回同一个 slug——那会造出第二份空账本 |
| `lives in … but this process resolves …` | 两个根，一个 slug | 选有 `members/` 的那个；另一个不是这个编队 |
| `send refused` | `manifest.v` 比本程序新 | 继续读与 ack；不要分配任何新东西 |
| `is closed` | `closed` 标记已置 | 换一个新 slug；旧账本保持可读，这正是设计意图 |
| `already claimed` | `manifest.json` 已写出，**且** `members/` 下已有任何 `*.json` 或 `peer-contract.md` 已在其中 | 换新 slug。唯一可以重跑的情形：`manifest.json` 存在而 `members/` 下一个 `*.json` 都没有*且* `peer-contract.md` 不在——那是你自己早先的 `cos new` 认领中途死了，这次调用会完成它而不是烧掉名字。判定按后缀而非 label 形状：`members/` 下任何名为 `*.json` 的文件都算成员，哪怕是手工放的，所以一个多余的 `notes.json` 也会占住编队。任一半边存在即是认领：空的 `peer-contract.md` 算已渲染，`cos` 拒绝而不覆盖。完全没有 `manifest.json` 时以上都不适用——那是全新根的情形，`cos new` 直接进行 |
| `acked … as MISSING` | 一记门铃点名了这个信道从未有过的序号 | 什么都不重做。那行就是报告，编队开不开启都打印。编队开启时它还会把 `{"missing":true}` 归档到 `acks/<to>~<from>/missing/`——在 acks 旁边而不是其中，所以它不消费任何记录，也不会挡住后来记录认领的序号；关闭的编队不落盘，因为那里没有东西重试 |
| `MEMBER <label> creating` | pane 活着，herdr 尚未列出它的 agent | 等一个 poll 周期——第二趟仍无进展就会报 `failed`，那是同一个事实加了裁决（`PROTOCOL.md` 定义了什么叫无进展趟）；若持续，自己去那个 pane 看——herdr `pane read` 会显示审批对话框。`cos` 从不读 pane 输出：屏幕文本在这里不是证据，清除审批是人的动作 |
| `MEMBER <label> gone` | 没有这个 pane、终端被替换，或 `unknown` | 它未 ack 的记录转为 `dead` 并被列出；需要的是重新加人（`cos join`），不是改写。那行仍带着它加入时的 `role=` 与 `kind=`——`agent start` 失败的成员有角色没有 `kind=`，即下文的半建成情形——所以替换者照同样的方式启动，而 `gone` 成员是报告而非退役（见「退役一个成员」） |
| `MEMBER <label> failed … no-progress=2` | 该成员连续两趟无进展：对 `creating` 是 herdr 从未列出过 agent；对 `ready` 是一条仍欠它的记录过了 ack 期限 | 它是 `cos poll` 与 `cos reconcile` 打印的一行，不是要你自己去找的文件，其余五条命令不打印。不欠任何东西的 `ready` 成员绝不会 `failed`；`gone` 的绝不计数。计数在 2 处停止*落盘*——是阈值不是累加——但上限在写入侧，读取不受限：手工造的标记打印自己的数字。手工处理：对那个 pane 跑 `herdr pane read` 看审批对话框。`cos` 绝不替你启动或重启 agent，而该成员的一个 ack 就会清掉标记 |
| `UNANSWERED …` | 已 ack、无回复、欠债人已消失 | 报告给人。重做会重放另一个 agent 已经完成的工作 |
| `NEW … <body MISSING at …>` | 记录幸存，它指向的 artifact 没有 | 报告那一行，**不要**凭缺失的文件重做工作。对它作最终裁决的仍是记录自己的 ack |
| `this pane is not in the roster` | `HERDR_PANE_ID` 匹配不到任何 `ready` 成员——或匹配到两个，此时拒绝而非猜测 | 跑 `cos reconcile <slug>` 读 `MEMBER` 行。若两个成员点名同一个 pane id，必有一份 `members/<label>.json` 是错的：人来修名册，没有 pane 会以自己不持有的 label ack |
| `two members resolve to pane …` | 同一 pane id 被两个 label 认领（被回收的 id，或过期的成员文件） | 停下，在任何一方 send 或 ack 之前修正 `members/`：错误 label 的 ack 消费的是对方的消息 |
| `WARN … no ack line, because …` | 有人手工命名了 `cos` 本会自己命名的文件：要么是 `channels/` 下一个任何 `cos` 命令都产不出的 label 目录，要么是序号在 `cos ack` 读取范围之外的记录文件——小于 1，或超出 Number 精确表示的最大整数 | 记录仍然成立，但不会为它打印 `RUN` 行，因为把一条 `cos ack` 会拒绝的命令交给 peer 是死路。改名字——第一种改目录，第二种改 `<seq>.json`；`cos` 绝不替你重命名已发布的信道或记录。关于这类记录的行为有三点，全部实测。`poll` 只显示高于读者游标的序号，而游标是 `cos` 自己会搬动的缓存：reconcile 步骤——`poll` 与 `reconcile` 都跑——把它钳到最旧一条仍欠 ack 的记录之下，对最旧欠账为 0 的信道就是 -1，所以在那里持有游标的读者确实会被展示零记录，且只要记录不可消费，两条命令就一直来回搬游标。在**你**发送过的信道上，门铃对两个边界都失明：超上限记录与零记录各自在期限到达时重敲一次。接收方随后看到什么并不对称——*直到它持有该信道的游标*：尚无游标文件时（敲进全新 pane 的门铃到达时的状态），超上限记录被它的 `poll` 打成 `NEW` 并带同一条 `WARN`，而零记录完全不打（0 不高于默认值 0），所以那记门铃敲进沉默，记录唯一的现形是 `reconcile` 的 `PENDING` 行；读者一旦持有任何游标，钳位把它拉到零下，它的 `poll` 就会打印 `NEW … 0` 并带这条 `WARN` |
| `WARN … not rung — "…" is not a label this program issues` | 同样的手工名字，这次在门铃处而非打印行被拦 | 该信道什么也没投递，任何 pane 里什么也没敲。记录保持；把成员文件或信道目录改回 `cos` 发放的 label（`lead`、`m1`……），reconcile 会重敲 |
| `holds characters a doorbell line cannot carry`（或 `must be an absolute path`） | `HERDR_COS_HOME` 里有空格、引号或 shell 元字符，或是相对路径 | 换一个朴素的绝对路径。根会被嵌进一行 shell 要读的文本，所以在门口拒绝而不是转义 |
| `dead (…)` | 过了期限、重敲过一次、仍无 ack | 报告；记录还在，停下来什么也不会丢 |

## 自己 pane 里的 agent 崩溃之后

`cos poll <slug>` 会列出所有指向你的内容，不管你是怎么走到这一步的：门铃可能被一个回合中途死掉的患者消费掉了，而只有你的 ack 决定它是否作数。重敲对你幂等，因为重复的门铃点名同一个 `seq`，而对已 ack 记录跑 `cos ack` 会说 `already acked` 且什么也不改——就像重复的幻影门铃重印它的 `as MISSING` 报告且不落盘任何新东西。没有一次 ack 尝试是无声的。预期下一次 poll 还会看到同一条 `NEW` 行：你的读取游标被钳回到最旧一条未 ack 记录之下，所以未 ack 的记录会一直被摆上来直到你 ack。那是安全的方向——被两次展示欠着的工作代价是一次重复的 ack 尝试，藏起它的代价是消息本身。

## herdr server 重启之后

账本不是 herdr 的，所以这里没有东西需要重建。`cos reconcile <slug>` 从活的 agent 列表重算每个成员，对 list 未点名的逐个询问 `pane get`，结果取决于回话的是什么：

- 同一个 agent 在**新 pane id** 下应答（pane 被移动、被重新挂载）会按记录的名字 `cos-<label>-<slug>` 重新绑定：状态说 `ready` 并点名继任 pane，没有任何文件被编辑。pane id 是 herdr 发的；名字是账本握住同一个 agent 的把手。
- **裸 pane** 成员没有名字可匹配，所以是 `gone`，需要重新 `cos join`。
- 把所有 pane 都丢弃且什么都没重启的重启没有继任者可找。`cos` 绝不自己启动 agent——第二次 `agent start` 会开出重复的 agent——所以成员保持 `gone` 直到人把它们带回来。其间未 ack 的记录被列出，不丢失。

接下来解析成功的成员会得到重敲的门铃，记录保留自己的序号：peer 已 ack 过的序号绝不二次发放，因为 ack 目录是分配下限的一部分——从未存在过的序号的报告住在 `missing/` 下、不算——所以回收的记录没法让下一条消息看起来像已被消费。

## 账本根被清空之后

没有任何东西能恢复被清空的 `channels/`：`cos poll` 以 `no ledger at` 失败，而不是假装编队是空的——这就是「丢了」与「悄悄丢了」的差别。如果编队必须活过 temp 清理，把 `<root>/fleets/<slug>` 拷去持久的地方——`cos close` 打印路径正是为此，且没有导出命令，因为账本的第二份拷贝就是第二份事实来源。

## 半建成的拓扑

`cos join` 发布 `members/<label>.json`，在 `agent start` 失败时以退出码 1 打印 `not retrying agent start` 并点名下面的分支——那行会问 herdr 是否停在了审批提示，让你 `cos join` 一个新成员，且有测试同时钉住这条建议与「then run cos reconcile」的缺席。成员以**无 agent 绑定**注册，意味着 reconcile 把它的 pane 当裸 pane：`ready`、可达、每记门铃都用 `pane run` 写入——而 shell *确实*会执行它，并以「command not found」作答，因为 `cosa` 是标记不是程序。`cos` 大声说明这一点（`… as a notice, not consumed`）且不计为投递。它的记录保持未 ack、可重试，所以在人来处理期间什么也不丢。清除审批，然后 `cos join` 一个新成员，把那份工作交给它。已归档在旧 label 下的记录仍然指向它——reconcile 会继续敲那个 pane，新成员不继承它的信道。**不要**指望在那个 pane 里启动 agent 然后 reconcile 重新绑定：成员文件写的是 `agent: null`，没有任何东西会为一次失败的启动打印 `cos-<label>-<slug>` 名字，而 reconcile 永远读到的是 null 绑定——即使人在那里放了 agent，成员也保持为裸 pane 接收者，它的门铃继续经 `pane run` 到达并继续打印 `not consumed`。账本文件永远不会为修这个而重写，这是写一次规则的代价，也是那个分支是「新成员」而非「修复」的原因。
绝不要盲目重跑 `agent start`：重试会在第二个 pane 里开出第二个 agent。更早一步死掉的 join——`pane split` 或 `pane move` 被拒、任何成员注册之前——更干净：`cos` 自己回滚刚 carve 的 worktree 与分支（checkout 只存在了几秒且是裸的，没有可丢的东西），并打印坐在你 tab 里的多余 pane id，由人关闭。修好 herdr 再重跑同一个 `cos join`：label 从未被认领，所以没有其他东西被动过。

## 成员的 worktree

`cos` 在 `join` 时为每个成员 carve 一棵 worktree，之后再也不看它：没有 pass 会 reconcile 树，所以这里的每一种失败对账本都是静默的，由人用普通 git 修复。

- **pane 活着但树没了**（temp 清理扫走了 `<root>/worktrees/`，或有人删了它）：pane 的 `--cwd` 现在悬空。`cos` 注意不到，成员照常 poll 和 ack。分支还在仓库里，按成员文件所说重新挂上——`git worktree add <worktree-from-the-member-file> <branch>`——成员就完整了。两个路径都从 `members/<label>.json` 读，不要猜。
- **账本根被清空**：`<root>/worktrees/` 下的 worktree 随之消失，但分支留在仓库。编队本身是 `no ledger at`（上文）且不予恢复；如果某分支上有值得保留的工作，在仓库被清理前 `git worktree add` 到你选的地方。
- **成员被重新添加**（`gone` 之后 `cos join`）：新 join 拿*新* label，carve 的是*新* worktree 与分支。旧成员的树与分支原样留在原地——`cos` 什么都不删。那个分支是否还有价值由人判断。
- **`--no-worktree` 成员没有树**：它的文件记录 `worktree: null`，它一直在 lead 的树里工作。没有可恢复的；风险正是隔离本要避免的那个。

退役一棵树：先关闭或改派 pane，然后 `git worktree remove <path>`（仅当里面有你决定丢弃的未提交工作时加 `--force`），工作已合并则 `git branch -d <branch>`。`cos` 两者都不代跑。

## 退役一个成员

`gone` 是报告，不是清理。成员文件还在，所以每个 pass 都把它打印成 `gone`，并且继续计入推荐的六个——计数遍历 `members/*.json`，死 pane 的文件也是文件。真正退役一个：**先关它的 pane，再删 `members/<label>.json`**。

顺序是承重的。`nextLabel`（`cos.mjs:125`）给新成员的编号是磁盘上最大编号加一，所以删编号最大的文件会让它的编号可复用：删那个——比如 `m3.json`，而 `m1`、`m2` 还在盘上、`m3` 的 agent 还活着——下一次 `cos join` 会再次认领 `m3` 并尝试启动同名 `cos-<label>-<slug>`，herdr 拒绝，因为活 agent 之间名字必须唯一——join 于是以 `agent start returned herdr …` 退出 1，即上文那个分支。先关 pane，名字在轮到那个号时已经空闲。删编号更小的文件不释放任何东西，因为 `nextLabel` 取最大值，但那个 label 就从名册上消失了，编号有了洞——`cos` 不在乎，`m4` 也不会变成 `m3`。

退役成员不退役它的邮件。已归档在 `channels/<from>-><label>/` 的记录留在账本里，指向的是 label 而不是 pane。如果那个序号被复用，新成员认领 label 并继承它们——阶梯把 label 解析到此刻持有它的任何 pane，于是重敲并消费退役成员从未读过的邮件。如果序号永不复用，就没有东西重敲它们、没有东西消费它们：它们悬挂在一个没有 pane 替它发言的 label 名下，序号也永不二次发放。无论哪种，退役前先 ack 真正完成的部分；`cos` 什么都不收集，退役的 label 也不构成改账本的理由。删成员文件同样不退役它的树——它被接入的 worktree 与分支活得比文件久；按 `## 成员的 worktree` 手工清理。

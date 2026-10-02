# Protocol

`scripts/cos.mjs` 实现的规则与其输出行携带的语义。程序照这里改；这里的规则变了，`tests/cos.test.mjs` 必须在同一个 commit 里变。`herdr-cos` 保留了 `herdr-centralization` 的形态但没有沿用它的行数上限：worktree 隔离与角色契约拓宽了 `cos.mjs`，所以硬上限是自己的——**800 行**，比祖先的 600 多。为了凑文字预算而砍规则，会让实现者有空子破坏它，所以这个上限是给程序的预算，而 `cos.mjs` 远未触顶。只有 `cos.mjs` 有硬上限；三份散文文件以它们必须说清的内容为准。

## Layout

```
<root>/fleets/<slug>/
  manifest.json                {slug, v, root, repo} — 写一次，永不修改；`repo` 是 `cos new` 解析出的
                               git toplevel，仓库外为 null
  members/<label>.json         {label, pane_id, terminal_id, agent, role, kind, worktree, branch} —
                               每成员一份，写一次；后四项是其 `join` 记录的
                               （见 Member state 与 Worktrees）
  channels/<from>-><to>/<seq>.json   一条记录；每条信道恰有一个写者
  artifacts/<from>-><to>#<seq>.md    超过 1500 字节的正文
  acks/<to>~<from>/<seq>.json        空 = 已消费；{"re":…} = 一条回复被 ack 且被持久记住
  acks/<to>~<from>/missing/<seq>.json  一份报告：某次门铃点名了这个信道从未有过的序号。故意放在
                                     ack 命名空间之外（见 Publishing）
  cursors/<to>~<from>.r        {c} — 本 pane 读到了哪里，按入站信道计
  cursors/<from>~<to>.s        {q,b,t,r} — 发送方槽位：头部记录、基线、投递时间、重试次数
  failures/<label>/<n>         {label, n, acks} — 无进展标记，水位在 `acks`
  closed                       cos close 的标记
  peer-contract.md             由 cos new 渲染；其中是绝对路径，永不重写
<root>/worktrees/<slug>/<label>/    每个成员的 git worktree，分支 cos/<slug>/<label>——隔离单元；
                                故意放在 fleets/ 之外，这样成员 checkout 的分支永远不会落在账本
                                里面（见 Worktrees）
```

`root` 由 `cos new` 解析一次，之后从 `manifest.json` 读回：`$TMPDIR` 是每进程变量，peer 重新解析它可能落到另一个根上，迎接它的是一份空编队。`openFleet` 把 `manifest.root` 与本进程解析结果比对，不一致即停，而不是另起一份账本。`members/` *就是*名册——没有别的文件列成员，因为一份列表就是一份要同步的副本。写一次意味着按内容写一次：一个名字存在之后就不再被编辑，删除被取代的条目是另一种动作（见 Publishing）。`cos new` 可能会完成上一次调用中断的认领——那是发布尚不存在的名字，不是改写。本程序打印或渲染的每条命令行都带 `HERDR_COS_HOME=<root>`，复制的行会重新解析到记录的根，而不是靠猜。

## Worktrees

`cos join` 把每个成员隔离进自己的 git worktree，两个成员永远不会写同一棵工作树。它从 lead 的 cwd 用 `git rev-parse --show-toplevel` 解析仓库，然后执行 `git worktree add -b cos/<slug>/<label> <root>/worktrees/<slug>/<label> HEAD`，并以 `--cwd` 指向该路径打开成员的 pane。worktree 位于账本根之下、仓库之外，这样成员 checkout 的分支永远不会落进账本，账本也不被任何分支触碰。成员文件把 `worktree` 与 `branch` 和其余身份一起写一次，恢复时可以再次点名这棵树。

两种情况会退回 lead 自己的工作树，且都不是错误：`cos join … --no-worktree` 完全跳过 git；lead 的 cwd 不在仓库内时会收到一条 `note:` 并共享其树。两种情况成员文件都记录 `worktree: null`。`git worktree add` *失败*则不同——join 在任何 pane 被切分之前停止并明说，因为一个半接入且没有树的成员比没有成员更糟。晚一步的失败则回滚：如果 carve 之后 `pane split` 或 `pane move` 被拒绝，刚出生几秒的裸 checkout 会被移除、分支被删——这是 `cos` 唯一会跑的 `git worktree remove` 和 `git branch -d`；*成员的*树仍然只由人来移——而那个多出来的切分 pane 会被点名让人来关，因为关 pane 不在这条程序的两条端口之内。除此之外没有任何自动清理：成员的 worktree 由人在认定分支已耗尽时用 `git worktree remove` 移除，`cos` 从不代劳。

## Publishing

先把字节写到同目录的临时文件 `<name>.<pid>.<rand>.tmp`，再用 `link(2)` 链到最终名字。`link` 遇 `EEXIST` 会失败而不是替换，所以冲突是一个信号，带序号的发布者会重扫 `max+1` 并重试。由此得出两条规则：

- 已发布的名字永不改变内容。条目一旦被取代就整体删除（`recycle`），这不是覆盖：支持这次删除的 ack 仍然存在。
- 临时文件与目标永远同目录。拷到另一个文件系统就是本设计拒绝的非原子回退。
- 序号绝不二次发放。下一个序号是 `max(records, acks)+1` 而不是 `max(records)+1`，因为回收会删记录而留下 ack：没有 ack 作下限，下一条消息会以 peer 已经消费过的序号到达，并在被读取之前就当作被取代的删掉。这也是 `missing` 报告被归档在 `acks/<chan>/missing/` 而不是放在 ack 旁边的原因：ack 文件的*名字*就是下限材料，所以一份点名的报告绝不能被读作对后来认领该序号的记录的消费——反过来，也不能让每一个后来的消息为一次手误而抬高水位。`cos ack` 的 `<seq>` 被校验为纯数字也是同理：`1e308` 与 `2**53+2` 经 JSON 往返仍是整数，会把那个下限卡死。
- 记录的 `link` 是它正文的提交点。artifact 在分配器内、记录发布之前写入，所以两步之间被 kill 只会在 `artifacts/` 留下一个孤儿正文，而不是发布一条 `file` 指向虚空的记录。正文名字被占用意味着同信道的另一个发送者已持有该序号，分配器再绕一圈而不是让 send 失败——且候选绝不重新考虑，所以那个搁浅的正文不会被争论第二次。
- 超过 ack 期限的信道临时文件由该信道的写者解除链接，这样 staging 与 `link` 之间的 kill 不会让信道永久堆垃圾。更新的不碰，所以慢的发布不会被竞态掉。其他目录一概不扫：那些临时文件无害，扫它们就意味着删除别的进程可能正在 link 的文件。

`cursors/` 是唯一的例外，而且是故意的：游标是读取位置，不是证据。删掉它不能丢记录、不能重复消费任何东西、不能复用序号——代价最多是一次额外的门铃，ack 检查能吸收它。如果删除 `cursors/` 改变了其他任何事情，那就是 bug：这个豁免只在缓存真的是缓存时成立。它的一个后果是有意的，不是泄漏：读者的 `.r` 会被钳回到*最旧一条仍欠 ack 的记录*之下——而不是最高的已 ack 记录，后者会让一个更晚的 ack 掩盖一条没人消费过的更早记录。所以一条已展示但未 ack 的记录会在每次 poll 时重新以 `NEW` 打出，直到它 ack。把欠着的工作再次展示是安全的方向；把它藏起来不是。

## Records

`{v, fleet, seq, from, to, type, re, text, file}`。`type` 是 `send` 或 `reply`——ack 永远不是记录，只是 `acks/` 下的一个文件，所以消费只有一个家。`re` 是 `<from>-><to>#<seq>`，带信道限定，因为序号只在单条信道内唯一。`file` 存在时 `text` 为空：超过 1500 字节的正文在 `artifacts/`，门铃完全不携带正文。记录的身份是 `(fleet, channel, seq)`，所以去重不需要时钟、boot id 或随机 token。

ack 是文件，不是记录，正文要么为空（该 seq 已消费），要么是 `{"re":…}`——被 ack 的那条回复的 `re`，从那条记录里复制。复制之所以存在，是因为 `acks/` 比 `channels/` 活得久：写者回收回答之后，ack 是唯一还能证明它曾被给出的东西，没有它 `unanswered` 会一直报告一条其实已经送达的回答。`cos ack` 能写的第三样东西根本不是 ack：门铃点名的序号信道从未持有过时，它把 `{"missing":true}` 归档到 acks 旁的 `missing/` 并明说——编队开启时。什么都不重做，什么都不消费，序号保持空闲；重复的幻影门铃会再次打印同样的行而不是沉默。poll 一条 `file` 已消失的记录会打印 `<body MISSING at …>` 并说明不要凭一个缺失的文件重做工作：记录是证据，正文不是。

## Doorbell

`herdr agent prompt <pane_id> "cosa <abs>/fleets/<slug>/peer-contract.md <label> <seq>"`，或对 agent 从未注册成功的成员 pane 用 `herdr pane run <pane_id> …`。`cosa` 是标记，不是命令：`agent prompt` 把这行敲进 agent 的输入框，被识别的 agent 读了会行动；`pane run` 把整行交给 shell，而 shell 找不到名叫 `cosa` 的命令——程序会大声说明，并把它计为一条通知而非一次投递。slug 匹配 `[a-z0-9][a-z0-9_-]{0,39}`，label 匹配 `[a-z][a-z0-9_-]{0,31}`。这不只是为了行能挺过引号与空格切分：这行要交给 shell，不符合这两个模式的名字在*门铃处*就被拒绝——目录名的任何一个 token 都到不了 shell。因此手工造的成员文件或信道什么也敲不响——它得到 `not rung`，记录保持。根被限制为 `[A-Za-z0-9._:/-]+` 且必须绝对、不能是 `/`：它会被嵌进一行 shell 要读的文本，所以 `HERDR_COS_HOME` 里出现空格、引号、`$`、反引号或 `;` 会在 `cos new` 处被拒绝，而不是被继续敲下去。已注册的 agent 名为 `cos-<label>-<slug>`，截断到 32 字符，label 在前，这样两个成员不会截成同一个名字；这个名字是成员跨 pane id 变化的身份（见 Member and observation state）。它是一个加速器：它点名契约，契约告诉接收者去拉什么。投递的证明除了 ack 别无他物。

## Message states

| 状态 | 判定 | 动作 |
|---|---|---|
| `acked` | `acks/<to>~<from>/<seq>.json` 存在 | 终态；写者回收记录与其 artifact |
| `unanswered` | 已 ack，反向信道没有携带该 `re` 的 `reply` 记录，也没有持有其副本的此类回复的 ack，且 acking pane 已不再是 `ready` | 报告给人；绝不自动重做——那会重放别人造成的副作用。答案还被欠着时记录被持有、不回收：删掉它就删掉了欠债的唯一证据。 |
| `queued` | 接收方被观察到 `working` | 什么都不做；`working` 的 pane 不能再戳 |
| `blocked` | 接收方被观察到 `blocked` | 把审批对话框交给人类；记录本来就在 |
| `pending` | 还在期限内，或不是信道头部，或你就是读者 | 什么都不做 |
| `unproven` | 超过 240s（测量前的估算值，见 `cos.mjs` 常量），无 ack，且 `state_change_seq` 自基线以来未动 | 对**同一个** `seq` 重敲一次门铃，重设基线，重启期限 |
| `dead` | 三元组不再解析，或重敲后仍无 ack | 报告；不再重试，*不就该消息写任何文件*。是否落盘 `failures/<label>/<n>` 由成员决定，仅限仍开启的编队：`gone` 的成员绝不计数（它的报告就是全部内容），仍可解析的成员一旦处于 `creating` 或有记录对它停在 `unproven`/`dead` 即计数。关闭的编队一律不落盘。那个标记数的是成员，不是记录 |

`unanswered` 是全编队扫描，不是对你自己信道的查询：任何一次 `cos reconcile` 会报告它找到的每一笔欠答，包括别的成员的欠债，因为输出是给人看的报告，不触发动作。一个 peer 通过回答*第三个*成员——本协议允许的 peer-to-peer 中继——了结了你的问题，会让你的反向信道里没有回复，所以那个 pane 消失后你会收到报告，尽管工作已经完成。它是报告，不是重做：在任何人重复任务之前先去看另一条信道。

`state_change_seq` 是一个只作否定用途的*证据*：没动证明不了什么都没跑，而它展示过的任何东西也都不算投递。反方向倒是可读——动了的计数器只被用来证明*有什么东西跑过*，这足以重设基线并把记录保持在 `pending` 而不是升级，这种用法可能推迟判断，但永远无法伪造消费。它证明不了投递——上游没有文档化这个字段，而一个 pane 内任何活动都会推进的计数器，分不清「我的 prompt 跑了」和「它干了别的」。基线存在发送方的 `cursors/<from>~<to>.s`，享有与游标相同的豁免，所以丢失缓存最多换来一次额外的幂等重敲，仅此而已。计数器动了会重启期限，而对这个字段的两种读法在那里都活得下去：如果它只为 prompt 而动，动的是投递；如果它为无关活动也动，忙碌 peer 的记录保持 `pending` 而不是升级到 `dead`——这是安全的方向，因为 ack 终结一切，而 `unanswered` 会接住欠债人消失的情形。
没有注册 agent 的成员 pane 没有计数器，在那里期限本身就是触发器，ack 检查吸收那一次额外的敲击。

一次往返不是瞬时的，这里没有任何表述声称它是。一次 lead→空闲 peer→回答 交换的预期形态约为 2 个模型回合里的 4–8 次工具调用——目测两到八分钟：门铃要敲进去，peer 的模型要花一个回合读契约并跑它的 ack 行，回答则等待你在 30s 节奏上的下一次拉取。这些是从协议自己的步骤数读出的估算。一次活体编队已经跑过（2026-09-30，herdr 0.9.1 上的命名 session，private protocol 22）：它的 peer 是脚本而非模型，脚本那一半——读渲染的契约、`poll`、跑契约打印的 ack 行——端到端约一秒。那是传输与账本的**下限**，不是往返的中位数，所以上面的分钟数保持为模型回合的估算，`240s` 保持为测量前的值。有机器背书的比三个数字看起来要窄：派发成本（成员全部解析完成后是一次 `agent list` 加 N 次 prompt，外加对 list 未点名的每个成员各一次 `pane get`——门铃批次不是整条命令，因为 `cos send` 以 reconcile pass 开场。只有批次被断言，测试标题为 `dispatch costs one agent list plus N doorbells and no wait flag`——它把该路径在 `agent list` 之后的*整段*序列钉死为 N 次 `agent prompt`，因此在那条路径上 `pane get` 的次数是零，且有测试作证；没有测试约束的是成员未命名或被移动时一次 reconcile pass 会做多少次 `pane get`）、`1500` 字节阈值（代码按它分支，两侧都有测试），以及 `240s` 的*规则*——通过向 `cos` 注入一个快进 300s 的时钟得到，所以期限逻辑被证明而数值本身仍是一个未测量的猜测。`30s` 节奏没有任何东西强制：`cos poll` 把它作为建议打印，没有代码路径读时钟去核查，也没有测试为它计时——`cos` 强制不了调用者的间隔，而能观测它的 harness 还没有跑。所以计划表里要求对拉取间隔做脚本化断言的那一行**未达成**，并且保持未达成，而不是改个说法。`cos` 不强制任何时延声明。

## Member and observation state

成员状态（`creating`、`ready`、`failed`、`gone`）每次调用都从 `members/*.json` 加 `herdr agent list` 重算，并与 `herdr pane get` 交叉核对——agent list 会漏掉卡在 `agent_not_ready` 的 pane，而被移动过的 pane 可能换了 id，所以两个来源单独都不够。它从不被存储。唯一的痕迹是 `failed` 背后的无进展计数，而且它有界。对仍可解析的成员而言，一趟 pass 在两种情况下*无产出*：它处于 `creating`（不存在能跑任何东西的 agent），或有记录对它停在 `unproven` 或 `dead`（即一个 `ready` 成员欠着过了期限的工作）。其他任何一趟都会清零计数，这就是不欠任何东西的 `ready` 成员永远不会 `failed` 的原因——而该成员在最近一次标记之后落在 `acks/<label>~*` 下的新 ack 同样会清零它。连续两趟无产出才构成 `failed`，计数随后停止落盘——一个永远不回来的成员否则会每趟多写一个文件去重复一个已经说过的事实，所以 `2` 是 `cos` 落盘的最大数字。那是写入的上限，不是读取的：计数取 `failures/<label>/` 里最大的标记名，所以手工造的 `failures/<label>/7` 会打印 `no-progress=7`。它在两种会清空普通计数的分支上停止打印——第一趟有产出，或该成员在标记水位之后落下的第一个 ack（它可能还卡着就发生了）——两种情况目录都随一次 `rmSync` 整体消失，从不被编辑，只被整体移除。手工造的标记还必须能解析为 JSON，因为最新标记的 `acks` 水位要从它读出（`cos.mjs:203`）；空文件换来的是一行 `cos <name>: unexpected SyntaxError: …` 加退出码 1，而不是一个计数。在仍开启的编队上这会卡住六条子命令而不止一条——除 `new` 外每条命令都以这一趟开场——`close` 也在六条之列，所以这个编队在人来修文件之前关不掉：`cos` 从不修复标记，而两种手工修复都行——删掉它，或者让它能解析，因为从它读出的只有 `acks` 水位，缺字段按 `0` 计。已关闭的编队不读标记（`:361`），同样的文件在那里卡不住任何东西，迟到的 `ack` 照样落盘。两种情况都不改变标记本身：没有一趟会重写或移除它读不了的文件，因为前面那个 `rmSync` 排在这次读取之后。
`gone` 成员的标记被同一个守卫跳过，所以挂在已消失 pane 下的不可读文件保持沉默。而 `cos ack` 不构成自己的一趟：它的正文从不碰 `failures/`，打开这次调用的 reconcile pass 才会（`cos.mjs:361,657`），所以成员落下的 ack 让*下一趟*清掉该成员的计数。
`gone` 成员什么都不落盘，因为它的缺席就是报告，herdr 会一直这么说；关闭的编队也什么都不落盘。`failed` 就是那个计数，别无其他，所以它同样会到达一个 agent 从未被 herdr 列出的成员，以及一个解析成功后归于沉默的成员；行上的 `(<reason>)` 是那一趟解析说的话——从未列出的成员是 `the agent is not visible to herdr yet`，沉默过的成员什么都没有（或一条 `re-bound from pane …` 备注）——而 `cos` 绝不会据此重启 agent。声明的 pane id 消失但一个*具名* agent 在另一个 pane 里以记录的名字应答时，那是同一名成员：pane id 归 herdr 管，名字归账本管，于是状态重新绑定到继任者，账本一个字节都不用改。两条限制直说：只对注册了 agent 的成员有效，且只在名字唯一时有效——消失的裸 pane 就是 `gone`，而 herdr 把名字复用给另一个 pane 会错误地重绑。

一个 pane 以恰好一个 `ready` 成员的身份自居，匹配 `HERDR_PANE_ID`。两个成员解析到同一个 pane id——被回收的 id，或一份写错的 `members/*.json`——意味着它们都不是这个 pane：`send` 和 `ack` 以 "this pane is not in the roster" 拒绝，reconcile 警告，因为以错误的 label 应答会让一个 pane 用自己的 ack 烧掉另一个 pane 的消息。歧义被拒绝，从不靠取第一个匹配来打破。

Observation state（`idle`、`working`、`blocked`、`done`、`unknown`）属于 herdr，只读不写；`unknown` 按 `gone` 处理，因为无法归类的 pane 被当作消费者计数是不安全的。两张表正交且永不合并：`working` 说了三元组是否解析的任何话，`failed` 也没说那个 pane 在干什么，任何成员状态都不从 observation 单独推导。

停摆时钟每条信道恰有一个所有者：发送方，且只对头部记录。既非端点的 pane 读得到阶梯但从不写槽位，更新的 send 也不能从更旧的未 ack 记录手里抢走槽位——那会给停摆的记录一张新的期限，让它被敲两次。

每个成员文件还携带 `join` 给它的 `role` 与 `kind`——与其余身份一样写一次，并跟随成员可能被报告的每一种状态，`gone` 也一样，那行仍然点名身份与替换者应当用哪个 CLI 启动。一个缺口：`agent start` 失败的 `join` 记录了角色而 kind 为 null，因为从未绑定过 CLI，所以那行没有 `kind=`，也没点名从哪启动——那是半建成的分支，不是恢复提示。`cos` 读回这两个字段只是为了打印：没有角色到信道的表，任何地方都没有权限，所以角色是给人看的名字而非能力，持有角色的成员并不因此被限制在它之内。同一份文件携带 `worktree` 与 `branch`（见 Worktrees）——同样写一次，但它们*不*上 `MEMBER` 行：在 `join` 时打印一次，之后只有人或恢复流程读回，因为没有哪趟 pass 会 reconcile 一棵树，成员的 worktree 也只由人移除。

## Output lines

peer 必须行动的行带 token 前缀；环绕它们的标题与合计是给人的。`cos send` 对每个目标打印一条 `sent <from>-><to>#<seq>`，正文进了文件时追加 ` (body in artifacts/)`。那行证明记录已发布，不证明门铃响了。**五种** `WARN` 措辞意味着「没有门铃被交给已注册的 agent」：`not rung`（名字不是本程序会发出的 label）、`nothing sent`（成员不是 `ready`）、`doorbell withheld`（它停在审批对话框）、`doorbell failed (herdr …)`（调用本身失败），以及 `… as a notice, not consumed`——五者中唯一一行*确实*到达了 pane 的：shell 找名为 `cosa` 的命令而不得，所以即使文字上了屏，什么也没被消费。`cos send` 先打印整批 `sent` 行再打一个 `WARN` 块，所以警告*跟在*它的 `sent` 后面而不是并肩，且那个块同时携带打开本次调用的 reconcile pass 的警告与本次自己的。五种措辞里只有三种可能来自重试，而重试发生在除 `new` 外每条命令开场的 pass 里——`poll` 和 `reconcile` 也在内，那里没有 `sent` 行可跟：`not rung`（门铃携带的 label 超出上文 Doorbell 处给定的模式——`cos.mjs:24` 定义的 label 模式会拒绝不以小写字母开头、或超过 32 字符的名字，正如拒绝携带杂字符的名字——后者只有手工造的 `members/<label>.json` 才造得出来——而这样一个文件就够了，因为匹配它的 pane 会以那个 label 发言，所以 `cos send` 自己发布信道然后拒绝敲它自己的行：`cos send` 按它发出的名册检查*目标*（`cos.mjs:543`），而这里触发的是拒绝行任一端坏 label 的检查，`from` 或 `to`（`:309`））、`doorbell failed`，以及裸 pane 通知。`nothing sent` 与 `doorbell withheld` 不可能来自重试，因为阶梯绝不把接收方未就绪或停在审批对话框的行标为可重试——那些读作 `dead` 与 `blocked`（`cos.mjs:221-222`），只有 `unproven` 会被重敲。`cos send` 以自己的计数收尾——`doorbells N of M`，M 是本次调用发布的记录数，N 是**本次调用**交给已注册 agent 的门铃数（裸 pane 通知计入 `M`，不计入 `N`）——所以被扣下的投递由程序亲口陈述，而不是靠缺行推断。N 有意窄于整条命令的敲击：`send` 以 reconcile pass 开场，pass 可能重敲的是*别的*、更旧的欠账。那些重试以自己的 `WARN … unproven — re-sent the doorbell once` 出现，计入 `cos reconcile` 的 `doorbells N`（那一趟交给已注册 agent 的每记门铃，对 `reconcile` 而言只可能是重试），其中 `re-sent N` 是重试数——落在裸 pane 上的重试计入 re-sent 而不计入门铃。`cos poll` 两个合计都不打印；它为欠你的工作打印 `NEW <from> <seq> <type> <preview>`，每条后跟一行 `RUN …`——那*就是* ack 命令，逐字复制——除非在一条 `cos ack` 会拒绝其名字*或*记录序号的信道上，此时一个 `WARN` 取代那行，而上面的 `NEW` 照印，因为藏起一条记录比 peer 发现它无法被 ack 更糟。然后 `OUT <channel>#<seq> <state>` 列你自己未 ack 的发送，再一条无前缀的合计，然后——仅当那批 `OUT` 非空——`pull again in 30s; ack deadline 240s`，程序自己说出这两个书面估算的就是这一行：唯一*打印*它们的地方，且只在确实有欠账时。渲染的契约也携带它们——期限一次、节奏两次，用契约自己的话（`cos.mjs:399,446`）。
`cos reconcile` 以 `fleet <slug> at <root>/fleets/<slug>` 开场，第二条打印 `self: <label>`，点名它评估的是谁的阶梯——或本 pane 不在名册。这个头只在编队仍开启时打印：关闭的编队上，下面 `is closed` 的拒绝就是全部输出，先于命令主体打印。超过推荐成员数时 `cos join` 追加一行 `note: <n> members, over the recommended 6 counting the lead`，报告编队的四条命令——`poll`、`send`、`ack`、`reconcile`——以 `WARN <n> members exceeds the recommended 6` 重复同一事实，其中 `ack` 并非每次都重复：`as MISSING` 行与 `already acked: <label> consumed …` 行在警告块之前返回（`cos.mjs:597,607`，对 `:617` 的那个块），而另一种 `already acked` 措辞——记录读完之后输掉竞态的 `already acked: <channel>#<seq>`——打印在 `:615`、直落 `:617`，所以它确实重复警告；`join` 不打印这种警告，`close` 两种措辞都不打印。没有任何东西被拒绝。`cos ack` 落盘 ack 时打印 `acked: <label> consumed <channel>#<seq>`；对它已持有的序号，ack 文件在读取记录之前就在时打印 `already acked: <label> consumed <channel>#<seq>`，记录其实已发布且已消费时打印 `already acked: <channel>#<seq>`。一次幻影门铃得两行：`acked <channel>#<seq> as MISSING: …` 然后 `nothing was redone …`。`cos reconcile` 不打印 `NEW`、`RUN` 或 `OUT`（它不消费读取位置），但打印 `PENDING <channel>#<seq> <state>`，有任何理由时追加 ` (<detail>)`，来自任何人。两者都打印 `MEMBER <label> <state> [role=…] [kind=…] [observed=…] [no-progress=<n>] [(<reason>)]`、`UNANSWERED <ref> owed by <label>` 与 `WARN <message>`。`<body MISSING at …>` 的 preview 是对账本的陈述而非干活的指令：报告那一行，什么都不重做。

一行打印出来的内容恰好是一行：每个 C0 控制字符与 DEL 都在唯一的 `out` 汇点被替换为空格，`die`、抛出的错误与每个合计也都经过它。信道目录是一个 POSIX 名字，而 POSIX 名字可以含换行，所以没有这道防线，手工造的目录能伪造一行打印——包括一条 peer 会照抄照跑的 `RUN …`，为一条它从未读过的记录落下消费凭证。类别是 C0 加 DEL，不再更宽：`U+2028` 与 `U+0085` **不**被替换，按 Unicode 断行切分的读者会看到两行。与此独立，`RUN` 行只对匹配 `[a-z][a-z0-9_-]{0,31}` 的 `from` **且**序号 ≥1 且不超过 Number 精确表示的最大整数的记录发出——label 测试是 `cos ack` 做的那一个，两个边界是该子命令从数字一侧（而非它测试的数字串一侧）看到的下限与上限，所以两者对每个到达这里的名字都一致——序号无法往返的名字不贡献新序号：它要么解析出不存在的路径而被跳过，要么解析成旁边的一个普通文件，而那份记录于是被读两次。可能被读成两行的名字因此永远不会变成可运行的行。

## Errors

`cos` 成功退出 0，被拒绝或失败的操作退出 1（stdout 上 `cos <cmd>: <message>`），用法错误退出 2——子命令缺失或未知时是七个名字的 `usage: cos <new|join|…>` 行，slug 缺失或畸形时是 `cos <cmd>: <what>`。不是拒绝的崩溃也只打印一行——`cos <command>: unexpected <code>: <message>`，命令名由包住 dispatch 的 catch 填入（从同一个 catch 打印的拒绝不带 `unexpected`；在 dispatch 之前打印、格式化在这之外的三行是 usage 行——未知子命令、缺 slug、slug 畸形）——因为 pane 里的一串堆栈是 peer 无法行动的噪声。herdr 失败以 `herdr reported <code>` 到达——`spawn_failed`、`cli_usage_error`、`exit_<n>`，或 JSON 信封携带的任何 code。必须被读作协议陈述的拒绝：`already claimed`（守卫只在 `manifest.json` 已写出时运行，随后在 slug 的 `members/` 下有任何 `*.json` 或契约已存在时触发；在两者存在之前被打断的认领由下一次 `cos new` *完成*，所以 herdr 打个嗝不会烧掉名字——而没有 manifest 的目录根本不是认领，那是 `cos new` 为之存在的全新根情形）、`no ledger at`（这个根没有这样的编队——恢复从不发明一个）、`lives in … but this process resolves`（两个根）、`send refused`（更新版 `v`：读旧记录与 ack 旧记录仍安全，分配新序号不安全）、`is closed`（不再发送也不再 reconcile；`ack` 与 `close` 是仍被接受的两条子命令，因为 ack 是证据而非工作）、`must be an absolute path` / `holds characters a doorbell line cannot carry`（根）、`ack needs: <from> <seq>`（不是纯数字的序号无法在不毒化分配下限的情况下被记录）、`published but unreadable`（无法解析的记录拒绝 ack：消费读不了的东西会让它被删除）。

## Invariants to keep when editing cos.mjs

1. `linkSync` 是发布最终名字的唯一手段；不对已发布的路径使用 `writeFileSync`/`renameSync`。只有 `cursors/` 原地写，且只由游标文件名里那个 label 写。
2. 恰好启动两个进程，各自在一条端口后面、别无其他：herdr 走 `herdrExec(argv)`，`git` 走 `gitExec(argv, cwd)`——后者只在为成员 carving worktree 时使用，以及在 join 在任何成员注册之前死掉时回滚那次 carve。两个端口都取固定 argv 数组，绝不取 shell 字符串，所以谁都执行不了名字里携带的内容。测试替换这两者。（`node` 出现在契约渲染的行里是因为 peer 的 shell 要运行它们，不是因为这里有什么东西启动它。）
3. 序号与 label 由失败的 `link()` 重试认领，从不靠时钟，也绝不二次发放——ack 目录是分配下限的一部分。
4. `acks/` 与 `manifest.json` 永不回收。指向不存在记录的门铃会被报告，在开启的编队上归档到 `missing/`，绝不写成 ack，也绝不重做——「缺席」在任何方向上都不是消费的证据。
5. 记录的 `link` 是发生在它身上的最后一件事：artifact 先落盘、在记录提交前释放，所以已发布的记录不可能点名一个从未写出的正文。孤儿正文是被接受的失败；孤儿记录不是。
6. 一个 pane 只能以它持有的 pane id 对应的那个 `ready` label 行动。两个认领者是错误，不是待打破的平局。
7. 只有信道自己的写者回收它，只有那个写者清扫自己的临时文件，仍欠回答的记录被持有。
8. 无法解析的已发布文件被报告并跳过：绝不删除、绝不计为已消费、绝不静默当作空信道——对它的 ack 被拒绝。
9. 除 `new` 外每条子命令都先开账本并 reconcile 再行动。关闭的编队仍为读取而 reconcile，peer 的 `ack` 在那里仍被接受——证据而非工作——但编队本身不再产出：没有门铃、没有重试、没有回收的记录、没有 `failures/` 标记，那里的幻影门铃只打印不落盘，因为那里没有东西重试，而无读者的落盘是为写而写。游标写入（钳位、ack 推进的 `.r`、读取时阶梯填充的发送方 `.s` 槽位）与过期临时文件的清扫仍然发生：一个只碰缓存，另一个只解除链接一个什么都没发布的文件。
10. 门铃携带契约的绝对路径、接收者的 label 与序号，别无其他——没有发送方、没有信道、没有正文。那个路径是唯一无法避免的 token：找不到账本的 peer 读不到它被要求遵守的规则。这条不变量保护的是那个指针*之后*的一切：根、slug、发送者、它自己的 label 都来自账本与 `HERDR_PANE_ID`，绝不来自 shell 敲进来的那行。
11. `cos` 打印出来给人运行的每一行，都是 `cos` 自己会接受的一行：根与 slug 做过字符集检查，ack 行里的 label 在打印前检查，本程序自己的路径是唯一被加引号的 token。绝不能把一条自己的程序都会拒绝的命令交给 peer。同一道字符集守卫更早地再跑一次：在门铃本身处、在行被构造之前，因为 `pane run` 把整行交给 shell 执行。一份在 `cos` 发放名字的模式（字符集*与*首字符*与*长度）之外*手工命名*的账本文件因此什么也敲不响，打印 `not rung`；它的记录保持，然后有人把文件改名。两个汇点谁也不能指望另一个兜底。
    *带序号的*手工名字有自己的一堵墙，值得展开，因为它四种形态里两种看起来无害。记录按其序号打印出的名字读回，所以 `007.json` 与 30 位长的名字解析出不存在的路径：这一趟说 `published but unreadable: skipped, not deleted, and nothing was acked for it`，两者都不打印 ack 行。注意随之而来的折叠——`007.json` 旁边的普通 `7.json` 会被读*两次*，因为两个名字都解析到它，而手工文件自己的正文从未被打开。真正能往返的两种形态才有趣：`0.json` 点名一个 `cos` 从不发放的序号（自己的分配从 1 开始），`9007199254740992.json`（= 2^53）超出 Number 精确表示的最大整数，`cos ack` 对两者都拒绝——前者按数字模式拒绝，后者按上限拒绝。所以打印路径测试的就是那个子命令测试的东西，任一记录都变成 `WARN … no ack line` 而不是一条读者无法运行的指令。直说：下限曾经是个洞——上限早就在，下限不在。同样直说，关于它的两次早期记述是错的。第一次声称孤立的 `0.json` 会打印一条可运行的 `RUN` 行；它不会自行打印，因为 `cos poll` 只报告*高于*自己读取游标的入站记录（该记录确实出现在 `reconcile` 里，作 `PENDING m1->lead#0 pending`，那行不点名任何可运行的东西，且 `cos ack` 拒绝清除它，于是它坐在之后每一份报告里）。第二次声称手工编辑的游标是让它现形的唯一入口，这也被驳倒了：把读取位置钳回到最旧一条仍欠 ack 的记录之下的钳位是本程序自己的行为，序号 0 之下是 **-1**——已持有该信道游标的读者（对该信道的任何一次 poll 只要读到过可读记录就会持有）会被下一趟推到零以下（`poll` 跑的是与 `reconcile` 相同的钳位），不需要任何手工文件。在该序列上实测：`poll` 打印 `NEW m1 0` 与下限的 `WARN`，然后把游标推进到它报告过的最大序号；下一趟又把游标钳回 -1；只要记录未 ack，两者就轮流下去，永不终止，因为 `cos ack` 拒绝 seq 0。手工编辑的 `cursors/` 文件——那是账本里唯一原地写的目录——也能到达同一状态，但它并非必需。所以下限不是装饰：它隔开的是「一步之遥的游标」与「peer 复制后跑不了的行」。
    两条测试承载它，而分工正是要点。入站那条把四个名字写进一条读者已持有游标的信道，由钳位提供可达性；它钉住一条 `published but unreadable` 警告*存在*（不是每个被跳过的名字各警告一次）、上限的 `WARN` 与下限的 `WARN` 各自带自己的理由打印，以及——「没有读者跑不了的 ack 行」的锐利形态——输出里每一条 `RUN` 行都点名那条普通记录、别无其他，而 `cos ack` 对零退出 1。它的两条无门铃断言是弱的：读者自己的信道无论序号什么都不敲。出站那条才是测门铃的，而门铃在两个边界上都**对序号失明**：`lead->m1/0.json` 与 `lead->m1/9007199254740992.json` 各自过期后，各被重敲一次，交给 pane 的文本以 `… m1 0` 与 `… m1 9007199254740992` 结尾。接收者随后的 `poll` 看到什么因边界而异——*直到它持有该信道的游标为止*，而敲进全新 pane 的门铃到达时游标尚不存在：超上限的记录被它的 `poll` 打成 `NEW`、ack 行的位置是那条 `WARN`，而零记录**一行都不打**（`unreadInbound` 要求序号严格高于游标，而尚无文件时游标默认为 0）——所以那记门铃敲进了沉默，记录唯一的现形是 `reconcile` 的 `PENDING` 行，那行不点名任何命令。沉默属于缺失的游标，不属于序号：读者一旦持有那里的任何游标，钳位把它拉到 -1，它自己的 `poll` 就像对其他记录一样打印 `NEW lead 0` 与下限的 `WARN`——上文那条入站测试的读者有游标，所以确实看到了。无论哪种，记录保持未 ack。规则约束的是本程序*邀请*别人运行的东西，不是它敲的东西。
12. 一行打印出来的内容恰好是一行：控制字符在唯一的输出汇点被替换，所以任何文件或目录名都伪造不了一行。
13. 一次 herdr 调用由**退出状态**裁决，从不由 stdout 是否看起来有用裁决：退出 0 即成功，哪怕什么都没打印；非零即失败，哪怕打印了可解析的正文。`pane run` 成功时什么都不打印（2026-09-30 在活的 0.9.1 server 上实测：第一次活体编队的第一记门铃被一个把空 stdout 当失败的端口报了 `doorbell failed`，而那行其实已经敲进 pane），上游把状态作为全部裁决——server 错误是 stderr 上带退出码 1 的 JSON，语法错误退出 2。读 stdout 取字段，绝不读它取答案。两条推论，分处接缝两侧：`cos.mjs:75` 的端口拥有第一条，每个调用者拥有第二条。第一条：裁决是 `status 0` **且**解析出的 body 不点名 `error`——所以报失败的 body 不能因为退出码友好就被接受。第二条：调用者只能在已经按 `ok` 分支过的响应上读字段。有过一个没这么做的调用者：`selfPane` 直接从 `.result` 取 `pane get` 信封。它的 `$HERDR_PANE_ID` 分支现在走会检查的 `paneLives`；`--current` 回退本来就在行内按 `ok` 分支，所以那个 helper 是一个分支的守卫，不是整个函数的。有一条测试钉住：失败的 `pane get` 点名不了本 pane。

## Rejected framings

- *屏幕输出作为证据。* pane 的可见文本不是消费记录；herdr 渲染出的 pane 可能是 agent 已经划过去的内容。只有 `acks/` 作数。
- *把 `state_change_seq` 当投递证明。* `arronKler/herdr-dispatch` 那样用它；本设计没有测量就拒绝了同一个读法，因为它不必测量：上游 `herdr` 从未文档化该字段，而一个 pane 自己的回合结束就能推进的计数器，分不清「我的 prompt 跑了」和「它干了别的」。它只作为上面的否定信号幸存；就算这个读法也错了，阶梯的代价是多一次幂等重敲——绝不是丢记录或虚假的消费声明。
- *文件输出作为回退。* 上游 `herdr` 把写文件定位为 agent 间交换的最后手段。这里账本才是主媒介，因为需求是「活过一次中断」，而屏幕活不过。

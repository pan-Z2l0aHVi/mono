# ADR-0019: 执行体主动向 Manager 汇报

- **Date**: 2026-09-29
- **Status**: 已接受
- **Amends**: [ADR-0015](0015-role-contracts-in-herdr-agents-skill.md)、[ADR-0016](0016-implementation-supervision.md)、[ADR-0017](0017-orchestration-decoupled-from-task.md) 中关于「消息只在 Supervisor 与 Manager 之间互发」和「巡检只读编排单元」的部分
- **Relates to**: [ADR-0017](0017-orchestration-decoupled-from-task.md)

## 背景

ADR-0016 引入 Supervisor 时写下了「双方用 `agent prompt` 互发消息」，那是当时唯一成文的 agent→Manager 消息通道。但这条规则只写在 Supervisor 契约里：Coder 和 Reviewer 干完一个 turn 之后，Manager 只能靠轮询或 `agent wait` 才知道，实时性在多数实施会话上是零。实测的代价不是措辞问题：一次编排里 Manager 有 8 小时不知道某个 Reviewer 已经审完，因为没有任何一方有义务开口。

`herdr` 侧的机制事实决定了这条通道能走通、也决定了它的形状：

- `agent prompt` 的参数只有 `<TARGET> <TEXT>`，**没有来源字段**；`agent get` 返回的字段里也没有「最后一条消息来自谁」。
- 消息经 bracketed-paste 写进目标 agent 的输入框并提交，因此**发往 Manager 的消息在 Manager 会话里就是一条 user turn，与用户本人输入同形**。这是下面「固定前缀」那条硬要求的唯一来源。
- `--wait` 跟踪的是生命周期状态而非单个 turn，且 Claude 完成 turn 报 `done` 不报 `idle`，所以 `--until idle` 永远等不到；并行派发时用它会阻塞 Manager（见 ADR-0017 记录的 2026-09-18 教训）。实时性只能来自消息本身，不能来自更聪明的等待。

同时 [ADR-0017](0017-orchestration-decoupled-from-task.md) 把巡检的数据源换成了编排单元，而编排单元的 churn 盯的是 worktree。执行体把 review 报告、返工报告写进 `$TMPDIR/herdr-agents/reports/` 时，**worktree 一个字节没变，churn 恒定**——巡检完全看不见一份报告落地。原设计里「消息丢了靠巡检兜底」因此没有着落：巡检没有这条信号。

还有一处张力需要交代：上游 `herdr` skill 对「让 agent 写文件」的立场是「读不出来时的兜底，不要在初始 prompt 里就要文件输出」。[ADR-0017](0017-orchestration-decoupled-from-task.md) 的 B 组把 `$TMPDIR/herdr-agents/` 定成编排产物的固定落点，已经是「长产物一律落文件」；本 ADR 把「消息只给结论、详情在文件」提成常规路径。两者不冲突——herdr 说的是「别把文件当唯一出口」，本 ADR 说的是「别把文件内容搬进消息」——但这个区别必须写明，否则下一个人会按其中一条的措辞否掉另一条。

## 决策

### A 组：全员可发，Manager 绑固定名

所有执行体（Designer、Lib Coder、Biz Coder、Reviewer、Supervisor）完成一个 turn 或需要 Manager 决策时主动汇报，不等轮询。注入面——任何 agent 都能往 Manager 的输入框写字——由下面的「待验 claim」和「固定前缀」两条收口，不靠限制发送方来消除。

Manager 在编排开始时 `herdr agent rename <自己的 pane> manager`，handoff 写明汇报目标。名字绑定跟着 pane 走，Manager 换 pane 后失效，所以契约要求发送方**发之前先 `herdr agent list` 确认该名字仍在**；不在就按编排记录里的 coordination id 找回当前 Manager，并在汇报里说明这次没发到。

绑名有一个必须一起处理的副作用。`patrol.mjs` 过去靠「Manager 的 pane 没有名字」自然把它排除在 agent 列表之外——巡检由 Manager 在自己的 turn 里执行，把它算进 `running` 会让 `running >= 1` 恒成立，`NO_ACTIVE` 永不触发，而 `NO_ACTIVE` 的静默是硬要求。绑了 `manager` 之后这条自然排除失效，因此 `patrol.mjs` 改为按名字显式排除。`manager` 与 `[herdr-report]` 一样是协议常量：Manager 收不到汇报，发送方就得靠「不在就按 coordination id 找回」的兜底分支，而那个兜底只在发送方愿意先查一次列表时才有效。

### B 组：消息只给结论和路径

消息体是自由文本，但只承载结论和指向 `$TMPDIR/herdr-agents/reports/` 下报告文件的路径。证据、命令输出、diff 与代码片段留在文件里，Manager 按路径定点读。

这条边界**没有强制力**：超长消息不会被拦下也不会被截断。选它是因为机械的行数上限会把有效信息一起丢，而前缀与路径可验已经提供了可机检的那一半。执行靠 Role 自律。

### C 组：待验 claim，不是指令

汇报不改变 approve、commit、merge 或返工的判据。Manager 要动其中任何一件事都自己独立重跑验证。这与「不采信实施者自报」是同一条纪律，只是覆盖到消息通道。报告的通过与否同理：Reviewer 汇报 `pass` 不等于 Manager 可以直接批准。

### D 组：固定前缀 + 路径可验

消息以 `[herdr-report]` 开头，路径必须真实存在且落在 `reports/` 下。两者缺一即按异常上报，不当汇报处理。

这是 A 组那条注入面的唯一防线：既然汇报与用户输入同形，就需要一条可机械判别的标记。它不是安全边界——持有 `[herdr-report]` 的文本照样能伪装成任何东西——而是让 Manager 和操作者能把「这是某个 agent 写进来的」与「这是用户说的」分开认。

### E 组：巡检增加独立的报告信号

`patrol.mjs` 增加 `REPORTS` 段，取 `reports/` 下的 `.md`（manifest 是 `.json`、浏览器留档是 `.png`，两者各有各的通道），指纹是**文件名 + mtime**——只比文件名集合会漏掉「已存在但被改写」，而返工报告就地更新是最该被看到的一种变化。归属靠文件名里的 coordination slug 反查，认不出报 `unmatched`，不猜。

首行增加 `REPORTS_CHANGED`：报告有变化而 agent 状态与 churn 都没变时独占首行；两者同轮变化时走信号组并带上 `REPORTS_CHANGED=` 与同一份明细，报告信号不因撞车而丢失。`NO_ACTIVE` 的静默只在真的什么都没发生时保持。

`ALL_DONE` 同样带上明细，**这一条不是可选项**。收尾轮——最后一个单元标 `finished`、所有人转 `idle`——正是最终报告落地的那一轮，而 `ALL_DONE` 一打印调用方就停掉 loop；`patrol.mjs` 又在打印后无条件推进 state，所以漏在这里不是「晚一轮」，是永久丢失。首行语义保持 `ALL_DONE` 不变，明细跟在它后面。

这条让「消息丢了靠巡检兜底」第一次有着落：巡检发现的不是「消息」，而是「有报告落地但我没收到汇报」。

### F 组：文件名含 coordination slug

报告文件名必须含本轮 coordination id 的 slug（完整 id 带斜杠，进不了文件名）。这把 [ADR-0017](0017-orchestration-decoupled-from-task.md) 的「工作单元只出现在文件名里」从描述升为可机检的规则，E 组的反查才有依据。

归属取**最长**命中 slug，不取第一个：slug 互为前缀时（`focus-ring` 与 `focus-ring-tabs`）子串匹配会同时命中，而 `reports/` 是 per-user 跨仓共享的、skill 自己的命名法又容易造出前缀包含，按读目录顺序取第一个等于让归属随文件系统漂移，且错的值会写进基线一直错下去。

### 刻意保留的部分

- Supervisor 的三个检查点、`Observation Report` 模板、`clear` / `open` / `resolved` / `disputed` / `escalated` 状态机与 `Readiness` 字段一字未改，只对齐发往 Manager 那条消息的落笔口径。
- 上游 `herdr` skill 的前置检查、pane / tab / workspace 机制。执行体选择见 [ADR-0020](0020-role-executor-not-bound.md)。
- [ADR-0017](0017-orchestration-decoupled-from-task.md) 的编排元数据落点与编排单元枚举。

## 行为变化

- **执行体多了一条主动通道**。Reviewer 审完不再需要 Manager 轮询或 `agent wait`。
- **Manager 的输入框多了一个不可忽略的来源**。任何进来的 turn 都要先判断是用户还是 agent；带 `[herdr-report]` 且路径可验的才是汇报。同一条纪律也保护反方向——用户在会话里说的话可能是 agent 写进来的。
- **巡检 state 换格式，不再逐字段迁移**。`$TMPDIR/herdr-agents-monitor/state` 的版本号从 `v2` 升到 `v3` 并新增 `REPORTS` 段，沿用 ADR-0017 定的「版本不匹配就当没有基线，输出里显式给一行 `baseline:`」。升级后第一轮多一次信号轮，下一轮自愈。
- **报告文件名从此是可解析的**。不含 slug 的存量报告会被报成 `unmatched`；它们是噪音而不是错误，巡检不对它们做迁移。
- **消息只保证送达**。Manager 正在跑长命令时，汇报排队到这一轮结束。「实时」的边界是「下一轮开始就能看到」，不是「立刻打断」。

## 后果

- 编排的感知从「Manager 单方面轮询」变成「执行体主动 + 巡检兜底」两条独立通道，覆盖到 agent 在发消息之前就崩掉的情况。
- 报告从「产物」变成「可被巡检观测到的信号」，实施期观察的盲区（写在 `$TMPDIR`、worktree 无变化）被填上。
- 「消息是待验 claim」把不采信自报这条纪律从 workflow 延伸到了消息通道，两处不再需要分别解释。
- 契约写进了全部六个 Role 文件而不只是 SKILL.md：每个 agent 会话只加载自己的 Role 文件，契约不写在那里它就看不到。代价是同一份契约在六处有落笔，漂移风险由 review 兜。

## 替代方案

- **让消息只落在 pane 外的旁路文件，Manager 靠巡检读**：绕开了与用户输入同形的问题，但实时性归零，退回到本 ADR 要解决的状态；不采用。
- **用 `herdr notification show` 做 agent→Manager 通道**：那是给用户看的桌面通知（OSC9），不是 agent 通道，且归因到编辑器而不是 Manager 会话；不采用。
- **给消息加来源签名并让 Manager 密码学校验**：能真正关掉注入面，但 Manager 没有可验证的公钥分发路径，实际会退化成「签名算法自己实现的信任」；不采用。
- **只改文档不改巡检**：消息通道能实时，但「消息丢了」这一支仍无着落，本 ADR 的兜底承诺兑现不了；不采用。
- **把 Supervisor 的三检查点合成一条完成通知**：省一次打扰，但丢掉实施中途的观测窗口，而那正是 Supervisor 存在的理由；不采用。

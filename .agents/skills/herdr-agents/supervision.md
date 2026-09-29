# 实施期 Supervisor

拆分实施 task 后、首次派发 Coder 前读本文件打分，据此决定是否启用；启用后按它的检查点协议执行。产品/UI task 不启用，整份跳过。

## 启用判断

Manager 给每个维度打 0 到 2 分，把分数、建议和理由写进编排记录。5/8 是参考线，不是自动 gate：按任务实际上调下调都行，但要写明为什么。

| 维度 | 0 分 | 1 分 | 2 分 |
| --- | --- | --- | --- |
| 影响半径 | 单点局部 | 多个文件或一个 workspace | 跨 workspace、公共消费面或多个并行工作单元 |
| 契约与不可逆性 | 纯内部、可轻易回退 | 需兼容已有行为 | 公共契约、迁移、权限、数据或发布不可逆边界 |
| 方案不确定性 | 方案和实现路径稳定 | 有局部未知 | 目标、边界或方案需要持续核对 |
| 验证成本 | 单条快速命令 | 需要多个测试或构建 | 浏览器、跨层、集成或长回归验证 |

产品/UI task 不启用。跳过就写 `Supervisor skipped` 和原因，分数到 5/8 也一样；分数不到 5/8 却要启用，写覆盖理由。Supervisor 只在实施期间工作，不替代 task 的 review 或 approval。

## 启动与只读边界

Manager 在同一组实施 worktree 开一个 Supervisor pane，整个编排周期共用一个 coordination id。id 由 Manager 在编排开始时自由生成，形如主题 slug，不从 task id 派生：

```text
herdr-agents/<主题slug>
```

id 不随阶段变化。pane 名称和 pane id 只用于寻址，顶替不了 coordination id；coordination id 写在消息正文里。Manager 把 Coder 和 Supervisor 的 live agent 名称或 pane id 一并写进 handoff，双方用 `agent prompt` 互发消息。发往 Manager 的消息同时也是通用汇报通道的一部分，落笔口径见 [`SKILL.md`](./SKILL.md) 的「汇报」一节——那一节适用于所有 Role，本文件不重复，只在检查点协议之外没有额外要求。参与者、启用理由、检查点结论和未决事项记进 `$TMPDIR/herdr-agents/reports/` 下的编排记录，格式见 [`SKILL.md`](./SKILL.md) 的「巡检」一节。

Supervisor 默认只读，可以做这些事：

- 读源码、测试、文档、Task Packet 和 task status。
- 读 tracked diff、untracked 文件清单和 diff 内容。
- 用 Herdr 读 Coder pane 的 `agent read`、状态和 `agent wait` 结果。
- 用 Herdr `agent prompt` 发观察报告和纠错消息，这个工具只传递消息，不写文件也不改代码。
- 跑只读 repo 查询，命令名以 [`docs/agents/commands.md`](../../../docs/agents/commands.md) 索引为准。

反过来的边界：Supervisor 不写文件、不编辑源码、不改 task state 和 Git 历史，不提交、不合并、不清理、不装依赖。测试和构建由 Manager 在自己的 pane 跑，Supervisor 只读结果，自己不触发可能写文件的命令。

## 检查点与报告

Manager 派发时把三个检查点写进 Coder handoff。每个检查点都要发报告，没问题也发 `clear`。

1. **首次写入前。** 确认实施方案、目录边界、task 合同和验证计划没有偏离要求。
2. **第一个可验证的实现切片完成后。** 确认这条路径能跑通，或者已有测试覆盖；错误处理、契约和验证证据要足以支撑后续实施。
3. **Coder 最终交付前。** 确认 diff、验证结果、范围、残余风险和 handoff 齐全，阻断问题已处理。

报告格式：

```text
Observation Report
Coordination: herdr-agents/<主题slug>
Checkpoint: before-first-write | first-verifiable-slice | before-final-delivery
Status: clear | open | resolved | disputed | escalated
Findings: <按严重程度列出问题；无问题写 none>
Evidence: <文件、行号、diff 或命令输出；编排有 task 时可附 task status>
Required action: <Coder 或 Manager 的下一动作；clear 写 none>
Readiness: Ready | Not ready
```

状态含义：

- `clear`：这个检查点没有要处理的问题。
- `open`：发现可修复的偏离或缺陷，等 Coder 改。
- `resolved`：Coder 已改，并给出 diff 或验证证据。
- `disputed`：Coder 认为报告不成立，交 Manager 裁决。
- `escalated`：需要 Manager 决策、拆 task 或换方案。

Coder 到检查点时用 Herdr `agent prompt` 分别通知 Supervisor 和 Manager，消息带 Manager 在编排开始时生成的那个 coordination id；发往 Manager 的那条按 [`SKILL.md`](./SKILL.md) 的「汇报」一节加 `[herdr-report]` 前缀并带 `reports/` 下的报告路径，检查点本身的内容、状态和时机不因这条要求改变。Supervisor 把纠错消息发给 Coder，把检查点报告和裁决结果发给 Manager。双方分工是：Supervisor 指出问题，Coder 修复并给出证据，Supervisor 重新核对后把 `open` 改成 `resolved`，有争议转 `disputed`。结束前必须填 `Readiness`，启用时最终报告应为 `Ready`。

Reviewer 不接收 Supervisor 报告，只读冻结 diff、Task Packet 的任务主合同和验证证据。Reviewer 退回后，Manager 复用原来的 Supervisor 会话和编排记录里那个 coordination id，先让 Supervisor 按更新后的 handoff 重新核对整个 diff，再重跑修复后仍需执行的检查点。旧报告不代表新 diff 的结论。

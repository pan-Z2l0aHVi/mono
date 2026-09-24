# ADR-0016: 实施期 Supervisor

- **Date**: 2026-09-24
- **Status**: 已接受
- **Amends**: [ADR-0010](0010-agent-role-orchestration.md)、[ADR-0014](0014-task-system-v2.md)、[ADR-0015](0015-role-contracts-in-herdr-agents-skill.md)

## 背景

现在的 herdr 流程通常等 Coder 做完后，Reviewer 才介入。复杂或影响面较大的任务可能在此之前就偏离方案、写错目录、漏掉契约，或者没有留下足够的验证证据。等到实施末尾才发现这些问题，返工会集中出现。

给每个任务都配一个观察者，会增加会话和等待成本。让观察者直接改代码，又会产生两个写入者，模糊 Coder 的 owner 责任。因此 Supervisor 按需启用，只读检查实施过程并向 Manager 报告。它不新增 task 状态，也不替代最终 Reviewer。

## 决策

### 1. 何时启用

新增 `supervisor` Role。每个实施 task 最多一个 Supervisor。产品/UI task 不启用，这类任务交给 Designer 和真实浏览器验证处理。

Manager 在拆分实施 task 后、首次派发 Coder 前评分。四个维度各按 0 到 2 分记录：影响半径、契约与不可逆性、方案不确定性、验证成本。5/8 是参考线，不是自动 gate。Manager 可以根据任务实际情况调整，并在 Task Packet 记录分数、建议，以及覆盖或跳过的理由。

### 2. 工作方式与权限

Supervisor 与 Coder 共享该实施 task 的 worktree，但不是该 worktree 的 owner。Supervisor 默认使用 Claude Code，启动权限与其他 Role 相同。启动参数只决定怎么启动，不改变它的只读边界。

Supervisor 可以读取源码、测试、文档、Task Packet、task status、tracked diff、未跟踪文件清单、Coder pane 状态和只读 repo 查询结果。它通过 Herdr `agent prompt` 发送报告与纠错消息。这个工具只传递文字，不会写文件或改代码。Manager 把 Coder 和 Supervisor 的 live agent 名称或 pane id 写进 handoff，方便双方发送消息。固定的 coordination id 只放在消息正文中，不充当 pane id。

Supervisor 不编辑文件、不修改 task state、不改写 Git，也不提交、合并、发布、清理生成物或安装依赖。它不运行可能写入工作区的测试或构建。这类命令由 Manager 在自己的 pane 中运行，Supervisor 只读取结果。Supervisor 通过 pane 事件、Coder 通知和三个检查点了解实施进度，不运行 watcher、常驻服务或后台写任务。Herdr 启动参数不会自动把会话限制为只读，Manager 通过 handoff 写清范围，并在检查点核对 diff 与 task status。

### 3. 检查点与报告

Manager 在 Coder handoff 中固定三个检查点：

1. 首次写入前：核对实施方案、目录边界、任务合同和验证计划。
2. 第一个可验证的实现切片完成后：核对实现路径已经可以运行，或已有测试覆盖。错误处理、契约和验证证据也要足以支持后续实施。
3. Coder 最终交付前：核对 diff、验证结果、范围、残余风险和 handoff 是否齐全。

每个检查点都要发报告，即使没有问题也要发 `clear`。报告状态只能是 `clear`、`open`、`resolved`、`disputed` 或 `escalated`，并包含具体证据和下一动作。

Manager 为该 task 使用固定的 coordination id `herdr-agents/<task-id>`。pane id 只用于通信，不能替代 coordination id。Coder 负责修复 `open` 项并回传 diff 或验证证据。Supervisor 只负责指出问题和核对证据。有争议时转 `disputed`，由 Manager 裁决。最终报告必须写明 `Readiness: Ready | Not ready`。启用 Supervisor 时，最终报告应为 `Ready`。

### 4. 与最终 review 隔离

Supervisor 报告是实施期的纠错信号，不是 review 或 approval 证据。Reviewer 不接收 Supervisor 报告，只审查冻结 diff、Task Packet 的任务主合同和验证证据。

Reviewer 退回后，Manager 复用原来的 Supervisor 会话和 coordination id。Supervisor 先按更新后的 handoff 重新核对整个 diff，再重跑修复后仍需执行的检查点。旧报告不能代表新 diff 的结论。

Supervisor 不可用或运行失败，不会改变 task state 的 phase，也不会绕过 workflow 的 review、approval 或验证 gate。Manager 记录例外，并决定继续、缩小监督范围或终止该 task。

### 5. 不写入 task state

Supervisor、Role 和 coordination 属于 herdr 编排事实，不属于 task 内核事实。`scripts/task.mjs` 不写入顶层 `roles`，`pnpm task assign --roles` 明确失败。旧 v1 state 中的 `roles` 和历史 `assign.roles` 仍可读取，但 task 内核不解释、不迁移，也不重写它们。

Task Packet 继续保存任务主合同，并提供可选的 Coordination 摘要，供会话重启后恢复参与者、检查点结论和未决事项。摘要不替代 task state、冻结 diff 或验证记录。task state schema 版本保持不变。

### 6. 文档归属

Role 列表、默认执行体绑定、启动参数、目录边界、handoff 格式、Supervisor 协议、coordination id 和 pane 时序见 [`.agents/skills/herdr-agents/SKILL.md`](../../.agents/skills/herdr-agents/SKILL.md)。Role 文档只描述各自职责。task 级别、状态机、快照、review、approval 和验证见 [`docs/agents/workflow.md`](../agents/workflow.md) 与 [`scripts/task.mjs`](../../scripts/task.mjs)。`scripts/validate-context.mjs` 只检查通用 context、Role Contract 身份和客户端注册形态，不维护绑定表、固定 Role 集合或 handoff 字段的镜像。

## 后果

- 复杂实施任务在最终 review 前多一次检查，方案偏移通常能更早暴露。
- 简单任务不承担额外会话成本；产品/UI 任务继续依赖 Designer、浏览器验证和既有 review 路径。
- Supervisor 报告需要 Manager 和 Coder 处理，但没有机器状态 gate；Manager 仍对交付负责。
- task state 只保留 task-level 证据，Role 和 coordination 的恢复信息放在 skill 与 Task Packet 摘要中。
- 同一项决定分散在 skill、Role Contract、workflow、Task Packet 和 ADR 中，以后改动仍要同步这些文件。

## 替代方案

- **所有 Coder 都配一个 Supervisor**：覆盖最完整，但会给简单任务增加固定成本和等待，不采用。
- **让 Supervisor 直接修复代码**：少一轮来回沟通，但会产生双写、owner 不清和 review 输入污染，不采用。
- **把 Supervisor 写入 task state 或做成 watcher 服务**：便于机器追踪，但会把临时编排细节固化进核心 schema，并引入常驻进程和清理责任，不采用。
- **用 Supervisor 取代最终 Reviewer**：能提前发现问题，但无法替代冻结 diff、独立身份和 approval 证据链，不采用。

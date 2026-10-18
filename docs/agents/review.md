# Review 与 Approval 拓扑

本文件承担收口环节的**判据**：冻结之后谁有资格审、审什么、批准需要谁签。状态机的相位顺序与转换条件归 `workflow.md`；级别判据归 `task-levels.md`；提交边界的判定口径与 hook 绕过禁令归 [`commit.md`](commit.md)。本文件不复述相位表。

## 独立性要求

- **T0**：必须 review。要求是一条不变量：reviewer 独立于实施者，不参与实施，也不接收实施者的叙述，只审冻结 diff、任务主合同与证据。用哪个执行体提供这份独立性不构成 gate——编排层另起的独立线程、owner 自己派的 fresh subagent、独立会话，都算数；换执行体时按 skill 记录理由。
- **T1**：必须 review，独立性要求与 T0 相同。
- **T2**：不用 review，这一档没有 review 相位。
- **任何级别禁止同一执行体自审**：实施者复核自己的 diff 不构成 review。这条由文档与角色纪律承担，不由内核强制。残余风险：reviewer 与实施者同模型、同源上下文时可能共享盲点，内核查不出来。

## 身份形状

owner、reviewer、approver、drop 署名人共用 id 形状 `^[A-Za-z0-9][A-Za-z0-9._-]{3,39}$`（如 `claude-code-reviewer-45a5b9eb`）。owner 由登录名兜底时不受该形状约束。

内核强制的「互不相等」约束只剩一条：**approver 不能等于本轮 reviewer**。reviewer 和 approver 都不要求换掉 owner 身份，所以单 agent 工作流的最小合法身份组合是 **owner 实施 + subagent review + owner approve**。

派 subagent 当 reviewer 时，不要把实施过程的叙述喂给它——它只该拿到 task id、级别、冻结 hash、Task Packet 与 diff 位置。理由不是礼貌：上面那条独立性要求规定 reviewer 只审冻结 diff、主合同与证据，收到叙述的 reviewer 已经在用实施者的框架看自己的盲区。

## 命令

```sh
pnpm agent:task review  --task <task-id> --result pass --reviewer <reviewer-id>
pnpm agent:task approve --task <task-id> --approver <approver-id>
```

`review` 的 `--result` 是强制的，取 `pass` 或 `fail`，省略等于让内核替你宣布通过——这正是它最容易被误用成留痕工具的地方。`fail` 使 task 回到 `active`；`approve` 不接受 `--result`，它只有「批准」这一种动作，但同样绑定当轮的 `diffHash`。

## 审查报告怎么写

先列具体发现，再按 `Block`、`Should fix`、`Nit` 排序，每条带文件和行号；没有缺陷时也要说明残余风险。检查项包括公共行为与向后兼容性、边界与失败情况、类型与错误处理、竞态或资源泄漏、用户输入安全风险和文档变更。重构要对照变更前后的行为清单。reviewer 报告、实施者叙述和聊天记录都不能替代冻结 diff 或验证证据。

每条 finding 都要独立核实过再落笔：涉及「历史上是否曾经如此」这类事实性断言时，用 `git log --all -S`、`git show <rev>:<path>` 一类命令自己验，不要采信实施者的叙述——ADR 是永久的 why 记录，写进去的假因果会被每个后来人当成事实。

## 测试验收

测试验收是流程收尾的功能验证环节，以测试工程师的视角独立执行功能层验证，例如真机操作、浏览器交互或压测，证据记在 `pnpm agent:task verify --kind acceptance` 上。它不改状态机相位：验证是证据记录而非相位（[ADR-0014](../adr/0014-task-system-v2.md)）。

`test` 与 `acceptance` 的分工是实施阶段自证对照脱离实施叙述的独立验收，后者关注实际功能、浏览器行为与边界情况。默认 `--kind test` 让绝大多数调用不必写它，只有 T0 需要额外补一条 acceptance。浏览器证据按 [`runtime-verification.md`](runtime-verification.md) 采集；改动该跑哪些验证的判据见 [`verification.md`](verification.md)。

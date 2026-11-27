# ADR-0010: 仓库指令保持编排无关（Harness-agnostic）

- **Date**: 2026-10-03
- **Revised**: 2026-11-21，仓库指令面移除对外部编排层的预设，保持编排无关（harness-agnostic）；2026-11-27，随 [ADR-0026](./0026-lean-agent-context-for-frontier-models.md) 退役 `task-ledger` skill，仅保留 worktree 隔离与验证不变量。
- **Status**: 已接受

## 背景

需求拆分、并行度、worktree 分配和跟进取决于具体的客户端、agent harness 与会话拓扑（单 agent 自治或多 agent 协作）。在仓库文档内预设外部编排层，会把特定调度器的生命周期与角色拓扑耦合进项目指令，妨碍不同工作流接入。

## 决策

仓库指令保持编排无关（harness-agnostic）。仓库只定义代码质量、task 归属、worktree 隔离、验证、review 与交付的不变量，不绑定任何编排层或会话拓扑。task 分级依据改动的影响（原 `task-ledger` skill 已随 [ADR-0026](./0026-lean-agent-context-for-frontier-models.md) 退役）。

一个可变 task 对应一个实施 worktree 和 owner。review 与验收要求由仓库 review 流程定义，不限定执行体形态。

## 后果

- 任何 agent harness、单 agent 或多 agent 拓扑只需遵守仓库边界与验证门禁即可直接工作，指令面不携带调度状态或角色协议。
- 本地台账只记录归属和进度，不代替 review、测试或 CI 证据。

## 替代方案

在仓库内规定编排层职责、拆分规则或角色拓扑，会使项目指令与特定调度方式绑死，降低跨环境通用性，因此不采用。

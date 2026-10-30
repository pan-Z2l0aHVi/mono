# ADR-0014: 按执行面组织脚本

- **Date**: 2026-10-19
- **Status**: 已接受

## 背景

仓库脚本服务于提交检查、CI、发布和维护。检查集合若由各调用方分别维护，新增或修改检查时容易遗漏。

## 决策

根 `scripts/` 按执行面组织：`checks/` 提供门禁薄入口，`policies/` 承载与本仓事实绑定的检查实现，跨仓可复用的实现收在 workspace 包 `@greypan/monorepo-kit`，`workflow/` 与 `maintenance/` 分别承载提交发布与维护操作，`lib/` 只放 Node 启动前求值的 bootstrap helper。pre-commit 与 CI 各有入口并复用原子检查；两者的检查集合可不同，实际集合以入口实现为准。

检查只读取状态并在失败时返回非零，不在检查阶段修复文件。检查门禁使用 Node ESM；其他脚本按复杂度选择 POSIX `sh` 或 Node。目录布局、语言选择和调用方法以 [script-policy.md](../agents/script-policy.md) 为准。

## 后果

- 调用方不必复制原子检查的实现；新增检查仍需选择对应执行面并更新入口。
- CI 不依赖 agent 专属目录或 task 台账。
- 入口与实际 workflow 必须同步，测试负责检查适用的拓扑不变量。

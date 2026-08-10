---
name: contract-change-review
description: 审查公共 API、导出、事件、类型适配和跨包运行时契约的影响面。用于公共行为或跨包变更；不用于单包内部实现。
---

# Contract Change Review

## 流程

1. 从 diff 定位导出、属性、事件、类型、workspace 引用和运行时边界。
2. 读取受影响包的 `AGENTS.md`、README、manifest、测试和相关 ADR；只在跨包或架构问题上加载 `CONTEXT.md`。
3. 搜索 React、Vue、Wails demo 及其他消费者，确认适配面和兼容风险。
4. 检查测试是否通过公共 API 验证行为，必要时要求根 `pnpm test` 或 `pnpm build`。
5. 输出影响面、必须同步的资料、验证命令和未覆盖的消费者；发现风险时先提出方案，不擅自扩大范围。

## 完成定义

- 每个受影响公共表面都有明确的兼容结论；
- 导出、类型、README 和测试的同步状态可追溯；
- 跨包变更有根级验证结果，或明确记录无法执行的原因。

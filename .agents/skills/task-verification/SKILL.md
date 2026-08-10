---
name: task-verification
description: 根据变更契约选择最小充分的测试、构建和浏览器验证，并生成交付证据。用于实现完成、代码审查和发布前检查。
---

# Task Verification

## 选择验证层级

- 局部行为：运行受影响包的聚焦测试。
- 跨包导出、引用或运行时契约：运行根 `pnpm test`。
- 构建配置、发布产物或导出：运行根 `pnpm build`。
- 浏览器原生行为：运行相关 browser-mode 测试，并按需读取 [`browser-verification.md`](../../../docs/agents/browser-verification.md)。
- UI/UX/交互/响应式：在真实浏览器中验证主要路径、键盘焦点、console、network 和移动/桌面视口。

## 流程

1. 从 diff 识别受影响契约和风险；不要无理由运行全量命令。
2. 先运行最快的聚焦验证，再按跨包或发布风险升级到根测试/构建。
3. 记录准确命令、结果、浏览器 URL/操作和未验证缺口。
4. 失败时保留失败输出并区分环境问题、现有失败和本次回归；不要用删除测试或跳过检查代替修复。

# 领域文档

工程技能在探索代码库时，应如何使用本仓库的领域文档。根 `CONTEXT.md` 是 repository-level project context：它可以同时记录 domain vocabulary、repository architecture context 和 ADR 索引；实现细节仍应留在源码、manifest、配置、测试或按需 task guide 中。

## 第三方 `domain-modeling` skill 集成

`.agents/skills/domain-modeling/` 是保持上游原文的第三方 skill；其通用 `CONTEXT.md` 流程不能改变本仓库根 `CONTEXT.md` 的内容边界或既有结构。调用该 skill 时，本指南、[`context.md`](./context.md) 和 ADR-0012 是本仓库的权威约束：保留 repository architecture context、包边界、依赖方向和 ADR 索引，只在相应章节维护领域词汇或记录已解决的架构决策。

上游 skill 中与本仓库 context 架构不兼容的通用表述不得据此删除或重构既有 project context；仅将实现细节保留在源码、manifest、配置、测试、task guide 或 ADR 中。出现冲突时，遵循本仓库规则而不修改第三方 skill。

## 按需探索

先从任务目标、受影响目录和最近的 `AGENTS.md` 确定范围。只有在架构、跨包依赖、术语或长期取舍会影响当前决策时，才加载以下 context：

- **`CONTEXT.md`**（位于仓库根目录），或者
- **`CONTEXT-MAP.md`**（位于仓库根目录，如果存在）——它指向每个 context 对应的 `CONTEXT.md`。只阅读当前主题命中的 context。
- **`docs/adr/`** ——只读取与当前选择相关的 ADR；在多 context 仓库中，再检查 `src/<context>/docs/adr/` 内的 context 范围决策。不要为简单的局部实现预先扫描全部 ADR。

如果以上文件不存在，**静默继续即可**。不要标记它们的缺失；不要建议提前创建。`/domain-modeling` 技能（包括通过 `/grill-with-docs` 调用时）会在术语或决策实际确定时懒创建这些文件。

## 文件结构

单 context 仓库（大多数仓库）：

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

多 context 仓库（根目录存在 `CONTEXT-MAP.md`）：

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← 系统级决策
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← context 专属决策
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## 使用权威术语

当你的输出中需要命名一个领域概念（在 issue 标题、重构提案、假设、测试名称中），使用当前任务已加载的 context 中定义的术语：跨包概念见 `CONTEXT.md`；`web-ui` 的架构和交互术语以对应 ADR 为准，`docs/agents/web-ui.md` 只负责路由；其他领域以各自 `CONTEXT.md` 或 task guide 为准。不要偏离文档明确避免的同义词。

如果你需要的概念还不在权威 context 中，这是一个信号——要么你在发明项目未使用的语言（请重新考虑），要么确实存在空白（记下来供 `/domain-modeling` 使用）。

## 标记 ADR 冲突

如果你的输出与现有 ADR 矛盾，请明确指出，而不是静默覆盖：

> _与 ADR-0007（事件溯源订单）矛盾——但值得重新讨论，因为……_

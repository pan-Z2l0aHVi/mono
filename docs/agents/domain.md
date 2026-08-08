# 领域文档

工程技能在探索代码库时，应如何使用本仓库的领域文档。

## 探索前先阅读以下内容

- **`CONTEXT.md`**（位于仓库根目录），或者
- **`CONTEXT-MAP.md`**（位于仓库根目录，如果存在）——它指向每个 context 对应的 `CONTEXT.md`。阅读与当前主题相关的每一个。
- **`docs/adr/`** ——阅读与你即将工作的领域相关的 ADR。在多 context 仓库中，还需检查 `src/<context>/docs/adr/` 中 context 范围内的决策记录。

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

## 使用术语表中的词汇

当你的输出中需要命名一个领域概念（在 issue 标题、重构提案、假设、测试名称中），请使用 `CONTEXT.md` 中定义的术语。不要偏离术语表明确避免的同义词。

如果你需要的概念还不在术语表中，这是一个信号——要么你在发明项目未使用的语言（请重新考虑），要么确实存在空白（记下来供 `/domain-modeling` 使用）。

## 标记 ADR 冲突

如果你的输出与现有 ADR 矛盾，请明确指出，而不是静默覆盖：

> _与 ADR-0007（事件溯源订单）矛盾——但值得重新讨论，因为……_

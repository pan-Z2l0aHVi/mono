# Skills 索引与分工

本页是 `.agents/skills/` 的路由说明，不是 skill；单个 skill 的触发入口以各自 `SKILL.md` 的 frontmatter `description` 为准。当多个 skill 的主题重叠时，以本页分工为准。

## 语言约定

- 仓库自编写 skill（`audit-instructions`、`contract-change-review`）使用中文。
- 第三方引入的 skill 保持上游英文原文，不翻译、不本地改写；其通用流程与本仓库规则、task guide 或实现事实冲突时，以后者为准。

## 主题重叠的分工

### 架构与代码质量

| Skill                          | 职责                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| `improve-codebase-architecture` | 评估工作流：对既有代码产出架构评估（HTML 报告），回答“现在哪里值得改”                       |
| `codebase-design`               | 设计词汇：实施前用深度模块、接口与 seam 词汇做设计决策（含 DESIGN-IT-TWICE、DEEPENING 参考） |
| `code-simplification`           | 清理工作流：行为不变的简化重构；找 bug 不归它，找 bug 用内置 code-review                    |

三者分别对应「评估 → 设计 → 清理」，不要同时全文加载。

### Context 与 instruction system

| Skill                | 职责                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `audit-instructions` | 仓库权威：审计本仓 instruction system 的加载路径、权威来源与验证缺口，绑定 `validate:context` |
| `context-engineering` | 第三方通用方法参考：何时优化 context、如何组织规则；与本仓规则冲突时以仓库侧为准            |

仓库侧约束（`docs/agents/context.md`、`AGENTS.md`）永远优先；`context-engineering` 只作方法参考加载。

### UI 实现与设计品味

| Skill                     | 职责                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `frontend-ui-engineering` | 实现工作流：生产化 UI 的结构、状态与可访问性实践                                           |
| `emil-design-eng`         | 品味参考：交互细节与动效判断（见上文动画分工表）                                           |
| `apple-design`            | 平台语义：手势、物理动效与系统设计原则                                                     |

交互动画知识在三个第三方 skill 中均有覆盖，按需求选其一加载，避免同时全文加载：

| Skill               | 职责                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| `emil-design-eng`   | 知识库：动效原则、参数与反模式参考。其 description 无 "Use when" 触发场景，需在设计/动画任务中主动加载 |
| `review-animations` | 审查输出：对动画代码按固定的 Before/After 格式产出审查结论（手动触发）                                 |
| `apple-design`      | 手势与物理动效：弹簧、拖拽、动量、可中断过渡等平台语义                                                 |

# Skills 索引与分工

本页是 `.agents/skills/` 的路由说明，不是 skill；单个 skill 的触发入口以各自 `SKILL.md` 的 frontmatter `description` 为准。当多个 skill 的主题重叠时，以本页分工为准。

## 语言约定

- 仓库自编写 skill（`audit-instructions`、`contract-change-review`）使用中文。
- 第三方引入的 skill 保持上游英文原文，不翻译、不本地改写；其通用流程与本仓库规则、task guide 或实现事实冲突时，以后者为准。

## 主题重叠的分工

交互动画知识在三个第三方 skill 中均有覆盖，按需求选其一加载，避免同时全文加载：

| Skill               | 职责                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| `emil-design-eng`   | 知识库：动效原则、参数与反模式参考。其 description 无 "Use when" 触发场景，需在设计/动画任务中主动加载 |
| `review-animations` | 审查输出：对动画代码按固定的 Before/After 格式产出审查结论（手动触发）                                 |
| `apple-design`      | 手势与物理动效：弹簧、拖拽、动量、可中断过渡等平台语义                                                 |

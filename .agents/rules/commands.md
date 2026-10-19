# 根命令面约束

命名形状、namespace 归属与机检说明以 [`docs/agents/commands.md`](../../docs/agents/commands.md) 为准；完整命令面以根 `package.json` 为准；契约查询工具的参数以 contract-change-review skill 的 SKILL.md 为准。本文件只写 commands.md 没有的约束。

- 不为单一需求新增根命令。能力属于某个包就放进那个包的 `package.json`；根命令只留给跨 workspace 编排、仓库自检、提交和发布边界、agent 工作流。
- 机检不覆盖不带 namespace 的裸单词引用，它和工具子命令、散文用词无法区分；这类陈旧引用靠 review 发现。

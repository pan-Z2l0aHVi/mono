# 根命令面约束

命名形状、namespace 归属、全量索引和机检说明都以 [`docs/agents/commands.md`](../../docs/agents/commands.md) 为准；查询工具的语义与参数以 [`docs/agents/agent-context.md`](../../docs/agents/agent-context.md) 为准。本文件只写 commands.md 没有的约束。

- 不为单一需求新增根命令。能力属于某个包就放进那个包的 `package.json`；根命令只留给跨 workspace 编排、仓库自检、提交和发布边界、agent 工作流。
- 增删或改名根命令时，名称形状和文档引用要在同一次变更里一起通过机检。两条守卫各自判什么，见 [`commands.md`](../../docs/agents/commands.md#机检)。
- 机检有一个盲区：不带 namespace 的裸单词写法不在文档引用的存在性检查范围内，它和 pnpm 自身的子命令、散文用词无法区分。这类陈旧引用只能靠 review 发现，实现见 [`scripts/validate-context.mjs`](../../scripts/validate-context.mjs)。

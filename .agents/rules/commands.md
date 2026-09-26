# 根命令面约束

本文件只保留不能从 `package.json` 本身读出的命名判断。完整命令索引、受众划分与约定理由见 [`docs/agents/commands.md`](../../docs/agents/commands.md)；查询工具的语义与参数以 [`docs/agents/context.md`](../../docs/agents/context.md) 为准，本文件不复述。

- 形状是 `{namespace}:{do}-{something}`：动宾之间用 `-`，没有宾语时省略（`ci:measure` 而不是 `ci:measure-something`）。namespace 取值是闭集 `agent` / `ci` / `dev`；无 namespace 也是合法形状，基础命令（`build`、`test`、`clean`）属于这一类。
- namespace 按**主要拥有方**划分，不按调用时机：`agent` 是 agent 自己的工作流（task、影响面查询、取证），`ci` 是 CI 与仓库自检会跑的那套（context 校验、脚本测试、成本统计），`dev` 是本地起服务。
- 判断放哪个 namespace 时问「谁最先因它失效」：改了会先打断 agent 自己的流程就是 `agent`，先让流水线变红就是 `ci`。
- 不要为单一需求新增根命令。能力属于某个包就放那个包的 `package.json`；只有跨 workspace 编排、提交边界或 agent 工作流才配根命令。
- 两条机检守着这个面：形状由 `scripts/command-conventions.test.mjs`（`ci:test-scripts` 的执行端）判定，文档里写到的根命令是否存在由 `ci:validate-context` 判定。改名的同一变更里必须让两者都过。
- 已知的机检盲区：没有 namespace 的裸单词形态不在存在性检查的覆盖内，因为无法与 pnpm 自身的子命令和散文用词区分。陈旧引用由 review 兜底。

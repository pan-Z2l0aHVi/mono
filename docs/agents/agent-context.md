# Agent Context 架构

本文件规定如何维护本仓的 agent context（instruction system）：层级、权威归属、客户端适配与新增门槛。它只管「context 自己怎么改」；工程原则、Task/PR 流程词汇与 ADR 索引以 [`CONTEXT.md`](../../CONTEXT.md) 为准，领域词汇以拥有该领域的包或应用级 `AGENTS.md` 为准，仓库拓扑以 [`ARCHITECTURE.md`](../../ARCHITECTURE.md) 为准，任务该读什么以根 [`AGENTS.md`](../../AGENTS.md) 的 task routing 为准。

## Context 层级

| 层级               | 权威来源                                                         | 何时加载                      | 内容边界                                 |
| ------------------ | ---------------------------------------------------------------- | ----------------------------- | ---------------------------------------- |
| Always available   | 根 [`AGENTS.md`](../../AGENTS.md)                                | 每次任务                      | 项目身份、不可绕过边界、任务路由         |
| Repository map     | 根 [`ARCHITECTURE.md`](../../ARCHITECTURE.md)                    | 需要全局拓扑或 workspace 定位 | 稳定目录地图、包角色与边界、依赖草图     |
| Project context    | [`CONTEXT.md`](../../CONTEXT.md)                                 | 架构、跨包、术语、长期设计    | 跨包工程原则、Task/PR 词汇、ADR 索引     |
| Task-specific      | `docs/agents/*.md`、`.agents/rules/*.md`、最近的包级 `AGENTS.md` | 任务命中对应领域              | 可执行流程、质量门槛、局部约束、领域词汇 |
| On-demand evidence | ADR、README、manifest、配置、源码、测试                          | 已确认受影响区域后            | 历史取舍、公共契约、当前实现             |

不要为「可能有用」批量加载文档。规则只保留无法由代码、类型、测试或工具配置可靠推导的约束；可自动验证的约束优先交给相应工具。

`docs/design/**` 不在上述层级内：它是设计资产与草图。参考材料不是权威来源，不随实现同步，也不进指令面（不参与路由、链接方向与根命令检查）；但必须有非权威标记。链接是唯一的例外：断链与节锚点按下方「语料门禁」全仓检查，参考材料同样不许留死链——历史结论可以旧，点开的 target 必须存在。引用时只作背景，结论仍要落到 ADR、组件文档或源码。

时点性研究记录与方案草稿不入库：按任务写在系统临时目录或任务工作区，用完即弃（`docs/research/` 在 `.gitignore` 里）。结论有长期价值时，把它写进 ADR 或组件文档，而不是保留原稿。

## 重复主题的权威来源

不同层级可以为路由短暂提及同一主题，但只能有一个流程权威来源；其他位置只说明何时加载或链接到它，不复制完整处方。`docs/agents/` 内部按 concern 切分，同一个 concern 只由一篇拥有；跨切面概念下沉为独立文档。下表列出与根/包级边界交叉的主题。

| 主题                         | 规则边界                                                                        | 流程权威来源                                                                                     | 证据类别                                       |
| ---------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| 生成物                       | 根/包级 `AGENTS.md` 只指向清单，不复制路径                                      | [`generated-artifacts.md`](./generated-artifacts.md)                                             | generator diff、构建、消费者类型检查           |
| 自动与人工审查的范围差       | 根/包级 `AGENTS.md` 只声明两者读的 diff 不同，不复制范围与排除清单              | [`review.md`](./review.md)                                                                       | `review-scope.json`、PR 结论评论               |
| 真实浏览器取证               | 根/包级 `AGENTS.md` 仅声明需要浏览器层                                          | [`runtime-verification.md`](./runtime-verification.md)                                           | 浏览器用例、冒烟与浏览器操作记录               |
| 浏览器进程与 profile         | 根/包级 `AGENTS.md` 只路由，不复制归属流程                                      | [`browser-resources.md`](./browser-resources.md)                                                 | 启动记录、profile 查询、回收结果               |
| 该跑哪些验证                 | 根/包级 `AGENTS.md` 只路由，不复制选择矩阵                                      | [`verification.md`](./verification.md)                                                           | 相关测试与聚焦构建                             |
| 影响面与契约查询             | 根入口不提供查询命令；工具接口见 monorepo-change-impact skill                   | monorepo-change-impact skill 的 SKILL.md                                                         | 契约查询脚本与其测试                           |
| 任务级别与准入               | 根 [`AGENTS.md`](../../AGENTS.md)「变更准入与登记」只给判定入口，不复制级别表   | task-ledger skill 的 SKILL.md                                                                    | 登记 CLI 的级别校验                            |
| 本地 task 台账与 Task Packet | 根 [`AGENTS.md`](../../AGENTS.md) 只路由，不复制 schema、命令或恢复处方         | task-ledger skill 的 SKILL.md                                                                    | 记录 fixture 与 status 查询                    |
| 预授权操作                   | 根 [`AGENTS.md`](../../AGENTS.md) 只列被允许与需授权的类别                      | [`workflow.md`](./workflow.md)（授权边界）与 request-authorization skill 的 SKILL.md（弹窗形状） | 四项说明与用户选择记录                         |
| 提交边界与署名               | 根 [`AGENTS.md`](../../AGENTS.md) 只路由授权边界，不复制操作清单                | [`commit.md`](./commit.md)                                                                       | pre-commit 政策检查与 PR CI 的 changeset gate  |
| worktree 与缓存              | 根 [`AGENTS.md`](../../AGENTS.md) 说明 owner 与 worktree 唯一性                 | [`worktree.md`](./worktree.md)                                                                   | 缓存不变量守卫                                 |
| 客户端权限                   | 根 [`AGENTS.md`](../../AGENTS.md) 只给路由，不复制配置                          | [`environments.md`](./environments.md)                                                           | 客户端配置与线程实际行为                       |
| 公共 `web-ui` 契约           | [`packages/web-ui/AGENTS.md`](../../packages/web-ui/AGENTS.md) 指向受影响消费者 | [`web-ui.md`](./web-ui.md)                                                                       | fixtures、contracts、browser/integration tests |
| 跨应用 UI 视觉与颜色原则     | 根 [`AGENTS.md`](../../AGENTS.md) 只路由，不复制颜色处方                        | [`ui-design.md`](./ui-design.md)                                                                 | token 配对、浅/深色模式对比度验证              |

## 链接方向

引用仓库内具体文件时使用行内 Markdown 链接，target 相对当前文件所在目录解析；仓库根以下的文档用 `./` 或 `../` 起头，必要时带节锚点。文件类别、glob、placeholder 和命令片段不是具体文件引用。`docs/agents/**` 不得链接 `.agents/rules/**`：短约束层指向正文，路由是入口的事；其余互指不设限，回路由 review 判断。

ADR 与指向它的 `docs/agents/` 文档只保留单向链接：ADR 侧用行内 code 指代文档名。散文约定只剩两条：ADR 的取代与修订链从新指旧；不叙述被取代的旧实现。新增或改名 `docs/agents/*.md` 时同步根入口的「按任务加载」表；其余维护规则见「维护 instruction system」。

## 语料门禁

`check-context` 判定路由完整性、断链与锚点、外部状态快照短语、远端写授权指针与非权威标记；ADR 与 `.agents/rules/**` 的入站断言仍会判红。判据与取舍见 [ADR-0013](../adr/0013-context-authority.md)，语料指纹边界见 [ADR-0022](../adr/0022-monorepo-kit-plugin-chain.md)。allowlist 变更必须在 diff 中显式发生，不能为让检查变绿而放宽模式。

## 客户端适配

- 客户端差异不改变 task 台账、授权边界与 checks，只体现在适配层。共享规范不设客户端专属副本；换客户端时按同样形状加一层。
- 为兼容 Claude Code：`.claude/rules` 与 `.claude/skills` 以 symlink 指向 `.agents/`；根目录不设 `CLAUDE.md`，否则包级 `AGENTS.md` 的注入会失效。该结论只在实测过的客户端版本上成立，先核对版本；具体映射以仓库当前的 symlink 为准。
- `.claude/settings.local.json` 不得显式放行根 [`AGENTS.md`](../../AGENTS.md) 禁止的共享 worktree Git 改写操作。

## 工具接口

- 影响面与契约查询由 monorepo-change-impact skill 的内置脚本提供；命令、参数与输出格式见该 skill 的 SKILL.md。workspace 图从 workspace 配置与 manifest 派生，不复制成静态文档。
- 仓库校验检查共享 context 的可加载性、语料权威标记与漂移门禁，不替代对规则语义、代码行为或 agent 输出质量的评审。

## 权威性与冲突处理

- **实现优先**：源码、测试、[`package.json`](../../package.json)、workspace 与构建配置是当前行为的证据；地图、README 或文档与它们冲突时以实现为准，并判断是否需要同步文档。
- **就近约束优先**：目标目录最近的 `AGENTS.md` 负责局部约束，根 [`AGENTS.md`](../../AGENTS.md) 负责仓库级边界与路由；与更远的文档冲突时取就近的。
- **冲突显式暴露**：输出与既有 ADR 或权威文档矛盾时明确指出并说明是否值得重开，不静默覆盖；文档、类型、配置与源码不能共同证明边界时，停在最小受影响范围并报告未决风险。
- **术语沿用已有 context**：命名领域概念时用当前已加载 context 里的术语（跨包工程术语看根 [`CONTEXT.md`](../../CONTEXT.md)，领域词汇看对应包或应用级 `AGENTS.md`、task guide 或 ADR），不用文档明确避开的同义词。

## 变更与文档同步

普通源码任务不需要阅读本表。修改以下工程资产时，在同一变更中同步对应权威文档；范围不明确时先查本表和相邻包 `AGENTS.md`。

| 变更类别                                                        | 必须同步的文档                                                                                                               |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 构建脚本、Vite/Turbo、CI/CD                                     | [`build.md`](./build.md)；根命令还更新 [`AGENTS.md`](../../AGENTS.md)                                                        |
| 包新增、移除或重命名                                            | [`ARCHITECTURE.md`](../../ARCHITECTURE.md)                                                                                   |
| lint、formatter、stylelint、cspell                              | [`lint-format.md`](./lint-format.md)                                                                                         |
| workspace catalog 与依赖放置策略                                | [`dependencies.md`](./dependencies.md)                                                                                       |
| Changesets 版本与发布策略                                       | [`release.md`](./release.md)                                                                                                 |
| task 登记、政策检查入口与命令面                                 | task-ledger skill 的 SKILL.md、[`commit.md`](./commit.md)、[`commands.md`](./commands.md)                                    |
| 测试框架或 Vite 测试配置                                        | [`verification.md`](./verification.md)                                                                                       |
| `packages/web-ui` 组件、icon 或公共契约                         | [`packages/web-ui/AGENTS.md`](../../packages/web-ui/AGENTS.md)、[`web-ui.md`](./web-ui.md) 与受影响 ADR                      |
| commitlint 或提交流程                                           | [`commit.md`](./commit.md)                                                                                                   |
| 影响未来工程取舍的架构决定                                      | 对应 ADR，并更新 [`CONTEXT.md`](../../CONTEXT.md) ADR 索引                                                                   |
| CI 审查 job 的审查范围、生成物排除清单或两份 diff 的分工        | [`review.md`](./review.md) 与 [`generated-artifacts.md`](./generated-artifacts.md)；后者「新增生成物时」列出的同步项一并适用 |
| client adapter、共享 rules/skills 或 instruction 体系布局与锚点 | 本文件、[`CONTEXT.md`](../../CONTEXT.md)、[ADR-0004](../adr/0004-progressive-agent-context-architecture.md) 与仓库校验       |
| codex 审查脚本、prompt 或运行手册                               | [`review.md`](./review.md)、[`.github/codex/README.md`](../../.github/codex/README.md)                                       |

## 维护 instruction system

新增 instruction、rule、skill 或 profile 前，先证明现有源码设计、类型、测试、lint 或脚本无法表达该约束。新增内容必须说明：何时加载、哪个事实是权威、违反后有什么工程风险。不能回答时，不新增文档或规则。落笔只写特殊设定、复杂机制和多处关联的事实，能从工具链、配置或行业惯例一眼看出的内容不写。

落笔按架构层处理：写范围、权威、不变量与取舍；具体命令、文件路径、CI 步骤、版本号和工具子命令属于实现层，交给代码、测试或专门文档。实现层变化不应要求同步指令文档，除非它改变了边界本身。需要举例时用类别，不要复制当前清单。

约束密度不设体量门禁，由权威优先、退役清理与 review 承接；门禁只判定已观测漂移与可客观判定的属性，不做文风或语义质量 linter。治理准则：仓库校验通过时默认精简输出，只在失败时给完整定位；自建 skill 的 frontmatter `description` 精炼为高意图密度触发词，正文承载详细流程，第三方 skill 保持上游原文；根 [`AGENTS.md`](../../AGENTS.md) 与 `.agents/rules/` 保持静态与格式稳定，不混入时间戳或易变状态，以最大化 prefix cache 命中。

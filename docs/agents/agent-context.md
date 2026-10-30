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

`docs/research/**` 与 `docs/design/**` 不在上述层级内：前者是时点性研究记录，后者是设计资产与草图。它们是参考材料，不是权威来源，不随实现同步，也不进指令面（不参与路由、互指图与根命令检查）；但必须有非权威标记并进入语料指纹。链接是唯一的例外：断链与节锚点按下方「链接面」全仓检查，参考材料同样不许留死链——历史结论可以旧，点开的 target 必须存在。引用时只作背景，结论仍要落到 ADR、组件文档或源码。

## 重复主题的权威来源

不同层级可以为路由短暂提及同一主题，但只能有一个流程权威来源；其他位置只说明何时加载或链接到它，不复制完整处方。`docs/agents/` 内部按 concern 切分，同一个 concern 只由一篇拥有；跨切面概念下沉为独立文档。下表列出与根/包级边界交叉的主题。

| 主题                     | 规则边界                                                                        | 流程权威来源                                                                                     | 证据类别                                       |
| ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| 生成物                   | 根/包级 `AGENTS.md` 只指向清单，不复制路径                                      | [`generated-artifacts.md`](./generated-artifacts.md)                                             | generator diff、构建、消费者类型检查           |
| 真实浏览器取证           | 根/包级 `AGENTS.md` 仅声明需要浏览器层                                          | [`runtime-verification.md`](./runtime-verification.md)                                           | 浏览器用例与 MCP 操作记录                      |
| 浏览器进程与 profile     | 根/包级 `AGENTS.md` 只路由，不复制归属流程                                      | [`browser-resources.md`](./browser-resources.md)                                                 | 启动记录、profile 查询、回收结果               |
| 该跑哪些验证             | 根/包级 `AGENTS.md` 只路由，不复制选择矩阵                                      | [`verification.md`](./verification.md)                                                           | 相关测试与聚焦构建                             |
| 影响面与契约查询         | 根入口不提供查询命令；工具接口见 monorepo-change-impact skill                   | monorepo-change-impact skill 的 SKILL.md                                                         | 契约查询脚本与其测试                           |
| 任务级别与准入           | 根 [`AGENTS.md`](../../AGENTS.md)「变更准入与登记」只给判定入口，不复制级别表   | task-ledger skill 的 SKILL.md                                                                    | 登记 CLI 的级别校验                            |
| 本地登记簿与 Task Packet | 根 [`AGENTS.md`](../../AGENTS.md) 只路由，不复制 schema、命令或恢复处方         | task-ledger skill 的 SKILL.md                                                                    | 记录 fixture 与 status 查询                    |
| 预授权操作               | 根 [`AGENTS.md`](../../AGENTS.md) 只列被允许与需授权的类别                      | [`workflow.md`](./workflow.md)（授权边界）与 request-authorization skill 的 SKILL.md（弹窗形状） | 四项说明与用户选择记录                         |
| 提交边界与署名           | 根 [`AGENTS.md`](../../AGENTS.md) 只路由授权边界，不复制操作清单                | [`commit.md`](./commit.md)                                                                       | pre-commit 政策检查与 PR CI 的 changeset gate  |
| worktree 与缓存          | 根 [`AGENTS.md`](../../AGENTS.md) 说明 owner 与 worktree 唯一性                 | [`worktree.md`](./worktree.md)                                                                   | 缓存不变量守卫                                 |
| 客户端权限               | 根 [`AGENTS.md`](../../AGENTS.md) 只给路由，不复制配置                          | [`environments.md`](./environments.md)                                                           | 客户端配置与线程实际行为                       |
| 公共 `web-ui` 契约       | [`packages/web-ui/AGENTS.md`](../../packages/web-ui/AGENTS.md) 指向受影响消费者 | [`web-ui.md`](./web-ui.md)                                                                       | fixtures、contracts、browser/integration tests |

## 链接方向

指令面之间不互指：「A 的细节见 B」允许，「A 与 B 互相链接」不允许——回路让 agent 无法判断该在哪一侧收敛。互指检查只统计行内 Markdown 链接，具体提取口径以仓库守卫为准。

机检不变量：

- `docs/agents/**` 不得链接 `.agents/rules/**`：短约束层自己指向正文，路由是入口的事。
- 非入口层文档之间不得互指。

### 怎么引用另一篇文档

引用仓库内具体文件时使用行内 Markdown 链接。target 相对当前文件所在目录解析；仓库根以下的文档使用 `./` 或 `../` 前缀，必要时附带节锚点。文件类别、glob、placeholder 和命令片段不是具体文件引用。

不转成链接的情况：

- 泛指的文件类别、层级或目录：`AGENTS.md`（含包级）、`docs/agents/*.md`、`.agents/rules/*.md`。这里说的是「哪一层」，不是「哪一篇」。
- glob、placeholder 与模板：`docs/<component>.md`、`**/*.md`。
- 命令、配置或输出片段里的文件名：`cat README.md`。
- 目标路径不存在。

引用会形成回路时，调整职责或删除重复引用，保留单向链接。`check-context` 会检查 `docs/agents/` 中对同目录文档的纯文本和单独行内 code 引用；其他文件引用由 review 核对。

ADR 记录技术选型、架构设计与工程化决策及其取舍；具体实现细节由源码、测试或对应文档承载。引用仓库内的具体文件时使用 Markdown 链接。若引用会形成互指，应删除重复导航或调整职责，不能改用纯文本或代码格式绕过检查。

散文约定（没有机检，靠 review 与纪律）：

- 入口层是文件名全大写的文档，包括根入口、包级 `AGENTS.md` 与 README。新增入口文档用大写名，正文文档不用；判定以守卫为准。
- 根 [`AGENTS.md`](../../AGENTS.md) 的「按任务加载」表是入口层的唯一导航面；本文件的权威来源表是 `docs/agents/` 内部的对应物，裁定同一主题由哪一篇拥有，不承担入口级导航。
- ADR 的取代与修订链只从新 ADR 指向旧 ADR；退役内容从活语料移除，历史由 Git 保存。
- 守卫不检查 ADR 的编号方向，也不检查 concern 归属是否唯一；把两个 concern 塞进同一篇、或让两篇共同拥有同一件事，它不会报错。
- 散文只陈述现状事实与未来方向：写当前行为、契约与设计意图，不叙述被取代的旧实现、旧属性名与改动过程；演进方向只写方向本身。ADR 按上文保留历史记录，不受此条约束。
- 参考材料（`docs/research/**`、`docs/design/**`）保留时点标记与结论的时效，正文同样不叙述仓库的改动历史：结论可以旧，写法按上一条。

## 语料门禁

`check-context` 在链接与锚点之外检查可客观判定的漂移属性：task-specific 文档是否有根入口路由、外部状态快照短语、远端写命令是否带授权指针、非权威语料是否带标记，以及内容指纹。体量不设上限，也不维护预算基线；只读 `--report` 列出链接面规模、未路由、零入站、缺标记、活 ADR 退役痕迹与最大文档，不作为门禁。判据与取舍见 [ADR-0013](../adr/0013-context-authority.md)。allowlist 变更必须在 diff 中显式发生，不能为让检查变绿而放宽模式。

### 链接面与指令面

两个扫描面不同，混用会误判覆盖范围：

- **指令面**：路由、互指图、ADR 入站、根命令存在性的判定范围，只含被加载的语料（入口文档、`docs/agents/**`、`docs/adr/**`、`.agents/**`、自撰 skill、包级 `AGENTS.md` 与 workspace `README.md`）。
- **链接面**：断链与节锚点的判定范围，含全部已跟踪 Markdown，即指令面加上 `docs/research/**`、`docs/design/**`、根 `README*.md`、`CHANGELOG.md` 与 `.changeset/*.md`。第三方上游件按其 [`skills-lock.json`](../../skills-lock.json) 出处排除，正文由上游维护。自撰 skill 在 `skills/` 是实体、在 `.agents/skills/` 是软链，同一文件只扫一遍，且按实体路径解析链接——那才是渲染器与读者看到的位置。

判据只针对本地 target：`http(s)`、`mailto:`、`tel:` 等协议链接离线无法验证，不检查；纯锚点与只有 query 的 target 指向本文件，也不检查。只检查行内链接 `[文字](target)`——reference-style 定义与 HTML `href` 不在扫描面内，改写时不要指望守卫兜住。本地 target 一律按当前文件所在目录解析，因此仓库根以下的文档必须写 `./` 或 `../` 起头的路径：`docs/input.md` 这类写法在按文件解析和按仓库根解析两种习惯下可能落到两个不同的文件，换个查看器就跳错，所以判为错误。仓库根下的文档不受此限，那里两种解析结果相同。尖括号包裹（`<./a b.md>`）与带 title 的链接（`[x](./a.md "标题")`）按 CommonMark 取 destination，title 不参与路径判定。行内 code 与围栏代码块里的 `[…](…)` 不是链接，扫描前剥掉；否则研究笔录里贴的正则字面量会被当成断链。

## 客户端适配

- 客户端差异不改变 task 台账、授权边界与 checks，只体现在适配层。共享规范不设客户端专属副本；换客户端时按同样形状加一层。
- 为兼容 Claude Code：`.claude/rules` 与 `.claude/skills` 以 symlink 指向 `.agents/`；根目录不设 `CLAUDE.md`，否则包级 `AGENTS.md` 的注入会失效。该结论只在实测过的客户端版本上成立，先核对版本。
- `.claude/settings.local.json` 不得显式放行根 [`AGENTS.md`](../../AGENTS.md) 禁止的共享 worktree Git 改写操作。

## 工具接口

- 影响面与契约查询由 monorepo-change-impact skill 的内置脚本提供；命令、参数与输出格式见该 skill 的 SKILL.md。workspace 图从 workspace 配置与 manifest 派生，不复制成静态文档。
- 仓库校验检查共享 context 的可加载性、语料权威标记与漂移门禁，不替代对规则语义、代码行为或 agent 输出质量的评审。

## 权威性与冲突处理

- **实现优先**：源码、测试、[`package.json`](../../package.json)、workspace 与构建配置是当前行为的证据；地图、README 或文档与它们冲突时以实现为准，并判断是否需要同步文档。
- **就近约束优先**：目标目录最近的 `AGENTS.md` 负责局部约束，根 [`AGENTS.md`](../../AGENTS.md) 负责仓库级边界与路由；与更远的文档冲突时取就近的。
- **冲突显式暴露**：输出与既有 ADR 或权威文档矛盾时明确指出并说明是否值得重开，不静默覆盖；文档、类型、配置与源码不能共同证明边界时，停在最小受影响范围并报告未决风险。
- **术语沿用已有 context**：命名领域概念时用当前已加载 context 里的术语（跨包工程术语看根 [`CONTEXT.md`](../../CONTEXT.md)，领域词汇看对应包或应用级 `AGENTS.md`、task guide 或 ADR），不用文档明确避开的同义词。概念或决策确实缺失时留给 `/domain-modeling` 在决策确定时懒创建，不提前建占位文件。

## 变更与文档同步

普通源码任务不需要阅读本表。修改以下工程资产时，在同一变更中同步对应权威文档；范围不明确时先查本表和相邻包 `AGENTS.md`。

| 变更类别                                                        | 必须同步的文档                                                                                                         |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 构建脚本、Vite/Turbo、CI/CD                                     | [`build.md`](./build.md)；根命令还更新 [`AGENTS.md`](../../AGENTS.md)                                                  |
| 包新增、移除或重命名                                            | [`ARCHITECTURE.md`](../../ARCHITECTURE.md)                                                                             |
| lint、formatter、stylelint、cspell                              | [`lint-format.md`](./lint-format.md)                                                                                   |
| workspace catalog 与依赖放置策略                                | [`dependencies.md`](./dependencies.md)                                                                                 |
| Changesets 版本与发布策略                                       | [`release.md`](./release.md)                                                                                           |
| task 登记、政策检查入口与命令面                                 | task-ledger skill 的 SKILL.md、[`commit.md`](./commit.md)、[`commands.md`](./commands.md)                              |
| 测试框架或 Vite 测试配置                                        | [`verification.md`](./verification.md)                                                                                 |
| `packages/web-ui` 组件、icon 或公共契约                         | [`packages/web-ui/AGENTS.md`](../../packages/web-ui/AGENTS.md)、[`web-ui.md`](./web-ui.md) 与受影响 ADR                |
| commitlint 或提交流程                                           | [`commit.md`](./commit.md)                                                                                             |
| 影响未来工程取舍的架构决定                                      | 对应 ADR，并更新 [`CONTEXT.md`](../../CONTEXT.md) ADR 索引                                                             |
| client adapter、共享 rules/skills 或 instruction 体系布局与锚点 | 本文件、[`CONTEXT.md`](../../CONTEXT.md)、[ADR-0004](../adr/0004-progressive-agent-context-architecture.md) 与仓库校验 |

## 维护 instruction system

新增 instruction、rule、skill 或 profile 前，先证明现有源码设计、类型、测试、lint 或脚本无法表达该约束。新增内容必须说明：何时加载、哪个事实是权威、违反后有什么工程风险。不能回答时，不新增文档或规则。落笔只写特殊设定、复杂机制和多处关联的事实，能从工具链、配置或行业惯例一眼看出的内容不写。

落笔按架构层处理：写范围、权威、不变量与取舍；具体命令、文件路径、CI 步骤、版本号和工具子命令属于实现层，交给代码、测试或专门文档。实现层变化不应要求同步指令文档，除非它改变了边界本身。需要举例时用类别，不要复制当前清单。

约束密度不设体量门禁，由权威优先、退役清理与 review 承接；门禁只判定已观测漂移与可客观判定的属性，不做文风或语义质量 linter。治理准则：仓库校验通过时默认精简输出，只在失败时给完整定位；自建 skill 的 frontmatter `description` 精炼为高意图密度触发词，正文承载详细流程，第三方 skill 保持上游原文；根 [`AGENTS.md`](../../AGENTS.md) 与 `.agents/rules/` 保持静态与格式稳定，不混入时间戳或易变状态，以最大化 prefix cache 命中。

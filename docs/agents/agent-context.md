# Agent Context 架构

本文件规定如何维护本仓的 agent context（instruction system）：层级、权威归属、客户端适配与新增门槛。它只管「context 自己怎么改」；领域语义与工程原则以 [`CONTEXT.md`](../../CONTEXT.md) 为准，仓库拓扑以 [`ARCHITECTURE.md`](../../ARCHITECTURE.md) 为准，任务该读什么以根 [`AGENTS.md`](../../AGENTS.md) 的 task routing 为准。硬约束短层见 `.agents/rules/agent-context.md`。

## Context 层级

| 层级               | 权威来源                                                         | 何时加载                      | 内容边界                             |
| ------------------ | ---------------------------------------------------------------- | ----------------------------- | ------------------------------------ |
| Always available   | 根 [`AGENTS.md`](../../AGENTS.md)                                | 每次任务                      | 项目身份、不可绕过边界、任务路由     |
| Repository map     | 根 [`ARCHITECTURE.md`](../../ARCHITECTURE.md)                    | 需要全局拓扑或 workspace 定位 | 稳定目录地图、包角色与边界、依赖草图 |
| Project context    | [`CONTEXT.md`](../../CONTEXT.md)                                 | 架构、跨包、术语、长期设计    | 工程原则、领域词汇、ADR 索引         |
| Task-specific      | `docs/agents/*.md`、`.agents/rules/*.md`、最近的包级 `AGENTS.md` | 任务命中对应领域              | 可执行流程、质量门槛、局部约束       |
| On-demand evidence | ADR、README、manifest、配置、源码、测试                          | 已确认受影响区域后            | 历史取舍、公共契约、当前实现         |

不要为「可能有用」批量加载文档。规则只保留无法由代码、类型、测试或工具配置可靠推导的约束；可自动验证的约束优先交给相应工具。

`docs/research/**` 与 `docs/design/**` 不在上述层级内：前者是时点性研究记录，后者是设计资产与草图。它们是参考材料，不是权威来源，不随实现同步，也不在 [`validate-context.mjs`](../../scripts/validate-context.mjs) 的扫描面内；引用它们时只作背景，结论仍要落到 ADR、组件文档或源码。

## 重复主题的权威来源

不同层级可以为路由短暂提及同一主题，但只能有一个流程权威来源；其他位置只说明何时加载或链接到它，不复制完整处方。

| 主题               | 规则边界                                                                        | 流程权威来源                                          | 自动证据                                               |
| ------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| 生成物             | 根/包级 `AGENTS.md` 说明「不可手改」与局部 source of truth                      | [`build.md`](build.md)                                | generator diff、build、消费者类型检查                  |
| 真实浏览器         | 根/包级 `AGENTS.md` 仅声明需要浏览器层                                          | [`runtime-verification.md`](runtime-verification.md)  | `pnpm run test` 中的 `*.browser.spec.ts`、MCP 操作记录 |
| 影响面与契约查询   | 根入口不再提供查询命令；命令面索引见 [`commands.md`](commands.md)               | contract-change-review skill（SKILL.md 与其内置脚本） | `**/scripts/*.test.mjs`（递归 glob 约定）              |
| 任务级别           | 根 `AGENTS.md`「Mutation Gate」只给判定入口，不复制级别表                       | [`workflow.md`](workflow.md)                          | `tasks/<task-id>.json` 的 level 与 events              |
| 预授权操作         | 根 `AGENTS.md` 只列被允许与需授权的类别                                         | [`workflow.md`](workflow.md)                          | [`workflow.md`](workflow.md) 的「预授权操作」清单      |
| 客户端权限与环境   | 根 `AGENTS.md` 只给路由，不复制配置                                             | [`environments.md`](environments.md)                  | `~/.codex/config.toml` 与线程的实际行为                |
| 公共 `web-ui` 契约 | [`packages/web-ui/AGENTS.md`](../../packages/web-ui/AGENTS.md) 指向受影响消费者 | [`web-ui.md`](web-ui.md)                              | fixtures、contracts、browser/integration tests         |

## 链接方向

指令面之间不互指：「A 的细节见 B」允许，「A 与 B 互相链接」不允许——回路让 agent 无法判断该在哪一侧收敛。

互指检查按方括号标签直接接圆括号目标的行内 Markdown 链接建图，与 `validate-context.mjs` 的链接提取口径一致；以第二组方括号给出目标的引用式链接不纳入自动判定。

- 入口层是文件名全大写的文档（`AGENTS.md`、`CONTEXT.md`、`ARCHITECTURE.md`）。它们天然与每个主题相邻，不参与互指判定。命名即约定：新增入口文档用大写名，正文文档不用。
- 上面的权威来源表是唯一导航面。topic 文档正文里的回指不承担导航职责——读者已经在那一侧了，改成文字提及。
- ADR 的取代与修订链只从新 ADR 指向旧 ADR。旧 ADR 里「被什么修订了」的回指，以及 ADR 指向正文落地位置的回指，都写成纯文本，ADR 编号照留。
- 正文不回指 `.agents/rules/`：短约束层自己指向正文，路由是入口的事。

以上由 `.agents/checks/no-mutual-links` 机检，判据以该脚本注释为准。

## 客户端适配

- 客户端差异不改变状态机与 gate，只体现在适配层。`AGENTS.md`、`CONTEXT.md`、`docs/agents/`、`.agents/rules/` 与 `.agents/skills/` 是所有客户端共用的规范，根目录不设客户端专属入口，也不复制共享规则正文。下面几条是当前仓库里**已存在**的适配，不是仓库只支持这些客户端——换客户端时按同样的形状加一层即可，规范正文不动。
- 为兼容 Claude Code 而存在的适配，由 `scripts/validate-context.mjs` 守着：
  - `.claude/rules` 与 `.claude/skills` 以 symlink 指向 `.agents/` 中的共享内容，不建第二套规范；它们属于 Task-specific 层，不是常驻加载层。
  - 根目录不设 `CLAUDE.md`。它一旦出现，Claude Code 会静默停止注入包级 `AGENTS.md`，而源码检查毫无反应。该结论只在实测过的客户端版本上成立，注入失效时先核对客户端版本，不要从本文件推断其他版本。
  - `.claude/settings.local.json` 不得显式放行根 `AGENTS.md` 禁止的共享 worktree Git 改写操作（`stash`、`switch`、`checkout`、`reset`、`clean`）。

## 工具接口

- 影响面与契约查询由 contract-change-review skill 的内置脚本提供（self-contained，只依赖 Node 内置模块）：`node skills/contract-change-review/repo-query.mjs verify [--json] [--base <git-ref> | --staged | --worktree] <paths...>` 输出受影响 workspace、最小读取 context、传递依赖、所需证据和最小充分验证建议；`contract [--json] <published-package>` 输出当前 exports、peerDependencies、sideEffects、直接消费者与最小验证；`contract-diff --base <git-ref> [--json]` 输出 manifest-level semver 审阅候选。workspace 图从 `pnpm-workspace.yaml` 的 `packages` patterns 与各 manifest 派生（内部依赖 = 依赖名命中 workspace 名集合，可发布 = 未标 `private`），不把影响面复制成静态文档。流程与完成定义见该 skill 的 SKILL.md。
- `scripts/validate-context.mjs` 只检查共享 context 的可加载性，不替代对规则语义、代码行为或 agent 输出质量的评审。

## 权威性与冲突处理

- **实现优先**：源码、测试、`package.json`、workspace 与构建配置是当前行为的证据；地图、README 或文档与它们冲突时以实现为准，并判断是否需要同步文档。
- **就近约束优先**：目标目录最近的 `AGENTS.md` 负责局部约束，根 `AGENTS.md` 负责仓库级边界与路由；与更远的文档冲突时取就近的。
- **冲突显式暴露**：输出与既有 ADR 或权威文档矛盾时明确指出并说明是否值得重开，不静默覆盖；文档、类型、配置与源码不能共同证明边界时，停在最小受影响范围并报告未决风险。
- **术语沿用已有 context**：命名领域概念时用当前已加载 context 里的术语（跨包看根 `CONTEXT.md`，其他看对应 `CONTEXT.md`、task guide 或 ADR），不用文档明确避开的同义词。概念或决策确实缺失时留给 `/domain-modeling` 在决策确定时懒创建，不提前建占位文件。

## 变更与文档同步

普通源码任务不需要阅读本表。修改以下工程资产时，在同一变更中同步对应权威文档；范围不明确时先查本表和相邻包 `AGENTS.md`。

| 变更类别                                                        | 必须同步的文档                                                                                                                                                                                              | 事实来源                                                                                                                           |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 构建脚本、Vite/Turbo、CI/CD                                     | [`build.md`](build.md)；根命令还更新 [`AGENTS.md`](../../AGENTS.md)                                                                                                                                         | [`package.json`](../../package.json)、[`turbo.json`](../../turbo.json)、`.github/workflows/`                                       |
| 包新增、移除或重命名                                            | [`ARCHITECTURE.md`](../../ARCHITECTURE.md)                                                                                                                                                                  | `packages/`、`apps/` 目录与 manifest                                                                                               |
| lint、formatter、stylelint、cspell                              | [`lint-format.md`](lint-format.md)                                                                                                                                                                          | 对应配置                                                                                                                           |
| workspace catalog 与依赖放置策略                                | [`dependencies.md`](dependencies.md)                                                                                                                                                                        | [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml)                                                                                 |
| Changesets 版本与发布策略                                       | [`release.md`](release.md)                                                                                                                                                                                  | [`.changeset/config.json`](../../.changeset/config.json)、[`changeset-version.yml`](../../.github/workflows/changeset-version.yml) |
| 测试框架或 Vite 测试配置                                        | [`test-execution.md`](test-execution.md)                                                                                                                                                                    | 测试配置                                                                                                                           |
| `packages/web-ui` 组件、图标或公共契约                          | [`packages/web-ui/AGENTS.md`](../../packages/web-ui/AGENTS.md)、[`web-ui.md`](web-ui.md) 与受影响 ADR                                                                                                       | 组件源码、类型、测试                                                                                                               |
| commitlint 或提交流程                                           | [`commit.md`](commit.md)                                                                                                                                                                                    | commit 配置或工作流                                                                                                                |
| 影响未来工程取舍的架构决定                                      | 对应 ADR，并更新 [`CONTEXT.md`](../../CONTEXT.md) ADR 索引                                                                                                                                                  | 可行替代方案之间的长期选择                                                                                                         |
| client adapter、共享 rules/skills 或 instruction 体系布局与锚点 | [`agent-context.md`](agent-context.md)、[`CONTEXT.md`](../../CONTEXT.md)、[ADR-0004](../adr/0004-progressive-agent-context-architecture.md) 与 [`validate-context.mjs`](../../scripts/validate-context.mjs) | 根 [`AGENTS.md`](../../AGENTS.md)、`.agents/`、root scripts、diff review                                                           |

## 维护 instruction system

新增 instruction、rule、skill 或 profile 前，先证明现有源码设计、类型、测试、lint 或脚本无法表达该约束。新增内容必须说明：何时加载、哪个事实是权威、违反后有什么工程风险。不能回答时，不新增文档或规则。落笔只写特殊设定、复杂机制和多处关联的事实，能从工具链、配置或行业惯例一眼看出的内容不写。

约束密度与重复没有机器基线：`audit:instructions` 与预算文件随 ADR-0014 退役，改由 diff review 人工把关；`<!-- invariant:... -->` 锚点是惰性注释，只供人工检索。

治理准则：仓库校验脚本通过时默认精简输出，只在失败时给完整定位，避免刷屏污染会话；自建 skill 的 frontmatter `description` 精炼为高意图密度触发词、正文承载详细流程，第三方 skill 保持上游原文；根 `AGENTS.md` 与 `.agents/rules/` 保持静态与格式稳定，不混入时间戳或易变状态，以最大化 prefix cache 命中。

# ADR-0026: 面向前沿模型的精简 Agent Context 体系

- **Date**: 2026-11-27
- **Status**: 已接受（Supersedes [ADR-0004](./0004-progressive-agent-context-architecture.md) 中的多层碎片结构，并退役 [ADR-0015](./0015-task-ledger.md)）

## 背景

随着 Claude 5 与 GPT-6 Astra 世代前沿编码模型的演进，行业上下文工程实践发生了根本转向（参考 Anthropic《The new rules of context engineering for Claude 5 generation models》与 OpenAI《Rethinking skills and prompts for GPT-6 Astra》）：

1. **旧时代防御性规则成为负资产**：为早期模型编写的通用工程常识（AAA 测试结构、行为优先于实现、错误处理不吞异常、通用审查清单、手把手进程查杀脚本）已被前沿模型内化，继续保留只稀释注意力并诱发指令冲突。
2. **过度强边界触发过早停顿**：把过多低风险本地操作与繁琐仪式化审批写入强停顿条款，会让高对齐模型在用户希望自主推进处反复请示。
3. **常驻上下文静默泄漏**：无 `paths:` frontmatter 的 `.agents/rules/*.md` 经 `.claude/rules` 软链在 Claude Code 中每轮全量常驻注入；多个仅低频使用的 skill 也以 model-invoked 持续占用 description 预算。
4. **碎片化与环境缓存漂移**：`docs/agents/` 膨胀至 23 篇（约 150 KB），包含大量元治理文档与可从源码、`package.json`、`vite.config.ts`、`--help` 直接推导的环境缓存；根部另设 `CONTEXT.md` 夹层。

## 决策

以**四条二元删留判据**（不设纯字符数配额，延续 [ADR-0013](./0013-context-authority.md)）重构全仓 Agent 指令体系：

1. **删 No-op**：前沿模型已内化的通用工程能力直接删除。
2. **确定性优先 + 跨端红线兜底**：可机械拦截的约束优先交给 CI、lint、git hooks 与 `.claude/settings.json`；因 Codex CLI 在本仓采用 `sandbox_mode = "danger-full-access"` 且不读 `.claude/settings.json`，跨客户端高危红线（入库生成物、`.env`/`.npmrc`/`.mise.toml`/Git 配置、共享 worktree 破坏性 Git 操作）在根 [`AGENTS.md`](../../AGENTS.md) 保留极简兜底。
3. **删环境缓存**：源码、manifest、构建配置与 `--help` 可直接读出的信息不再抄入文档。
4. **先锁 Must-Keep 不变量**：只保留无法从代码推导的仓库特有边界、跨包隐式耦合、非显然时序/工具链坑与产品边界。

### 目标结构

- **根入口瘦身**：移除根 `CONTEXT.md`（2 条核心工程原则并入根 `AGENTS.md`，ADR 索引迁至 [`docs/adr/README.md`](./README.md)）；`ARCHITECTURE.md` 仅保留紧凑 workspace 索引表与发布/私有边界。根 `AGENTS.md` 明确正向本地自治许可（独立任务 worktree 内的非破坏性构建/测试/修复闭环无需每步请示，禁止为变绿擅自调大 timeout）。
- **`.agents/rules/` 作用域化**：删 4 份复读/元治理文件，仅保留 `ui-style.md`（`paths: **/*.{css,vue,tsx,jsx}`，吸收原 `ui-design.md`）与 `docs-style.md`（`paths: **/*.md`, `packages/web-ui/**`，合并原 `terminology.md`），并在根 `AGENTS.md` 以单行逐文件链接兼顾 Codex CLI 发现性与 `check-context` 入站断言。
- **`docs/agents/` 分支隔离合并（23 篇 → 9 篇）**：收敛为 `build.md`、`ci.md`、`generated-artifacts.md`、`verification.md`、`workflow.md`（含 commit 规范与 PR 自动跟进闭环）、`release.md`（保持独立防污染高频工作流）、`review.md`、`environment.md`、`scripts-and-commands.md`；移除 `agent-context.md`、`writing-agent-docs.md`、`web-ui.md`（迁入 `packages/web-ui/AGENTS.md`）与 `ui-design.md`。
- **PR 自动跟进与授权边界**：收窄逐次授权到外部/不可逆高风险操作；PR 创建后自动跟进 workflow 与审查结果，属实问题修复后直接常规推送，误判或无需修改项在 PR 中补充评论说明依据。
- **包级 `AGENTS.md` 归零审计**：仅保留 10 个存在复杂隐式契约的核心包/应用入口并大幅瘦身，删除 6 个低增量包级 `AGENTS.md`（`wuchale-vue`、`test-kit`、`route-progress`、`browser-kit`、`js-kit`、`dev-kit-demo`）。
- **Skills 治理**：退役 `request-authorization` 与 `task-ledger`；`apps-sparse-checkout` 改为 `disable-model-invocation: true`；保留并大幅瘦身 `monorepo-change-impact` 与 `test-authoring`；第三方 `.agents/skills-vendored/` 维持上游原文与现有软链面。

## 后果

- 自撰指令语料文件数从 54 缩减至 25，常驻上下文负载与按需文件噪声大幅下降，模型注意力集中于真实不变量。
- 跨客户端适配边界（根禁 `CLAUDE.md`、`.claude/{rules,skills}` 软链、`check-context` 断链与远端写授权指针门禁）保持完整有效。
- 后续维护不再依赖独立元治理文档，直接按本 ADR 的四条判据与 `check-context` 门禁把关。

## 替代方案

- **仅做字面压缩而不调整目录与 skill 分层**：无法消除无 `paths:` rules 的常驻泄漏、`build-*` 碎片化与已退役流程 skill 的维护死重。
- **彻底删除根 `AGENTS.md` 软红线而完全依赖 `.claude/settings.json`**：Codex CLI 不读 `.claude/settings.json` 且运行在无沙箱模式，会导致生成物与配置在 Codex 侧裸奔，故不采用。

---
name: audit-instructions
description: 审计仓库 instruction system 的加载路径、重复约束、权威来源和验证缺口。用于修改 AGENTS.md、CLAUDE.md、rules、skills、agent profiles 或 hooks；不用于普通源码任务。
---

# Context Audit

## 流程

1. 读取根 `AGENTS.md`、`docs/agents/context.md`、`CONTEXT.md` 和当前 diff。
2. 按任务目录列出最近的 `AGENTS.md`、命中的 guide/rule、skills、agent profile 和工具配置。
3. 为每条规则记录：加载条件、权威来源、自动验证方式、重复/冲突和删除风险。
4. 优先删除重复或可由代码/测试/配置表达的内容——已被 lint/CI/配置强制的（对照 `scripts/tool-enforced-rules.json`）删文字、留指向该工具的指针；重复处方收敛到单一权威来源，其他位置只留指针。新增文字必须说明何时加载、事实来源和违反风险。
5. 区分「无条件命令」与「条件加载」：只有无条件命令才构成过约束，条件加载只在命中场景生效，不要按字数一刀切。
6. 运行 `pnpm validate:context` 检查 symlink、路径、frontmatter 和 ADR 索引，再运行 `pnpm audit:instructions -- --strict`；后者带 `--json` 可读 `budget` / `toolEnforcedHits` / `repeatedBlocks`。最后按一个代表性任务人工复核 context 路由效果，不以文档总字数作为质量指标。

## 校验器是双向门，不是单向棘轮

2026-09-14 起（ADR-0012）两个校验器都改为双向门：**锚点覆盖的正文措辞**可以随模型换代自由重写，加重约束才需要动文件。入口与契约字面量——`AGENTS.md` 必经 `docs/agents/workflow.md`、`CONTRIBUTING.md` 必含 edit gate 命令、handoff 字段名、角色绑定表——仍由 `validate-context.mjs` 钉住，那些不是零摩擦改动的对象。

- **锚点**：`audit-instructions.mjs` 只校验 `<!-- invariant:... -->` 锚点是否存在——8 个锚点名展开为 14 条「文件 × 锚点」断言，落在 `AGENTS.md`、`docs/agents/workflow.md`、`docs/agents/task-packet.md` 和 `.agents/agents/*` 的 5 个角色文件（`role-sections` 一项按目录展开）。删锚点才需要改脚本。CLAUDE.md 例外——它没有锚点，改由 `validate-context.mjs` 的三条断言管：必须是常规文件（非 symlink）、必须含字面量 `AGENTS.md`、长度不超过 `CLAUDE_ADAPTER_MAX_CHARACTERS`（800）。
- **预算基线**：`scripts/instruction-budget.json` 记录逐文件字符数与祈使词数（`tolerance: 0`）及 `repeatedBlockPairs`（当前 8）；`scripts/tool-enforced-rules.json` 记录已被工具强制的规则。预算 scope 是约束层（根入口 + rules + agents + references + docs/agents），**不含 `.agents/skills/`**，因此改 skill 文本不牵动基线。
- **加重约束** → 改基线文件，因而出现在 diff 里被评审看见；**放宽限制** → 调基线，或在删掉正文锚点的同时删 `invariantAnchors` 里的对应条目（只删正文锚点会让 `--strict` 直接失败）。
- 任一基线文件缺失、`totals` 缺失、`tolerance` 无法解析为有限数或为负、`repeatedBlockPairs` 非数字，`--strict` 一律失败；加 `--warn` 时这些断言降级为报告，仅供本地排查。这是防双向门被静默关闭的机制，**不要改回「文件缺失就跳过」**。

## 量化 gate 摩擦（判断是否过约束的一手证据）

不要凭字数或直觉判断 gate 轻重，直接读 task state：

- task state 位于 **git common dir 下的 `agent-workflow/`**（即 `<git-common-dir>/agent-workflow`，用 `git rev-parse --git-common-dir` 探测），**不在当前 worktree 的 `.git/` 下**。
- 统计 `mode` 分布、`roles` 长度（多角色编排是否真发生）、`verification` 条数、`allowedPaths` / `affectedWorkspaces` 是否长期为空、`manualInterventions` 的根因归类。
- 反复出现的 `manualInterventions` 根因就是最该修的摩擦点。若根因集中在「freeze 之后文件又变」这类**操作顺序**问题，改文档里的顺序说明即可，不必放松 gate 本身。
- 该目录是 friction 证据来源，不是清理对象。

## 输出

报告 context 层级、重复项、冲突项、建议变更、验证命令和仍需人工决策的长期取舍。不要在审计 skill 中直接改写用户的业务源码。

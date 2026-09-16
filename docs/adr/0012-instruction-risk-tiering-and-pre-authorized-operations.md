# ADR-0012: Instruction 风险分级、预授权操作与约束预算

- **Date**: 2026-09-14
- **Status**: 已接受
- **Amends**: [ADR-0011](0011-agent-model-binding-and-effort.md) 的「后果」中关于角色契约执行体自述参与机械校验的说明
- **Relates to**: [ADR-0004](0004-progressive-agent-context-architecture.md)、[ADR-0010](0010-agent-role-orchestration.md)

## 背景

ADR-0004 建立了渐进披露的 context 架构，ADR-0010 与 ADR-0011 建立了角色、编排与执行体绑定。这三者都把约束往上加，没有定义「什么时候该减」。实测结果是两个校验器成了单向棘轮：

- `scripts/audit-instructions.mjs --strict` 与 `scripts/validate-context.mjs` 只在必需标记缺失时失败，从不检测约束是否已冗余。加约束零摩擦，删或软化最重的 gate 会让两个必过校验同时失败。
- `docs/agents/build.md` 又规定 instruction system 变更必须通过这两条，CI 的 `check` job 也照跑，形成闭环。

同时，workflow gate 的触发条件按「变更类别」而非风险判定：凡会写文件或走 Git、merge、release 的任务都要先 `init` 并跑 preflight，Fast lane 只对错别字与纯格式开口。`.git/agent-workflow/` 的 63 个已关闭 task state 提供了量化证据：

- 单角色的任务占 60/63（95%），多角色编排是设计核心但实际极少发生。
- `verification` 只有 1 条的占 51/63（81%）。
- `allowedPaths` 与 `affectedWorkspaces` **63/63 全为空数组**——preflight 明文要求记录这两项，从未被填写过一次。
- `manualInterventions` 共 11 条，其中 6 条根因相同：`freeze` 之后文件又变了（5 条 empty changeset 建在 freeze 之后，1 条 `vp staged` 在 pre-commit 期间重排表格），diff 失效后必须重走 freeze → review → approve。另有 3 条是状态机缺少「frozen 且已编辑 → editing」路径，只能手工重置 phase。

两篇外部文章确认了方向：Claude 的《The new rules of context engineering for Claude 5 generation models》主张删掉冗余系统提示后「no measurable loss on our coding evaluations」，并要求把「Give Claude rules」换成「Let Claude use judgement」、「Put it all upfront」换成 progressive disclosure；OpenAI 的《Rethinking skills and prompts for GPT-6 Astra》把「Before every edit, read architecture.md…」列为反模式（「burn context and slow work down」），并要求显式允许已知安全的工作流，因为旧限制会被新模型字面执行而「stop even when you want it to keep going」。

## 决策

### 1. 变更按可查证的风险分级，而不是按变更类别触发

`docs/agents/workflow.md` 的「变更风险分级」是唯一权威分级表：档 0 免 task state，档 1 走 `direct`，档 2 走 `orchestrated`。判据全部可从变更路径、manifest 与 `pnpm find:usages -- <paths...>` 输出查证：受影响 workspace 只有一个时，档 0 的「单 workspace」条件成立。根 `AGENTS.md` 的 Mutation Gate 只给判定入口和不可绕过的边界，不复制分级表。

放宽 gate 不需要改 `scripts/agent-workflow.mjs`：提交 hook 在找不到 active task 时返回 `{ok: true, enforced: false}` 并放行，这是脚本既有行为。

### 2. 预授权操作显式列出

已知安全的工作流（本地测试与校验命令、包级构建、只读查询工具、在目标 worktree 内读文件、修复本次改动导致的失败并重跑）直接执行，不必逐步请示。commit、push、merge、publish、依赖与 lockfile、`.npmrc` / `.mise.toml` / Git 配置、凭证读写与破坏性 git 操作仍需逐次授权。清单写在 `docs/agents/workflow.md` 的「预授权操作」，根 `AGENTS.md` 只列被允许与需授权的类别。

### 3. 校验器钉锚点，不钉措辞

不变量用 HTML 注释锚点表达，`scripts/audit-instructions.mjs --strict` 只校验锚点存在。正文措辞可以随模型换代重写而不必改脚本；新增一条不变量才需要同时改文档与脚本。同时删除这些措辞钉：AGENTS.md 的章节标题、`workflow.md` 的 8 个章节标题、`.agents/agents/*` 的 7 个 Role section 标题、角色契约的「X 由 Y 承担」自述正则。`CLAUDE.md` 的「薄适配入口」措辞钉换成尺寸契约（不超过 800 字符）。

### 4. 给「减法」配上可执行的基线

- `scripts/instruction-budget.json` 逐文件记录字符数与祈使词数量。超基线即 `--strict` 失败，因此放宽约束必须同时改基线文件，这个动作会出现在 diff 里被评审看见。
- `scripts/tool-enforced-rules.json` 记录已被 lint、CI 或配置强制的规则。命中即失败，所以删掉的规则不能换个写法长回来。
- 两个基线文件本身也是门的一部分：文件缺失、`tolerance` 非数字或 `totals` 字段缺失都会让 `--strict` 失败，避免「删除基线」成为绕过评审的静默通道。
- 重述块检测用 40 字符规范化滑窗（阈值 6 个共享窗口）报告文件对，基线记录对数，增长即失败。

### 5. 顺带清理

`.agents/rules/` 中已被工具强制或与文档重述的条目收敛：`react.md` 删掉由 oxlint 强制的规则行，`commit.md` 的 changeset 解释与 `--no-verify` / `--no-gpg-sign` 收敛到 `docs/agents/commit.md`，`testing.md` 删掉由 CI 强制的全量 test/build 要求，`global-rename.md` 压成触发条件加指针，`linting.md` 的代码风格细节改为指向 `vite.config.ts`。包边界约束在 `AGENTS.md` 内从 4 处收敛为 1 处权威加指针。

## 后果

- 单 workspace 的行为变更、同包测试新增、一页文档不再是「必须先建状态机」的变更；档 1 与档 2 仍保留 task state、review 与 approval。
- `scripts/audit-instructions.mjs` 新增 `budget`、`toolEnforcedHits`、`repeatedBlocks` 三类 `--strict` 断言，`--json` 同步输出；`--warn` 把 strict 断言降级为报告，**只用于本地采集基线或排查，CI 不得使用**（`.github/workflows/ci.yml` 使用 `--strict --json`）。
- `scripts/validate-context.mjs` 不再校验章节标题与角色自述措辞，改为尺寸契约（CLAUDE.md ≤ 800 字符）加绑定表镜像校验。
- `docs/agents/workflow.md` 新增「变更风险分级」与「预授权操作」两节，并写明 changeset 与格式化必须在 `freeze` 之前完成——这条直接针对 6 条人工干预的共同根因。
- `docs/agents/task-packet.md` 的 `Allowed paths` 与 `Affected workspaces` 只在档 2 填写（其他档写 `N/A`，保留字段以免消费者改变形状），`Review` 行的 `secondary review` 死字段删除。
- 已知限制：重述块检测只比较文件对数量，不比较单对内的重复规模；在既有文件对内增写重复段落不会增加对数。这类增长会被约束预算的字符上限拦下，所以两条门互为补充而不是互相替代。规范化后总长低于 40 字符的极短文件不会产生任何滑窗，不受这一门约束。
- 高风险清单不再循环引用：`AGENTS.md` 单向指向 `workflow.md`。
- 未解决：状态机缺少「frozen 且已编辑 → editing」路径（修它要改 `scripts/agent-workflow.mjs`，与本次「只改文档」的边界冲突）；`check` 的 `merge` phase 未写进 `workflow.md`。

## 替代方案

- **只改文档、不改校验器**：任何一次精简都会被自己的校验拦回来，减法不可持续；不采用。
- **改 `scripts/agent-workflow.mjs` 新增轻量路径**：会扩大改动面并牵动 `agent-workflow.test.mjs`，而脚本本身已经是「无 task state 即放行」；不采用。
- **删掉校验器**：会同时失去防回退能力，`validate-context` 的结构与软链断言仍不可替代；不采用。
- **继续用写死的必需标记字符串**：换模型时重写文档就必须改脚本，正是本次要消除的耦合；不采用。

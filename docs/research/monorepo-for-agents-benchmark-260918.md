# 为 AI Coding Agents 优化的 Monorepo：2025-2026 业界基准与本仓评判

- 日期：2026-09-18
- 类型：调研报告（只读研究，不含实施建议的代码变更）
- 方法：以一手来源为基准盘点，逐维度对照本仓实现；每条主张标注来源。GitHub 内容经 `gh api` 实读，非转述。

## 执行摘要

1. 本仓在「文档分层 / 渐进披露 / prompt cache 稳定性 / 影响面查询 / review 独立性 / task 可恢复性」六个维度达到或超过业界公开基准；核心差距集中在三点：**执行隔离无 sandbox、验证证据靠 agent 自述、instruction 体系无行为评测**。
2. 本仓最大结构风险不是缺实践，而是「大量硬约束是 prose 而非确定性 gate」——业界方向是把约束从文档迁移到 hooks/CI/sandbox（确定性执行），本仓恰好相反（ADR-0014 还删除了机器校验的 instruction 审计）。
3. T0/T1/T2 + freeze/diffHash 状态机在业界公开材料中无对应物，属于超前；但其 done/verify gate 接受自报验证结果，是「超前中的薄弱点」。

## 一、业界基准盘点

### 1.1 agent 入口与文档分层

- **agents.md 规范**：AGENTS.md 是「agent 的 README」，开放格式，60k+ 项目使用；示例强调 dev environment tips、testing instructions、PR instructions 三段式（https://github.com/openai/agents.md/blob/main/README.md，https://agents.md）。
- **Claude Code memory 文档**：CLAUDE.md 目标 <200 行，过长会降低 adherence；嵌套 per-directory CLAUDE.md 是 monorepo 首选；仓库已有 AGENTS.md 时用 `CLAUDE.md` import 或 symlink 对齐（Windows 不支持 symlink 时用 import）；monorepo 用 `claudeMdExcludes` 排除无关包（https://code.claude.com/docs/en/memory，https://code.claude.com/docs/en/large-codebases）。
- **Claude Code best practices**：CLAUDE.md 只放「删掉会导致出错」的内容，可从代码推导的不要写；bloat 会让指令被忽略；把 CLAUDE.md 当代码 review、定期修剪（https://code.claude.com/docs/en/best-practices）。
- **Cursor**：四类 rules（Project/User/Team/AGENTS.md），`.mdc` frontmatter 提供 alwaysApply/globs/description 的机器可读加载语义（https://cursor.com/docs/rules）。
- **实仓举证**：vercel/next.js 根 `AGENTS.md`（29KB，CLAUDE.md 为其 symlink）+ `packages/next/AGENTS.md`、`turbopack/AGENTS.md` 嵌套（gh api repos/vercel/next.js/contents/AGENTS.md）；microsoft/vscode `AGENTS.md` 是指向 `.github/copilot-instructions.md` 的薄指针（gh api repos/microsoft/vscode/contents/AGENTS.md）。
- **GitHub 官方分析（2,500+ repos）**：成功的 agent 文件共性是——命令前置、示例优于解释、明确边界（never/ask first/always 三档）、六个核心区（commands/testing/structure/style/git workflow/boundaries）（https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/）。

### 1.2 验证闭环与证据

- 「给 Claude 一个可运行检查」是头号 best practice；agent 必须出示证据（测试输出、命令返回、截图）而非口头断言成功（https://code.claude.com/docs/en/best-practices）。
- 确定性 gate 的三档递进：prompt 内要求 → Stop hook 脚本（advisory 变 deterministic）→ 第二意见（fresh subagent / adversarial review，reviewer 只见 diff 与标准，不见实施者推理）（同上）。
- Google code review 标准：reviewer 独立于作者，review 最终代码而非作者的过程描述（https://google.github.io/eng-practices/review/reviewer/standard.html）。
- 云端自动化 review 已产品化：Claude Code GitHub Code Review（多 agent、severity 分级、REVIEW.md 定制）、Copilot code review 读取仓库 AGENTS.md（https://code.claude.com/docs/en/code-review；github.blog changelog「Copilot code review: AGENTS.md support」）。

### 1.3 任务隔离与 worktree

- Claude Code 官方 worktree 机制：`.claude/worktrees/<name>`、自动建分支、退出时清理、stale-lock sweep、`.worktreeinclude` 携带 gitignored 文件（https://code.claude.com/docs/en/worktrees）。
- 多会话并行的官方形态：worktrees、cross-session messaging、agent teams、fan-out（`claude -p` 循环 + `--allowedTools` 收权）（https://code.claude.com/docs/en/best-practices）。

### 1.4 执行隔离与安全（sandbox）

- Claude Code：sandboxed Bash 提供 filesystem/network 隔离，权限 allowlist + sandbox 是减少弹窗同时保持控制的官方组合（https://code.claude.com/docs/en/sandboxing、https://code.claude.com/docs/en/sandbox-environments）。
- OpenAI Codex：sandbox 是默认执行模型——AGENTS.md 中明文记录 `CODEX_SANDBOX_NETWORK_DISABLED` / `CODEX_SANDBOX=seatbelt` 环境变量语义，并提供执行策略文档（gh api repos/openai/codex/contents/AGENTS.md；repos/openai/codex/contents/docs/execpolicy.md）。
- Google monorepo 实践（传统基线）：单一仓库 + 集中权限/提交校验是规模化前提（https://research.google/pubs/why-google-stores-billions-of-lines-of-code-in-a-single-repository/，DOI 10.1145/2854146）。

### 1.5 评测、成本与记忆

- **Agent evals**：`claude plugin eval` 对 skill/plugin 跑 eval suite，与 no-plugin baseline 对照，可 gate CI（https://code.claude.com/docs/en/plugin-evals）。
- **成本治理**：`/usage`、statusline cost、`--max-budget-usd`、enterprise 平均 $13/dev/active day 的可观测基线（https://code.claude.com/docs/en/costs）。
- **记忆**：auto memory（agent 自动积累笔记）与 CLAUDE.md 分工明确（https://code.claude.com/docs/en/memory）。

## 二、逐维度评判

### 2.1 agent 入口与文档分层 —— 做对了

- 根 `AGENTS.md`（97 行）只承载身份/不可绕过边界/路由，`CLAUDE.md` 是薄适配——与「薄指针」模式（microsoft/vscode）和 agents.md 开放格式一致；`.claude/{rules,skills,agents}` symlink 复用 `.agents/`，正对应官方「已有 AGENTS.md 时 symlink/import 对齐」建议（`docs/agents/context.md`「客户端适配」）。
- 渐进披露落地为「Context 层级」表与「按任务加载」路由表（根 `AGENTS.md`），与 large-codebases 指南的「per-directory 分层、按需加载」同构，且比官方多了「重复主题的权威来源」表——单一流程权威、其余只链接，这是业界文档中少见的自控纪律（推断：来源缺失，属本仓自创且合理）。
- Context Engineering 准则（`docs/agents/context.md`「Token 治理」）：skill description 常驻指针精炼化、入口静态化保 prefix cache 命中——官方 prompt-caching 文档确认缓存失效成本（https://code.claude.com/docs/en/prompt-caching，经 llms.txt 索引），本仓把缓存命中写成了治理准则，属超前。
- 「2,500 repos 分析」的六核心区本仓全覆盖：commands（预授权清单+常用命令）、testing（testing.md）、structure（ARCHITECTURE.md）、style（code-style.md）、git workflow（commit.md/workflow.md）、boundaries（「不可绕过的仓库边界」+ never 清单）。

### 2.2 任务隔离与 worktree —— 做对了，有一处刻意偏离

- 「一个可变 task = 一个 worktree = 一个 owner」「禁共享工作区 git 改写」「角色目录边界=写入边界」（`docs/agents/worktrees.md`、根 `AGENTS.md`）比官方「并行会话不碰撞」的目标更严格。
- 偏离点：官方默认 `.claude/worktrees/` + 自动清理 + `.worktreeinclude`；本仓统一 `<repo>-worktrees/<task-id>`（根 `AGENTS.md`）。**推断**：偏离换来的是 task 身份与 herdr 多执行体可见性，但放弃了官方的自动 cleanup/lock sweep/文件携带，代价是每个新 worktree 手动 `pnpm install && build`（`worktrees.md` 已诚实记录该摩擦，TURBO_CACHE_DIR 共享缓解了构建冷缓存）。

### 2.3 验证门禁与证据链 —— 超前，但证据是自报的

- T0/T1/T2 状态机 + freeze/diffHash + review/approval 绑定同一 hash + `events[]` append-only（`docs/agents/workflow.md`、`scripts/task.mjs`、ADR-0014）：业界公开材料无此强度。freeze 归一化管线与 pre-commit 只留 guard 的竞态消除（ADR-0014 §4）是扎实的工程决策。
- 浏览器证据三档 + `agent:verify check-env`（`docs/agents/browser-verification.md`）直接把「证据不可信环境中的验证结论无效」机制化，业界未见对应物（推断：官方只有 screenshot/verify skill 层面）。
- **没做对**：`scripts/task.mjs:407-415` 的 `verify` 只记录 agent 自报的 `name/result`，不执行命令、不校验 exit code——「done 前必须 pass」的硬 gate 建立在自报之上。业界对应物是「deterministic Stop hook / CI 实跑」（best-practices §verification）。缓解是 CI 全量兜底 + `live.clean` 与 hash 一致性检查，但「验证真的跑过且通过」在 T0/T1 本地闭环内不可证。
- `audit:instructions` 与预算基线退役（ADR-0014、`docs/agents/context.md`「评测与审计」）后，instruction 体系回归纯人工 diff review，与业界「instruction 当代码测、evals gate CI」方向相反。

### 2.4 影响面/契约查询 —— 做对了

- `pnpm find:usages / inspect:contract / diff:contract`（`scripts/repo-query.mjs`）从 `pnpm-workspace.yaml` patterns 与 manifest 派生影响面，不维护静态影响文档；`find:usages` 输出还充当 T2 判定的机器判据（`workflow.md`「任务级别」）。这相当于业界「code intelligence plugin / language-server 精确定位」（large-codebases §Reduce file reads）的自建、可测试版本（`repo-query.test.mjs`）。
- 缺失（P2）：查询是 path/manifest 级而非 symbol 级；官方 code intelligence 插件提供 definition/callers 精确导航，公共 API 改动的 caller 影响面目前靠测试与 review 兜底。

### 2.5 review 自动化与独立性 —— 做对了核心，缺 CI 层

- reviewer ≠ owner、fresh context、只审冻结 diff 不听实施者叙述（`workflow.md`「review 拓扑」）与 Google 标准、Claude adversarial review 完全同向且更硬（hash 绑定、review fail 回 active）。
- 缺失（P1）：本仓 CI（`.github/workflows/ci.yml`）无任何自动化 PR review（Claude Code Code Review / Copilot AGENTS.md review 均已产品化）；独立 reviewer 会话仍是纯人力编排，T0 review 的可得性受限于人/会话排队（推断：单仓单人 + agent 编排场景下，独立 reviewer 常由 Manager 新起会话承担，「独立性」强度介于 fresh subagent 与人类 review 之间）。

### 2.6 多 agent 编排与权限边界 —— 结构领先，执行面裸奔

- 唯一权威绑定表、扁平编排、handoff 五字段合同 + `Proven mechanism` 条件必填（根 `AGENTS.md`、`task-packet.md`）：业界（agent teams、GitHub custom agents）只到「角色定义」粒度，没有机器强制的交接字段，本仓把交接也做成了契约。
- **最大缺口（P0/P1）**：实施角色 herdr 启动参数是 `codex --yolo` / `claude --dangerously-skip-permissions`（`.agents/agents/manager.md`「Dispatch permissions」），即 coders 全权、无 sandbox。隔离完全依赖 task gate + git 禁令 + 目录纪律这些 prose/软机制。业界 2025-2026 的默认答案是 sandbox 化执行（Claude sandboxed Bash 的 fs/network 隔离、Codex 默认 sandbox + Seatbelt/env var 契约，见 §1.4）。Reviewer 侧的只读白名单已做得很细（`manager.md`），但 coders 侧零隔离是明显的不对称。

**勘误（260919）**：本条最后一句为假。`manager.md`「Dispatch permissions」表把 Reviewer 与 Manager/Designer/Lib Coder/Biz Coder 列为同一档完全访问（`codex --yolo` / `claude --dangerously-skip-permissions`），仓库里不存在 reviewer 只读白名单，只读边界由角色纪律与 task gate 承担（该表下方条目写明这一点）。因此「coders 零隔离 vs reviewer 细白名单」的不对称框架也不成立：五类角色在 dispatch 层全部零隔离，缺口比初版描述的更宽。

### 2.7 恢复与可观测 —— 做对了

- `events[]` 时间线、`<git-common-dir>/tasks/` 跨 worktree 共享、「重启后从 task state 恢复，不从聊天记忆猜测」（`workflow.md`「失败和恢复」）正中业界共识（官方 resume/checkpoint 语义）。issue 只作镜像、本地 state 不依赖外部服务，比官方集成更深一层。

### 2.8 业界有而本仓没有

| 实践                                                | 业界来源                                                         | 判断                                                            |
| --------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| Sandbox 化执行（coders）                            | code.claude.com/docs/en/sandboxing；codex AGENTS.md sandbox 契约 | **P0**：唯一靠运行时保证的隔离维度，本仓全无                    |
| 本地确定性验证 gate（hook 实跑命令并捕获退出码）    | best-practices「deterministic gate」                             | **P1**：`task verify` 改为可选 `--run` 执行并记录真实 exit code |
| Agent evals（skills/instruction 行为回归，gate CI） | code.claude.com/docs/en/plugin-evals                             | **P1**：ADR-0014 删掉 audit 后没有任何行为层校验                |
| CI 自动 PR review                                   | code.claude.com/docs/en/code-review                              | **P1**：T0/T1 强制 review 可先由 CI 自动 review 预检兜底        |
| Token/成本观测                                      | code.claude.com/docs/en/costs                                    | **P2**：本仓有缓存治理准则但无任何用量度量                      |
| symbol 级代码导航                                   | large-codebases「code intelligence」                             | **P2**：find:usages 是 path 级                                  |
| 依赖/密钥安全自动化（secret scanning、audit）       | github.blog security 板块；claude-security 插件                  | **P2**：CI 无安全扫描步骤                                       |
| auto memory 类知识沉淀                              | code.claude.com/docs/en/memory                                   | 观望：本仓以 ADR/handoff 显式沉淀替代，不认为缺失               |

### 2.9 本仓有而业界少见 —— 多余还是超前

- **T0/T1/T2 状态机 + freeze/hash（超前）**：公开业界材料中最接近的只是「CI 必须绿 + 人类 approve」，本仓把证据链做成可机检 schema。风险是过程税：T2 之外每次改动要 new/start/freeze/review/approve/done 六步，若 agent 不读文档则全链条失效（guard 只在 commit 边界生效）——**过程的强度建立在 prose 遵从上，这是它与传统工程流程（人类有入职训练）的本质差异**。
- **Designer 角色与编排路由表（基本多余）**：业界（GitHub 2,500-repo 分析）结论是「不要做 general helper、按需建窄角色」；Designer 仅在产品需求启用且不写生产代码，实际可由 Manager 会话 + `emil-design-eng` 等 skill 覆盖（推断，依据 `.agents/skills/` 下各 `SKILL.md` 的 `description` 触发词分工；原分工表所在的 `.agents/skills/README.md` 已于 2026-09-19 删除）。作为可选机制保留成本不高，但排进了 AGENTS.md 常驻上下文。
- **重复主题权威来源表、invariant 锚点注释（半多余）**：ADR-0014 后锚点已无机器校验，保留为「人工检索」用——是惰性资产；权威来源表本身承担防重复的职责，保留合理。
- **浏览器证据三档 + agent:verify（超前）**：业界只有「screenshot 对比」层级；本仓的环境前置检查（rAF/时钟/可见性）是真实踩坑产物，建议保留。
- **中文 instruction 体系（中性）**：业界全部英文，但 agents.md 规范不限定语言，现代模型对中文指令遵从无显著差异（推断）；保持现状即可，无需改动。

## 三、优先级建议

**P0**

1. 给实施角色加执行隔离：评估启用 Claude Code sandboxed Bash（fs/network 边界）或把 coder 任务放进容器/dev container（sandbox-environments 的 threat model 对照），替代 `--dangerously-skip-permissions` 的裸奔面。

**P1** 2. `task verify` 支持执行模式：`--run <cmd>` 由脚本实跑并记录 exit code/耗时到 events，使 T0/T1 的 done gate 从自报变为可证。3. 恢复 instruction 体系的行为校验：为本仓自建 skills 与核心 rules 写最小 eval set（官方 plugin eval 格式），在 CI 中跑 `validate:context` 之外加一层行为回归。4. CI 接入自动化 PR review（Claude Code Code Review 或 Copilot AGENTS.md review），作为 T0/T1 独立 reviewer 之前的机器预检。

**P2** 5. token/成本观测接入 statusline 与 task events（`/usage` 数据、`--max-budget-usd`）。6. symbol 级影响面：code intelligence 插件或 LSP 补足 find:usages 的 caller 精度。7. CI 增加最基础的安全扫描（secret scanning / dependency audit）。

## 四、深化实证（260918 同日复核）

本节是对前三节结论的同日实证深化，方法为三路并行只读核查：① CLI 沙箱能力与 dispatch 配置实读（`codex 0.154.0` / `claude 2.1.267` 的 `--help`、`.agents/agents/manager.md`、`~/.codex/config.toml`、`.mise.toml`）；② 全量 task 事件账本解析（`<git-common-dir>/tasks/*.json` 共 10 个 task 的 `events[]` 时长与异常统计）；③ 盲区扫描（commit 归因、MCP 写权限面、注入入口、CI 执行面、权限白名单）。凡与前三节结论冲突处，以本节为准。

### 4.1 P0 定性修正：sandbox 是改配置（约 1 天），不是建基础设施

§1.4/§2.6 将「coders 零隔离」定性为需要引入隔离基础设施，实测修正：

- 两个执行体 CLI 都自带沙箱，是 dispatch flag 主动绕过了它们：`codex --yolo` 是 `--dangerously-bypass-approvals-and-sandbox -a never` 的别名（codex 0.154.0 实测）；`claude --dangerously-skip-permissions` 同理绕过权限层。
- codex 侧最小变更为 `codex -s workspace-write -a never --add-dir <例外路径>`；本仓 reviewer 角色的 `codex --sandbox read-only -a never` 已长期在用——沙箱路径可行性已被本仓自证。
- Claude Code 无 `--sandbox` CLI flag，但 sandboxed Bash 经 `--settings <file>` 按会话注入，支持域名级网络允许列表（强于 codex 的网络二元开关）。
- workspace 范围之外的例外共五类：主仓 `.git`（task state 写入 `<git-common-dir>/tasks/`，freeze/verify/guard 硬性需要）、共享 turbo 缓存（`.mise.toml` 的 `config_root/../.turbo-cache`）、pnpm 全局 store（install 需网络与 store 写入）、浏览器测试产物（Chrome/agent-browser 缓存目录）、registry + loopback 网络（dev server / vitest）。
- 残余风险（诚实记录）：`.git` 例外意味着被攻破的 coder 仍可篡改共享 VCS 元数据（hooks/refs），workspace 级并非严格沙箱；codex 开 `network_access` 后无域名过滤，其网络隔离基本失效。若只做一侧，Claude `--settings` 路线（域名级过滤）收益最大。

结论：P0 成本从「评估引入隔离体系（天级以上）」修正为「改 dispatch flags + 例外清单 + 实测闭环（约 1 天）」。

**勘误（260919）**：本节第 2 条「本仓 reviewer 角色的 `codex --sandbox read-only -a never` 已长期在用——沙箱路径可行性已被本仓自证」为假，据 §2.6 勘误同一条来源（`manager.md`「Dispatch permissions」把 Reviewer 列为完全访问）。本仓从未以 sandbox 参数启动过任何角色的 CLI，因此上面的「约 1 天」只有 CLI flag 存在性证据（`codex 0.154.0` 的 `--help`）支撑，缺少本仓实测闭环；成本估计降级为待验证，需要先跑一次 sandbox 化的 dispatch 再定档。另：文中 `.agents/agents/manager.md` 一类路径已于 260919 迁址到 `.agents/skills/herdr-agents/roles/`（见 [ADR-0015](../adr/0015-role-contracts-in-herdr-agents-skill.md)），本节作为当时的读取记录保留原路径。

### 4.2 「过程税」实测为轻，但遵从结论只覆盖编排者

对 10 个 task（2026-09-18，t0×2 / t1×5 / t2×3，全部终态 done，零 drop、零卡死）的 `events[]` 解析：

- 纯 gate 开销（freeze→review→approve→done 扣除实施时长）中位约 6-10 分钟/task；start→freeze 的 11.2 分钟主体是实施本身，不计入税。
- 7 次重冻结集中在 3 个可审 task，与 review 打回轮次一一对应——返工税集中在 gate 起作用的环节，属预期成本而非官僚税。
- 全部 T0/T1 具备 verify pass + approval，抽查 review pass hash == approve hash == 最终 diffHash，绑定有效。
- **样本局限**：单日、全部由同一 Manager 会话强制约束产生，证明的是「编排者遵从」；§2.3/§2.9 担心的「独立 coder 漂移导致 prose 链条失效」既未被证实也未被排除，仍是未受压假设。
- **新发现（前三节遗漏）**：review fail 从不落为显式 `result=fail` 事件，只能靠重冻结指纹反推打回——`events[]` 审计链弱于规范承诺，需 `scripts/task.mjs` 小改补齐。

### 4.3 报告盲区：两个新缺口

| 缺口                     | 事实                                                                                                                                                                                                                                     | 定级           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| MCP 写权限面未随角色收权 | 仓库 `.mcp.json` 向所有加载它的会话开放 github MCP 全套写工具（push_files / merge_pull_request / delete_file / create_repository / issue_write），活跃于 Manager 会话并携带运行中 PAT；reviewer 只读白名单（§2.6 强项）未延伸到 MCP 配置 | P1（成本低）   |
| 注入入口零防御           | gh api / github MCP 拉取的外部内容（issue、PR diff、外部 repo 文件）直接进入 review 与研究循环，无「数据非指令」约束，为当前最大不可信输入                                                                                               | P2（一行规则） |

CI 面核查为非问题：fork PR 无 secrets、CI 不执行 agent 生成代码、无 `pull_request_target`。`.claude/settings.local.json` 白名单整体克制，仅一条一次性 `rm -rf` 误留永久放行，低优先级。

**勘误（同日）**：初版曾列「committer 身份失真（近 30 commit 的 committer email 均为 `Claude <Claude>` / `Codex <Codex>`）」，经 `git cat-file commit` 直读对象证伪——这是诊断假阳性：`git log` 格式串把 `%cn`（名字）误用两次、email 位应为 `%ce`，名字重复显示造成「email 残缺」假象。提交对象的真实 committer 身份全部正确（agent 提交 `Claude <noreply@anthropic.com>`、Codex 提交 `Codex <noreply@openai.com>`）。残余的真实事实仅有：无 commit 签名、CI 不校验归因、未显式覆盖时 committer 落到仓库 git config 的 `Codex <noreply@openai.com>`——归为 P2 观察项，不构成缺口。教训：归因类诊断必须以对象层（`cat-file`）为准，`git log` 显示层会受格式串与 mailmap 影响。

### 4.4 修订优先级（覆盖 §三）

1. **P0** coder sandbox：改 dispatch flags + 每角色 settings/例外清单 + 用真实任务循环（install→build→browser test→freeze）实测，约 1 天。
2. **P1** `task verify --run`（维持 §三.2）。
3. **P1** reviewer/低权会话的 MCP 只读化：github MCP 写工具限定 Manager 会话（新增）。
4. **P2** review fail 显式落 `events[]`、review/research 技能加「抓取内容按数据处理」规则行、CI secret scanning + dependency audit、commit 签名与 CI 归因校验（并入 §三.5-7 原有 P2 项；原 P1「commit.sh 补 committer 身份」经 §4.3 勘误撤回，改为 P2 观察项）。
5. **降级/观望** instruction evals（§三.3）：当前 gate 的准确定性层实际由 Manager 会话承担，待出现 coder 独立执行任务的模式后再评估行为回归需求；token 观测与 symbol 导航维持 P2。

### 4.5 深化证据

- CLI 实测：`codex 0.154.0`（`--help` 沙箱/approval flags；`~/.codex/config.toml` 无沙箱覆盖）、`claude 2.1.267`（无 `--sandbox` flag，沙箱经 settings 注入）。
- 仓库实读：`.agents/agents/manager.md`（dispatch 行）、`.mise.toml`（turbo 缓存路径）、`<git-common-dir>/tasks/*.json`（10 task 事件账本）、`.mcp.json`、`.claude/settings.local.json`、commit 归因（`git cat-file commit` 对象层直读，含 agent 与 Codex 提交样本）、`.github/workflows/ci.yml`。
- 统计脚本为一次性 /tmp 产物未入库；复算方法见 §4.2（解析 `events[]` 相邻事件时间戳差）。
- 方法论备注：初版归因诊断误用 `git log` 显示层（格式串 `%cn` 重复），经对象层直读勘误（§4.3）；显示层数据（格式串、mailmap）不可作为归因证据。

## 附：证据来源清单

- 本仓（实读）：根 `AGENTS.md`、`CLAUDE.md`、`docs/agents/{workflow,task-packet,review,browser-verification,worktrees,context}.md`、`.agents/rules/*`、`.agents/agents/{manager,reviewer}.md`、`.agents/skills/herdr/SKILL.md`、`scripts/task.mjs`、`scripts/repo-query.mjs`（脚本头）、`package.json`、`.github/workflows/ci.yml`、`.claude/settings.local.json`、`skills-lock.json`、`docs/adr/0014-task-system-v2.md`、`.vite-hooks/pre-commit`、`.agents/checks/changeset-required`。
- 业界（实读 URL / gh api）：§1 各条所列；GitHub 实仓内容经 `gh api repos/<owner>/<repo>/contents/...` 取得（openai/agents.md、openai/codex、vercel/next.js、microsoft/vscode、google/eng-practices）。
- 未能核实：developers.openai.com/codex/guides/agents-md 全文（网络策略拦截，仅能引用 openai/codex 仓库内 stub 指针与 AGENTS.md 实例）。

# ADR-0014: Task 体系 v2

- **Date**: 2026-09-18
- **Status**: 已接受
- **Supersedes**: [ADR-0010](0010-agent-role-orchestration.md) 的任务状态机与 mode 词汇、[ADR-0012](0012-instruction-risk-tiering-and-pre-authorized-operations.md) 的风险分级表
- **Amends**: [ADR-0011](0011-agent-model-binding-and-effort.md)（角色默认模型与思考强度分档取消，模型与思考强度由用户会话设置或 Manager 按任务指定）

## 背景

旧 task 体系（ADR-0010/0012）经 89 个 task state 的量化审计后确认：证据链（baseSha/diffHash/review/approval/verify）与提交门禁零故障，但存在四类残余问题——mode 字段名不副实（`orchestrated` 实际是风险档，27/27 单角色；`release`/`hotfix` 在脚本中零行为分支）、post-merge close gate 与 squash merge 结构性冲突、状态残留与快照丢失只能手写 `forcedClose` JSON、`affectedWorkspaces`/`allowedPaths` 是无写入者的 schema 残留字段。用户决定推翻重来：重建一套脱离具体业务的抽象 task 内核，级别只表达 workflow 严格程度，软件迭代操作（release/hotfix）降级为 playbook 文档。

## 决策

### 1. 级别词汇 T0/T1/T2，取代 mode 与风险分级

task 唯一的分档字段是 `level`（t0/t1/t2，T0 最严格），只表达 workflow 严格程度，不再以「风险等级」为主要维度。旧分级判据（跨 workspace、公共契约、多 worktree、instruction system 等）保留为分档规则。P2 的 skip review 场景由 T2 档位吸收（免审、允许当前 worktree 直接修改、guard 只要求 active）；`--review skip` 开关删除。（2026-09-20 加固：「只要求 active」只描述证据链门槛，政策检查照跑，见 §4。）（2026-09-21 修订：T2 明确定位为「所有简单快速改动的兜底档」，因此 `new`/`start` 对它不再要求 worktree 干净——干净要求的存在理由是 freeze 的全量 staging，而 T2 的快速通道不经过 freeze。豁免止于 start：T2 若为验证留痕而主动 freeze，freeze 自己要求干净起点，否则那条失效面对 T2 一样成立（「干净」含未跟踪文件，所以按 `new → start → 修改 → freeze` 的序列走必然撞墙，留痕用的那次 freeze 实际上在改动 commit 之后）。它换来的是低摩擦，交出去的是 diff 边界：T2 的提交内容就是当时的 index，要被人 review 或要能整笔回滚的改动不属这一档。）

### 2. 状态机与终态

```text
open -> active -> frozen -> reviewed -> approved -> done
（任何未完结状态可 -> dropped，需 --reason 与 --by）
```

- `dropped` 是带 reason 的强制终态，取代手写 `forcedClose`/`closedReason` 与残留 task 的手工 JSON 清理。（2026-09-20 加固：`drop` 除 `--reason` 外还要求 `--by <agent-id>` 署名，事件记 `{reason, by}`——重新 freeze 同样能推翻已冻结的证据，但之后还能走完整流程，`dropped` 却是这条 task 证据的不可逆终点，所以必须留下「谁做的」和一句后来者读得懂的话；参数门槛与其先后顺序的操作性定义在 `docs/agents/workflow.md`。）
- review `fail` 使 task 回到 `active`，修复后重新 freeze。
- freeze 可从 `frozen/reviewed/approved` 重入（重算 hash、重置 review/approval），stale 恢复不需要独立 reopen 命令。
- post-merge（集成后验证）gate 删除：合并后正确性交给 CI 兜底。
- committed/integrated/verified/closed 等中间相位删除：验证是证据记录而非相位。

### 3. 证据与事件

- 状态存 `<git-common-dir>/tasks/<task-id>.json`，跨 worktree 共享，schema 单版本。
- `events[]` append-only 事件日志记录全部状态转换（含重 freeze、drop 的原因与署名人、历次 owner），取代 `manualInterventions` 手工补记。
- `verify` 只记录证据、不执行任何命令，因此 `--result pass|fail` 必须显式给出。（2026-09-20 加固：原先缺省为 `pass`，等于让只留痕的命令替使用者宣布通过；省略即拒绝。）
- 快照指纹沿用 baseSha + 工作区内容的确定性 hash；commit 前后同一内容 hash 不变，guard 与 done 的「hash 一致」校验横跨 commit 边界。

### 4. 归一化与政策检查分离

- freeze 归一化：`git add -A` → `CI=true pnpm run fix:code` → 重新 staging → 计算 diffHash。pre-commit 只保留 `pnpm task guard`，不运行任何 fixer，结构性消除「commit 期改写导致冻结失效」竞态（旧体系的 `vp staged` 双管线收敛方案随之退役）。（2026-09-20 加固：全量 staging 的范围边界改由 `new`/`start` 守住——T0/T1 的 `open → active` 要求 worktree 干净，创建期那次检查不再是唯一一次，「冻结 diff 只含本 task 改动」由此成为可依赖的前提。2026-09-21 修订：这条干净要求只留给你真会 freeze 的档位，T2 的 start 豁免，见 §1；豁免不传染给 freeze 本身——脏 worktree 上的 T2 调 freeze 被直接拒绝，否则「`git add -A` 只会扫进本 task 的改动」这个前提对 T2 就是空的（此前文档与注释把它写成「T2 不 freeze 所以不存在」，是措辞盖过了实现）。）
- 仓库级政策通过 `.agents/checks/` 可执行检查挂载，freeze 在取快照前执行、非零退出即中止；检查进程经环境变量拿到 task id、level 与 baseSha。内核因此零政策词汇——它不知道任何检查核对什么，唯一的例外是下一条登记的无 task 白名单（一个检查名）。本仓的 `changeset-required` 检查是第一条政策，对全部级别无豁免（release 聚合 diff 对 base 天然包含被聚合 task 的 changeset）。（2026-09-20 加固：同一批检查还在 `guard` 放行提交前再跑一次，两个边界各自核对哪一份拷贝按检查而定——`changeset-required` 的文件清单与内容都取自 staged 条目，不回落到工作区的同名文件，`format-clean` 判的则是工作区副本，见下一条（2026-09-21 修订：此处原写「两个边界核对的都是 index」，那是把一条检查的口径写成了边界的属性）——T2 一般不 freeze，只挂 freeze 的检查对它形同不存在，「无豁免」此前只是断言；`changeset-required` 同时核到内容层，只含两行 `---` 的空壳仍是 commit.md 认可的「无版本影响」声明，细则以 `.agents/checks/changeset-required` 与其注释为准。代价是「无豁免」止于有 task 的提交：没有 active task 的 worktree 不受任何核对 task 交代物的政策约束，只过 `alwaysOnChecks` 白名单里那条与 task 无关的检查（下一条），task gate 本身对它放行。2026-09-21 修订：检查进程以 pipe 接管两段输出、不会自己上终端，所以「中止并给出原因」必须把 stdout 与 stderr 一起回显——`vp check` 这类工具把「哪个文件、为什么」写在 stdout、只把一句 error 写在 stderr，只留 stderr 等于把检查给出的理由整段丢掉，这条对所有检查成立而不只是 `format-clean`。）
- 清洁度保证（格式、lint 与类型）与 task 档位解耦（2026-09-21）：上一条留下的洞是「T2 与无 task 提交都不经过 freeze，所以没有任何东西保证提交是干净的」。解法不是把它们拉回 task 体系（为改一行文档新建 worktree、装依赖、freeze，代价与改动不成比例），而是加一条与 task 无关的 `.agents/checks/format-clean`：读 `git diff --cached --diff-filter=ACMR` 的暂存清单，把工作区副本交给 `vp check` / `stylelint` / `gofmt -l` 判定。判定范围比「格式化」宽：`vp check` 一次跑格式、lint 与类型，所以它拦下的不只是没跑过 fixer 的文件，报错提示也因此指向 `vp check` 的输出而不是某条 fix 命令。它**只检不改**——fixer 若改写文件就会破冻结不变式，而 `vp staged` 那类工具为处理部分暂存要动用 stash，会把别人的在制品卷进来，这两条正是退役它的原因。「只检不改」因此是被机器守住的：调用形状是 flag 在前、路径在后，仓库根一个真名叫 `--fix` 的文件会变成一个真的 fixer 开关，所以以 `-` 开头的暂存路径直接 fail-closed，而不是依赖各工具对 `--` 分隔符的解释；被 git C-引号化的名字（含引号、反斜杠或换行）一起拒绝，因为磁盘上没有对应文件，放过去就是畸形文件静默漏检；gofmt 非零退出（读不了、语法错）也当作拦住，不留在 `set -e` 的静默中止里。为此 guard 的无 task 分支不再直接放行：`scripts/task.mjs` 的 `alwaysOnChecks` 白名单决定哪些检查连无 task 提交也要过，`format-clean` 在列、`changeset-required` 不在列（一条没有 task 的提交无从交代起于哪个 task，硬要 changeset 只会逼人写空壳）。新增检查默认不登记，所以后果是少一层保证而不是拦住合法提交；登记过的则必须真的执行到——检查按「普通文件 + 执行位」挂载，丢掉 +x 就能让这条唯一的无 task 保证静默消失，所以白名单跑完后要核对覆盖度。覆盖度核对的限度也写清楚：它问的是「登记的检查执行到了没有」，所以把 `AGENT_VP_CMD` 之类的工具入口指向一个必定成功的程序，检查仍登记为跑过、guard 输出与真通过不可分辨——那条不由机器守住，落在 `docs/agents/commit.md` 的禁止绕过清单里（与删掉整个 `.agents/checks/` 目录同族，都不改受版本控制的内容、都只能靠 review 发现）。口径差异是明确接受的：`format-clean` 判工作区副本，与内核快照同口径（`currentSnapshot` 也按工作区字节算 hash）。

### 5. review 拓扑与绑定表

- T0 强制独立 reviewer 会话；T1 强制 review、允许 Manager 派 fresh subagent；T2 免审或 coder 自派 fresh subagent。全程禁止同一会话自审。reviewer id 校验 `^[A-Za-z0-9][A-Za-z0-9._-]{3,39}$` 且必须 ≠ owner。（2026-09-20 加固：同一条形状校验按 `AGENT_ID` 复用到 approver、drop 署名人与显式申报的 `--owner`（登录名兜底不受限），四个声明身份的字段落在同一字符集里「互不相等」才比的是人而不是字形；reviewer 与 approver 比对的是 owner **历史**而非现值——`assign` 没有相位限制，只比现值会被「先派给别人、再回来批自己」绕开；approver 还须 ≠ 本轮 reviewer。三个身份互不相同才让「独立验收」成为机器事实，但 id 本身仍是自报的，内核防的是误用而不是合谋。）
- 角色 → 执行体绑定表只保留 role 与 executor 两列；默认模型与思考强度分档取消（amends ADR-0011）。绑定表适用于主工作流（herdr + Claude Code / Codex CLI）；任何其他执行体（zcode、workbuddy、pi 等）可承担任一角色，目录边界、task gate、reviewer ≠ owner、handoff 字段等机器强制约束不变；T0/T1 在 task packet 记录替代执行体。
- 编排派发按受影响 workspace 数据驱动：单 workspace 单 coder，跨 workspace 拆 handoff，Designer 按需。

### 6. 测试约定

`scripts/` 采用 Go 风格对称约定：每个脚本一个 `<name>.test.mjs`，`test:scripts` 以 glob 执行全部 `scripts/*.test.mjs`，新增测试文件零注册。

### 7. 载体与迭代

内核实现于 `scripts/task.mjs`（`pnpm task`），不抽独立 package（等第二个消费者出现）；workflow 自迭代维持 prose 政策 + `validate:context` + ADR 流程，不引入 policy 配置引擎。

## 后果

- `scripts/agent-workflow.mjs` 与 `agent-workflow.test.mjs` 删除，`agent:workflow` script 由 `task` 取代；`.vite-hooks/pre-commit` 只剩 `pnpm task guard`。
- 旧 task state 目录 `agent-workflow/` 清空后，`<git-common-dir>/tasks/` 是唯一执行真相。
- release/hotfix 不再是 task 体系概念；release.md 改述为 release playbook，hotfix 独立成 playbook，各自声明如何满足级别 gate（workflow 文档重建阶段落地）。（2026-09-20 修订：hotfix 不再独立成文件，`docs/agents/hotfix.md` 已删除，正文内联在 `docs/agents/workflow.md`「Playbook」节；本条「hotfix 不是 task 体系概念、按级别 gate 满足要求」不变。同日 `validate:context` 去掉的只是 Agent 指令文档语料的存在性断言（入口面 `AGENTS.md`/`CLAUDE.md`/`package.json` 仍要求存在），ADR 的发现性从「`CONTEXT.md` 逐条索引」改为「每份编号 ADR 至少有一条来自其他指令文档的入站链接」，不再把 `CONTEXT.md` 的体积钉成契约；断链、与实现事实漂移、绑定表与 frontmatter 一致性、pre-commit allowlist、必经命令和软链等检查保持不变。）
- 跨包集成损坏不再有 post-merge gate 兜底，依赖 CI；`fix:code` 依赖 node_modules，冷 worktree 需先安装依赖。
- instruction 预算基线（`scripts/instruction-budget.json`）随 `audit:instructions` 一并退役，不再维护。

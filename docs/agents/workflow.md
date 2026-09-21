# 开发与协作工作流

本文件是 monorepo 所有实施任务的必经流程。它定义任务级别、状态机、变更证据和角色交接；内核实现见 [`scripts/task.mjs`](../../scripts/task.mjs)（`pnpm task`），worktree 细节见 [`worktrees.md`](worktrees.md)，release playbook 见 [`release.md`](release.md)、hotfix playbook 见本文「Playbook」节，任务交接包见 [`task-packet.md`](task-packet.md)。Herdr、Claude、Codex 等只是执行适配层，不改变本流程的状态和 gate。任务体系的完整决策见 [ADR-0014](../adr/0014-task-system-v2.md)。

## 先建立任务

<!-- invariant:workflow-states -->

所有实施任务（判据见「任务级别」）必须先完成以下 preflight：

1. 查看 `git status --short --branch`，确认当前工作区和目标 worktree 的已有变更归属。
2. 读取根 `AGENTS.md`、本文件和命中的 rule/guide；进入 workspace 后读取最近的包级 `AGENTS.md`。
3. 为任务选择唯一、不可变的 task id 和级别（T0/T1/T2，T0 最严格）。
4. 在目标 worktree 执行（新 worktree 先跑一次 `pnpm install && pnpm run build`，判据见 [`worktrees.md`](worktrees.md)「创建和复用」）：

   ```sh
   pnpm task new --task <task-id> --level t0|t1|t2 --issue <issue-url|N/A>
   pnpm task assign --task <task-id> --roles <role,...> --worktree <path>
   pnpm task start --task <task-id>
   ```

5. 记录范围、验收标准和所需验证；推荐写入 task packet。GitHub issue 是可选追踪镜像，创建时经 `--issue` 记入 task state；`status` 会对缺失 issue 的 task 打 stderr 提示，事后补挂用 `issue` 子命令。issue 只作追踪镜像，不是执行真相，本地 task state 不能依赖外部服务。

## 任务级别

<!-- invariant:risk-tiering -->

级别代号 T0/T1/T2（T0 最严格），只表达 workflow 严格程度。判据全部可从变更路径、manifest 和 `pnpm find:usages` 输出查证，不依赖主观的「大改/小改」判断；判据本身描述的是变更的影响半径，不是任务的价值排序。

| 级别 | 判据（命中任一即属该级）                                                                                                                                                                                         | worktree                             | review                                       | approval | done 前 ≥1 条 pass 验证 | commit gate（guard）               |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------- | -------- | ----------------------- | ---------------------------------- |
| T0   | 跨 workspace 的公共 API/exports/事件/类型契约；依赖、catalog、lockfile、构建配置或 CI；聚合发布或多 worktree 并行                                                                                                | 专属 task worktree                   | 强制，独立 reviewer 会话（reviewer ≠ owner） | 必须     | 是                      | approved + hash 一致 + checks 通过 |
| T1   | 跨多个 workspace（`apps/*` / `packages/*`）但不改 T0 所列契约；公共导出变更但消费者仍在同一 workspace；改动 instruction system、`.agents/` 或根 `scripts/*.mjs` 的行为                                           | 专属 task worktree                   | 强制，允许 Manager 派 fresh subagent         | 必须     | 是                      | approved + hash 一致 + checks 通过 |
| T2   | 改动全部落在一个 workspace 内，或只落在 `docs/` 等仓库根文档目录；且不改依赖字段与 lockfile、不改 CI 与 workspace 配置、不改被其它 workspace 消费的导出符号、不改 instruction system 与根 `scripts/*.mjs` 的行为 | 允许当前 worktree 直接改，不要求干净 | 免审（可自派 fresh subagent）                | 不要求   | 推荐不作强制            | active + checks 通过               |

多级同时命中取最高级（T0 > T1 > T2）。级别判定可机器查证：`pnpm find:usages -- <paths...>` 只输出一个受影响 workspace 时，T2 的单 workspace 条件成立。本表是每级严格程度的唯一权威，「状态机」节不复制。表里的 `checks` 指 `.agents/checks/` 下的仓库政策检查，三个级别在提交前一律要过，与是否 freeze 无关；本仓当前有两条——`changeset-required`（只对有 task 的提交）与 `format-clean`（对每一条提交，含没有 task 的），细则以这两个脚本自身的注释为准。

release playbook 与 hotfix playbook 是普通 task 在特定场景下的操作程序（见「Playbook」节），它们不是 task 体系的概念。

## 预授权操作

<!-- invariant:pre-authorized-ops -->

以下操作属于已知安全的工作流，直接执行并修复本次改动导致的问题即可，不必逐步请示：

- 运行仓库既有测试与校验命令：`pnpm test`、`pnpm run test:scripts`、包级 `test`、`pnpm run check:code`、`pnpm run check:cspell`、`pnpm run validate:context`。
- 修复本次改动导致的失败并重跑受影响的测试。
- 包级 build 与 `pnpm run build`。
- 只读查询：`pnpm find:usages`、`pnpm inspect:contract`、`pnpm diff:contract`、`pnpm task status`、`git status`、`git diff`、`git log`。
- 在目标 worktree 内读取任意文件。

以下操作仍必须逐次获得用户明确授权：commit、push、merge、tag、publish、release；依赖、catalog、lockfile 的任何改动；`.npmrc`、`.mise.toml` 与 Git 配置；凭证、密钥与 `.env` 的读写；破坏性 git 操作（`reset --hard`、`push --force`、`clean`、`stash`）。

## 状态机

任务状态保存在 Git common dir 的 `tasks/<task-id>.json`，不进入工作树版本控制。状态只能按以下顺序推进：

```text
open -> active -> frozen -> reviewed -> approved -> done
                                                    （任何未完结状态可 -> dropped，需 --reason 与 --by）
```

实际命令与状态的关系：

| 阶段       | 必要条件                                                                    | 命令或交接          |
| ---------- | --------------------------------------------------------------------------- | ------------------- |
| `open`     | 有 task id、level、base SHA、branch、worktree                               | `pnpm task new`     |
| `active`   | 由 `open` 进入时 preflight 已完成，且（T0/T1）worktree 干净（无未提交改动） | `pnpm task start`   |
| `frozen`   | 变更路径和内容已形成稳定快照                                                | `pnpm task freeze`  |
| `reviewed` | reviewer 对冻结 hash 给出 `pass`；`fail` 使 task 回到 active                | `pnpm task review`  |
| `approved` | 对同一个 hash 批准并记录 approver                                           | `pnpm task approve` |
| `done`     | 交付结论已记录，验证 gate 通过                                              | `pnpm task done`    |
| `dropped`  | 任务终止或残留清理，强制 `--reason` 与 `--by`                               | `pnpm task drop`    |

以下 gate 是硬条件：

- 未 `new` 不得实施；未 freeze 不得 review；review 和 approval 必须绑定同一个 `diffHash`。
- `new` 与 `start`（仅 `open → active` 这一次）对 T0/T1 要求 worktree 干净，T2 豁免：freeze 用 `git add -A` 归一化整个 worktree，实施起点没有别人的在制品，冻结 diff 才只含本 task 的改动。豁免只到 start 为止——T2 若为留痕而主动 freeze，freeze 自己要求干净起点（`git add -A` 的失效面对哪一档都一样真，豁免只是把检查从 start 移到 freeze）。review `fail` 回到 active 后不复查干净度。
- 冻结 `diffHash` 的 canonical 口径是 `scripts/task.mjs` 的快照哈希（sha256 依序吸收 baseSha 与每个快照文件的路径、mode、内容，覆盖 tracked+untracked），不是 git diff 的摘要；reviewer 核验冻结一致性以 `pnpm task status --task <id>` 的 `live` 比对（hash 一致 + 非 stale）为准，不要用 `git diff | shasum` 自制配方复算。
- freeze、review 或 approval 后任何文件变化都会使证据 stale；必须重新 freeze（重算 hash 并重置 review/approval），再重复 review、approve。
- owner、reviewer、approver、drop 署名人共用同一套 id 形状（显式 `--owner` 也要过这道校验，只有登录名兜底不受限），且一起构成可比对的留痕；「≠」到底比谁，以「review 拓扑」节为权威，本节不重复。
- `pnpm task verify` 必须显式给出 `--result pass|fail`：它只记录证据、不执行任何命令，省略结果不等于通过。verify 只接受非 stale 的结果，pass 验证还要求工作区干净（验证必须覆盖已提交内容）；`done`（T0/T1）要求最新一条验证为 pass 且快照与验证时一致。
- T2 的快速通道：`new → start → 修改 → done`，guard 不要求快照证据，也不要求 worktree 干净，但仍会跑 `.agents/checks/` 政策检查。它换来的是「一条带署名的快速改动路径」，代价是这一档的提交内容就等于当时的 index——别人的在制品一旦被 `git add` 进来就会一起提交，T2 不提供 diff 边界。要为验证留痕可以 freeze，但那一笔的前提是 worktree 干净（干净要求的由来见上面 `new`/`start` 那条；`live.clean` 把未跟踪文件也算在内，所以实际上必须先把改动 commit 掉再 freeze）。需要清晰边界（要被 review、要能整笔回滚）的改动升 T1 并用专属 worktree。

常用命令：

```sh
pnpm task status --task <task-id>
pnpm task freeze --task <task-id>
pnpm task review --task <task-id> --result pass --reviewer <reviewer-id>
pnpm task approve --task <task-id> --approver <independent-approver-id>
pnpm task verify --task <task-id> --name "pnpm test" --result pass
pnpm task issue --task <task-id> --ref <issue-url|N/A>
pnpm task done --task <task-id>
pnpm task drop --task <task-id> --reason <why> --by <your-agent-id>
```

freeze 自身执行归一化管线：`git add -A` 全量 staging（快照语义本就覆盖全部 tracked+untracked 文件），运行 `CI=true pnpm run fix:code`，把归一化后的内容计入 `diffHash`。归一化是强制的。声明了 `fix:code` 的仓库若依赖未安装，freeze 直接失败；先在 worktree 里执行 `pnpm install && pnpm run build` 再重试。只有不含 `fix:code` 脚本的仓库（测试 fixture、纯 git 仓库）才跳过。pre-commit 只保留 guard、不运行任何 fixer，因此不存在 commit 期改写文件导致冻结失效的竞态；commit 边界的清洁度（格式、lint 与类型）由 `.agents/checks/format-clean` 以「只检不改」的方式兜住。

`.agents/checks/` 下的可执行政策检查（以 POSIX sh 运行、需要 +x）在两个边界各跑一次：freeze 取快照前、guard 放行提交前，失败即中止，并把该检查的 stdout 与 stderr 一起作为原因回显（工具常把「哪个文件、为什么」写在 stdout、只把一句 error 写在 stderr，留一段就等于把理由丢掉）。挂在 guard 上是必要的——T2 一般不 freeze，政策若只跟着 freeze 走，对最常见的 T2 就形同不存在。有 active task 时全部检查都跑；没有 task 时只跑 `scripts/task.mjs` 的 `alwaysOnChecks` 白名单（当前是 `format-clean`），因为像 `changeset-required` 那样核对 task 交代物的检查，对一条没有 task 的提交只能逼人补一个空壳。白名单是无 task 路径上唯一的保证，所以内核跑完后核对它被完整执行：登记的检查被删、变成目录或丢掉 +x 时 guard 硬失败并点名，而不是静默跳过（整个 `.agents/checks/` 目录不存在的仓库——测试 fixture、未挂政策的仓——不适用这条核对，本地删掉整个目录不提交因此是已知旁路；同族还有一条是把 `AGENT_VP_CMD` / `AGENT_STYLELINT_CMD` / `AGENT_GOFMT_CMD` 指向必定成功的程序，因为覆盖度核对的是「登记的检查有没有执行到」，看不见检查被掏空，`commit.md` 的禁止清单因此把那种 env 覆盖也算作绕过提交 hook，尽管它不改任何受版本控制的文件；那个白名单集合本身是内核里唯一与本仓绑定的登记项，换仓复用要么改成随仓声明、要么清空）。本仓两条检查的口径分别是：`changeset-required` 核对 index（文件清单取自 `git diff --cached`，内容也读 staged blob 而不是工作区的同名文件——freeze 前内核已 `git add -A`，guard 放行的提交内容就是 index），所以没 `git add` 的 changeset 不算交代过，「工作区里已经补好了但没 add」也不算；`format-clean` 按 `--diff-filter=ACMR` 取暂存文件，把工作区副本交给 `vp check` / `stylelint` / `gofmt -l` 判定且不带 `--fix`，所以「改了没 add」和「add 了没改」都会以工作区那一份为准；拦下的不只是没跑过 fixer 的文件——`vp check` 一次判格式、lint 与类型三件事，报错里的提示指向 `vp check` 自己的输出，因为 fixer 修不掉类型错误（未 `pnpm run build` 的 worktree 会在这里报出成片假 `TS2307`，见 [`worktrees.md`](worktrees.md)）。以 `-` 开头、或被 git C-引号化（名字里含引号、反斜杠或换行）的暂存路径直接 fail-closed——前者会变成一个真的 fixer 开关而不是一个参数，后者在磁盘上没有对应文件，放过去就是畸形文件静默漏检；git 不引号化的 glob 元字符不在覆盖面内，`vp check` 与 stylelint 都会把入参当 pattern（实测 `vp check 'scripts/*.mjs'` 展开成 13 个文件），所以那一类命名既可能漏检、也可能把未暂存的文件拉进来拦提交，而按元字符拦截会把本仓跟踪的 `apps/vue-web-ui-demo/src/pages/[...all]/index.vue` 一起拒掉，残余仍由全仓 `check:code` 兜住。检查清单会回显在 `guard` 与 `freeze` 的输出里（`checks`，以及 freeze 事件中的 `checks`）。

提交边界由受版本控制的 `.vite-hooks/pre-commit` 再次检查。它通过 `pnpm task guard` 自动发现当前 worktree 的 active task；T0/T1 只有 `approved` 且冻结 diff 未变化时才允许提交，T2 只要求 active；两个级别在放行前都要通过上述政策检查。没有 active task 时 task gate 本身放行，但仍会跑 `alwaysOnChecks`（即 `format-clean`，未通过检查的工作区副本照样拦住提交），并在 stderr 写下 `task gate: not enforced` 给出 `pnpm task new` 的入口——静默放行会让「这个仓没门禁」和「忘了建 task」看起来一模一样。这道门禁的强制力止于留痕与拦下一次提交：没有 active task 的 worktree 只有这条与 task 无关的清洁度检查，管不到它要不要 task、改动归谁，上游的 `h` 包装脚本也保留 `HUSKY=0` / `VP_GIT_HOOKS=0` / `VITE_GIT_HOOKS=0` 环境变量旁路。真要绕过，留下的是一个没有 task 证据的 commit，而 CI 只在被改动的包需要版本时才因缺 changeset 失败——纯 docs 与 root 变更不会——所以最终发现它的是 review。也因此「不得绕过提交 hook」是 [`commit.md`](commit.md) 的授权口径，不是机器保证。提交 hook 保护的是 commit 边界，不能替代实施前的 `new` 和 `start`。这条无 task 路径还覆盖 CI 里唯一的那次 `git commit`：`changeset-version.yml` 先经 `./.github/actions/setup-deps` 跑 `pnpm install --frozen-lockfile`（`prepare: vp config` 因此把 `core.hooksPath` 指到 `.vite-hooks/_`，该 job 没有设 `HUSKY` / `VP_GIT_HOOKS` / `VITE_GIT_HOOKS`），随后 `changesets/action` 为版本 PR 提交，所以只要那次提交走正常 hook，它就得过 `format-clean`（上游是否带 `--no-verify` 在这里核不了，留作未知）。这条路径还没在带 `alwaysOnChecks` 的配置下真跑过，所以下面是按文件形状的推演而不是实测：只动 npm 包时，暂存的是 `CHANGELOG.md`（在 `vp` 的格式 ignore 里）、`package.json`（changesets 写出的字节已是规范形状）与被消费的 `.changeset/*.md`（删除，不进 `--diff-filter=ACMR` 清单）；bump 到不在 `ignore` 里的 `@greypan/interweave`（`privatePackages.version: true`）时，`release:version` 还会跑 `sync:version` 写出 `build/config.yml` 与 wails3 产物，其中 `build/windows/info.json` 是 JSON、会被判。而走不到这条检查的分支更多：hook 是 `mise exec -- pnpm task guard`，该 job 只 `mise install node pnpm`，所以 mise 补齐工具、pnpm 起不起得来、`wails3` 在不在，都排在 `format-clean` 前面。结论只能是「没有证据说它会炸，也没有证据说它不会」：版本 job 失败时先分清是这条检查拦的、前面那条链路断的，还是那次提交压根没跑 hook。

每次状态转换都会追加到 state 的 `events[]` 时间线，不需要任何手工补记：`freeze` 记 diffHash、`reFreeze`、`normalized` 与 `checks`，`review`/`approve` 记 diffHash 与身份，`new`/`assign` 记 owner 与 worktree，`drop` 记原因与署名人 `by`，`start`/`done`/`verify` 只记时间戳与各自字段（verify 的 diffHash 存在 `verification[]` 而不是事件里）。被取代的旧 hash 不单独留存：它由后一条带 hash 的事件与 `pnpm task status` 的 `live` 比对隐含。

## 角色与执行体

角色定义会话身份、职责边界和协作方式，与单个 task 解耦；执行体是承担该角色的 CLI/agent。角色 → 执行体的唯一权威绑定表在根 [`AGENTS.md`](../../AGENTS.md) 的「多 Agent 编排」节，本文件不复制表格；模型与思考强度由用户会话设置或 Manager 按任务指定，不设角色默认（见 ADR-0014）。

- 绑定表适用于主工作流（herdr + Claude Code / Codex CLI）；任何其他执行体（zcode、workbuddy、pi 等）可承担任一角色，目录边界、task gate、reviewer ≠ owner、handoff 字段等机器强制约束不变。T0/T1 在 task packet 记录替代执行体与理由。
- Reviewer 独立于实施者，以冻结的 `diffHash` 为审查对象；拓扑见「review 拓扑」。

## 编排模式

<!-- invariant:orchestration-routing -->

Manager 统一接收需求并编排，保持扁平，不引入 Integrator 或其他中间层级。coder 数量按影响面数据驱动派发，不按 mode 或默认编队：

1. 受影响 workspace 是一个（以 `pnpm find:usages` 输出为准）→ 单 coder 实施。
2. 受影响 workspace 跨 `packages/*` 与 `apps/*` → Manager 拆成两个 task、两个 worktree，契约通过 handoff 传递。
3. 需求涉及产品设计/UI → 先经 Designer（判据是需求性质，不是改动大小），结论与理由写入 task packet。

- 目录边界固定：Lib Coder 只在 `packages/*` 写入，Biz Coder 只在 `apps/*` 写入。
- 每个角色一个独立 worktree（或严格目录隔离）与唯一 owner；同一 worktree 同时只服务一个可变 task。
- 角色之间统一使用结构化 handoff，五个必填字段以 [`task-packet.md`](task-packet.md) 的模板为权威；缺少任一项不得进入实施或验收。
- 集成与发布聚合由 Manager 直接协调（见「Playbook」节），不设独立编排角色。

## review 拓扑

- **T0**：独立 reviewer 会话（新起的 claude/codex 进程，与实施角色同等权限但不参与实施），不接收实施者的叙述，只审冻结 diff 与证据。
- **T1**：强制 review，Manager 派 fresh subagent 即可（subagent 只接收冻结 diff 与证据，独立性接近独立会话）。
- **T2**：免审；若要审，coder 自派 fresh subagent。
- **任何级别禁止同一会话自审**：实施者复核自己的 diff 不构成 review。
- owner、reviewer、approver、drop 署名人共用 id 形状 `^[A-Za-z0-9][A-Za-z0-9._-]{3,39}$`（如 `claude-code-reviewer-45a5b9eb`）：`--owner`/`AGENT_TASK_OWNER` 与另外三个声明身份的字段一起，才是可比对的留痕；owner 由登录名兜底时不受该形状约束。reviewer 与 approver 都不许是该 task 的 owner——比对的是 owner 历史（`new` 与历次 `assign` 写过的每一个 id），只比现值会被「先派给别人、再回来批自己」绕开；approver 还额外 ≠ 本轮 reviewer。三个身份互不相同，「独立验收」才是机器事实而不是措辞（id 本身仍是自报的，防的是误用而不是合谋）。

报告以按严重程度排列的具体发现开头（`Block` / `Should fix` / `Nit`），每条带文件与行号；未发现缺陷时说明测试缺口和残余风险。检查项：公共行为与向后兼容性、聚焦测试覆盖、边界与失败情况、类型与错误处理、竞态或资源泄漏、用户输入安全风险、文档变更；重构须把完成的变更与变更前的行为清单对照。浏览器相关的 review 必须按 [`browser-verification.md`](browser-verification.md) 的三档核实证据，修复类变更的 handoff 必须携带「已证实机制」（见 [`task-packet.md`](task-packet.md) 字段约束）；未给出已证实根因的方案性返工本身就是 review 发现项。

## 角色和边界

- **Manager**：建立 task，拆解任务，分配 owner，按「编排模式」派发，维护依赖，汇总证据，组织 review 和交付判断；直接协调 release 聚合与集成验证，不新增 Integrator 层级。
- **实施 Agent**：只在被分配的 task worktree 工作（T2 允许当前 worktree），遵守 handoff 声明的 Scope 与角色目录边界，保持变更待 review，不擅自 commit、push、merge 或关闭任务。
- **Reviewer**：独立审查冻结的目标 diff 和验证证据（与实施角色同等权限，但不参与实施、不直接修改被审查代码），结果绑定 `diffHash`；发现问题交回实施 Agent，修复后重新 freeze/review。
- **Designer**：仅在产品/设计需求下启用，输出可实现的交互、视觉和验收决策，不修改 `packages/*` 与 `apps/*` 生产代码，不改变代码归属和状态 gate。

## 并发原则

- 一个可变任务对应一个 task worktree 和一个 owner；同一 worktree 不得被两个实施任务同时写入（T2 在当前 worktree 快速实施时同样遵守：先结束或 drop 当前 task，再开下一个）。
- package worktree 可以作为缓存或验证 lane，但不能作为任务身份；跨包 vertical slice 使用任务级 worktree，并按「编排模式」做严格隔离；无法严格隔离时必须拆成独立 task 与独立 worktree。
- 角色目录边界即 worktree 内的写入边界：同一 worktree 中，任一角色不得修改对方目录下的文件；需要对方改动时通过 handoff 派发，而不是越界编辑。
- Reviewer 不在持续变化的实施 worktree 上复用旧结论；review 前冻结，修复后重新冻结。
- 并行编排可使用 Herdr，也可使用其他 harness；用 Herdr 起多角色会话的开机时序见 [`herdr-agents/SKILL.md`](../../.agents/skills/herdr-agents/SKILL.md)，pane、tab、workspace 的命令与生命周期规则见上游 [`herdr/SKILL.md`](../../.agents/skills/herdr/SKILL.md)，均不在本文件重复。
- 并行派发多个互不依赖的 task 时，派单命令本身不要阻塞等待某个 agent 的结果：先把全部 handoff 提交出去，再分别监听各 agent 的进度；等待放在派发全部完成之后。

## Playbook

release 和 hotfix 不是 task 体系的概念；它们是普通 task 在软件迭代场景下的操作程序，各自声明如何满足级别 gate：

- **release playbook**（[`release.md`](release.md)）：聚合已批准 task、确认 changeset、集成验证、PR 与合并后验证。聚合 task 按 T0 建。
- **hotfix playbook**：线上紧急修复仍按 `pnpm task new --task hotfix-<slug> --level t0|t1 --playbook workflow.md#playbook` 建 task，T0/T1 的全部 gate 一项不免，紧急性不删除证据链。与普通 task 的差异只有三条：分支基线取生产状态而不是 dev lane 最新 head，合并节奏与 release playbook 一致；diff 保持最小，不顺手重构、不扩大范围；验证聚焦回归——修复点加受影响契约的聚焦测试，只有涉及浏览器运行时行为时才按 [`browser-verification.md`](browser-verification.md) 的证据档位执行。review 可以先于其他任务排期，但 reviewer 独立性要求不变。

## 失败和恢复

- 命令失败时保留 task state 和工作树，先用 `pnpm task status --task <task-id>` 判断当前 phase，不要重建或覆盖状态文件。
- 需要终止或清理残留 task（agent 结束后遗留的 active task、快照无法物化的 task）时用 `pnpm task drop --task <task-id> --reason <why> --by <your-agent-id>`；`--reason` 至少 10 个非空白字符，`--by` 与 reviewer/approver 同一套 id 形状。drop 是唯一合法的强制终态，不手工编辑 state JSON。
- session、Herdr 或 harness 重启后，从 task state 的 `phase`、`worktree`、`baseSha`、`events[]` 和 live stale 结果恢复，不从聊天记忆猜测进度。
- GitHub issue 不可用时继续本地流程，最终报告注明“未同步”；issue 只作追踪镜像，不是执行真相。
- release CI 失败时，机械性修复可由 Manager 直接处理；逻辑或测试修复回到原 task owner，并在聚合 diff 变化后重新 review。

# PR review 纪律

本文件规定 PR 上 review 结论的读法、有人审查时的执行纪律、结果回写、复审和合并前核对，也是 PR 上自动审查所依据的同一份判据。T2 按影响安排。

PR review 默认由 CI 之后那道自动审查承担：它只看 diff、仓库判据与 head 工作树里的当前文件上下文，不听实施者叙述，结论绑定 head。GitHub 登录身份相同不抹去它的独立性，但作者不能在 GitHub 批准自己的 PR。要不要另起一次本地 agent 或人工审查由实施 agent 自己判断，本文不列触发条件。会话选用的模型与推理强度由编排决定，不写入仓库政策。本文涉及的远端写操作都需用户逐次明确授权；机制见 [`workflow.md`](./workflow.md#怎么取得这个授权)。

有人审查时，reviewer 用独立或新鲜上下文，只接收任务验收条件、PR URL/base/head、相关规则和原始证据；实施者摘要算待核线索，其自评结论不算审查依据。GitHub MCP 可以替代 `gh` 读取 PR、评论与 reviews，也可以发表绑定 `commit_id` 的 `COMMENT` review；工具选择不改变 SHA、授权和响应核对要求。Task 台账（见 [`.agents/skills/task-ledger/SKILL.md`](../../.agents/skills/task-ledger/SKILL.md)）不记录 review、approval、verify 或 CI 通过。required context `check` 只证明 CI 中的检查结果，不是 review 结论。远端规则集是否要求 approving review 属于平台状态，以仓库当前规则为准，不改变本文的判据。

## 自动审查结论的效力

CI 的 `check` 之后还有一道 Codex 审查门：它按本文的三档给发现，把结论写进 PR 上同一条持久评论。这道结论就是本仓默认的 PR review。它与人工审查读的不是同一份 diff，范围差见下文「审查范围与生成物」；决策与代价见 [ADR-0021](../adr/0021-codex-review-gate.md)。

- 结论绑定被审查的 head。`reviewed` 只覆盖那一份代码；head 变了结论就过期，`stale`、`unreviewed` 与 `not_applicable` 都不代表已审。
- `reviewed` 且 `Block > 0`、`error` 与 `unreviewed` 让这道门变红。`error` 表示配置或调用故障，不是审查意见，按故障码处置：`config_missing` 按 PR 评论列出的变量名补齐 GitHub 后台的 secrets/variables；`model_failed` 先看 `Run codex exec` 日志，网关 5xx 或瞬时错误重跑整条 run，只有配置或模型侧拒绝才改后台；`artifact_missing` 查审查腿的上传与写回腿的下载。模型腿跑完却没产出可用结论是 `unreviewed`（故障码 `unusable_output`），同样变红：先重跑整条 run，重复出现说明输出契约坏了，改 prompt 或校验而不是当成「没有意见」——这类故障下审查腿仍是绿的，`gh run rerun --failed` 只会重跑门禁腿。没交覆盖证据是 `missing_coverage`，同样记 `unreviewed`，但审查腿会一并判红；`Codex Review Report` 在该 CI run 的第一次 attempt、且写回腿自身也是第一次 attempt 时自动用 `gh run rerun --failed` 重跑审查腿与门禁腿一次，重跑后的新结论更新同一条持久评论。任一 attempt 已重跑过（`run_attempt>1`，或人工 re-run 了写回腿导致 `github.run_attempt>1`），就不再重试、评论标 `exhausted`，按本文做完整独立审查或修输出契约；任一 attempt 字段不可读、或 CI 未判 `failure`，评论标 `none`，按提示先看写回腿运行页 Summary 的原因再决定是否重跑一次，不要连续重跑；自动重跑自身失败时评论标 `failed`，按提示核对写回腿的 `actions: write` 与运行页错误，再手动重跑一次：`coverage` 是 schema 的必填项，有 findings 也不能省，否则交一条 Nit 就绕开整条规则；空 findings 时清单至少要有一条等于本次 diff 改过的文件（写到目录不算命中；只读了判据文档、而本次 diff 没改它，同样归这一档）。没有覆盖证据的结论与「没查就收尾」在产物上分不开，不能当作已审查。绿色只留给有结论可读的 run。门是约定式的：不改动 GitHub 的分支规则，红叉由人处置，绿色也不替人签字。
- 端点、模型名、思考强度、密钥与 codex 版本由 GitHub 后台提供，仓库不写默认值；配置未填齐时门是红的，这是设计意图。完整契约见 [ADR-0021](../adr/0021-codex-review-gate.md)。
- **结论即 review**：本次有可审的源码改动、生成物已按下文核对、自动结论的 `coverage.uncovered` 为空，且结论的 reviewed SHA 等于当前 head、`Block` 为 0、required context `check` 在当前 head 上成功时，这份 PR 的 review 已经完成，人工不必逐行重看。要重看的是发现修掉后的新 head，不是同一份结论。自动审查没看过被滤除的生成物，也没能判断 `uncovered` 里列出的改动处；有未覆盖项时这些位置必须逐项人工复核，绿门替代不了它们。
- `coverage` 说清这份结论的射程：`coverage.inspected` 是模型实际读过的路径，`coverage.uncovered` 是它声明无法判断的改动处。`uncovered` 非空是合法的收口出口：结论仍是 `reviewed`、门也不因此变红，但上一条「结论即 review」的完成条件不成立 —— 这些位置不在结论的覆盖范围内，必须逐项人工复核再收口，绿门替代不了它们。人工补的是结论列出的空白，不是把已覆盖的 diff 重看一遍；两处口径不互斥，区别在「结论有没有效」与「review 算不算完成」。
- 生成物不需要 diff，也不需要 review：按 [`generated-artifacts.md`](./generated-artifacts.md) 的清单滤除后，自动审查不读也不评注；它们的正确性由 `check-generated` 与消费者类型检查证明。没有 generator 可重建、只能靠人判断的入库产物落在这两份证据之外。
- 门给不出覆盖当前 head 的结论时，PR 上没有可用的 review，仍要人按本文流程做完整独立审查：`error`、`unreviewed`、`stale`、`not_applicable`；来自 fork 的 PR（那条腿默认不跑）；自动修推送出的新 head；只改生成物、`empty_diff: true` 的 PR（空 diff 不构成可合并结论，也不算「结论即 review」）。`Block > 0` 不属于这一类：它有结论，处置是按三档修掉发现后在新 head 上重取结论。
- 自动修在 `check` 失败且后台开关开启时产出一份候选 patch，校验通过才提交并推回 PR 分支。机器人提交不会触发 checks，所以新 head 上要等一次人重跑的 CI 才有 CI 证据；已经含自动修提交的 head 不再自动规划第二次。
- `Codex Review Report` 是写回腿，不改判结论，只把 CI 已产出的结论搬到 PR 上；`missing_coverage` 时另按上文触发一次自动重跑，不跑模型。它的绿色只说明这条腿跑过，不代表发了评论：没有 `codex-review-findings` 产物、或 head 已不属于任何打开的 PR 时它按设计跳过，并在运行页 Summary 与 notice 里写明是哪一种跳过。要判断「这条评论是不是当前 head 的」，仍按第一条核对评论头部的 `sha` 与 `status`；`reviewed` 且带阻断发现时头部写 `status=blocked`，语义与「reviewed 且 `Block > 0`」一致。正文另有「结论生成于」，因为这条评论是就地更新的，GitHub 上显示的创建时间永远是第一次写回那一刻。这条腿由 CI run 完成后另起一次 run，评论必然晚于 job 变绿：查不到评论时先读写回腿自身的 conclusion，再区分「还没落地」与「按设计跳过」；只有后者才说明 PR 上不会有这条镜像，此时结论以审查腿日志与 `codex-review-findings` 产物为准，产物也缺失就是上文的 `artifact_missing`。

## 审查范围与生成物

同一个 PR 有两份 diff，读哪一份由执行体决定，结论只覆盖自己读过的那一份：

| 执行体       | diff 面                                                                                                                                         | 生成物                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Codex 审查门 | 按生成物清单滤除后的源码 diff；`review-scope.json` 记 `excluded_pathspecs`、`changed_paths`、`preloaded_paths`、`preload_bytes` 与 `empty_diff` | 不在 diff 里，不需要 diff，也不需要 review |
| 人工独立审查 | merge-base..head 的完整 diff                                                                                                                    | 在 diff 里，按清单核对，不逐行评注         |
| 复审         | 前次已审 head..当前 head 的完整增量                                                                                                             | 同上                                       |

每个新 head 都重看一次完整 diff，同 head 且配置指纹一致才复用前一次产物，所以新 head 上的这道结论就是该轮复审。人工审查的后续轮次以前次已审 head 到当前 head 的增量为范围。

**生成物不需要 diff，也不需要 review**：它由 generator 完整重建，没有需要人判断的改动，留在审查输入里只会淹没真实源码、吃掉大 PR 的审查预算。自动审查按 [`generated-artifacts.md`](./generated-artifacts.md) 的唯一判据「能否由 generator 完整重建」取最小路径集，把清单里的入库生成物整批滤出 `pr.diff` 与 `changed_paths`；被滤除的路径不进 `coverage.inspected`，也不算 `coverage.uncovered`。清单、generator 入口、逐类核对办法与新增生成物时的同步要求都在该文档，排除理由与实测见 [ADR-0021](../adr/0021-codex-review-gate.md)「审查范围」。

生成物的判据是「能否由 generator 完整重建」，不适用逐行评注；审查结论也不评判它们的逐行正确性：

- 人工审查核对生成输入是否与产物同批改动，以及适用的只判校验（`check-generated`）与消费者类型检查是否通过；不一致按 `Should fix` 以上报，不手改产物。
- Codex 结论不覆盖生成物：`reviewed` 且 `Block 0` 不代表生成物已核对，不能据此跳过 `check-generated` 或人工核对。
- Codex 也不得因 diff 里没有被滤除的生成物就判定它们缺失或未更新；它们的正确性由 `check-generated` 与消费者类型检查证明，不由审查结论证明。需要核对时读工作树当前内容。

只改生成物（滤除清单内任意路径）的 PR 会得到空 diff（`empty_diff: true`），自动审查只能得出「没有源码改动可审」。这不是对生成物的审查，不构成可合并结论，也不算「结论即 review」：这类 PR 按完整 diff 走人工审查，或至少按清单逐类核对并留下 generator 证据。

## 固定输入与范围

本节和后面两节只在真有人审查时生效；默认路径读 PR 上那条结论评论，不需要这些步骤。由编排层提供 PR URL 与仓库，并负责分配 reviewer worktree；无法分配时，reviewer 按下文只读复用已有 worktree。审查开始时记录 PR 当前 base 与 head 的完整 SHA、目标分支、作者、状态、draft、文件数及合并对象，并读取已有 inline review、review 和普通评论，包括自动审查那条持久评论。首次人工 review 读取完整 diff；同一执行人后续轮次读取增量 diff。文件、评论或提交对象无法完整读取时，报告覆盖不完整，不给出「无问题」或可合并结论。

reviewer 不得切换、覆盖或修改实施者 worktree；除自己专属的 reviewer worktree 外，不修改任何工作树的文件，也不修改被审分支或 Git 索引。需要写盘的验证只使用专属 reviewer worktree，或在系统临时目录中从 PR head 检出的一次性 worktree；后者用完即移除。专属 reviewer worktree 与只读复用的已有 worktree 都要满足：工作树无未提交改动、origin 指向 PR base 仓库、HEAD 等于 PR head、base/head 对象存在。复用已有 worktree 时，被审内容一律取自 merge-base..head 的 Git 对象，不把该工作树里未提交的内容当作 PR 内容；首次审查完整改动；复审以此前已审查 head 到当前 head 的完整增量为范围，而不是只看最新 commit。审查开始和提交报告前都要重新读取 PR base/head 与复用 worktree 的 HEAD；head 变化后旧报告只覆盖旧提交。force push、rebase、base 更新或范围变化后，重新求 merge-base 并判断旧证据是否仍适用，检查完整受影响范围；无法确定范围时重新完整审查。复用条件不满足时，报告无法开始或继续审查，不迁就当前状态。

GitHub `pull_request` 的 CI 默认 checkout 是 base/head 的临时合并对象，代码 review 固定在 PR head。不能把 Actions run/check 关联用的 PR head SHA 当作 runner 实际测试的 checkout SHA。`gh pr checks --json` 不提供 head SHA；改用 run/check 对象或 check-runs API 核对关联的 head。required `check` 必须关联当前 PR head，并在实际执行快照与政策检查后成功；关联 SHA、base/head 或 step 结果不符时，不能证明当前输入已通过 CI。

## 审查内容与发现

检查需求和验收是否实现、行为与失败路径、公共契约、兼容性、测试质量、权限与用户输入安全、竞态、资源管理，以及文档与机检的一致性。指令或 context 改动另核四问：这段是稳定不变量还是外部状态快照？这个 concern 是否只有一个权威？这个 chunk 单独被检索时是否自包含？是否写入了会漂移的命令、路径、版本或实现清单？对每个发现给 `Block`、`Should fix` 或 `Nit`，并列当前文件行、影响、复现条件和证据。Block 未处理时不能给可合并结论；Should fix 若不修，须由维护者留下处置理由；Nit 不冒充阻断问题。无发现也要记录审查范围、验证证据和未覆盖风险。自动审查把审查范围与未覆盖风险落在 `coverage.inspected`（实际读过的路径）与 `coverage.uncovered`（无法判断的改动处）里，验证证据只挤进这两处或 `summary`，没有独立字段；人工报告仍按「报告、回写与复审」列字段。

自动审查的调查预算按风险分配，不按文件数平均分配：`prepare` 在 prompt 里预注入本文核心判据速览、按风险排序的 `changed_paths` 与首批高风险 diff 片段（同步落盘于 `review-preload.md`），模型先看改了公共契约、失败路径、权限、并发与跨包接口的改动，证据足以定档或从代码本身推不出失效即可交卷，不必读完 `changed_paths`。这不是采样阈值，`changed_paths` 仍是本次改动的全集；执行细则在审查 prompt 的「调查与收口」段，判据仍以本文为准。没能判断的改动处列进 `coverage.uncovered`：非空不使结论作废、门也不因此变红，但它是射程空白，必须由人工逐项复核，且不满足上文「结论即 review」的完成条件；`coverage.inspected` 只写真读过的路径（预注入段给出完整 diff 且已审完的文件可计入，已截断或未预注入的文件须实际打开后才可列入），不能用没读过的文件凑命中（空 findings 时仍按 `missing_coverage` 作废）。

异步测试或 helper 变化时，按 [test-authoring](../../.agents/skills/test-authoring/SKILL.md#异步完成与隔离) 核对完成信号、失败语义、负向断言边界和退出清理。精简或迁移时核对行为承接与原生集成证据；历史 flaky 的结案和性能对比按 [verification.md](./verification.md#flaky-调查与性能对比) 核对，重复全绿不替代根因证据。

## 报告、回写与复审

默认路径没有要回写的报告：CI 已经把结论写进 PR 上那条持久评论，绑定 reviewed head，档位统计与发现都在里面。读这条结论不需要授权，它是 CI 的产出；向 GitHub 追加评论、review 或元数据才按下一段逐次取得授权。

人工审查的持久报告至少记录 PR URL、base/head SHA、reviewer 执行体、审查范围、发现及处置、验证命令与实际结果、未覆盖风险、结论，以及上一轮报告和本轮修复的对应关系。报告写入 PR review/comment 或编排器明确提供的持久交付记录；不得只留在临时目录，也不要提交到被审分支。

没有用户对 PR 外部写入的明确授权时，只交付本地报告，不调用写 API；授权机制见 [`workflow.md`](./workflow.md#怎么取得这个授权)。获得授权后使用绑定 reviewed head 的 `COMMENT` review，不自动 `APPROVE` 或 `REQUEST_CHANGES`。调用前重新读取 PR base/head，确认仍等于报告覆盖的 SHA；已漂移则先补审。检查 API 响应的 `commit_id`、state 与 `html_url`，并重读远端 base/head；失败或漂移时报告仍为待发布或旧版本。请求超时或中断时，先分页读取现有 reviews 并核对 `commit_id`、正文和 `html_url`，确认没有重复 review 后才重试。

实施者修复 Block/Should fix 后运行相关验证并推送需另获用户授权，机制见 [`workflow.md`](./workflow.md#怎么取得这个授权)。新 head 上的 review 是那道门在新 head 上重跑的结论，它每次都看完整 merge-base..head，核对方式是评论头部的 `sha` 等于当前 head、`Block` 为 0。人工审查走到后续轮次时，复用仍有效的完整审查，以前次已审 head 到当前 head 的 diff 为增量，检查全部新改动、前轮发现的处置及其受影响行为，并更新完整 PR 结论和验证记录。报告写明前后 SHA 与沿用的报告；缺少可信基线、证据不完整或历史与 base 变化使覆盖范围无法确定时重新完整审查。未处理的 Block 不能靠 CI 变绿消除。

## 合并前与恢复

合并前重新读取当前 PR 状态、draft、base/head、冲突/mergeability、required checks、CI snapshot 记录的实际 checkout SHA、review 结论覆盖的 SHA（自动审查即那条持久评论头部的 `sha`；有人工报告时是报告覆盖的 SHA）、未决发现及 changeset 结果。strict 只要求 PR 跟上 base；squash 会产生新 commit，不能推断最终 main commit 与已测试 SHA 或树恒等。只有全部证据对应当前 base/head、没有未处置 Block、required CI 与硬约束成功、PR 非 draft 且可合并后，才向用户报告具体待合并 PR 和 SHA。每次 merge 需用户明确授权，机制见 [`workflow.md`](./workflow.md#怎么取得这个授权)。

获授权后以 squash 锁定已审查的 head；它不锁定 base，base 变化或 GitHub 拒绝时停止并重新核对。合并后核实 `state`、`mergedAt` 与 `mergeCommit`。不要用 `--admin` 绕过保护，也不要用无条件 `--auto` 代替当前证据。task 台账（见 `task-ledger` skill）的 `closed` 不代表 review、CI、merge 或发布成功。

网络或权限不足、无 PR、diff/对象不全、required CI 尚未运行/挂起/取消/跳过、review 未获授权回写或 API 失败、PR base/head 漂移、merge 中断，对应步骤都记录为未完成并保留 PR URL、base/head SHA、reviewer worktree、已验证证据、未完成步骤和上一轮报告引用。下次从这些实际状态继续；PR 创建前的本地预审不构成 PR review，缺失证据也不构成通过。

具体命令、字段与分页语义以 `gh` 手册和 GitHub REST / Actions 文档为准。

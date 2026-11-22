# PR review 纪律

本文件是 CI 之后那道自动审查所依据的判据，也是 PR review 的执行纪律。PR review 默认由自动审查承担：
它只看 diff、仓库判据与 head 工作树的文件上下文，不听实施者叙述，结论绑定 head；要不要另起本地 agent
或人工审查由实施 agent 判断。有人审查时，reviewer 用独立或新鲜上下文，只接收任务验收条件、PR URL/base/head、
相关规则和原始证据；实施者摘要算待核线索，自评不算审查依据。远端写操作都需用户逐次明确授权：机制见
[`workflow.md`](./workflow.md#怎么取得这个授权)，排查入口见 [`.github/codex/README.md`](../../.github/codex/README.md)。

## 自动审查结论的效力

CI 的 `check` 之后还有一道 Codex 审查门：它按本文的三档给发现，把结论写进 PR 上同一条持久评论。这道结论
就是本仓默认的 PR review。审查范围见下文「审查范围与生成物」；设计决策与代价见 [ADR-0021](../adr/0021-codex-review-gate.md)。

- 结论绑定被审查的 head。`reviewed` 只覆盖那一份代码；head 变了结论就过期，`stale`、`unreviewed` 与 `not_applicable` 都不代表已审。
  评论 marker 的 `status` 取 `reviewed` / `stale` / `blocked` / `error` / `not_applicable`；`blocked` 即 `reviewed` + `Block > 0`，
  `error` 也不代表已审。
- `reviewed` 且 `Block > 0` 变红；`error` 与 `unreviewed` 同样变红，都不代表已审。`error` 表示配置或调用故障，不是审查意见。
  故障码、重跑次数与排查顺序见 [`.github/codex/README.md`](../../.github/codex/README.md)；判据与重跑次数以脚本为准。
- **结论即 review**：本次有可审的源码改动、生成物已按下文核对、`coverage.uncovered` 为空，且 reviewed SHA 等于当前
  head、`Block` 为 0、required context `check` 在当前 head 上成功时，这份 PR 的 review 已经完成，人工不必逐行重看；
  要重看的是发现修掉后的新 head。
- `coverage` 说清射程：`coverage.inspected` 是模型实际读过的路径，`coverage.uncovered` 是它声明无法判断的改动处。
  非空时结论仍有效、门不变红，但「结论即 review」不成立，这些位置必须逐项人工复核；人工补的是结论列出的空白。
- 门给不出覆盖当前 head 的结论时，PR 上没有可用的 review，仍要人按本文做完整独立审查：`error`、`unreviewed`、
  `stale`、`not_applicable`、来自 fork 的 PR，以及未配置 `CODEX_AUTOFIX_PUSH_TOKEN` 时由默认 `GITHUB_TOKEN`
  推送出的自动修新 head。`Block > 0` 有结论，处置是修掉发现后在新 head 上重取。

## 审查范围与生成物

各执行体读不同的 diff 面，结论只覆盖自己读过的那一份：Codex 审查门读按生成物清单滤除后的源码 diff，
范围细节记在 `review-scope.json`；人工独立审查读 merge-base..head 的源码 diff；复审读前次已审 head..当前 head 的源码增量。
生成物均不在 diff 里，按清单另行核对。

首次审查覆盖完整源码 diff。复审以可信的前次已审 head 为基线，检查该 head 到当前 head 的全部源码增量、
前次发现的处置及其受影响行为，并继承仍有效的已审范围和未覆盖项；新结论须标明基线和当前 head。
基线不可用、审查范围或 base 变化使先前证据失效，或增量范围无法确定时，重新完整审查源码。

**生成物不需要 diff，也不需要 review**：它由 generator 完整重建，留在审查输入里只会淹没真实源码、吃掉大 PR
的审查预算。自动审查按 [`generated-artifacts.md`](./generated-artifacts.md) 的唯一判据「能否由 generator 完整重建」
取最小路径集，把清单里的入库生成物整批滤出 `pr.diff` 与 `changed_paths`；被滤除的路径不进 `coverage.inspected`，
也不算 `coverage.uncovered`。清单、generator 入口与逐类核对办法都在该文档，排除理由与实测见 ADR-0021「审查范围与生成物滤除」。

人工审查核对生成输入是否与产物同批改动，以及 `check-generated` 与消费者类型检查是否通过；不一致按 `Should fix`
以上报，不手改产物。Codex 结论不覆盖生成物：`reviewed` 且 `Block 0` 不代表生成物已核对，也不能据此判定它们缺失。
只改生成物的 PR 得到 `empty_diff: true`，不构成可合并结论，也不算「结论即 review」；按清单逐类核对并留下 generator 证据。

## 固定输入与范围

本节和后面两节只在执行独立审查（人工或独立 agent 会话）时生效。使用专属 reviewer worktree，或只读复用已有 worktree。审查开始时记录 PR 当前 base/head 的完整 SHA、目标分支、作者、状态、draft、文件数及合并对象，并读取已有 inline review、review、评论与自动审查那条持久评论。文件、评论或提交对象无法完整读取时，报告覆盖不完整，不给出「无问题」或可合并结论。

reviewer 不得切换、覆盖或修改实施者 worktree；除专属 reviewer worktree 外不修改任何工作树的文件，也不改被审分支
或 Git 索引。需要写盘的验证只用专属 worktree，或在系统临时目录中从 PR head 检出的一次性 worktree（用完即移除）。
两种 worktree 都要满足：无未提交改动、origin 指向 PR base 仓库、HEAD 等于 PR head、base/head 对象存在。
复用已有 worktree 时，被审内容取自 merge-base..head 的 Git 对象，不把未提交内容当作 PR 内容。审查开始与提交报告前
都要重新读取 PR base/head 与复用 worktree 的 HEAD；head 变化后旧报告只覆盖旧提交。force push、rebase、base 更新
或范围变化后，重新求 merge-base 并判断旧证据是否仍适用；无法确定范围时重新完整审查。复用条件不满足时报告无法开始。

CI 默认 checkout 是 base/head 的临时合并对象，代码 review 固定在 PR head；Actions run/check 关联用的 PR head SHA
不是 runner 实际测试的 checkout SHA。`gh pr checks --json` 不提供 head SHA；改用 run/check 对象或 check-runs API
核对关联的 head。required `check` 必须关联当前 PR head，并在实际执行快照与政策检查后成功；关联 SHA、base/head
或 step 结果不符时，不能证明当前输入已通过 CI。

改动 `.github/workflows/ci.yml` 的 `codex-review` 与 `codex-autofix-plan` job、任一 `.github/workflows/codex-review*.yml`、
`.github/scripts/` 下的 `codex-review.mjs`、`codex-autofix.mjs`、`check-review-output.mjs` 或 `lib/` 中可信脚本时，
人工 review 另读 [ADR-0021](../adr/0021-codex-review-gate.md)「权限拆分与安全不变量」。

## 审查内容与发现

检查需求和验收是否实现、行为与失败路径、公共契约、兼容性、测试质量、权限与用户输入安全、竞态、资源管理，
以及文档与机检的一致性。指令或 context 改动另核七问：这段是稳定不变量还是外部状态快照？这个 concern 是否
只有一个权威、指针是否落到能回答该问题的小节？这个 chunk 单独被检索时是否自包含？是否写入了会漂移的命令、
路径、版本、实现名或清单？新增或移动的文档是否已被入口路由覆盖？删除的内容是否已有落点？每条指令是否能
判断做到或没做到？写作判据见 [writing-agent-docs.md](./writing-agent-docs.md)。
对每个发现给 `Block`、`Should fix` 或 `Nit`，并列当前文件行、影响、复现条件和证据。Block 未处理时不能给
可合并结论；Should fix 若不修，须由维护者留下处置理由；Nit 不冒充阻断问题。无发现也要记录审查范围、
验证证据和未覆盖风险。

自动审查把审查范围与未覆盖风险落在 `coverage.inspected` 与 `coverage.uncovered`；验证证据只挤进这两处或
`summary`。没能判断的改动处列进 `coverage.uncovered`：非空不使结论作废、门也不因此变红，但必须由人工逐项复核。
`coverage.inspected` 只写真读过的路径，不能用没读过的文件凑命中；`coverage` 是 schema 必填项，空 findings 时仍按
`missing_coverage` 作废。

自动审查的调查预算按风险分配：`changed_paths` 仍是本次改动的全集，模型先看公共契约、失败路径、权限、并发与
跨包接口的改动，证据足以定档即可交卷。预注入、技能路由与预载机制见 runbook 与脚本，执行细则在审查 prompt，判据仍以本文为准。

异步测试或 helper 变化时，按 [test-authoring](../../.agents/skills/test-authoring/SKILL.md#异步完成与隔离) 核对完成信号、
失败语义、负向断言边界和退出清理。精简或迁移时核对行为承接与原生集成证据；历史 flaky 的结案和性能对比按
[verification.md](./verification.md#flaky-调查与性能对比) 核对，重复全绿不替代根因证据。

## 报告、回写与复审

默认路径没有要回写的报告：CI 已把结论写进 PR 上那条持久评论，绑定 reviewed head；头部标记怎么解释见
[`.github/codex/README.md`](../../.github/codex/README.md)。

人工审查的持久报告至少记录 PR URL、base/head SHA、reviewer 执行体、审查范围、发现及处置、验证命令与实际结果、
未覆盖风险、结论，以及上一轮报告和本轮修复的对应关系。报告写入 PR review/comment 或持久交付记录；
不得只留在临时目录，也不要提交到被审分支。

没有用户对 PR 外部写入的明确授权时，只交付本地报告，不调用写 API；授权机制见 [`workflow.md`](./workflow.md#怎么取得这个授权)。
获得授权后使用绑定 reviewed head 的 `COMMENT` review，不自动 `APPROVE` 或 `REQUEST_CHANGES`。调用前重新读取
PR base/head，确认仍等于报告覆盖的 SHA；已漂移则先补审。写完核对响应的 `commit_id`、state 与 `html_url` 并重读
远端 base/head；超时或中断时先分页读取现有 reviews，确认没有重复 review 后才重试，失败时报告仍为旧版本。

实施者修复 Block/Should fix 后推送需另获用户授权，机制见 [`workflow.md`](./workflow.md#怎么取得这个授权)。
复审按「审查范围与生成物」的基线与回退规则进行，核对结论覆盖当前 head、前次发现已处置且 `Block` 为 0；
人工报告写明前后 SHA、沿用的报告及验证记录。未处理的 Block 不能靠 CI 变绿消除。

复审循环遵守收敛纪律（用户授权确定的流程上限；CI 门脚本自己的重跑次数是另一套口径，见
[`.github/codex/README.md`](../../.github/codex/README.md)）：

- **封顶**：人与 agent 驱动的语义复审循环最多三轮，每轮只受理 Block 与 Should fix。
  Nit 与措辞级发现一次性列出、随下一批改动顺带处理，保持记录但不重开循环。第三轮结束仍有 Block 时如实报告
  残留发现与证据，交用户决断处置，不以「再多跑几轮」代替判断。
- **复现即重设计**：同一 finding 跨轮第二次出现，说明承载它的机制站不住——回到设计层删掉或简化该机制，
  而不是打第三个补丁。条件越叠越多的复审循环按此收束。
- **确定性验证先行**：类型检查、lint、单测、真实进程与 git 复现等能交给确定性工具闭环的判断全部交给工具
  （层级与最小选择见 [`verification.md`](./verification.md)）；语义复审只审工具测不出的行为、契约与竞态，
  每个发现都带可复现证据。只跑语义复审不结案。

## 合并前与恢复

合并前重新读取 PR 的 draft、base/head、mergeability、required checks、CI snapshot 的实际 checkout SHA、
review 结论覆盖的 SHA（自动审查即评论头部的 `sha`）、未决发现与 changeset；前端改动还要有
[`runtime-verification.md`](./runtime-verification.md#前端冒烟门) 的前端冒烟结论。strict 只要求 PR 跟上 base；
squash 会产生新 commit，不能推断最终 main commit 与已测试 SHA 或树恒等。只有全部证据对应当前 base/head、
没有未处置 Block、required CI 与硬约束成功、PR 非 draft 且可合并后，才向用户报告待合并 PR 和 SHA。
每次 merge 需用户明确授权，机制见 [`workflow.md`](./workflow.md#怎么取得这个授权)。

获授权后以 squash 锁定已审查的 head；它不锁定 base，base 变化或 GitHub 拒绝时停止并重新核对。合并后核实
`state`、`mergedAt` 与 `mergeCommit`。不要用 `--admin` 绕过保护，也不要用无条件 `--auto` 代替当前证据。
task 台账（见 [`task-ledger`](../../.agents/skills/task-ledger/SKILL.md)）的 `closed` 不代表 review、CI、merge 或发布成功。

网络或权限不足、PR/diff 对象不全、required CI 未就绪、回写失败或 base/head 漂移、merge 中断时，对应步骤记为
未完成并保留 PR URL、base/head SHA、reviewer worktree、已验证证据与未完成步骤；下次从这些实际状态继续。
PR 创建前的本地预审不构成 PR review，缺失证据也不构成通过。命令、字段与分页语义以 `gh` 手册和
GitHub REST / Actions 文档为准。

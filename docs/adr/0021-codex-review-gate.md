# ADR-0021: Codex 自动 PR 审查门

- **Date**: 2026-11-04
- **Revised**: 2026-11-09
- **Status**: 已接受

## 背景

人工独立 review 是合并前的主要质量关口，但它要等人，而且对同一份 diff 的低级遗漏并没有分工价值。仓库已经有 PR CI，把一次模型审查挂在 CI 之后不需要新的基础设施。

难点不在「能不能跑模型」，在四处：

- PR 验证的 workflow 在仓库里被机器判定为只读，而审查结论要写回 PR。
- 被审查的改动与被审查代码同处一个 worktree，模型读到的东西可能被这次改动改写。
- 模型输出是概率性的，一道红绿不定的门不会被接受。
- 模型调用依赖仓库外部配置；配置缺失与调用崩溃若不区分于「模型没给结论」，整道门会在 CI 全绿的情况下一次都不运行。

## 决策

Codex 审查承担本仓默认的 PR review 结论（2026-11-06 起；此前的口径是「对 ADR-0012 的补强，不是替代」，见下文同名修订段）。绿色 CI 不证明 review 完成，这道结论也不证明 `check` 通过。两条各证一件事，同时成立才算审过。

**门禁形态**：约定式门禁，不改 GitHub 分支保护。`reviewed` 且 `Block > 0`、`error` 与 `unreviewed` 让这道门变红；`stale`、`not_applicable` 保持绿色。绿色因此只表示「这次运行有结论可读」，不表示结论是「没问题」。`Block` 数量、状态、故障码与缺失配置名一起写进 PR 上同一条持久评论。合并准入仍由人和仓库的 PR review 纪律决定。

**状态口径**：`error` 只表示配置或调用故障，故障码为 `config_missing`、`model_failed`、`artifact_missing` 之一；模型 job 跑完却没产出可用结论是 `unreviewed`，故障码 `unusable_output`，输出不合 schema 也归这一档；模型给出空 findings 却没交覆盖清单是 `missing_coverage`，同样记 `unreviewed`。两档都让门变红：`unreviewed` 曾经保持绿色，实测中一次空 `summary` 就把整份 findings 丢掉而 PR 上只留一个绿勾，因此「模型没给出可用结论」与「结论是 Block 0」必须用颜色分开，处置是重跑一次，重复出现说明输出契约坏了。`continue-on-error` 只让判定脚本有机会落结论，模型 job 的 `steps.<id>.outcome` 仍传给判定脚本，故障不会被掩成「未审查」。review job 被整体跳过时门记 `not_applicable`。

**输出校验口径**：`parseReviewFindings` 把 findings 与 `coverage` 的结构错误都当致命错误（非法 JSON、缺 `findings`、未知档位、未知字段、空 `problem`、非法行号；`coverage` 非对象、缺 `inspected`/`uncovered`、条目不是非空字符串、含未知字段），这类输出由 `validate` 记 `unusable_output`；`coverage` 整个字段缺席则不算结构错误，交给 `validate` 判 `missing_coverage`——一个是「形状坏了」，一个是「没交」，处置不同。`summary` 只是评论顶部一行摘要，模型给空串或没给时结论照常成立，`validate` 在日志里留一行 `review output carries no summary` 并照常写 `reviewed`；prompt 的「输出」段明确要求 1–2 句摘要，但校验不拿装饰性字段当阻断条件——一次空 `summary` 不该让整份 findings 作废。

**覆盖度口径**：`docs/agents/review.md` 一直要求「无发现也要记录审查范围、验证证据和未覆盖风险」，但 schema 在 2026-11-06 之前只有 `summary` 与 `findings`，这条要求在输出里没有落脚处——模型只能把「我正在看什么」塞进 `summary`，于是空 findings 的结论和「没查就收尾」在产物上完全同形。现在 schema 必填 `coverage.inspected` / `coverage.uncovered`：`validate` 在「无 findings、diff 非空、`inspected` 为空」时判 `missing_coverage` 并让门变红，diff 为空时豁免（没有源码改动可读，空清单不是缺证据）。`prepare` 同时把这次改动过的路径写进 `review-scope.json` 的 `changed_paths`：空 findings 时 `inspected` 至少要有**一条等于其中的改动文件**，否则同样判 `missing_coverage`——写父目录（`docs`）不算读过 `docs/agents/review.md`，只读判据文档就交卷，正是要区分的早停；反过来，PR 改的就是那份判据文档时，它当然算被审对象。复用路径还要多一道：`coverage` 是这一版才加的必填字段，没有它的旧产物一律不复用（不论有没有 findings），宁可重跑模型让这个 head 产出证据，也不把一次没有证据的结论洗成绿色——若改成「复用后再判红」，该 head 的重跑会永远红下去。`validate` 的复用分支再用同一判据兜一次，避免别的写入口绕开 `reuse`。`coverage` 是 schema 的必填项，有 findings 也不能省：否则交一条 `Nit` 就绕开整条覆盖规则，因此 diff 非空时 `validate` 一律要求 `coverage` 存在。判 `missing_coverage` 时 findings 仍会写进产物与评论：「结论不可用」由 `status` 表达，把已经看到的 Block 丢掉只会让作者少一条线索，而 `deriveConclusion` 以 `status` 为准，findings 不能把不可用的结论升格成绿色。复用的 artifact 解到独立目录（`$RUNNER_TEMP/codex-review-prior`），不与本轮 `prepare` 写的 `review-scope.json` 同目录——同名文件会把本次范围覆盖成上一轮的，`changed_paths` 就此缺位；缺位时交集为空，判定按红处理而不是放行，范围对不上宁可不给绿色。

**收口纪律**：`coverage.uncovered` 是「读不完」的合法出口：`coverageGap()` 不读它，非空既不判红也不使结论作废，但按 `docs/agents/review.md` 必须人工逐项复核，且不满足该文件「结论即 review」的完成条件（`uncovered` 为空）。2026-11-07 给审查 prompt 补「调查与收口」段（按风险排序、证据够就交卷、如实列 `uncovered`、不许假 `inspected`），并把「按 `changed_paths` 逐个文件读」改成「候选清单 + 分片入口」：#519 在 60 分钟上限处被掐断时，模型把 137 文件清单当成必须读完的任务，93 条命令后仍未收口。这是给大 PR 一个可审计的出口，**不是对上游 `429 model_failed` 的修复**——那几次崩溃与运行时长、token 和模型进度没有稳定关系，属上游网关限速，另案处置。可信 prompt 与 schema 取自 PR base，本修复自身的审查 job 仍读旧 prompt；`docs/agents/review.md` 不在可信输入清单里，由模型从工作区（本 PR head）读取，本 PR 即生效，因此这一轮是混合契约（旧 prompt 要求按清单逐文件读、新判据授权早停），按「输入可信来源」条款里已接受的同类风险由人工 review 兜住；prompt / schema 的新行为要等合入 main 后的下一个 PR 才能验证。

**空壳结论与恢复**（2026-11-08）：PR #527 连续两轮里，模型在读完判据文档、还没打开任何改动文件时就交出 schema 允许的空对象（`summary` 为空串或写成过程句、`findings=[]`、`coverage.inspected=[]`）；`run_codex` 与 review job 都是 `success`，只有 gate 判 `unreviewed / missing_coverage`。这暴露两处问题：schema 只要求字段存在、不要求内容非空，「没查就收尾」与「查过没发现」在产物上仍可同形；红色只落在 gate，`gh run rerun --failed` 只重跑 gate、不重跑模型 job，必然拿同一份空壳 artifact 再红一次。修法分两层：可信 prompt 补「判据与清单读完后，先实际打开至少一个 `changed_paths` 里的改动才允许输出 JSON」的硬约束，并写明 `docs/agents/review.md` 里指向授权、合并、worktree 的链接是实施 agent 的流程文档、不是审查判据，别顺着读下去耗尽调查预算；CI 编排层新增 `Reject empty review output` 步骤，直接复用 `coverageGap` 判据、检出**所有**会被判 `missing_coverage` 的形态（`coverage` 整个缺席、`inspected` 为空、或 `inspected` 没命中 changed_paths），让审查 job 一起变红，使 `--failed` 覆盖模型 job；只覆盖「无 findings + 无 inspected」这一种形态会漏掉「交一条 Nit 但没给 coverage」和「只读了判据文档就收尾」，那两种仍会卡在「review 绿 / gate 红」。该步骤的工作区脚本从 PR head 读取（本 PR 即生效），只判红、不判绿，结论仍由取自 PR base 的 `validate` / `gate` 裁决——作者改它换不来绿色；prompt 的新约束仍按「收口纪律」段的混合契约，要等合入 main 后的下一个 PR 才生效。`docs/agents/review.md`、PR 评论与 gate 日志的恢复指引**仅对 `missing_coverage`** 改指 `--failed`：`unusable_output` 与 `error` 的审查 job 仍是绿的，`--failed` 只会重跑门禁 job，这两类保留「重跑整条 run」。`Upload review findings` 补 `overwrite: true`，让 `--failed` 重跑审查 job 时能覆盖同 run 内的同名 artifact。**未采用**：在同一 job 里第二次调用 codex-action 做自动重试——`drop-sudo` 在第一次调用后已禁用 sudo，第二次调用的 root phase 会失败；也不给 schema 加 `minItems` / `minLength`，strict structured outputs 不支持这些关键字，加了要么无效要么让整次调用报错。

**空壳复发与自动恢复**（2026-11-09）：`missing_coverage` 在 #527 / #529 / #531 上按 run attempt 累计复发 6 次。`Reject empty review output` 让 guard、审查 job 与 gate 一起判红（CI run `42504056711` 实证），`gh run rerun --failed` 因此能覆盖模型 job；防线把「假绿」变成「真红 + 一次人工重跑」，不降低复发频率。根因在带 `--output-schema` 的调用形态：模型一旦产出符合 schema 的 JSON 就结束，#531 在 trusted base 已含「先打开改动」硬约束的前提下，仍花 38,652 tokens 读判据文档，说出「现在去拿 diff 统计」的下一轮就交出 `inspected` / `uncovered` / `findings` 全空的合法对象。自然语言硬约束挡不住「交卷先于调查」，所以要修的是「产生后无需人工」，而不是再加一道检测。

**自动恢复机制**：`Codex Review Report` 的 `report-conclusion` 在 CI 已 completed 时读 `codex-review-findings` 里的 `review-meta.json`，仅当 `status=unreviewed`、`error_code=missing_coverage`、CI run `conclusion=failure`，且**两个 attempt 维度都为 1** 时调用 `gh run rerun --failed` 一次。上限因此有两个来源，都钉在 `AUTO_RETRY_LIMIT=1`，拓扑断言与行为单测分别钉住：① `github.event.workflow_run.run_attempt` 是**触发本次写回 workflow 的 CI run** 的 attempt，`conclusion` 也来自同一 payload；`github.event` 就是该事件的完整 webhook payload，其中 `workflow_run` 对象是 workflow run schema，明确含 `run_attempt`（首次为 1、每次重跑递增）与 `conclusion`。重跑完成会再次触发 `workflow_run`，新事件里这个值是 2，用来挡住「第二次写回 workflow run」。② `github.run_attempt` 是**写回 workflow run** 的 attempt（首次为 1、每次 re-run 递增，`run_id` 不变）。只判①会漏掉人工 re-run 写回 run：re-run 复用原始事件 payload，CI run attempt 仍是 1、artifact 仍是空壳，于是再 POST 一次 `rerun-failed-jobs`，突破「只一次」上限，持久评论还可能被后写的 `triggered` 覆盖掉此前的 `exhausted`。反过来只判②也不行——CI 重跑会产生一个**全新的写回 workflow run**，其 ② 重置为 1，挡不住新事件，会无限重跑模型 job。两个量不是替代关系，是同一个不变量的两个维度。两个量都由 workflow 注入可信脚本，不再额外发 `GET /actions/runs/{id}`：少一次 API 调用也少一处限流 / 403 的失败源；任一字段不可读时跳过重跑，宁可转人工也不冒循环风险。`reportAttempt>1` 判 `exhausted` 而不是 `none`：`none` 会让结论评论退回「人工再重跑一次」的旧指引，把已用掉的上限说成还没用。门槛刻意不写成步骤 `if: … && github.run_attempt == 1`——步骤被跳过时 output 为空、状态落 `none`，同样退回误导性指引。判定顺序按「先排除不该恢复的情形 → 再判上限是否已用尽 → 才允许重跑」分层：`meta` 判码、`runConclusion !== 'failure'`、两个 attempt 的合法性依次在前，任一大过上限才落 `exhausted`。CI 已成功却取到旧空壳 artifact 时不该误报「自动重跑 1 次仍不可用」，字段不可读也一律优先于「已用尽」，否则会拿坏掉的值宣称 `exhausted` 并与「任一不可读 → `none`」的口径冲突（代价：`runAttempt>1` 且 `reportAttempt` 不可读时会从 `exhausted` 降为 `none`；这只可能来自 env 注入坏，真实第二次写回 workflow 的 run 是全新 workflow run、其 ② 恒为 1）。`none` 档文案因此改成「先看写回 run 运行页 Summary 的原因（CI 非 `failure`、产物不是空壳、attempt 不可读或注入异常），仅当 CI 判红且产物确属空壳时才必要时重跑一次，CI 已成功则先核对评论 `sha`，反复出现就修输出契约或 env 注入，不要连续重跑」：保留可操作指引，但不再在注入坏时诱导「人工重跑 → 新写回 workflow 的 run → 又落 `none`」的循环。判定落在写回 job 唯一的动作类写操作 `auto-retry` 子命令里，workflow YAML 与可信脚本同源，合入 main 后的下一个 PR 生效。上限取 1 而不是 2：每次重跑都会再触发一次写回 workflow 与模型 job，第二次自动重跑就不是恢复而是反复烧模型；平台自身的 50 次重跑上限只是兜底，不作为契约。`overwrite: true` 让新 artifact 覆盖同名产物，新结论更新同一条持久评论；`unusable_output` 与 `error` 的审查 job 仍是绿的，恢复指引保持「重跑整条 run」。运行页 Summary 同时记下 CI attempt 与写回 run attempt，便于真实复发时核对是哪个维度挡下了重跑。

**异常收敛与失败兜底**：`auto-retry` 把 `requireEnv`、meta 解析与 `rerunFailed` 的业务异常统一收敛成 `state=failed`，写完 step output、运行页 `::error` annotation 与 Summary 后正常退出，步骤再加 `continue-on-error` 兜住进程级崩溃；这样不依赖「失败步骤的 output 是否被 runner 保留」，结论评论也不会因 output 为空退回旧版手动重跑指引。**例外如实说明**：`writeOutputs` / `appendSummary` 自身写失败时仍会抛给 `main` 并以非零退出，此时步骤 `outcome='failure'`，由下游兜底接住；写回 job 因 `continue-on-error` 仍是绿的，判断恢复是否失败以运行页 annotation、Summary 与结论评论的 `failed` 档为准，不看这条 job 的颜色。结论评论侧把 `outputs.state` 与 `steps.auto_retry.outcome` 分别注入 `CODEX_REVIEW_AUTO_RETRY_STATE` / `CODEX_REVIEW_AUTO_RETRY_OUTCOME`，由可信脚本的 `resolveAutoRetryState()` 解析：显式四态优先，output 为空且步骤失败时兜成 `failed`，被跳过的步骤保持 `none`。这个判定刻意不写成 `state || (outcome == 'failure' && 'failed') || 'none'`——后者依赖 Actions 表达式「`&&` / `||` 返回操作数」这一未明文记录的语义，脚本内判定可做求值级单测。空串与白名单外的值由 `normalizeAutoRetryState` 归一化为 `none`，不会冒充某个恢复档。编排层行为单测覆盖 attempt 1 重跑、CI run attempt 2 停止、写回 run 自身 attempt 2 停止且不再 POST、写回 run attempt 缺失时保守跳过、`unusable_output` 不分流、重跑抛错 / meta 损坏 / env 缺失三条异常路径都写 `failed` 且不重复重跑，另有一条覆盖四态与 outcome 兜底的求值。

**权限扩张**：`report-conclusion` 持有 `actions: write`（`codex-autofix-apply` 仍是 `actions: read`），唯一用途是这一次 `rerun-failed-jobs` 调用。与「权限拆 workflow」的张力在此明写：写 job 本就是唯一能写 PR 与推 commit 的 job，actions 写权限没有把模型调用或 `contents: write` 带进只读 job，也没有让写回 job 改判结论。代价是写 job 的 token 能重跑本仓库任意 Actions run，因此脚本只在 job 级 `if` 已限定的「同源仓库、非版本分支、非取消 run」且 `resolve-pull` 已解析到 PR、产物已下载成功时才动作，run id 固定取 `github.event.workflow_run.id`，次数由 CI run 与写回 run 自身两个 attempt 维度共同钉在 1，并在结论评论里区分 `none` / `triggered` / `exhausted` / `failed` 四态。**边界如实说明**：`reviewTarget()` 的「base 为 `main`」校验只在后续 `Post conclusion comment` 步骤里执行，重跑动作本身不校验 base；base 非 main 的同源 stacked PR 可能被多触发一次重跑，随后评论步骤才拒绝写回。job 级权限意味着该 job 内全部步骤与第三方 action 共享同一 token；仓库 / 组织级 Workflow permissions 若被降级，声明的 `actions: write` 会失效，此时 `failed` 档会提示核对权限与运行页错误。

**未采用**：A′（`ci.yml` 新增 `codex-review-retry` job 规避权限扩张，但 gate 拓扑与结论复用都要改，回归面更大）；同一 job 第二次调 codex-action（`drop-sudo` 后 sudo 已禁用）；schema 加 `minItems` / `minLength`（strict structured outputs 不支持）；再加一道 guard 或收紧 `coverageGap`（已覆盖全部形态且已有判红实证）；换模型或调 effort（根因不在模型能力）；从 `GET /actions/runs/{id}` 读 `run_attempt`（payload 已带同一字段，多一次 API 调用即多一处 403 / 限流失败源，且 REST 文档未明文保证不带 attempt 号的 GET 恒返回最新 attempt）；把写回 run 自身的 attempt 门槛写成 `Auto-rerun` 步骤的 `if`（步骤被跳过时 output 为空、状态落 `none`，结论评论退回「人工再重跑一次」的旧指引，等于把已用掉的上限说成没用过）；给 `exhausted` 再拆一档「写回 run 被 re-run」（四态已能表达「上限已用尽，转人工」，多一档只增加文案与断言的同步面）。prompt 预注入（B1）与自动恢复分两张 PR 依次合入（见下文「判据与高风险 diff 预注入（B1）」），让可信输入的生效时机可归因。

**自动恢复的残余风险**：按「不主动制造失败」的口径，真实 `workflow_run` → rerun → 第二次 `workflow_run` 链路尚未实证，以下只有静态检查、单测与官方文档支撑：① 本仓库的 `GITHUB_TOKEN` 实际能否成功 POST `rerun-failed-jobs`，受仓库与组织级 Workflow permissions 降级影响，失败会落到 `failed` 档；② 虽已按官方 schema 确认 `workflow_run` 对象含 `run_attempt`（首次 1、重跑递增），仍需实机核对重跑后新事件里该字段确为 2、以及同一 `run_id` 的 concurrency group 串行排队是否符合预期；字段缺失时保守跳过重跑、不会循环。③ `download-artifact@v7` 用 `run-id` 下载时没有 `run-attempt` 输入，多 attempt 下取到的是不是最新产物（上游 README 无明文），若取到 attempt 1 的旧空壳，第二次评论会误报 `exhausted`（判定顺序重排后，CI 确实判红时仍如此；CI 已成功则落 `none`，不再误报）。④ `github.run_attempt` 的「首次 1、每次 re-run 递增」有官方 contexts 明文，但「re-run 复用原始 event payload」这一前提在官方文档里没有逐字明文（contexts 页只说 `github.event` 是触发该 run 的那次 webhook payload，re-running 页只说明复用原事件的 SHA / REF / actor 权限）。这是**需要**第二维度的原因，不是 ② 判定的前提：无论 payload 是否刷新，写回 run 被 re-run 时 ② 必然 ≥2 并挡在 `exhausted`；若 CI run 也确实被重跑过，① 也会 ≥2 形成双挡。只判①时，若 payload 复用且 CI 从未重跑，① 仍为 1，就会重复 POST。两个维度不会出现「都仍是 1 却已重跑过」的组合（写回 run 被 re-run ⟹ ②≥2；CI 被重跑 ⟹ ①≥2 或由 ② 补位）。合入 main 后真实空壳复发时，先核对运行页 Summary 的两个 attempt 与结论评论的恢复档，再逐项收口。**这条双维度门槛的来源是 PR #532 自己的 CI 结论评论（2026-11-09）**：模型指出只看 payload 的 `run_attempt` 时，人工 re-run 写回 run 会再 POST 一次重跑并让评论从 `exhausted` 回退成 `triggered`；后一半后果只在「第一次写回 workflow 的 run 被 re-run、CI run 仍为 attempt 1」时成立（CI 已重跑过的第二次写回 workflow 的 run 会被 ① 挡在 `exhausted`），真正无条件成立的是「重复 POST `rerun-failed-jobs`」。双维度门槛把所有组合都堵住了，比该发现的描述更保守。两轮独立复审都没覆盖这一路，说明「可信脚本 + 拓扑断言」也挡不住模型从调用时序上找到的缺口。

**判据与高风险 diff 预注入（B1）**（2026-11-09）：自动恢复解决了「空壳产生后无需人工」，但没缩短开局「先花数万 tokens 用 `sed` 读 `docs/agents/review.md`、说出『现在去拿 diff』的下一轮被 `--output-schema` 诱导提前交出空对象」的窗口（PR #531 run `42504056711` 在真开改动前消耗 38,652 tokens）。修法在 `.github/codex/prompts/review.md` 与 `codex-review.mjs prepare` 两侧同时收窄这个窗口：① prompt 的「判据」段直接内嵌 `docs/agents/review.md` 的三档定义、审查维度、指令/context 四问与覆盖要求，并明文要求「开局不要再用 `sed` / `cat` 整篇读取 `docs/agents/review.md`（除非本次 `changed_paths` 改的正是该文件）」，模型第 0 轮即可直接看代码；② prompt 新增 `<!-- codex-review-preload:start -->` … `<!-- codex-review-preload:end -->` 标记块，`prepare` 在算出 `pr.diff` 与 `changed_paths` 后，用 `classifyPathRisk` / `rankChangedPaths` 把改动路径按四档风险稳定排序（rank 0 `high`：CI/workflow、脚本、根与包配置、manifest、公共入口 barrel；rank 1 `high`：`packages/` 与 `apps/` 运行时源码；rank 2 `medium`：测试、ADR、agent 规则/技能/文档；rank 3 `low`：其余文档、样式、changeset 与静态资源），并直接从内存中的 `range.diff` 按 `diff --git` 分块切出单文件 diff（`splitDiffByPath`，解码 Git C 风格八进制 UTF-8 引号路径并兼容新增、删除、重命名与纯 mode 变更，不额外派生逐文件 `git diff` 子进程）；③ `buildReviewPreload` 按行且不截断多字节 UTF-8 字符（`truncateUtf8ByLines`）把排名靠前的高风险改动组装成预注入文本（路径概览上限 `PRELOAD_MAX_PATHS=30`，diff 片段上限 `PRELOAD_MAX_FILES=8`、单文件上限 `PRELOAD_PER_FILE_BYTES=4096`、总 diff 上限 `PRELOAD_TOTAL_DIFF_BYTES=24576`），并用动态加长的反引号围栏（`wrapCodeFence`）包裹每个 diff 片段以防源码内含 ` ``` ` 提前闭合代码块；每个预注入文件显式标明 `完整 diff` 或 `已截断`，prompt 规定标为 `完整 diff` 且已据此审完的文件可计入 `coverage.inspected`，标为 `已截断` 或 `未预注入` 的文件仍须实际打开后才可计入；④ `commandPrepare` 把预注入内容写进结论目录的 `review-preload.md`（随 `codex-review-findings` artifact 一起上传供事后审计），在 `review-scope.json` 里记录 `preloaded_paths` 与 `preload_bytes`，并在 `$RUNNER_TEMP/trusted/codex/prompts/review.md` 存在时按起止标记幂等替换注入块（`injectPreloadIntoPrompt`）——这样 `ci.yml` 里的 `Review pull request with Codex` 仍读同一个 `prompt-file: ${{ runner.temp }}/trusted/codex/prompts/review.md`，无需改动 workflow 拓扑或 `stage-codex-inputs` 清单，预注入内容也与可信 prompt 同源落在 runner 临时目录。**生效时机**：`stage-codex-inputs` 从 `BASE_SHA` 取可信脚本与 prompt，因此本 PR 自己的 CI 仍跑旧 `prepare` 与旧 prompt，B1 在**合入 main 后的下一个 PR** 上生效。**未采用**：B2（把模型调用拆成「不带 `--output-schema` 的只读调查轮 + 带 schema 的结构化收口轮」两次 `codex-action` 调用）——它能从机制上消除单轮调查期的 schema 早停诱因，但多一次 action 启动与计费开销，且同一 job 内二次调用受 `drop-sudo` 限制、跨 job 又要传中间产物，留作 B1 + 自动恢复上线后若 `missing_coverage` 仍高频复发时的备选。

**自举期脚本缺失**（2026-11-08）：`pull_request` 事件的 workflow YAML 取自 merge ref（base + head 三方合并），不是纯 PR head；本步骤随 #528 合入 main 后，尚未更新的 open PR 的 merge ref 也会带上它，而它们的 `checkout` 显式检出旧 head，工作区里既没有 `check-review-output.mjs`、也没有 `codex-review.mjs` 的 `coverageGap` 导出，直接执行会因模块缺失把审查 job 判红。因此该步骤的 `if` 增加 `hashFiles('.github/scripts/check-review-output.mjs') != ''`：脚本缺失就跳过，只让分支已含本改动的 PR 执行。跳过既不判红也不判绿，结论仍由取自 base 的 `validate` / `gate` 裁决；旧 head PR 本就处于「新防线尚未生效」的自举期，其 `missing_coverage` 仍按原有结论处置，不把「分支落后」伪装成模型 job 故障。可信输入清单不收这个脚本：旧 head 的 `stage-codex-inputs` 也不会 stage 它，且脚本 import 的是工作区 `codex-review.mjs`，从 trusted 取反而更绕。拓扑断言同时钉住 `hashFiles` 条件，防止回退。

**生成物滤除口径**：审查输入里不该出现生成物。`docs/agents/generated-artifacts.md` 的唯一判据是「能不能由 generator 完整重建」，据此按清单取可表达的最小 glob，由取自 PR base 的 `REVIEW_EXCLUDE_PATHSPECS` 在 `git diff` 入口滤出 `pr.diff` 与 `changed_paths`：目录型 `**/generated/**`、Wails `bindings/**`、单文件生成声明与 icon barrel。此前只滤 `**/generated/**`，其余生成物一旦出现在改动里就会随 `changed_paths` 被逐个读，是不必要的干扰与 token 消耗。实测 `git ls-files` 上这六条 pathspec 滤掉的是全部入库生成物（2026-11-08 实测 2451 个，随仓库演进增长；`**/generated/**` 之外只有 19 个，这个子集自首次实测起未变）；#519 的 137 文件 diff 里一条生成物都没有，那次 429 属上游网关限速，本次是预防性收敛范围，不是对它的修复。生成物不需要 diff，也不需要 review；它们的正确性仍由 `check-generated` 与消费者类型检查证明，不由结论证明。被滤除的路径不进 `coverage.inspected`，也不算 `coverage.uncovered`（那不是未覆盖，是不需要查），`review-scope.json` 记 `excluded_pathspecs` 供审计。名单不从 PR head 的工作树读取：作者可以改名单把自己的文件排除出审查，所以它必须留在可信脚本里；`inspectConfig` 还把它纳入配置指纹，清单变更后同 head 的旧结论不会借复用回到绿色。**未采用**：按文件名或 `DO NOT EDIT` 标记猜生成物（本仓既有不带标记的生成物，也有带标记却与 generator 无关的上游产物），以及审查脚本运行时加载 `.claude/settings.json` 的 `deny`（那份文件按「输入可信来源」从 PR base 落到 runner 临时目录，autofix job 已用它校验 patch；但滤除清单是审查契约的一部分，须与 prompt、schema 同源留在可信脚本里，不与编辑拦截共用一份通配；两侧覆盖关系另由脚本单测钉住：显式覆盖表挡单侧增删，用 git 的 glob 引擎比对两份名单命中的真实入库文件集合（两侧集合相等；绝对数随仓库演进漂移，单测比对的是集合不是数目）挡「同步改表」的绕过；覆盖表与样例仍是人工维护，尚无文件入库的新生成物路径须按判据核对）。

**权限拆 workflow**：模型只在 PR 验证的只读 job 里运行；写回（评论、应用并推送 patch、触发一次失败 job 重跑）在由 CI 完成事件触发的独立 workflow 里进行，那条 workflow 一次都不调用模型。这条划分是 PR 验证只读不变量成立的前提。该 workflow 显示名为 `Codex Review Report`（文件 `codex-review-report.yml`）：它的产物是一份关于既有结论的报告，不改判结论，所以不叫 publish。

**配置契约**：端点、模型名、思考强度、密钥与 codex 版本全部由 GitHub 后台提供，CI 定义只写引用，不写默认值、不写兜底表达式。

| 名称                       | 载体     | 用途                              |
| -------------------------- | -------- | --------------------------------- |
| `CODEX_REVIEW_API_KEY`     | Secret   | 模型凭据                          |
| `CODEX_RESPONSES_ENDPOINT` | Variable | 公网可达的 Responses API 兼容端点 |
| `CODEX_REVIEW_MODEL`       | Variable | 模型名                            |
| `CODEX_REVIEW_EFFORT`      | Variable | 思考强度                          |
| `CODEX_VERSION`            | Variable | codex CLI 与本地代理版本          |
| `CODEX_AUTOFIX_ENABLED`    | Variable | 仅 `true` 启用两条自动修 job      |

密钥只出现在预检步骤的 `env` 与模型 action 的 `openai-api-key` 输入里，不下放到 job 级 `env`：job 级会把它带进模型进程，本地代理的隔离就不成立。调用经由 action 自带的本地代理，模型进程拿不到密钥本身。端点必须是 GitHub-hosted runner 能到达的 Responses API 兼容网关；本机 loopback 代理不在可达范围内。合法模型名由该网关决定，仓库不预设。

`CODEX_RESPONSES_ENDPOINT` 必须是**完整的 Responses 端点 URL**（含 `/responses` 路径），不是 base URL：action 把它作为本地代理的 `--upstream-url` 传入，代理把请求体原样 POST 到该地址，不会替调用方补 `/responses`。填成 base URL 会在模型调用时得到 404，而预检只判非空、挡不住这类格式错误，因此端点格式只能由真实 run 兜住。代理会原样转发 codex 发出的请求头（`Authorization` 与 `Host` 除外）；若网关要求会话头，链路上是否能带全依赖 codex 版本与代理实现，同样只能靠真实 run 验证。

**配置预检**：`codex-review.mjs preflight` 从 PR base 落地的同一份可信脚本里运行，逐项判空并只打印变量名，不打印值。它把非密钥配置与密钥「有无」写成 runner 临时目录里的配置快照和指纹；缺项直接写 `status: error` 的结论，让 gate 变红。两条模型 job 共用这套预检；没有配置快照时自动修 job 不产出 patch。CI 拓扑断言禁止配置字面量与兜底表达式，并钉住每个输入的唯一后台来源。

**故障可见**：配置未填齐时门是红的，这是设计意图，不是待修的噪声。发布 job 的写权限至少包含 `pull-requests: write`；读 PR、读评论与写评论任一处的 403 都必须带 job permissions、仓库 Workflow permissions 与组织策略三项排查清单失败，诊断由发布命令统一包裹（含判定阶段的 gh 调用），不留「只读调用被拒就静默」的旁路；诊断只认权限类短语，避免评论正文里的数字把普通失败误报成权限故障，非权限类失败原样抛出。发布 job 另有一条只读探测，把端点不可达与写权限被拒在日志里分开。

**沙箱档位**：使用 action 的 legacy `sandbox` 输入（`--sandbox`），不使用权限档输入。本仓 `.codex/config.toml` 在 project 层写死全访问；`--sandbox` 覆盖的是同一个配置键，权限档落在另一个键上，无法证明它能压过 project 层。CI 定义由机器断言钉住这个选择。

**Runner 镜像**：两条模型 job 固定 `runs-on: ubuntu-24.04`，且保留 `safety-strategy: 'drop-sudo'`；本 workflow 其余 Linux job 仍用 `ubuntu-latest`。原因是 `ubuntu-latest` 已滚动到 `ubuntu-26.04`：该镜像的 `sudo` 是 sudo-rs（忽略 `-E`）、`/usr/bin/test` 是 uutils coreutils（`-w` 只读 mode bits），`openai/codex-action@v1.13` 的 `drop-sudo` 在 `restrictRootServiceSocket()` 里给 `/run/dbus/system_bus_socket` 设好 deny ACL 后仍被误判为「runner 仍可写」，在 `Run codex exec` 启动 Codex 之前就抛错退出。上游 issue [#188](https://github.com/openai/codex-action/issues/188) 同款报错，修复 PR [#191](https://github.com/openai/codex-action/pull/191) 尚未合并，v1.13 之后的 main 提交也未包含该修复。固定 24.04 而非改用 `safety-strategy: read-only`：后者会被上游 `determinePermissionSelection()` 强制成 read-only sandbox，直接废掉 autofix job 的 `workspace-write`，且放弃 sudo 剥离；也不选 `unprivileged-user`，它要额外处理 checkout、`CODEX_HOME`、prompt 与输出文件权限，落地成本远高于收益。代价是依赖一个终会退役的旧镜像。**恢复条件**：上游发布含 #191 修复的 `codex-action` 版本后，把两条 job 恢复为 `ubuntu-latest`、同步删掉拓扑断言里的固定值，并在真实 run 上按验收清单第 8 项复核。若 24.04 先退役而上游仍未修，不能直接回 `ubuntu-latest`（会重现同一故障），必须走备选：升级到已修复的 action、改用 `unprivileged-user` 并补齐权限准备，或停用 `drop-sudo` 并同时重构 autofix job 的沙箱。`check` 与 Wails job 不受此约束。CI 拓扑断言同时钉住镜像标签与 `drop-sudo`，任一被改都会让脚本单测变红。

**输入可信来源**：prompt、schema、判定脚本（含预检）与生成物禁令清单从 PR base（写 job 从默认分支）取版本落到 runner 临时目录，执行只用那份副本。工作区本身仍检出 PR head：`uses: ./...` 的复合 action 由 job 工作区解析，检出 base 会让本 PR 新建的 action 解析不到，这道门整个跑不起来——固定的是脚本内容的来源，不是工作区的来源。残留的篡改面是 workflow YAML 与 PR job 由工作区解析的复合 action（`setup-deps` 与 `stage-codex-inputs`，前者还先于后者运行）：它们必须由 head 提供，所以改它们仍在被审查的 diff 里明写，与「模型能读到 worktree 里的 review 判据文档」归在同一类已接受风险里，由人工 review 和「只审同源仓库、base 为 `main`」的范围一起兜住。CI 定义由机器断言同时钉住工作区来源与 `base-sha` 这两侧。2026-11-08 起 review job 另有一条从工作区直接执行的 `check-review-output.mjs`（空壳检测）：它不进 trusted 清单，但只写退出码、不注入 secret、排在上传之后且不接触 artifact 内容，结论仍由取自 base 的 `validate` / `gate` 裁决；改它最多让审查 job 不跟着变红、换不来绿色，归入同一类已接受风险。

**适用范围**：只审同源仓库、base 为 `main`、未关闭且不是版本分支的 PR。fork PR 默认不跑——它拿不到仓库 secret，要审就得逐次为它放行。

**幂等与去重**：同一 head 且配置指纹（端点、模型、强度、版本、密钥有无）一致、且旧结论是 `reviewed` 时，复用前一次 run 的产物；标题编辑与手动重跑不再消耗模型调用。配置变动会让旧结论失效，`error` 与 `unreviewed` 从不复用。并发组按 PR 分支取消更早的 run。不设文件数、行数或改动量阈值，也不给模型加「只看 N 个文件」的采样；体量由 120 分钟上限、按风险排序的调查策略与 `coverage.uncovered` 这个如实收口出口共同兜住——出口不是阈值，未判断的改动处仍要逐条列出并交人工复核。

**自动修**：`check` job 失败且 `CODEX_AUTOFIX_ENABLED` 为 `true` 时，模型在 workspace 沙箱里产出一份候选 patch，作为 artifact 交给特权 job；只有它校验通过才提交并直推 PR 分支。patch 只能修改已入库文件，CI 定义、依赖清单、生成物、agent 指令与凭证路径一律整份拒绝。已包含自动修提交的 head 不再规划第二次。开关无值即两条 job 都不跑，主审查链路不依赖它。规划 job 是尽力而为的旁路，保留 job 级 `continue-on-error`，其失败不让 PR 变红；这与审查 job 「故障即红」不矛盾：门只看审查结论，自动修的失败由 artifact 与日志呈现。

**触发收敛**：写回 job 只处理同源仓库的 PR run，排除已取消的 run 与版本分支；没有审查 artifact 时跳过发评论，不制造无意义失败——但跳过必须留痕：`Explain the skipped report` 在 Summary 与 notice 里写明原因，并回查触发 run 的 artifact 列表，把「没有可写回的结论」和「写回 job 没取到已有产物」分开。同一道留痕也覆盖「head 不属于任何打开的 PR」：这一步的守卫按 `resolve-pull` 是否成功取，不按有没有解析到 PR，否则解析不到 PR 时整条 job 一步都不跑、静默变绿。只读探测是尽力而为，失败不阻止结论发布，写权限不足由结论步骤的 403 清单报告。门仍不设为分支必需检查。

**结论产物跨 run 传递**：审查 job 上传的 `codex-review-findings` artifact 由写回 job 下载，结论复用也会下载历史 run 的同名 artifact。`actions/download-artifact@v7` 只有在**显式给出 `github-token: ${{ github.token }}`** 时才会启用 `repository` / `run-id` 跨 run 查找（上游 `src/download-artifact.ts` 节选：`if (inputs.token) { options.findBy = { workflowRunId: inputs.runID } }`）；缺 token 会静默退化成「只查当前 workflow run」，写回 job 因此报 `Artifact not found for name: codex-review-findings` 并跳过发评论。三处跨 run 下载（写回 job 两条、`ci.yml` 的复用一条）都必须带 token，由拓扑断言钉住；同 run 的下载不需要。上传用 `upload-artifact@v6`、下载用 `download-artifact@v7` 是各自独立的主版本，二者都基于 v4+ artifact 后端，互相兼容，此次故障与版本差无关。另：写回 workflow 的触发是 `workflow_run`，GitHub 只取**默认分支**上的 workflow 文件，所以本文件的修改必须合入 main 后才生效，PR 自己那轮 CI 无法验证写回修复。

**残留风险**：下载步骤仍带 `continue-on-error`，因为「本来就没有产物」是合法跳过，不该把这种 run 判红。跳过不再静默：`Explain the skipped report` 会把原因写进运行页 Summary 与 notice，并回查触发 run 的 artifact 列表——产物存在却下载失败时该步骤非零退出，把写回 job 自身的故障和「没有可写回的结论」分开。代价是每次跳过多一次只读的 Actions REST API 调用（这里不需要、也没有用到 `actions: write`）。

**引导落地**：可信脚本取自 PR base，因此引入新子命令的那个 PR 自己拿到的仍是 base 里的旧脚本。模型 job 这一级不设 `continue-on-error`，旧脚本缺少 `preflight` 时该 job 直接变红，而不是又回到全绿静默。合并后的下一个 PR 起，base 带新脚本，链路完整生效。

**时间与成本**：审查 job 给 120 分钟上限，自动修 job 保持 60 分钟——前者要覆盖整份改动的风险面，后者产出的是一小片 patch，且只在 `check` 失败时触发。上限是天花板不是预算目标：常规 PR 5–25 分钟，按旧契约只有 130 文件以上的改动会用到后半段（实测见「同日第八次实测」）；收口纪律允许证据足够时提前交卷，也允许把未判断处列进 `coverage.uncovered` 而不硬撑到上限，因此「会用到后半段」不再是新契约下的预测。

**审查范围**：`resolveReviewRange` 的 `git diff` 用 `REVIEW_EXCLUDE_PATHSPECS` 在入口按 `docs/agents/generated-artifacts.md` 的清单滤除已知入库生成物（六条 pathspec，取舍见上文「生成物滤除口径」），`pr.diff` 与 `review-scope.json` 的 `changed_paths` 都不含它们；scope 记下 `excluded_pathspecs` 与 `empty_diff` 便于审计。`changed_paths` 同时是模型的分片入口：提示词要求先读它，按风险挑出要读的改动，再逐文件 `git diff <merge-base> <head> -- <path>`，而不是一次读完整个 diff；清单里的每一条都按待审源码处理，模型不自行扩大滤除范围。它是候选清单而非必须读完的任务清单，但收口纪律不授权从清单里删条目：没判断的改动处要逐条落进 `coverage.uncovered`，取舍见上文「收口纪律」。滤掉的是干扰信息：md-to-meta 的 meta/codeblock 随 markdown 重建整批换哈希名，`routeTree.gen.ts`、Wails bindings 等生成物同样只随 generator 变，既不需要 diff 也不需要 review。`prepare` 由审查 job 与自动修 job 共用，两条 job 同时受益。对 PR #515 的 base/head 对象做本地 `git diff` 实测：13.9 MB → 1.29 MB（不是 CI run 观测值；可信脚本取自 base，本修复 PR 的 CI 仍跑旧脚本）。**执行纪律不在本 ADR**：两份 diff 的分工、生成物怎么核对、空 diff 为何不构成可合并结论，由 `docs/agents/review.md`「审查范围与生成物」承载；生成物清单与排除清单的边界由 `docs/agents/generated-artifacts.md` 承载；本 ADR 只记取舍与实测。

**同步子进程上限**：`lib/github.mjs` 的 `run()` 与 codex 链路的 `gh` 调用统一给 `spawnSync` 设 64 MiB `maxBuffer`。默认 1 MiB 缓冲在大 PR 上抛 `ENOBUFS`，`prepare` 会在 preflight 之前失败并被下游误判成 `config_missing`；排除生成物后 diff 仍可能超过 1 MiB，两处修复缺一不可。

## 2026-11-05 修订：首次实测复盘

首批 run 暴露的事实，取自 `pan-Z2l0aHVi/mono` 的 Actions 运行记录：

- 仓库 Actions secrets 与 variables 均为空。`ci.yml` 引用的 `secrets.CODEX_REVIEW_API_KEY` 与 `vars.CODEX_RESPONSES_ENDPOINT` 展开成空串。
- `openai/codex-action@v1.13` 的代理启动步骤以 `inputs['openai-api-key'] != ''` 为条件，被跳过；`read_server_info` 的条件含 `prompt-file != ''`，仍无条件运行，轮询 10 秒后抛 `ENOENT: /home/runner/.codex/<run-id>.json`。`Run codex exec` 从未执行。
- 模型步骤的 `continue-on-error: true` 把这次崩溃掩成 job 绿灯；`validate` 记为 `unreviewed`，`codex-gate` 按当时的口径保持绿色。
- 写回 workflow 的 14 次 run 中 9 次 failure、4 次 skipped、1 次「成功」其实是全部步骤跳过。`POST /repos/.../issues/<n>/comments` 稳定返回 403 `Resource not accessible by integration`，PR 上没有任何 `codex-review-conclusion` 评论。
- 模型名 `claude-haiku-5-5` 与强度 `high` 硬编码在 CI 定义里，后台无法覆盖；`findReusableRun` 只按 head SHA 复用，改配置也不会让同一个 head 重跑。

净结果：零次模型调用、零条结论评论、CI 全绿。根因不是模型质量，而是「配置缺失 → 调用崩溃 → 崩溃被吞 → 门保持绿」这条静默链，加上写回 job 权限不足。以上决策条款逐段封住这条链。

**同日第二次实测（PR #515，配置填齐后的首个真实集成 PR）**：`check` 7m34s 通过，Wails 各 job 通过；`Codex review` 14 秒即失败，日志只有 `could not start git: spawnSync git ENOBUFS`，`codex-gate` 按「故障即红」正确变红，但把原因归为 `config_missing`。根因是 `resolveReviewRange` 把 13.9 MB 的 `git diff` 整份读进默认 1 MiB 缓冲，preflight 根本没执行、零模型调用；写回 job success 且因无产物按设计跳过发评论。结论：门的颜色机制有效，但失败归因不够准（preflight 未运行不等于配置缺失），且大 diff 必须在范围与缓冲两侧同时收敛。

**同日第三次实测（PR #516，范围/缓冲修复分支，首次真正启动 `Run codex exec`）**：`check` 6m0s 通过，`Codex review` job 表面 31s pass（模型步骤自带 `continue-on-error`），`Codex review gate` 13s fail，报 `model_failed: the review step produced no output file`；PR 上无 `codex-review-conclusion` 评论，写回 job success 但按设计跳过。完整 job 日志显示 `CODEX_SAFETY_STRATEGY: drop-sudo`，`Run codex exec` 内部 `dropSudoWithPrivileges()` 在 447ms 内退出 1：

```text
Image: ubuntu-26.04
sudo: preserving the entire environment is not supported, '-E' is ignored
runner is not a member of the sudo group.
Error: Could not restrict access to /run/dbus/system_bus_socket.
Error: /usr/bin/sudo exited with code 1
##[end-action id=review.run_codex;outcome=failure;conclusion=failure]
```

即 `codex-final-message.json` 从未生成，模型一次都没被调用。这不是配置或脚本问题，而是 runner 镜像与上游 action 的兼容性缺陷（见「Runner 镜像」条款）。注意 job 显示 pass 而 gate 红，正是「故障即红」设计在起作用：模型步骤的 `continue-on-error` 只让 `validate` 有机会落结论，`outcome=failure` 仍传给了判定脚本。

**同日第四次实测（CI run `42052145360`，PR #516 固定 24.04 后重跑，首次完整模型调用；写回 workflow 的 run `42053983201`）**：`check` 2m27s、`Codex review` 7m29s、`Codex review gate` 18s 全 pass。`Set up job` 为 `Image: ubuntu-24.04`；`drop-sudo` 成功（`Restricted access to /run/dbus/system_bus_socket for runner UID 1001`），`Run codex exec` 以 `deepseek-v4.1-flash` / `high` 真跑 7 分多钟并产出 `codex-final-message.json`，`validate` 记 `CODEX_REVIEW_STEP_OUTCOME: success`、结论 `Block 0, Should fix 1, Nit 0`，artifact `codex-review-findings` 1478 bytes 上传成功。**但 PR 上仍没有结论评论**：写回 job `Download review findings` 报 `Artifact not found for name: codex-review-findings`，`Probe comment permission` 与 `Publish conclusion comment` 均被跳过。根因是 `download-artifact@v7` 跨 run 下载缺 `github-token`（见「结论产物跨 run 传递」）；此前从未有有效 artifact，这个 #514 遗留缺陷一直不可观测。模型自身提的那条 `Should fix` 也成立：`.github/codex/prompts/review.md` 仍称 diff 是「完整 unified diff」，与排除生成物后的实际范围矛盾，已同步改写为「源码改动 diff」并写明排除清单。该 prompt 同属 `stage-codex-inputs` 从 **PR base** 落地的可信输入，所以 PR #516 自己这一轮读到的仍是旧 prompt；改写只在修复合入 main 后的下一个 PR 生效，与写回 workflow 的引导限制同源。

**同日第五次实测（CI run `42059307127`，head `58ac1314`，第 3 次尝试）**：`check` 1m25s、`Codex review` 22m25s、`Codex review gate` 17s 全 pass；`Image: ubuntu-24.04`、`drop-sudo` 成功、`Run codex exec` 以 `deepseek-v4.1-flash` / `high` 真实调用并产出 `codex-final-message.json`，结论 `Block 0, Should fix 0, Nit 0`。该 run 的前两次尝试（attempt 1、2）都在 `Run codex exec` 启动 1.6–1.8 秒后失败，日志为 `server_error: Upstream request failed: [invalid_request_error] this feature is not yet supported by atlas`，零模型调用；模型 job 因步骤级 `continue-on-error` 显示 pass，gate 按「故障即红」记 `model_failed`。同一配置、同一 head 在第 3 次尝试即成功，说明这是上游网关的瞬时故障，不是仓库配置问题——处置是**重跑整条 run**，不能只重跑 failed job（模型 job 表面是绿的）。PR 上仍无结论评论，原因与第四次相同：写回 workflow 取默认分支版本，token 修复尚未合入 main。这次观测也说明 60 分钟上限仍有余量（已见 7m29s 与 22m25s 两档），但回收余量要等真实分布更稳定。

**同日第六次实测（PR #519 三个 head，PR #520 一次重跑；2026-11-06）**：同一份 prompt、同一个 `deepseek-v4.1-flash`，产出差异大到不能当噪声。head `17fe6611` 跑 16m07s、730,547 tokens，给出 2 条 `Should fix` 与一句中文摘要；head `3d990480` 只跑 1m35s、268,842 tokens、49 次命令调用就交卷，`findings: []`，摘要写成 `Inspecting shell i18n and related exec checks.`；PR #520 的重跑更极端，6.5 秒、7,866 tokens、零命令调用，摘要写成 `先读取审查规范与 PR diff，再按仓库的分级标准核对变更。` 后两次的模型自述里都留着没查完的线索（`No bug obvious. Need inspect shell i18n … Could have path bug.`），说明它是**提前收尾**而不是查完没发现。同时暴露第二个问题：结论评论是就地更新的，`created_at` 永远停在第一次写回那一刻（`07:13` vs `updated_at 11:14`），读者据此以为没有新结论。

根因不在模型能力，而在输出契约缺字段：`review.md` 要求「无发现也要记录审查范围、验证证据和未覆盖风险」，schema 却只有 `summary` 与 `findings`——这条要求无处落脚，模型只能把过程句塞进 `summary`；而「空 findings」零成本、且与「查完没问题」在产物上完全同形，早停因此不可观测、门照旧绿。修法见「覆盖度口径」与评论的「结论生成于」行；没有采用换模型或「摘要必须含中文」这类替代判据。

**同日第七次实测（PR #519 head `d96d5d88`，CI run `42260301840` 的两次 attempt）**：`coverage` 让早停可见，但没让它停下来。attempt 1 只跑 4.2 秒、316 tokens、**零命令调用**，摘要写成「正在读取 PR 的源码 diff 与仓库审查判据，随后核对受影响文件及相关调用方。」；attempt 2 跑 11.2 秒、16,589 tokens、6 次命令调用，先把 `review-scope.json` 猜成 `$RUNNER_TEMP/review-scope.json`（实际在同级 `codex-review/` 目录下，输出为空），再 `sed -n '1,200p' pr.diff`（578,836 字节 / 137 个文件），推理里写下 `Diff huge 578k. Need systematically inspect all changed files` 后直接交出 `{"summary":"...","coverage":{"inspected":[],"uncovered":[]},"findings":[]}`。两次都判 `missing_coverage`，门是红的——`coverage` 按设计让这类结论无法变绿，但它只解决「看不见」，不解决「没查」。同一 PR 的上一个 head `9fbda756` 用同一份 prompt 跑 15m39s、读 113 个文件、报出 1 条 `Should fix`（正是 `d96d5d88` 修掉的 `throwIfNoEntry` 缺陷），说明改动本身可审，缺的是可读入口：prompt 只提到 `review-scope.json` 的名字却没给路径，也没说大的 diff 该怎么分片。修法见「审查范围」；评论侧同时把作废结论的覆盖行与「未覆盖」段落一并收掉，不再与「未审查」自相矛盾。

**同日第八次实测（PR #519 head `9a430e74`，CI run `42333032169`）**：新 prompt 生效后的第一轮。模型不再早停——同一份 137 文件 / +4323 −3394 的改动，上一版 prompt 在 11 秒内交白卷，这一版跑满 60 分钟仍在读：93 条命令、无一条重复，读掉 90 个仍存在的源码文件里的 62 个（另有 21 条源码路径是本 PR 删除的旧位置），推理里已在逐条比对实现与判据。但 job 级 `timeout-minutes: 60` 到点掐断了它：`codex-final-message.json` 没写出来，`validate` 记 `unusable_output`（`the review step produced no output file`），门红。**结论**：`changed_paths` 分片入口解决了「不查就收卷」，代价是把「大 PR 读不完」暴露出来；按已读比例推算收口需要 95–100 分钟，审查 job 上限因此提到 120 分钟（自动修不受影响）。这一条同时说明「60 分钟余量」不再是猜测：常规 PR 仍在 25 分钟内，只有 130 文件量级的改动会落到后半段。**未采用**：给小 PR 和大 PR 分设两套 prompt（可信输入取自 base，分叉会让同一 head 的结论不可比），或让模型自行截断到某个文件数（截断点无法用判据表达，等于把「查多少」交给运气）。

**验收清单**（后台配置填齐后按 run 日志逐项核对）：

1. `Run codex exec` 出现，`codex-final-message.json` 非空且通过 schema。
2. PR 上出现 `codex-review-conclusion` 持久评论，`status=reviewed`。
3. 清掉任一变量后重跑：`codex-gate` 变红，日志只列缺失变量名，评论标 `error` 与 `config_missing`。
4. 改 `CODEX_REVIEW_MODEL` 后同 head 重跑：旧结论不复用，模型重新调用。
5. 写回 job 成功发出或更新结论评论；workflow_run 列表里没有无产物的失败 run。没有产物的 run 仍为绿色，但 Summary 必须写明「未写回」与原因。
6. 拓扑断言与脚本单测全绿。
7. `review-scope.json` 记有 `excluded_pathspecs`、`changed_paths` 与 `empty_diff`，审查 diff 与 `changed_paths` 里没有 `docs/agents/generated-artifacts.md` 清单里的任何生成物路径（不只 `**/generated/**`）；大 PR 不因 `ENOBUFS` 让 `prepare` 失败。（**合入 main 后的下一个 PR** 上核对：可信脚本取自 PR base，修复自己的 CI 仍跑旧脚本。）另外，`.claude/settings.json` 的 `deny` 编辑拦截名单与六条 pathspec 的覆盖关系由脚本单测钉住：单侧增删或改名会红，已入库文件的覆盖集合不一致也会红；覆盖表与样例为人工维护，新增生成物仍须按判据逐条核对。
8. 两条模型 job 的 `Set up job` 日志出现 `Image: ubuntu-24.04`，且 `Run codex exec` 不再出现 `Could not restrict access to /run/dbus/system_bus_socket`。以审查 job 为准，满足第 1 项（有真实模型结论）后再核对此项；autofix job 只在 `CODEX_AUTOFIX_ENABLED=true` 且 `check` 失败时运行，默认关闭，不必为验收专门打开。
9. 写回 job `Download review findings` 不再报 `Artifact not found`，且 `Post conclusion comment` 未被跳过（这两步是可观测的修复点；评论内容本身按第 2 / 5 项核对）。写回 workflow 取默认分支版本，**必须在修复合入 main 后的下一个 PR** 上核对，PR #516 自身无法验证。autofix patch 那处下载同理，但 `CODEX_AUTOFIX_ENABLED=false` 时整条 job 被跳过，只能在显式打开开关且 `check` 失败的 run 上验证。
10. 写回 workflow 改名为 `Codex Review Report` 后：Actions 列表显示新名字，job 为 `report-conclusion`（`Report review conclusion`）；无产物的 run 在 Summary 里有跳过原因与 notice；写回成功时 Summary 记 `已创建/已更新结论评论 #<id>`。「有产物却下载失败」的判红分支只能靠改坏 `run-id` 或断网触发，自然 run 上不必刻意制造，留作未实测项。
11. 输出校验口径与红色边界：模型给出 `summary: ""` 而 findings 合法时，`Record review conclusion` 照常写 `reviewed`、PR 评论有档位与发现但没有摘要行，`Codex review gate` 的颜色只由 `Block` 决定；`review-meta.json` 为 `unreviewed` 时 gate 必须红，日志为 `Codex review produced no usable conclusion (unusable_output): …`，Summary 里有 `Code: unusable_output`。这两条由脚本单测钉住（`parseReviewFindings` 的容错用例、`gate` 在 `unreviewed` 上退出 1），无需在真实 run 上刻意制造。

12. 覆盖度口径：`review-findings.json` 含 `coverage.inspected` 与 `coverage.uncovered`，`review-scope.json` 含 `changed_paths`，PR 评论头部有「覆盖：检查 N 个文件」；diff 非空时缺 `coverage` 一律判 `missing_coverage`（有 findings 也不例外），空 findings 时还要 `inspected` 至少一条**等于** `changed_paths` 里的文件（写目录不算）；没有 `coverage` 的旧产物不复用，且复用 artifact 解在独立目录、不会覆盖本轮的 `review-scope.json`。评论正文有「结论生成于」且就地更新时该行随新结论变化。这一条由脚本单测钉住（coverage 结构用例、有 findings 缺清单用例、`changed_paths` 相等与缺位用例、`path:line` 与目录条目用例、scope 不被覆盖用例、`missing_coverage` 端到端用例、复用拒绝用例、渲染断言），无需在真实 run 上刻意制造。提示词里的路径与 `scopePath()` 的输出一致，由单测钉住；作废结论的评论不出现「无未覆盖项」，也不渲染「未覆盖」段落。

13. 收口纪律：prompt 把 `changed_paths` 当作候选清单（不是逐条读完的任务清单）、写明按风险排序与「证据够就交卷」；`coverage.uncovered` 非空时 PR 评论渲染「未覆盖」段落并交人工逐项复核，空 findings 时仍按 `missing_coverage` 作废。关键措辞由脚本单测钉住；`coverage.inspected` 是否真读过属模型自述，脚本只能校验结构，真伪由人工复核。prompt / schema 的新行为只能在**合入 main 后的下一个 PR** 上核对（可信输入取自 PR base）；判据文档从工作区读取、本 PR 即生效，这一轮是混合契约，按「输入可信来源」的已接受风险由人工 review 兜住。这一项不用于验证上游 429 是否恢复。

14. 空壳自动恢复：`report-conclusion` 持 `actions: write`，`Auto-rerun empty review output` 只在 `missing_coverage`、CI run `failure`，且 CI run attempt 与写回 run 自身 attempt **都为 1** 时重跑一次；任一大过上限停在 `exhausted`，任一不可读或 CI 非 `failure` 停在 `none`（`none` 档要求先核对运行页原因、不要连续重跑）。判定顺序把「不该恢复」的三类检查放在「上限已用尽」之前，单测钉住 `CI success + reportAttempt=2`、`runConclusion` 不可读 + `reportAttempt=2` 与「一个维度不可读、另一个已 >1」都不误报 `exhausted`。`unusable_output` / `error` 不分流到自动重跑；两个 attempt 分别由 payload 与 `github.run_attempt` 注入，不额外发 GET。重跑调用失败、meta 损坏或 env 缺失时结论评论写 `failed`，步骤失败且无 output 时由 `CODEX_REVIEW_AUTO_RETRY_OUTCOME` 交给 `resolveAutoRetryState()` 兜底。判定、分流与「写回 run 自身被 re-run 不再 POST」由纯函数与可注入的 `commandAutoRetry` 行为单测钉住，恢复状态解析有求值级单测，权限、步骤顺序、两个 env、门槛不落在步骤 `if` 与可信子命令由编排断言钉住。真实空壳复发时核对运行页 Summary 的两个 attempt、`CODEX_REVIEW_AUTO_RETRY_STATE` / `CODEX_REVIEW_AUTO_RETRY_OUTCOME` 两个传参与结论评论档位，不主动制造空壳。workflow YAML 与可信脚本都取默认分支版本，**合入 main 后的下一个 PR** 才生效。

15. 判据与高风险 diff 预注入（B1）：`prepare` 在结论目录写出 `review-preload.md`，`review-scope.json` 含 `preloaded_paths` 与 `preload_bytes`，且当 `$RUNNER_TEMP/trusted/codex/prompts/review.md` 存在时按 `<!-- codex-review-preload:start/end -->` 标记幂等注入预注入块；`.github/codex/prompts/review.md` 含该起止标记、`preloadPath()` 路径与内嵌三档判据。风险分档排序、C 引号 UTF-8 路径解析、新增/删除/重命名/mode-only diff 切分、行级 UTF-8 截断、动态代码围栏防闭合、预算截断（`PRELOAD_MAX_PATHS=30` / `PRELOAD_MAX_FILES=8` / `PRELOAD_PER_FILE_BYTES=4096` / `PRELOAD_TOTAL_DIFF_BYTES=24576`）、空 diff 豁免与 `commandPrepare` 重复调用幂等性由脚本单测钉住；`stage-codex-inputs` → `Prepare review range` → `Review pull request with Codex` 的步骤顺序与 `trustedPromptPath()` 一致性由拓扑断言钉住。可信脚本与 prompt 取自 `BASE_SHA`，真实 run 上的预注入产物在**合入 main 后的下一个 PR** 上核对。

**待办**：`prepare` 的任何失败都会跳过 preflight，被 `validate` 记成 `config_missing`；后续把 preflight 前置到 prepare 之前，或引入 `job_failed` / `preflight_missing` 错误码，并同步「状态口径」、`docs/agents/review.md` 的故障码清单、`renderConclusion()` 与相关单测。本次修复后该误归因对 PR #515 的事故不再可达，门「故障即红」不受影响。

## 2026-11-06 修订：这道结论就是本仓默认的 review

引入这道门时的定位是「补强，不是替代」，独立性仍由人或另起的会话在 PR 上兑现一次。落地后按这条口径跑了两个 PR。实测取自 PR #519 的 head `3d990480`：审查范围 `b1a59cef..3d990480`，532,884 字节、130 文件；`Codex review` job 跑 2 分 6 秒，其中 `Run codex exec` 这一步 95 秒，是模型真调用而不是产物复用；结论 `Block 0 / Should fix 0 / Nit 0`。同一 head 按旧口径还要再派一次独立审查：85 个文件的增量切成 4 条 lane，每 lane 18–26 个文件分别派出，报告回收后才编号给用户。

**裁决**：门给的结论就是这份 PR 的 review。三条同时成立即完成：reviewed SHA 等于当前 head、`Block` 为 0、`check` 在当前 head 上成功。要不要另起一次本地 agent 或人工审查由 agent 自己判断，仓库文档不规定触发条件，也不禁止。操作口径在 `docs/agents/review.md`「自动审查结论的效力」，本 ADR 只记取舍。

**2026-11-07 补，裁决之后落地的覆盖度契约改了这条的射程**：三条同时成立覆盖的是结论自己声明读过的部分。`coverage.uncovered` 非空时那些位置不在结论射程内，必须逐项人工复核再收口；这一条不算上面那句「不规定触发条件」的例外，因为它不要求任何人重读已覆盖的 diff，只补结论列出的空白。同一次改动里还留下一个证据问题：本修订引用的 head `3d990480` 那次 run，事后复盘归为提前收尾（模型 job 1m35s、268,842 tokens、`findings: []`，自述里留着没查完的线索，见「同日第六次实测」），所以它证明的是模型真调用，不是审查查完。取消固定第二次审查的论证因此不再挂在那一次 run 上，改挂在覆盖证据上：契约要求 `inspected` 命中改动文件，缺证据直接判 `missing_coverage` 变红，绿色从此自带射程。

**为什么这次可以换**：独立性要的是「执行体与实施者叙述隔离」，不是「执行体数量」。门满足隔离（另一个 runner、另一个模型、只读 PR diff、结论绑定 head），第二个人工执行体读的是同一批字节、按同一份三档判据，边际收益是重复劳动而不是新增维度。「同一份判据」不是推测：`.github/codex/prompts/review.md` 内嵌 `docs/agents/review.md` 的核心三档判据并要求模型「按它判，不要自创标准」，2026-11-09 预注入（B1）落地前的历史 run 日志里也能看到它把该文件原文读进上下文。

**没有换掉的东西**：

- 覆盖空白仍在，兜法换了。被 `**/generated/**` 剔除的生成物门看不见，此前靠人工核对，现在靠 `check-generated` 与消费者类型检查；只改生成物的 PR（`empty_diff: true`）也按这条走。
- 拿不到覆盖当前 head 的结论时（`error`、`unreviewed`、`stale`、`not_applicable`、fork PR、自动修推送的新 head、两个兜校验都不适用的产物），PR 上没有 review 结论。
- 概率性没有被消除。门漏掉的低级遗漏，没有别的执行体会看到；缓解手段是后台可随时换更强的模型与更高强度（配置指纹变了就不复用旧结论），而不是把人工复核写回默认流程。

## 后果

- 自动修推送的新提交不会触发 checks，PR 上那道必需检查要人重跑一次 CI 才会覆盖新 head；结论对新 head 也随之过期，这是「直推」换来的代价。
- 门是约定式的：绕开它只需要忽略一次红叉。2026-11-06 起它是本仓默认的 PR review，忽略这一次红叉就等于合并未经审查的 PR。省掉的是「等一次人工细看」，新增的兜底只剩维护者自己看颜色。
- 后台配置未填齐时每个 PR 都会红。配置本身成为可观测的门禁输入，代价是配置变更与门的颜色直接绑定。
- 引入新可信子命令的那个 PR 自身无法完成审查：它的 base 还是旧脚本，模型 job 会红。首次落地要先合入脚本、再在后续 PR 上验证全链路。
- 只读 job 与写 job 分居两个 workflow，读代码时看到的 YAML 不能解释全部行为；判据在 ADR 与机器断言里，不只在 CI 定义里。
- 模型结论的可信度受沙箱档位、输入版本与后台配置影响，这三处都由 CI 拓扑测试钉住，改动会被断言挡下来，而不是靠 review 时想起来。
- 两条模型 job 绑定 `ubuntu-24.04`，与本 workflow 其它 Linux job 的 `ubuntu-latest` 不同步；24.04 退役前必须按「Runner 镜像」条款的恢复条件完成迁移，否则审查链路会再次在模型启动前静默失败（表现为 job 绿、gate 红、零模型调用）。这是一笔有到期日的技术债。
- 只改生成物（滤除清单内任意路径）的 PR 得到空 diff，门不会因此变红：结论是 `reviewed`（`Block 0`）。门本身不区分「审过源码」与「没有源码可审」——`unreviewed` 现在会让门变红，那是「模型没给出可用结论」，不是空 diff 的预期结果。这块覆盖空白由 `docs/agents/review.md`「审查范围与生成物」的人工纪律兜：`empty_diff: true` 既不算「结论即 review」，也不构成可合并结论，这类 PR 按完整 diff 走人工审查，或至少按清单逐类核对并留下 generator 证据。
- 仍未实测的项：Linux 上 `--sandbox` 是否如文档生效；120 分钟对 200 文件以上的 PR 是否够（目前已见的最大档是 137 文件、需 95–100 分钟）；`codex-action` 在输出不合 schema 时是否仍以 0 退出（已观测到 schema 合法但 `summary` 为空的输出以 0 退出并落到 `unreviewed`；schema 非法时是重试还是失败仍未观测）；`workflow_run.head_branch` 在各事件下的实际取值；写回 job 403 在补 `pull-requests: write` 后是否彻底消失。403 若仍复现则按「故障可见」条款升级到专用写令牌。

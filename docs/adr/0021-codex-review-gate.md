# ADR-0021: Codex 自动 PR 审查门

- **Date**: 2026-11-04
- **Revised**: 2026-11-22
- **Status**: 已接受

## 背景

人工独立 review 是合并前的主要质量关口，但它要等人，且对同一份 diff 的低级遗漏并无分工价值。仓库已有 PR CI，
把一次模型审查挂在 CI 之后不需要新基础设施。难点有四处：PR 验证 workflow 被机器判定为只读，而结论要写回 PR；
被审改动与被审代码同处一个 worktree；模型输出是概率性的；模型调用依赖仓库外部配置，配置缺失与调用崩溃若不区分于
「模型没给结论」，门会在 CI 全绿时一次都不运行。

## 决策

### 门禁形态

Codex 审查承担本仓默认的 PR review 结论（2026-11-06 起）。它是约定式门禁，不改 GitHub 分支保护：
绿色只表示「这次运行有结论可读」，不表示「没问题」；结论、状态与故障信息写进 PR 上同一条持久评论，
合并准入仍由人决定。绿色 CI 不证明 review 完成，结论也不证明 `check` 通过，两条同时成立才算审过。
现行红绿映射、状态语义与三档处置只在 `review.md` 定义，本 ADR 只记录取舍。

`error` 只表示配置或调用故障（`config_missing`、`model_failed`、`artifact_missing`）；模型跑完没产出可用结论是
`unreviewed`（`unusable_output`），空 findings 却没交覆盖清单是 `missing_coverage`，同记 `unreviewed`。
两类「没给出可用结论」必须与「结论是 Block 0」在颜色上分开：曾有一次空 `summary` 把整份 findings 丢掉而 PR
只留绿勾；处置是重跑一次，重复出现说明输出契约坏了。`continue-on-error` 只让判定脚本有机会落结论，
模型 job 的 `outcome` 仍传给判定脚本。

### 覆盖度与结论即 review

`coverage` 契约、完成条件与状态后果只在 `review.md` 定义，本 ADR 只记取舍。保留覆盖清单，
是因为「没读过的没审」与「读了并判断为无问题」必须可区分；`uncovered` 非空时那部分不在结论射程内，必须逐项
人工复核，也不满足「结论即 review」。旧产物没有 `coverage` 时一律不复用，宁可重跑一遍。

独立性要的是「执行体与实施者叙述隔离」，不是执行体数量；门在另一个 runner、另一个模型、只读 PR diff 上跑，
结论绑定 head，第二个人工执行体读同一批字节的边际收益是重复劳动。

### 自动恢复

`Codex Review Report` 在 CI 已 completed 时读结论产物，仅当 `status=unreviewed`、故障码为 `missing_coverage` 或
`unusable_output`、CI run 为 `failure`，且 CI run 的 attempt 与写回 run 自身 attempt 都为 1 时，调用一次
`gh run rerun --failed`。重跑完成会再次触发 `workflow_run`，第二维 `github.run_attempt` 挡住人工重跑写回 run
造成的重复 POST；两个维度缺一不可。上限取 1：每次重跑都会再触发一次写回 workflow 与模型 job，第二次就不是恢复
而是反复烧模型。`error` 不在恢复范围。恢复状态分 `none` / `triggered` / `exhausted` / `failed` 四态；判定顺序
先排除不该恢复的情形，再看上限是否用尽，字段不可读时保守跳过。结论评论里的 `状态轨迹` 记最近若干次档位与恢复档，
历史存在 marker 行而不是可见文本，防止模型伪造。

### 权限拆分与安全不变量

模型只在 PR 验证的只读 job 里运行；写回（评论、应用并推送 patch、触发一次失败 job 重跑）在由 CI 完成事件触发的
独立 workflow `Codex Review Report` 里进行，那条 workflow 一次都不调用模型。`report-conclusion` 的 `actions: write`
只用于那一次 `rerun-failed-jobs`；脚本只在「同源仓库、非版本分支、非取消 run」且已解析到 PR、产物下载成功时动作，
run id 取自 `github.event.workflow_run.id`。

可信输入（prompt、schema、判定脚本、生成物禁令清单、影响面查询脚本与审校 skill、第三方 vendored 审校参考）从
PR base 取版本落到 runner 临时目录，执行与参考只用那份副本，禁止读取 PR head 工作区的 `.agents/skills/` 与
`.agents/skills-vendored/`。工作区仍检出 PR head，否则本 PR 新建的复合 action 解析不到。残留篡改面是 workflow YAML、
由工作区解析的复合 action，以及工作区里的 review 判据文档；这些都在 diff 里明写，与「按需 Skill 路由」一样归入
由人工 review 兜住的已接受风险。

模型 job 的 sandbox 档位固定：审查用 `read-only`，自动修规划用 `workspace-write`，由拓扑断言锁住，放宽要先改断言。
两条模型 job 固定 `ubuntu-24.04`，其余 Linux job 用 `ubuntu-latest`。`ubuntu-26.04` 的 sudo-rs 与 uutils `test -w`
会让 `drop-sudo` 的 socket ACL 校验误判（openai/codex-action#188），模型 job 在 exec 前退出；恢复条件是上游修复
落地后统一迁移两条 job 与拓扑断言，不单边改一个 workflow。

密钥只出现在预检步骤的 `env` 与模型 action 的 `openai-api-key` 输入，不下放 job 级；模型经 action 自带的本地代理
调用，拿不到密钥本身。端点、模型名、思考强度、密钥与 codex 版本全部由 GitHub 后台提供，CI 只写引用、不写默认值
与兜底；唯一例外是可选 secret `CODEX_AUTOFIX_PUSH_TOKEN`，未配置时 checkout 回落 `GITHUB_TOKEN`。

### 审查范围与生成物滤除

`generated-artifacts.md` 的唯一判据是「能否由 generator 完整重建」，据此取可表达
的最小 glob，由取自 PR base 的排除清单在 `git diff` 入口滤出 `pr.diff` 与 `changed_paths`：目录型 `**/generated/**`、
Wails `bindings/**`、单文件生成声明与 icon barrel。被滤除的路径不进 `coverage.inspected`，也不算
`coverage.uncovered`；`review-scope.json` 记 `excluded_pathspecs` 与 `empty_diff` 供审计。名单必须留在可信脚本里：
从 PR head 读取等于让作者把自己的文件排除出审查；名单变更纳入配置指纹，同 head 的旧结论不借复用回到绿色。
实测 `git ls-files` 上这些 pathspec 覆盖全部入库生成物；PR #515 的 13.9 MB diff 滤后为 1.29 MB（本地实测，
非 CI 观测值）。`changed_paths` 是候选清单与分片入口，不是必须读完的任务清单；没判断的改动处要逐条落进
`coverage.uncovered`。

### 审查输入与高风险预注入

开局整篇读判据文档会吃掉数万 tokens 并诱使提前收口，因此 prompt 直接内嵌 `review.md` 的三档判据、审查维度、
七问与覆盖要求，并要求开局不再整篇读该文件。`prepare` 按风险把改动路径分成四档（CI/配置/公共入口、
包与应用运行时源码、测试与 ADR/规则/文档、其余），把排名靠前的高风险非测试 diff 组装成 `review-preload.md`，
每个片段标明「完整 diff」或「已截断」：标为完整且据此审完的才能计入 `coverage.inspected`。测试文件只列路径、
不预注入原始 diff，防止单测里的构造 JSON 或夹具注入提示词。`.agents/skills/` 分三层路由：实施流程型禁用，自撰审校型
（`test-authoring`、`monorepo-change-impact`）按 diff 确定性路由并内嵌可信副本，第三方 vendored UI skill 只在前端
源码命中关键词时注入要点；统一覆写为 schema JSON 输出。`empty_diff: true` 时跳过路由。

### 幂等、触发与配置

同一 head 且配置指纹（端点、模型、强度、版本、密钥有无、生成物排除清单，以及同可信基目录下 `codex/prompts/review.md` 模板与 `codex/schemas/review-findings.schema.json` 的 SHA-256 哈希；任一契约文件缺失则 fail-closed 返回空指纹并拒绝复用）一致、旧结论为 `reviewed` 时走 `same_head` 复用前一次产物；当 head 经 `Update branch` 同步 `main` 前移时，若基线校验通过、`git merge-tree --write-tree` 无合并冲突且滤除生成物后的净增量为 0（`changedPaths` 与 `diff` 均为空），走 `zero_incremental_diff` 短路复用并原样继承前一次的 `findings`、`counts`（含已有 `Block`）、`summary` 与 `coverage`；`error` 与 `unreviewed` 从不复用；并发组按 PR 分支取消更早的 run。写回 job 只处理同源仓库的 PR run，排除已取消 run 与版本
分支；没有审查产物时跳过发评论，但必须在 Summary 与 notice 里说明原因。只审同源仓库、base 为 `main`、未关闭且
非版本分支的 PR；fork PR 默认不跑。审查 job 的时间上限高于自动修，具体分钟数见 [`ci.yml`](../../.github/workflows/ci.yml)，
上限是天花板而不是预算目标。

### 自动修

`check` 失败且 `CODEX_AUTOFIX_ENABLED=true` 时，模型在 workspace 沙箱里产出候选 patch，作为 artifact 交给特权 job，
校验通过才提交并直推 PR 分支。patch 只能修改已入库文件；CI 定义、依赖清单、生成物、agent 指令与凭证路径整份拒绝。
唯一新增例外是失败步骤为 `Check changesets` 时新增顶层 `.changeset/*.md`：有界的空壳 changeset 天生只能是新增文件，
不放行则自动修对这一类红叉结构性无效；新增内容仍由随后的 `Check changesets` 与版本 PR 复核。计数对象是当前 PR
历史中带 `Autofix-by: codex-autofix` trailer 的提交，上限 3 个；计数无法验证或达上限时不再规划或推送，转人工。
规划 job 是尽力而为的旁路，失败不让 PR 变红。

### 未采用

- A′：在 `ci.yml` 新增 retry job 规避权限扩张——gate 拓扑与结论复用都要改，回归面更大。
- 在同一 job 第二次调用 codex-action——`drop-sudo` 后 sudo 已禁用，root phase 会失败。
- schema 加 `minItems` / `minLength`——strict structured outputs 不支持，要么无效要么整次调用报错。
- 按文件名或 `DO NOT EDIT` 标记猜生成物——既有无标记的生成物，也有带标记却与 generator 无关的上游产物。
- 从 `GET /actions/runs/{id}` 读 `run_attempt`——payload 已带同一字段，多一次请求即多一处 403 / 限流失败源。
- B2：把模型调用拆成「只读调查轮 + 结构化收口轮」两次调用——能消除单轮 schema 早停诱因，但多一次启动与计费，
  且受 `drop-sudo` 与跨 job 传产物限制，留作 B1 与自动恢复上线后仍高频复发时的备选。
- 让可信 job 在 `Check changesets` 失败时无条件合成空壳 changeset——无法区分「只改 docs/test」与「改了公共包
  行为但忘了写 changeset」。
- 按「最外层平衡花括号」从散文提取 JSON——会把推理中的示例对象当成结论，且无法与真结论区分。

## 后果

- 配置了 `CODEX_AUTOFIX_PUSH_TOKEN` 时，自动修推送的新提交会触发后续 checks 与审查门；未配置时回落
  `GITHUB_TOKEN`，新提交不触发 checks，需要人重跑 CI，结论对新 head 也随之过期。
- 门是约定式的：绕开它只需忽略一次红叉。2026-11-06 起它是默认 PR review，忽略即等于合并未经审查的 PR。
- 后台配置未填齐时每个 PR 都会红：配置成为可观测的门禁输入，代价是配置变更与门的颜色直接绑定。
- 引入新可信子命令的 PR 自身无法完成审查（base 还是旧脚本，模型 job 会红），首次落地要先合入脚本再在后续 PR 验证。
- 读写分居两个 workflow，读代码时看到的 YAML 不能解释全部行为；判据在 ADR 与机器断言里，不只在 CI 定义里。
- 两条模型 job 绑定 `ubuntu-24.04`，与其它 Linux job 的 `ubuntu-latest` 不同步；24.04 退役前要按上游修复完成迁移，
  这是有到期日的技术债。
- 只改生成物的 PR 得到空 diff，结论是 `reviewed`（`Block 0`），门不区分「审过源码」与「没有源码可审」；
  这块覆盖空白由 `review.md`「审查范围与生成物」的人工纪律兜。
- 概率性没有消除：门漏掉的低级遗漏没有别的执行体会看到，缓解手段是后台随时换更强模型与更高强度，而不是把人工
  复核写回默认流程。

## 2026-11-05 修订：首次实测复盘

首批 run 的事实：后台 secrets / variables 全空，模型 action 的代理启动被跳过，`read_server_info` 轮询 10 秒后抛
`ENOENT`，`Run codex exec` 从未执行；模型步骤的 `continue-on-error` 把崩溃掩成绿灯；写回 workflow 的 14 次 run 中
9 次 failure、4 次 skipped、1 次「成功」实为全部步骤跳过，评论 API 稳定 403。净结果是零次模型调用、零条结论评论、
CI 全绿。根因不是模型质量，而是「配置缺失 → 调用崩溃 → 崩溃被吞 → 门保持绿」的静默链，加上写回 job 权限不足；
上述决策逐段封住了这条链。同日后续实测又依次暴露：大 diff 的 1 MiB 缓冲 `ENOBUFS`（门颜色对，但原因被误归为
`config_missing`）、`ubuntu-26.04` 上 `drop-sudo` 与上游 action 不兼容（job 绿、gate 红、零模型调用），
以及跨 run 下载 artifact 缺 `github-token`。空壳检测、预注入与自动恢复都是此后针对早停与空壳结论的补强。

## 2026-11-06 修订：这道结论就是本仓默认的 review

引入时定位是「补强，不是替代」，落地后按旧口径还要再派一次独立审查，把增量切成多条 lane 回收报告。裁决改为：
门给的结论就是该 PR 的 review，完成条件以 `review.md` 的现行判据为准；要不要另起本地
agent 或人工审查由 agent 自己判断，仓库不规定触发条件。覆盖度契约落地后射程进一步收窄：`coverage.uncovered`
非空的位置必须逐项人工复核，那不算「规定触发条件」，只补结论列出的空白。

## 2026-11-12 修订：增量复审

首次审查保留完整范围；存在可信基线时，复审检查前次已审 head 到当前 head 的完整增量，并沿用仍有效的覆盖与未覆盖
记录。base、历史或范围变化使基线失效时重新完整审查。`gh pr update-branch` 的 merge commit 会让 merge-base 前移，
因此基线校验允许 `prior.base_sha` 是当前 base 的祖先，并在需要时用 `git merge-tree --write-tree` 合成无冲突三方
合并树作为 diff 起点；有真实冲突时回退全量。

## 2026-11-18 修订：自动修轮次上限放宽到 3 次

计数对象与上限见「自动修」。PR #553 实测中，自动修修掉 TS2769 后新 head 又卡在 `Check changesets`，单次上限不足以
覆盖一次 PR 内顺序出现的多个独立失败面。分页读取 PR commits 后必须再读一次 PR 对象：读数少于报告的 `commits`、或
total 缺失/非法时按「无法验证」禁用自动修，不把 250 条 API 上限误写成提交数。合并后所有以新 main 为 base 的 CI run
都使用新脚本；观察方式是 prepare 开头输出的固定版本行，这项观察只能在合并后完成。

## 2026-11-22 修订：零增量短路复用与单头 PR 自动推进队列

### 零增量短路复用与指纹锁定

- **安全成立前提**：`git merge-tree --write-tree` 无冲突且滤除生成物后净增量为 0，只能证明三方合并无文本冲突，**不能排除**上游 `main` 的公共接口、类型签名或构建配置变化引发的语义回归。之所以安全跳过重复 LLM 审查，是因为 `ci.yml` 中 `codex-review` 依赖 `needs: check`，GitHub Merge 平面上的确定性 `check`（构建、类型检查、lint、测试与政策门禁）仍会在新合并树上全量重跑，由确定性门禁捕获语义回归。
- **`Block` 原样继承**：无论上一轮 `counts.Block === 0` 还是 `Block > 0`，零增量短路复用都原样保留 `findings`、`counts`、`summary` 与 `coverage`（只更新 `head_sha`、`base_sha`、`merge_base_sha`、`reused_from` 与 `reuse_reason: 'zero_incremental_diff'`）。带有未修复 `Block` 的 PR 即使纯同步了主干，经 `codex-gate` 仍判阻断，绝不借复用放绿。
- **复用文案区分**：`renderConclusion` 依据 `meta.reuse_reason` 区分 `same_head`（同 head 复用）与 `zero_incremental_diff`（主干同步净增量为 0、沿用原结论含原有 Block 判定），持久化评论继续就地更新。
- **可信契约入指纹**：`inspectConfig` 从同可信基目录（`$RUNNER_TEMP/trusted/` 或 `.github/`）读取 `codex/prompts/review.md`（剥除 `prepare` 运行时预注入区块后的模板正文）与 `codex/schemas/review-findings.schema.json` 的 SHA-256 哈希纳入 `config.fingerprint`；任一文件缺失时 fail-closed 返回空指纹并拒绝一切复用。

### 单仓单头 PR 自动推进队列（Layer 2A）

- **问题与 token 选择**：个人仓开启 `strict`（Require branches to be up to date before merging）后，多 PR 并行合并会产生连环 `behind`；而默认 `GITHUB_TOKEN` 调用 `update-branch` 推送的 merge commit 不会触发新的 `pull_request` CI run（GitHub 防递归限制）。因此新增 `pr-auto-update-queue.yml`，在配置了单仓 GitHub App Secrets（`PR_QUEUE_APP_ID`、`PR_QUEUE_APP_PRIVATE_KEY`）时通过固定 SHA 的 `actions/create-github-app-token` 申请最小权限（`Contents: Read and write`、`Pull requests: Read and write`）短效 token 调用 `update-branch`，以 App 身份唤醒后续 `check` 与原生 auto-merge；未配置密钥时优雅跳过，不阻断既有流程。
- **同仓围栏与防雪崩状态机**：队列脚本 `pr-auto-update-queue.mjs` 与 workflow job 级守卫严格只纳入 `open`、base 为 `main`、非 `draft`、作者已手动开启 `Enable auto-merge` 且 `head.repo.full_name === base.repo.full_name` 的同仓 PR（绝不触碰 fork PR，也不检出 PR head）。状态机按 PR 编号 FIFO 排序：只要队列中已有非 `behind`、非 `dirty` 的 PR 正在运行 required `check`（`queued` / `in_progress`），立即 `noop` 不抢跑；对 `dirty`、`check` 失败/取消/超时（`failure` / `cancelled` / `timed_out`）与 `mergeable_state === 'unknown'` 明确记录并跳过避免死循环；每次最多推进第 1 个可用的 `behind` PR 并附 `expected_head_sha`，遇到 422（head 已变或冲突）时优雅记录并退出 0。
- **后果**：多 PR 并行开启 auto-merge 时可按 FIFO 单头串行追平主干并触发确定性 `check` + 零增量复用；若出现文本冲突或单测失败会停在该 PR 等待作者修复，不浪费 CI 并发，也不替人自动合入未开启 auto-merge 或来自 fork 的改动。

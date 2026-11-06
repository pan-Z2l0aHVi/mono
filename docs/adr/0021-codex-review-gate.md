# ADR-0021: Codex 自动 PR 审查门

- **Date**: 2026-11-04
- **Revised**: 2026-11-06
- **Status**: 已接受

## 背景

人工独立 review 是合并前的主要质量关口，但它要等人，而且对同一份 diff 的低级遗漏并没有分工价值。仓库已经有 PR CI，把一次模型审查挂在 CI 之后不需要新的基础设施。

难点不在「能不能跑模型」，在四处：

- PR 验证的 workflow 在仓库里被机器判定为只读，而审查结论要写回 PR。
- 被审查的改动与被审查代码同处一个 worktree，模型读到的东西可能被这次改动改写。
- 模型输出是概率性的，一道红绿不定的门不会被接受。
- 模型调用依赖仓库外部配置；配置缺失与调用崩溃若不区分于「模型没给结论」，整道门会在 CI 全绿的情况下一次都不运行。

## 决策

Codex 审查是对 [ADR-0012](./0012-pr-review.md) 的补强，不是替代：绿色 CI 不证明 review 完成，模型结论也不证明人工独立 review 已完成。

**门禁形态**：约定式门禁，不改 GitHub 分支保护。`reviewed` 且 `Block > 0`、`error` 与 `unreviewed` 让这道门变红；`stale`、`not_applicable` 保持绿色。绿色因此只表示「这次运行有结论可读」，不表示结论是「没问题」。`Block` 数量、状态、故障码与缺失配置名一起写进 PR 上同一条持久评论。合并准入仍由人和仓库的 PR review 纪律决定。

**状态口径**：`error` 只表示配置或调用故障，故障码为 `config_missing`、`model_failed`、`artifact_missing` 之一；模型腿跑完却没产出可用结论是 `unreviewed`，故障码 `unusable_output`，输出不合 schema 也归这一档；模型给出空 findings 却没交覆盖清单是 `missing_coverage`，同样记 `unreviewed`。两档都让门变红：`unreviewed` 曾经保持绿色，实测中一次空 `summary` 就把整份 findings 丢掉而 PR 上只留一个绿勾，因此「模型没给出可用结论」与「结论是 Block 0」必须用颜色分开，处置是重跑一次，重复出现说明输出契约坏了。`continue-on-error` 只让判定脚本有机会落结论，模型腿的 `steps.<id>.outcome` 仍传给判定脚本，故障不会被掩成「未审查」。review job 被整体跳过时门记 `not_applicable`。

**输出校验口径**：`parseReviewFindings` 只把 findings 的结构当致命错误（非法 JSON、缺 `findings`、未知档位、未知字段、空 `problem` 与非法行号）。`summary` 只是评论顶部一行摘要，模型给空串或没给时结论照常成立，`validate` 在日志里留一行 `review output carries no summary` 并照常写 `reviewed`；prompt 的「输出」段明确要求 1–2 句摘要，但校验不拿装饰性字段当阻断条件——一次空 `summary` 不该让整份 findings 作废。

**覆盖度口径**：`docs/agents/review.md` 一直要求「无发现也要记录审查范围、验证证据和未覆盖风险」，但 schema 在 2026-11-06 之前只有 `summary` 与 `findings`，这条要求在输出里没有落脚处——模型只能把「我正在看什么」塞进 `summary`，于是空 findings 的结论和「没查就收尾」在产物上完全同形。现在 schema 必填 `coverage.inspected` / `coverage.uncovered`：`validate` 在「无 findings、diff 非空、`inspected` 为空」时判 `missing_coverage` 并让门变红，diff 为空时豁免（没有源码改动可读，空清单不是缺证据）。`prepare` 同时把这次改动过的路径写进 `review-scope.json` 的 `changed_paths`：空 findings 时 `inspected` 至少要有**一条命中这些路径**，否则同样判 `missing_coverage`——只读 `docs/agents/review.md` 就交卷，正是要区分的早停。复用路径还要多一道：`coverage` 是这一版才加的必填字段，没有它的旧产物一律不复用（不论有没有 findings），宁可重跑模型让这个 head 产出证据，也不把一次没有证据的结论洗成绿色——若改成「复用后再判红」，该 head 的重跑会永远红下去。`validate` 的复用分支再用同一判据兜一次，避免别的写入口绕开 `reuse`。`coverage` 是 schema 的必填项，有 findings 也不能省：否则交一条 `Nit` 就绕开整条覆盖规则，因此 diff 非空时 `validate` 一律要求 `coverage` 存在。复用的 artifact 解到独立目录（`$RUNNER_TEMP/codex-review-prior`），不与本轮 `prepare` 写的 `review-scope.json` 同目录——同名文件会把本次范围覆盖成上一轮的，`changed_paths` 就此缺位；缺位时交集为空，判定按红处理而不是放行，范围对不上宁可不给绿色。

**权限分腿**：模型只在 PR 验证的只读 job 里运行；写回（评论、应用并推送 patch）在由 CI 完成事件触发的独立 workflow 里进行，那条 workflow 一次都不调用模型。这条划分是 PR 验证只读不变量成立的前提。该 workflow 显示名为 `Codex Review Report`（文件 `codex-review-report.yml`）：它的产物是一份关于既有结论的报告，不改判结论，所以不叫 publish。

**配置契约**：端点、模型名、思考强度、密钥与 codex 版本全部由 GitHub 后台提供，CI 定义只写引用，不写默认值、不写兜底表达式。

| 名称                       | 载体     | 用途                              |
| -------------------------- | -------- | --------------------------------- |
| `CODEX_REVIEW_API_KEY`     | Secret   | 模型凭据                          |
| `CODEX_RESPONSES_ENDPOINT` | Variable | 公网可达的 Responses API 兼容端点 |
| `CODEX_REVIEW_MODEL`       | Variable | 模型名                            |
| `CODEX_REVIEW_EFFORT`      | Variable | 思考强度                          |
| `CODEX_VERSION`            | Variable | codex CLI 与本地代理版本          |
| `CODEX_AUTOFIX_ENABLED`    | Variable | 仅 `true` 启用两条自动修腿        |

密钥只出现在预检步骤的 `env` 与模型 action 的 `openai-api-key` 输入里，不下放到 job 级 `env`：job 级会把它带进模型进程，本地代理的隔离就不成立。调用经由 action 自带的本地代理，模型进程拿不到密钥本身。端点必须是 GitHub-hosted runner 能到达的 Responses API 兼容网关；本机 loopback 代理不在可达范围内。合法模型名由该网关决定，仓库不预设。

`CODEX_RESPONSES_ENDPOINT` 必须是**完整的 Responses 端点 URL**（含 `/responses` 路径），不是 base URL：action 把它作为本地代理的 `--upstream-url` 传入，代理把请求体原样 POST 到该地址，不会替调用方补 `/responses`。填成 base URL 会在模型调用时得到 404，而预检只判非空、挡不住这类格式错误，因此端点格式只能由真实 run 兜住。代理会原样转发 codex 发出的请求头（`Authorization` 与 `Host` 除外）；若网关要求会话头，链路上是否能带全依赖 codex 版本与代理实现，同样只能靠真实 run 验证。

**配置预检**：`codex-review.mjs preflight` 从 PR base 落地的同一份可信脚本里运行，逐项判空并只打印变量名，不打印值。它把非密钥配置与密钥「有无」写成 runner 临时目录里的配置快照和指纹；缺项直接写 `status: error` 的结论，让 gate 变红。两条模型腿共用这套预检；没有配置快照时自动修腿不产出 patch。CI 拓扑断言禁止配置字面量与兜底表达式，并钉住每个输入的唯一后台来源。

**故障可见**：配置未填齐时门是红的，这是设计意图，不是待修的噪声。发布腿的写权限至少包含 `pull-requests: write`；读 PR、读评论与写评论任一处的 403 都必须带 job permissions、仓库 Workflow permissions 与组织策略三项排查清单失败，诊断由发布命令统一包裹（含判定阶段的 gh 调用），不留「只读调用被拒就静默」的旁路；诊断只认权限类短语，避免评论正文里的数字把普通失败误报成权限故障，非权限类失败原样抛出。发布腿另有一条只读探测，把端点不可达与写权限被拒在日志里分开。

**沙箱档位**：使用 action 的 legacy `sandbox` 输入（`--sandbox`），不使用权限档输入。本仓 `.codex/config.toml` 在 project 层写死全访问；`--sandbox` 覆盖的是同一个配置键，权限档落在另一个键上，无法证明它能压过 project 层。CI 定义由机器断言钉住这个选择。

**Runner 镜像**：两条模型腿固定 `runs-on: ubuntu-24.04`，且保留 `safety-strategy: 'drop-sudo'`；本 workflow 其余 Linux job 仍用 `ubuntu-latest`。原因是 `ubuntu-latest` 已滚动到 `ubuntu-26.04`：该镜像的 `sudo` 是 sudo-rs（忽略 `-E`）、`/usr/bin/test` 是 uutils coreutils（`-w` 只读 mode bits），`openai/codex-action@v1.13` 的 `drop-sudo` 在 `restrictRootServiceSocket()` 里给 `/run/dbus/system_bus_socket` 设好 deny ACL 后仍被误判为「runner 仍可写」，在 `Run codex exec` 启动 Codex 之前就抛错退出。上游 issue [#188](https://github.com/openai/codex-action/issues/188) 同款报错，修复 PR [#191](https://github.com/openai/codex-action/pull/191) 尚未合并，v1.13 之后的 main 提交也未包含该修复。固定 24.04 而非改用 `safety-strategy: read-only`：后者会被上游 `determinePermissionSelection()` 强制成 read-only sandbox，直接废掉 autofix 腿的 `workspace-write`，且放弃 sudo 剥离；也不选 `unprivileged-user`，它要额外处理 checkout、`CODEX_HOME`、prompt 与输出文件权限，落地成本远高于收益。代价是依赖一个终会退役的旧镜像。**恢复条件**：上游发布含 #191 修复的 `codex-action` 版本后，把两条腿恢复为 `ubuntu-latest`、同步删掉拓扑断言里的固定值，并在真实 run 上按验收清单第 8 项复核。若 24.04 先退役而上游仍未修，不能直接回 `ubuntu-latest`（会重现同一故障），必须走备选：升级到已修复的 action、改用 `unprivileged-user` 并补齐权限准备，或停用 `drop-sudo` 并同时重构 autofix 腿的沙箱。`check` 与 Wails 腿不受此约束。CI 拓扑断言同时钉住镜像标签与 `drop-sudo`，任一被改都会让脚本单测变红。

**输入可信来源**：prompt、schema、判定脚本（含预检）与生成物禁令清单从 PR base（写腿从默认分支）取版本落到 runner 临时目录，执行只用那份副本。工作区本身仍检出 PR head：`uses: ./...` 的复合 action 由 job 工作区解析，检出 base 会让本 PR 新建的 action 解析不到，这道门整个跑不起来——固定的是脚本内容的来源，不是工作区的来源。残留的篡改面是 workflow YAML 与 PR 腿由工作区解析的复合 action（`setup-deps` 与 `stage-codex-inputs`，前者还先于后者运行）：它们必须由 head 提供，所以改它们仍在被审查的 diff 里明写，与「模型能读到 worktree 里的 review 判据文档」归在同一类已接受风险里，由人工 review 和「只审同源仓库、base 为 `main`」的范围一起兜住。CI 定义由机器断言同时钉住工作区来源与 `base-sha` 这两侧。

**适用范围**：只审同源仓库、base 为 `main`、未关闭且不是版本分支的 PR。fork PR 默认不跑——它拿不到仓库 secret，要审就得逐次为它放行。

**幂等与去重**：同一 head 且配置指纹（端点、模型、强度、版本、密钥有无）一致、且旧结论是 `reviewed` 时，复用前一次 run 的产物；标题编辑与手动重跑不再消耗模型调用。配置变动会让旧结论失效，`error` 与 `unreviewed` 从不复用。并发组按 PR 分支取消更早的 run。不设文件数、行数或改动量阈值，也不给模型加「只看 N 个文件」的采样——体量问题用超时兜住，而不是用少看来兜。

**自动修**：`check` job 失败且 `CODEX_AUTOFIX_ENABLED` 为 `true` 时，模型在 workspace 沙箱里产出一份候选 patch，作为 artifact 交给特权腿；只有它校验通过才提交并直推 PR 分支。patch 只能修改已入库文件，CI 定义、依赖清单、生成物、agent 指令与凭证路径一律整份拒绝。已包含自动修提交的 head 不再规划第二次。开关无值即两条腿都不跑，主审查链路不依赖它。规划腿是尽力而为的旁路，保留 job 级 `continue-on-error`，其失败不让 PR 变红；这与审查腿「故障即红」不矛盾：门只看审查结论，自动修的失败由 artifact 与日志呈现。

**触发收敛**：写回腿只处理同源仓库的 PR run，排除已取消的 run 与版本分支；没有审查 artifact 时跳过发评论，不制造无意义失败——但跳过必须留痕：`Explain the skipped report` 在 Summary 与 notice 里写明原因，并回查触发 run 的 artifact 列表，把「没有可写回的结论」和「写回腿没取到已有产物」分开。同一道留痕也覆盖「head 不属于任何打开的 PR」：这一步的守卫按 `resolve-pull` 是否成功取，不按有没有解析到 PR，否则解析不到 PR 时整条腿一步都不跑、静默变绿。只读探测是尽力而为，失败不阻止结论发布，写权限不足由结论步骤的 403 清单报告。门仍不设为分支必需检查。

**结论产物跨 run 传递**：审查腿上传的 `codex-review-findings` artifact 由写回腿下载，结论复用也会下载历史 run 的同名 artifact。`actions/download-artifact@v7` 只有在**显式给出 `github-token: ${{ github.token }}`** 时才会启用 `repository` / `run-id` 跨 run 查找（上游 `src/download-artifact.ts` 节选：`if (inputs.token) { options.findBy = { workflowRunId: inputs.runID } }`）；缺 token 会静默退化成「只查当前 workflow run」，写回腿因此报 `Artifact not found for name: codex-review-findings` 并跳过发评论。三处跨 run 下载（写回腿两条、`ci.yml` 的复用一条）都必须带 token，由拓扑断言钉住；同 run 的下载不需要。上传用 `upload-artifact@v6`、下载用 `download-artifact@v7` 是各自独立的主版本，二者都基于 v4+ artifact 后端，互相兼容，此次故障与版本差无关。另：写回腿是 `workflow_run`，GitHub 只取**默认分支**上的 workflow 文件，所以本文件的修改必须合入 main 后才生效，PR 自己那轮 CI 无法验证写回修复。

**残留风险**：下载步骤仍带 `continue-on-error`，因为「本来就没有产物」是合法跳过，不该把这种 run 判红。跳过不再静默：`Explain the skipped report` 会把原因写进运行页 Summary 与 notice，并回查触发 run 的 artifact 列表——产物存在却下载失败时该步骤非零退出，把写回腿自身的故障和「没有可写回的结论」分开。代价是每次跳过多一次 `actions: read` 的 API 调用。

**引导落地**：可信脚本取自 PR base，因此引入新子命令的那个 PR 自己拿到的仍是 base 里的旧脚本。模型腿的 job 级不设 `continue-on-error`，旧脚本缺少 `preflight` 时该 job 直接变红，而不是又回到全绿静默。合并后的下一个 PR 起，base 带新脚本，链路完整生效。

**时间与成本**：两条模型腿各给 60 分钟上限，这是首批实测用的临时余量，测出真实分布后回收；自动修只在失败时触发，它自己也是消耗模型调用的一条腿。

**审查范围**：`resolveReviewRange` 的 `git diff` 用 `:(exclude,glob)**/generated/**` 在入口剔掉生成产物，`review-scope.json` 记下 `excluded_pathspecs` 与 `empty_diff` 便于审计。这是路径层面的批量 churn 过滤：md-to-meta 的 meta/codeblock 随 markdown 重建整批换哈希名，`icons/generated` 等入库产物同样只随 generator 变，都只会淹没真实改动；`routeTree.gen.ts` 之类单文件生成物仍留在审查 diff。`prepare` 由审查腿与自动修腿共用，两条腿同时受益。对 PR #515 的 base/head 对象做本地 `git diff` 实测：13.9 MB → 1.29 MB（不是 CI run 观测值；可信脚本取自 base，本修复 PR 的 CI 仍跑旧脚本）。**执行纪律不在本 ADR**：两份 diff 的分工、生成物怎么核对、空 diff 为何不构成可合并结论，由 `docs/agents/review.md`「审查范围与生成物」承载；生成物清单与排除清单的边界由 `docs/agents/generated-artifacts.md` 承载；本 ADR 只记取舍与实测。

**同步子进程上限**：`lib/github.mjs` 的 `run()` 与 codex 链路的 `gh` 调用统一给 `spawnSync` 设 64 MiB `maxBuffer`。默认 1 MiB 缓冲在大 PR 上抛 `ENOBUFS`，`prepare` 会在 preflight 之前失败并被下游误判成 `config_missing`；排除生成物后 diff 仍可能超过 1 MiB，两处修复缺一不可。

## 2026-11-05 修订：首次实测复盘

首批 run 暴露的事实，取自 `pan-Z2l0aHVi/mono` 的 Actions 运行记录：

- 仓库 Actions secrets 与 variables 均为空。`ci.yml` 引用的 `secrets.CODEX_REVIEW_API_KEY` 与 `vars.CODEX_RESPONSES_ENDPOINT` 展开成空串。
- `openai/codex-action@v1.13` 的代理启动步骤以 `inputs['openai-api-key'] != ''` 为条件，被跳过；`read_server_info` 的条件含 `prompt-file != ''`，仍无条件运行，轮询 10 秒后抛 `ENOENT: /home/runner/.codex/<run-id>.json`。`Run codex exec` 从未执行。
- 模型步骤的 `continue-on-error: true` 把这次崩溃掩成 job 绿灯；`validate` 记为 `unreviewed`，`codex-gate` 按当时的口径保持绿色。
- 写回腿 14 次 run 中 9 次 failure、4 次 skipped、1 次「成功」其实是全部步骤跳过。`POST /repos/.../issues/<n>/comments` 稳定返回 403 `Resource not accessible by integration`，PR 上没有任何 `codex-review-conclusion` 评论。
- 模型名 `claude-haiku-5-5` 与强度 `high` 硬编码在 CI 定义里，后台无法覆盖；`findReusableRun` 只按 head SHA 复用，改配置也不会让同一个 head 重跑。

净结果：零次模型调用、零条结论评论、CI 全绿。根因不是模型质量，而是「配置缺失 → 调用崩溃 → 崩溃被吞 → 门保持绿」这条静默链，加上写回腿权限不足。以上决策条款逐段封住这条链。

**同日第二次实测（PR #515，配置填齐后的首个真实集成 PR）**：`check` 7m34s 通过，Wails 各腿通过；`Codex review` 14 秒即失败，日志只有 `could not start git: spawnSync git ENOBUFS`，`codex-gate` 按「故障即红」正确变红，但把原因归为 `config_missing`。根因是 `resolveReviewRange` 把 13.9 MB 的 `git diff` 整份读进默认 1 MiB 缓冲，preflight 根本没执行、零模型调用；写回腿 success 且因无产物按设计跳过发评论。结论：门的颜色机制有效，但失败归因不够准（preflight 未运行不等于配置缺失），且大 diff 必须在范围与缓冲两侧同时收敛。

**同日第三次实测（PR #516，范围/缓冲修复分支，首次真正启动 `Run codex exec`）**：`check` 6m0s 通过，`Codex review` job 表面 31s pass（模型步骤自带 `continue-on-error`），`Codex review gate` 13s fail，报 `model_failed: the review step produced no output file`；PR 上无 `codex-review-conclusion` 评论，写回腿 success 但按设计跳过。完整 job 日志显示 `CODEX_SAFETY_STRATEGY: drop-sudo`，`Run codex exec` 内部 `dropSudoWithPrivileges()` 在 447ms 内退出 1：

```text
Image: ubuntu-26.04
sudo: preserving the entire environment is not supported, '-E' is ignored
runner is not a member of the sudo group.
Error: Could not restrict access to /run/dbus/system_bus_socket.
Error: /usr/bin/sudo exited with code 1
##[end-action id=review.run_codex;outcome=failure;conclusion=failure]
```

即 `codex-final-message.json` 从未生成，模型一次都没被调用。这不是配置或脚本问题，而是 runner 镜像与上游 action 的兼容性缺陷（见「Runner 镜像」条款）。注意 job 显示 pass 而 gate 红，正是「故障即红」设计在起作用：模型步骤的 `continue-on-error` 只让 `validate` 有机会落结论，`outcome=failure` 仍传给了判定脚本。

**同日第四次实测（CI run `42052145360`，PR #516 固定 24.04 后重跑，首次完整模型调用；写回腿 run `42053983201`）**：`check` 2m27s、`Codex review` 7m29s、`Codex review gate` 18s 全 pass。`Set up job` 为 `Image: ubuntu-24.04`；`drop-sudo` 成功（`Restricted access to /run/dbus/system_bus_socket for runner UID 1001`），`Run codex exec` 以 `deepseek-v4.1-flash` / `high` 真跑 7 分多钟并产出 `codex-final-message.json`，`validate` 记 `CODEX_REVIEW_STEP_OUTCOME: success`、结论 `Block 0, Should fix 1, Nit 0`，artifact `codex-review-findings` 1478 bytes 上传成功。**但 PR 上仍没有结论评论**：写回腿 `Download review findings` 报 `Artifact not found for name: codex-review-findings`，`Probe comment permission` 与 `Publish conclusion comment` 均被跳过。根因是 `download-artifact@v7` 跨 run 下载缺 `github-token`（见「结论产物跨 run 传递」）；此前从未有有效 artifact，这个 #514 遗留缺陷一直不可观测。模型自身提的那条 `Should fix` 也成立：`.github/codex/prompts/review.md` 仍称 diff 是「完整 unified diff」，与排除生成物后的实际范围矛盾，已同步改写为「源码改动 diff」并写明排除清单。该 prompt 同属 `stage-codex-inputs` 从 **PR base** 落地的可信输入，所以 PR #516 自己这一轮读到的仍是旧 prompt；改写只在修复合入 main 后的下一个 PR 生效，与写回腿的引导限制同源。

**同日第五次实测（CI run `42059307127`，head `58ac1314`，第 3 次尝试）**：`check` 1m25s、`Codex review` 22m25s、`Codex review gate` 17s 全 pass；`Image: ubuntu-24.04`、`drop-sudo` 成功、`Run codex exec` 以 `deepseek-v4.1-flash` / `high` 真实调用并产出 `codex-final-message.json`，结论 `Block 0, Should fix 0, Nit 0`。该 run 的前两次尝试（attempt 1、2）都在 `Run codex exec` 启动 1.6–1.8 秒后失败，日志为 `server_error: Upstream request failed: [invalid_request_error] this feature is not yet supported by atlas`，零模型调用；模型 job 因步骤级 `continue-on-error` 显示 pass，gate 按「故障即红」记 `model_failed`。同一配置、同一 head 在第 3 次尝试即成功，说明这是上游网关的瞬时故障，不是仓库配置问题——处置是**重跑整条 run**，不能只重跑 failed job（模型 job 表面是绿的）。PR 上仍无结论评论，原因与第四次相同：写回腿取默认分支版本，token 修复尚未合入 main。这次观测也说明 60 分钟上限仍有余量（已见 7m29s 与 22m25s 两档），但回收余量要等真实分布更稳定。

**同日第六次实测（PR #519 三个 head，PR #520 一次重跑；2026-11-06）**：同一份 prompt、同一个 `deepseek-v4.1-flash`，产出差异大到不能当噪声。head `17fe6611` 跑 16m07s、730,547 tokens，给出 2 条 `Should fix` 与一句中文摘要；head `3d990480` 只跑 1m35s、268,842 tokens、49 次命令调用就交卷，`findings: []`，摘要写成 `Inspecting shell i18n and related exec checks.`；PR #520 的重跑更极端，6.5 秒、7,866 tokens、零命令调用，摘要写成 `先读取审查规范与 PR diff，再按仓库的分级标准核对变更。` 后两次的模型自述里都留着没查完的线索（`No bug obvious. Need inspect shell i18n … Could have path bug.`），说明它是**提前收尾**而不是查完没发现。同时暴露第二个问题：结论评论是就地更新的，`created_at` 永远停在第一次写回那一刻（`07:13` vs `updated_at 11:14`），读者据此以为没有新结论。

根因不在模型能力，而在输出契约缺字段：`review.md` 要求「无发现也要记录审查范围、验证证据和未覆盖风险」，schema 却只有 `summary` 与 `findings`——这条要求无处落脚，模型只能把过程句塞进 `summary`；而「空 findings」零成本、且与「查完没问题」在产物上完全同形，早停因此不可观测、门照旧绿。修法见「覆盖度口径」与评论的「结论生成于」行；没有采用换模型或「摘要必须含中文」这类替代判据。

**验收清单**（后台配置填齐后按 run 日志逐项核对）：

1. `Run codex exec` 出现，`codex-final-message.json` 非空且通过 schema。
2. PR 上出现 `codex-review-conclusion` 持久评论，`status=reviewed`。
3. 清掉任一变量后重跑：`codex-gate` 变红，日志只列缺失变量名，评论标 `error` 与 `config_missing`。
4. 改 `CODEX_REVIEW_MODEL` 后同 head 重跑：旧结论不复用，模型重新调用。
5. 写回腿成功发出或更新结论评论；workflow_run 列表里没有无产物的失败 run。没有产物的 run 仍为绿色，但 Summary 必须写明「未写回」与原因。
6. 拓扑断言与脚本单测全绿。
7. `review-scope.json` 记有 `excluded_pathspecs` 与 `empty_diff`，审查 diff 里没有 `**/generated/**` 路径；大 PR 不因 `ENOBUFS` 让 `prepare` 失败。（**合入 main 后的下一个 PR** 上核对：可信脚本取自 PR base，修复自己的 CI 仍跑旧脚本。）
8. 两条模型腿的 `Set up job` 日志出现 `Image: ubuntu-24.04`，且 `Run codex exec` 不再出现 `Could not restrict access to /run/dbus/system_bus_socket`。以审查腿为准，满足第 1 项（有真实模型结论）后再核对此项；autofix 腿只在 `CODEX_AUTOFIX_ENABLED=true` 且 `check` 失败时运行，默认关闭，不必为验收专门打开。
9. 写回腿 `Download review findings` 不再报 `Artifact not found`，且 `Post conclusion comment` 未被跳过（这两步是可观测的修复点；评论内容本身按第 2 / 5 项核对）。写回腿取默认分支版本，**必须在修复合入 main 后的下一个 PR** 上核对，PR #516 自身无法验证。autofix patch 那处下载同理，但 `CODEX_AUTOFIX_ENABLED=false` 时整条腿被跳过，只能在显式打开开关且 `check` 失败的 run 上验证。
10. 写回腿改名为 `Codex Review Report` 后：Actions 列表显示新名字，job 为 `report-conclusion`（`Report review conclusion`）；无产物的 run 在 Summary 里有跳过原因与 notice；写回成功时 Summary 记 `已创建/已更新结论评论 #<id>`。「有产物却下载失败」的判红分支只能靠改坏 `run-id` 或断网触发，自然 run 上不必刻意制造，留作未实测项。
11. 输出校验口径与红色边界：模型给出 `summary: ""` 而 findings 合法时，`Record review conclusion` 照常写 `reviewed`、PR 评论有档位与发现但没有摘要行，`Codex review gate` 的颜色只由 `Block` 决定；`review-meta.json` 为 `unreviewed` 时 gate 必须红，日志为 `Codex review produced no usable conclusion (unusable_output): …`，Summary 里有 `Code: unusable_output`。这两条由脚本单测钉住（`parseReviewFindings` 的容错用例、`gate` 在 `unreviewed` 上退出 1），无需在真实 run 上刻意制造。

12. 覆盖度口径：`review-findings.json` 含 `coverage.inspected` 与 `coverage.uncovered`，`review-scope.json` 含 `changed_paths`，PR 评论头部有「覆盖：检查 N 个文件」；diff 非空时缺 `coverage` 一律判 `missing_coverage`（有 findings 也不例外），空 findings 时还要 `inspected` 至少一条命中 `changed_paths`；没有 `coverage` 的旧产物不复用，且复用 artifact 解在独立目录、不会覆盖本轮的 `review-scope.json`。评论正文有「结论生成于」且就地更新时该行随新结论变化。这一条由脚本单测钉住（coverage 结构用例、有 findings 缺清单用例、`changed_paths` 交集与缺位用例、scope 不被覆盖用例、`missing_coverage` 端到端用例、复用拒绝用例、渲染断言），无需在真实 run 上刻意制造。

**待办**：`prepare` 的任何失败都会跳过 preflight，被 `validate` 记成 `config_missing`；后续把 preflight 前置到 prepare 之前，或引入 `job_failed` / `preflight_missing` 错误码，并同步「状态口径」、`docs/agents/review.md` 的故障码清单、`renderConclusion()` 与相关单测。本次修复后该误归因对 PR #515 的事故不再可达，门「故障即红」不受影响。

## 后果

- 自动修推送的新提交不会触发 checks，PR 上那道必需检查要人重跑一次 CI 才会覆盖新 head；结论对新 head 也随之过期，这是「直推」换来的代价。
- 门是约定式的：绕开它只需要忽略一次红叉，因此它省的是「等一次人工细看」，不是「替代人工」。
- 后台配置未填齐时每个 PR 都会红。配置本身成为可观测的门禁输入，代价是配置变更与门的颜色直接绑定。
- 引入新可信子命令的那个 PR 自身无法完成审查：它的 base 还是旧脚本，模型腿会红。首次落地要先合入脚本、再在后续 PR 上验证全链路。
- 只读腿与写腿分居两个 workflow，读代码时看到的 YAML 不能解释全部行为；判据在 ADR 与机器断言里，不只在 CI 定义里。
- 模型结论的可信度受沙箱档位、输入版本与后台配置影响，这三处都由 CI 拓扑测试钉住，改动会被断言挡下来，而不是靠 review 时想起来。
- 两条模型腿绑定 `ubuntu-24.04`，与本 workflow 其它 Linux job 的 `ubuntu-latest` 不同步；24.04 退役前必须按「Runner 镜像」条款的恢复条件完成迁移，否则审查链路会再次在模型启动前静默失败（表现为 job 绿、gate 红、零模型调用）。这是一笔有到期日的技术债。
- 只改 `**/generated/**` 的 PR 得到空 diff，门不会因此变红：结论是 `reviewed`（`Block 0`）。门本身不区分「审过源码」与「没有源码可审」——`unreviewed` 现在会让门变红，那是「模型没给出可用结论」，不是空 diff 的预期结果。这块覆盖空白由 `docs/agents/review.md`「审查范围与生成物」的人工纪律兜：空 diff 不构成可合并结论，也不适用核对式抽查。
- 仍未实测的项：Linux 上 `--sandbox` 是否如文档生效；60 分钟余量对应多大的真实耗时；`codex-action` 在输出不合 schema 时是否仍以 0 退出（已观测到 schema 合法但 `summary` 为空的输出以 0 退出并落到 `unreviewed`；schema 非法时是重试还是失败仍未观测）；`workflow_run.head_branch` 在各事件下的实际取值；写回腿 403 在补 `pull-requests: write` 后是否彻底消失。403 若仍复现则按「故障可见」条款升级到专用写令牌。

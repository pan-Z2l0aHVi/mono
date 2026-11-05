# ADR-0021: Codex 自动 PR 审查门

- **Date**: 2026-11-04
- **Revised**: 2026-11-05
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

**门禁形态**：约定式门禁，不改 GitHub 分支保护。`reviewed` 且 `Block > 0`、以及 `error` 让这道门变红；`unreviewed`、`stale`、`not_applicable` 保持绿色。`Block` 数量、状态、故障码与缺失配置名一起写进 PR 上同一条持久评论。合并准入仍由人和仓库的 PR review 纪律决定。

**状态口径**：`error` 只表示配置或调用故障，故障码为 `config_missing`、`model_failed`、`artifact_missing` 之一；模型腿正常结束却没产出结论是 `unreviewed`，输出不合 schema 也归 `unreviewed`。`continue-on-error` 只让判定脚本有机会落结论，模型腿的 `steps.<id>.outcome` 仍传给判定脚本，故障不会被掩成「未审查」。review job 被整体跳过时门记 `not_applicable`。

**权限分腿**：模型只在 PR 验证的只读 job 里运行；写回（评论、应用并推送 patch）在由 CI 完成事件触发的独立 workflow 里进行，那条 workflow 一次都不调用模型。这条划分是 PR 验证只读不变量成立的前提。

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

**触发收敛**：写回腿只处理同源仓库的 PR run，排除已取消的 run 与版本分支；没有审查 artifact 时跳过发评论，不制造无意义失败。只读探测是尽力而为，失败不阻止结论发布，写权限不足由发布步骤的 403 清单报告。门仍不设为分支必需检查。

**引导落地**：可信脚本取自 PR base，因此引入新子命令的那个 PR 自己拿到的仍是 base 里的旧脚本。模型腿的 job 级不设 `continue-on-error`，旧脚本缺少 `preflight` 时该 job 直接变红，而不是又回到全绿静默。合并后的下一个 PR 起，base 带新脚本，链路完整生效。

**时间与成本**：两条模型腿各给 60 分钟上限，这是首批实测用的临时余量，测出真实分布后回收；自动修只在失败时触发，它自己也是消耗模型调用的一条腿。

**审查范围**：`resolveReviewRange` 的 `git diff` 用 `:(exclude,glob)**/generated/**` 在入口剔掉生成产物，`review-scope.json` 记下 `excluded_pathspecs` 与 `empty_diff` 便于审计。这是路径层面的批量 churn 过滤：md-to-meta 的 meta/codeblock 随 markdown 重建整批换哈希名，`icons/generated` 等入库产物同样只随 generator 变，都只会淹没真实改动；`routeTree.gen.ts` 之类单文件生成物仍留在审查 diff。`prepare` 由审查腿与自动修腿共用，两条腿同时受益。对 PR #515 的 base/head 对象做本地 `git diff` 实测：13.9 MB → 1.29 MB（不是 CI run 观测值；可信脚本取自 base，本修复 PR 的 CI 仍跑旧脚本）。

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

**验收清单**（后台配置填齐后按 run 日志逐项核对）：

1. `Run codex exec` 出现，`codex-final-message.json` 非空且通过 schema。
2. PR 上出现 `codex-review-conclusion` 持久评论，`status=reviewed`。
3. 清掉任一变量后重跑：`codex-gate` 变红，日志只列缺失变量名，评论标 `error` 与 `config_missing`。
4. 改 `CODEX_REVIEW_MODEL` 后同 head 重跑：旧结论不复用，模型重新调用。
5. 写回腿成功发出或更新结论评论；workflow_run 列表里没有无产物的失败 run。
6. 拓扑断言与脚本单测全绿。
7. `review-scope.json` 记有 `excluded_pathspecs` 与 `empty_diff`，审查 diff 里没有 `**/generated/**` 路径；大 PR 不因 `ENOBUFS` 让 `prepare` 失败。（**合入 main 后的下一个 PR** 上核对：可信脚本取自 PR base，修复自己的 CI 仍跑旧脚本。）
8. 两条模型腿的 `Set up job` 日志出现 `Image: ubuntu-24.04`，且 `Run codex exec` 不再出现 `Could not restrict access to /run/dbus/system_bus_socket`。以审查腿为准，满足第 1 项（有真实模型结论）后再核对此项；autofix 腿只在 `CODEX_AUTOFIX_ENABLED=true` 且 `check` 失败时运行，默认关闭，不必为验收专门打开。

**待办**：`prepare` 的任何失败都会跳过 preflight，被 `validate` 记成 `config_missing`；后续把 preflight 前置到 prepare 之前，或引入 `job_failed` / `preflight_missing` 错误码，并同步「状态口径」、`docs/agents/review.md` 的故障码清单、`renderConclusion()` 与相关单测。本次修复后该误归因对 PR #515 的事故不再可达，门「故障即红」不受影响。

## 后果

- 自动修推送的新提交不会触发 checks，PR 上那道必需检查要人重跑一次 CI 才会覆盖新 head；结论对新 head 也随之过期，这是「直推」换来的代价。
- 门是约定式的：绕开它只需要忽略一次红叉，因此它省的是「等一次人工细看」，不是「替代人工」。
- 后台配置未填齐时每个 PR 都会红。配置本身成为可观测的门禁输入，代价是配置变更与门的颜色直接绑定。
- 引入新可信子命令的那个 PR 自身无法完成审查：它的 base 还是旧脚本，模型腿会红。首次落地要先合入脚本、再在后续 PR 上验证全链路。
- 只读腿与写腿分居两个 workflow，读代码时看到的 YAML 不能解释全部行为；判据在 ADR 与机器断言里，不只在 CI 定义里。
- 模型结论的可信度受沙箱档位、输入版本与后台配置影响，这三处都由 CI 拓扑测试钉住，改动会被断言挡下来，而不是靠 review 时想起来。
- 两条模型腿绑定 `ubuntu-24.04`，与本 workflow 其它 Linux job 的 `ubuntu-latest` 不同步；24.04 退役前必须按「Runner 镜像」条款的恢复条件完成迁移，否则审查链路会再次在模型启动前静默失败（表现为 job 绿、gate 红、零模型调用）。这是一笔有到期日的技术债。
- 仍未实测的项：Linux 上 `--sandbox` 是否如文档生效；60 分钟余量对应多大的真实耗时；`codex-action` 在输出不合 schema 时是否仍以 0 退出（这决定 `unreviewed` 会不会被 `model_failed` 取代）；`workflow_run.head_branch` 在各事件下的实际取值；写回腿 403 在补 `pull-requests: write` 后是否彻底消失。403 若仍复现则按「故障可见」条款升级到专用写令牌。

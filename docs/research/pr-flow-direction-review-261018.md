<!-- corpus-status: reference -->

# 单维护者、多编码 agent 仓库的提交与合并责任

> 状态：非权威参考（时点性研究）。结论以现行 ADR、源码与测试为准。

> 文中行号、实测数值与「当前实现」类描述均为写作时点，不随实现同步；现行权威见所引 ADR、源码与测试。

调查日期：2026-10-18。范围是本地 commit、检查、审查和 merge 的责任划分。本文先依据 GitHub、Git、Changesets 的一手文档判断可用机制；不以本仓现有方案或实现为前提。下文的「官方明示」指链接中的产品行为，「工程判断」指据此提出的取舍，「待仓库实证」指不能从通用文档推出的条件。

## 可核验的机制

- GitHub flow 让贡献者在分支提交、开 PR、处理反馈后合并。PR 保存评论和提交历史，检查失败可在 PR 上看到。它说明一种轻量协作路径，不证明每个仓库都必须设置 required review，也不规定本地 task 状态机。[GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow)
- GitHub 可分别要求 PR、审批和 status checks。required checks 的结果必须覆盖当前 PR 的相关提交或测试合并提交，不能复用旧提交结果。GitHub 也接受 `skipped`、`neutral` 等满足规则的结论，因此“required”不自动等于“必定执行成功”；按路径等条件跳过整个 required workflow 则可能长期 Pending。GitHub 允许指定预期的 GitHub App 作为 check 来源。[ruleset 规则](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)、[required checks 排障](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)、[protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- GitHub 的 stale approval option 会在 PR diff 变化时撤销既有审批；另一个 option 要求最近一次可审查推送由推送者之外的人批准。后者不自动撤销旧审批。目标分支改变 merge base 也可能使审批失效。PR 作者不能批准自己的 PR。因此，单人账号若开启强制人工审批，需要事先确认另有合格 reviewer，否则会把自己锁在合并门外。[ruleset 规则](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)、[批准 PR](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/approving-a-pull-request-with-required-reviews)
- Git 的 `pre-commit` 在提交前运行，非零退出可阻止 commit，但 `git commit --no-verify` 可绕过它。它适合快速反馈，不是远端合并的最终证明。`git add -A` 在未给 pathspec 时将整个工作树的新增、修改和删除写入 index；`git add -p` 支持只选部分 hunk。Git 默认 commit 的是 index 中内容。[githooks](https://git-scm.com/docs/githooks)、[git-add](https://git-scm.com/docs/git-add)
- Changesets 的 FAQ 明说，不需发布的改动无需 changeset。CLI 支持 `--empty`，用途是满足要求每个 PR 有 changeset 的 CI；`status` 在包变更却无 changeset 时会退出 1。Changeset 中的包名和 semver bump 是发布意图，`version` 才据此修改版本、依赖与 changelog。由此不能把「文件命中 package 路径」直接等同于「应发版」，也不能把空声明当成实际版本判断。[Changesets FAQ](https://changesets.dev/faq)、[CLI 指南](https://changesets.dev/guide/cli)
- GitHub 当前文档已允许特定配置下的 Copilot approving review 满足 required approval；该功能仍为 public preview，默认关闭。仓库配置中「允许 Copilot 提交 approval」与「让该 approval 计入 merge 要求」是独立开关，还可能受组织、企业和路径范围限制。通用 required reviews 页面仍有「Copilot reviews 不计数」的旧表述，不能据此推断所有 bot 一概无效，也不能假定本仓已经开通、启用或愿意付费。[Copilot approval](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-code-review#pull-request-approvals-from-copilot)、[Copilot 配置](https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/configure-code-review)、[通用审批页](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/approving-a-pull-request-with-required-reviews)

## 责任划分的工程判断

最省心的默认分工是：实施 agent 负责分支里的小范围 commit 和其实际运行的相关验证，独立 reviewer 负责审查 PR 上的最终 diff 与验证证据，维护者负责选择合并时机并承担发布风险。CI 负责对将要合并的提交重复运行可自动判定的门槛。这样每项结论都依附于可追溯的 Git 对象或 PR 记录。需要强制人审时，必须先有第二个合格的 GitHub reviewer；若只有一个账号，可先要求独立 agent 在 PR 记录审查意见，由维护者判定，而不把本地 agent 的自称「approved」误认为 GitHub 的 required approval。若可用且接受 preview 的 Copilot approval，也可评估其 GitHub 原生审批能力，但应先以一条测试 PR 核验账号、规则和文件范围。

本地 hook 只放耗时短、确定性高、能直接解释失败原因的检查。耗时较长的测试和构建由实施者按影响面选择运行，CI 在 PR 最新提交上重跑合并必需项。若每次 commit 都跑 monorepo 全量 checks，频繁提交会被迫合并成大提交，反而延迟反馈；若仅在本地运行，`--no-verify`、不同环境和旧 SHA 又使合并保证不足。例外是仓库规模小、全量检查足够快，此时本地全跑可以比维护选择逻辑更便宜。

本地自研 task 状态机只应解决多个 agent 的 worktree 归属、交接和恢复。`$TMPDIR` 台账若可能消失，就不能成为「已审查」「已验证」「可合并」的权威记录。能够复原的事实应落在 commit、PR review、CI run、必要时的 Task Packet 里。若跨进程 owner 冲突确实反复发生，保留极小的 owner/worktree 记录有价值；若编排层已有独占分配和可靠交接，再增加逐级状态、hash、approval 镜像，会产生两份难以同步的真相。此处是工程推断，必须用本仓的并行冲突和恢复案例判断，不是 GitHub 文档的要求。

全量 `git add -A` 加 fixer 的归一化命令可以帮助专属且干净的 worktree 形成一致快照，但会覆盖有意的部分 staging，并吸收同一 worktree 内无关、未忽略的新文件。命令若保留，应先明确其「收集整棵树」语义，执行后让实施者查看 `git diff --cached` 和 `git status`，在 fixer 改写后重新检查 diff，再 commit。需要小步或选择性提交时，按 pathspec 或 `git add -p` 更合适。pre-commit 本身不应暗中全量 staging 或改写工作树，因为运行检查的对象会与实施者已选的 index 不一致。

Changeset 判定交给知道用户可见行为和发布范围的实施者，再由 reviewer 核对。涉及已发布包的用户可见修复、新功能或破坏性变化，通常需要真实 changeset；纯内部工具、文档或未发布私有应用变化未必需要。若本仓决定所有 PR 都必须显式表态，则空 changeset 是可选的流程成本，适合遗漏发布说明比噪音成本更高的仓库；若可按包和改动范围准确判别，允许无 changeset 的 PR 更符合 Changesets FAQ。自动脚本能发现缺失或格式问题，但不能仅靠路径准确判断 semver 级别。

新增「AI required check」只有在团队确实要阻止未经独立 AI 审阅的合并，并能保证每次新推送都重新审查、检查结果绑定最新 SHA、输出可解释且来源受控时才值得做。GitHub 已提供 required checks 和特定配置下的 Copilot approval；自建 AI check 需要承担调用、配额、故障降级、误报以及把意见映射为 pass/fail 的成本。单维护者更容易先把 AI review 当作 PR 上可见的辅助证据，让人根据具体意见合并。反例是安全敏感且法规要求独立机器审查的仓库，或已经验证 AI check 对特定缺陷有稳定检出率的仓库，此时 required check 可能合算。不能用「常见仓库如此」替代缺陷收益与运维成本的实测。

## 仍需本仓实证

1. 当前 ruleset 到底要求哪些 check、是否要求审批、是否允许绕过、CI 是否每次在最新 SHA 运行；required workflow 有没有因路径过滤而 Pending。
2. 单人 GitHub 账号、agent 身份和可用 reviewer 的权限；Copilot approval 的计划、企业与仓库开关、费用和真实测试 PR 行为。
3. 本地五项检查、相关测试和全量构建的耗时与失败分布；多少时间花在重复运行，多少缺陷只在 CI 或 review 被发现。
4. 编排层是否已保证 worktree 独占；`$TMPDIR` 丢失或状态与 Git/PR 冲突时，当前恢复步骤是否依赖台账中不可重建的信息。
5. 发布包、私有应用和根目录工具的真实发布策略；历史 PR 里空 changeset 与漏发版分别出现多少次。

在这些数据缺失时，建议先维持小而明确的本地提交职责、PR 上可追溯的审查、对最新 SHA 的 CI 门槛，由维护者决定 merge。是否增加强制审批、自建 AI check 或更复杂的本地状态，只按上述实证缺口逐项决定。

## 本仓实证与父级判断

以下部分由父级 Sol high 在独立资料调查完成后，对当前未提交实现进行复核。依据是实际源码、临时 Git fixture 和 2026-10-18 的只读 GitHub API 响应，不采信旧交接文档的结论。本节只提出方向建议，没有继续改实现或远端配置。

### 已确认的事实

| 对象                     | 实证                                                                                                                                                                                                                                                                                                                                                                                    | 含义                                                                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 远端合并边界             | 重新查询 `gh api repos/pan-Z2l0aHVi/mono/rulesets/20240791`：active、无 bypass、strict required context `check`、审批数 0、squash-only                                                                                                                                                                                                                                                  | 当前有 CI 合并门禁，没有通用的独立 review 强制门禁。其他附加 approval 字段仍存在，不能将“审批数 0”解释为所有 PR 都无需任何额外审核。                                  |
| 四项政策只在本地执行     | `scripts/task.mjs:13,298` 列出五项 checks；`.github/workflows/ci.yml:69-91` 调用 context、changeset、build、脚本测试、pack、check-code，没有调用 command-conventions、no-mutual-links、turbo-cache-invariant、web-ui-docs-inputs。`scripts/task.test.mjs` 对调度用临时 mock checks；`scripts/checks/check-context.mjs`（原 `validate-context.mjs`）校验链接有效性等，未执行这四项政策。 | format-clean 的主要格式/静态检查已有全仓 check-code 兜底；另外四项没有等价的显式远端执行保证。真实 no-mutual-links 检查曾拦住五组互指，context 校验通过没有替代它。   |
| freeze 吸收既有无关文件  | 隔离临时仓库先放入 unrelated-existing.md，建立 T2，再只暂存 intended.md。新 CLI freeze 后 index 同时包含两文件，phase 仍 active。源码 `scripts/task.mjs:251-277` 两次 `git add -A`，`:411-425` 不生成冻结证据。                                                                                                                                                                         | 这是符合当前实现的行为，并非测试失败，但它覆盖部分 staging，也削弱小步提交的便利。T2 允许脏起点，所以不能用“专属 task”推导所有文件均属本次变更。                      |
| 台账不承载放行证据       | `scripts/task.mjs:128-133` 没有 review/approval/verification 字段；`docs/agents/workflow.md` 明说 done 不代表 CI/review/merge。root AGENTS 仍要求每次变更先建 task；CLI 为 563 行，提供十个命令。                                                                                                                                                                                       | 归属隔离与迁移有实际职责，不能仅据行数判定该删；但 init/start/done/issue/pr 的重复录入是否值得，需要用恢复和协调需求检验。                                            |
| review 的过渡记录        | `docs/agents/review.md:7,15` 要求独立 reviewer 检查实际 diff，并把结论链接至对应 PR/提交。ruleset 没有通用 approving-review gate。                                                                                                                                                                                                                                                      | 可采用人工启动的独立 agent review，无需先做付费自动服务；合并前应明确核对报告覆盖当前 head，且阻断发现已处理。证据应保存在 PR 或明确的持久交付记录，而不只在 tmpdir。 |
| 所有 PR 必须有 changeset | 判据现居 `packages/monorepo-kit/src/plugin/changesets/changeset-required.ts`（原 `scripts/changeset-required.mjs:173-178`，现 `scripts/policies/changeset-required.mjs` 只是薄 re-export）：在没有有效声明时失败，即使改动只在根文档或工具；`.changeset/pr-review-flow.md` 当时是空声明，已被后续发布消费删除。版本检测脚本以 releases 非空才启动版本步骤。                             | 每 PR 空声明是本仓额外政策，不是 Changesets 的必要条件，也不证明 semver 判断正确。空声明可能等待后续真正的版本操作才被消费。                                          |

现状注（2026-10-30 核验，针对上表）：

- 远端合并边界：`gh api repos/pan-Z2l0aHVi/mono/rulesets/20240791` 属远端平台状态，本行只是写作时点的只读快照，不随本仓同步。
- 四项政策只在本地执行：该行的断言已被后续实现推翻——`pnpm run check-policy` 的 8 项（`scripts/checks/check-policy.mjs:14-23`）现在 `check` job 内执行（`.github/workflows/ci.yml:153-157`）；2026-10-30 只读查询远端规则集，`check` 仍是 main 唯一的 required status context（strict=true）。context、changeset 等步骤现分布在 `.github/workflows/ci.yml:147-184`，`:69-91` 现为读取 PR 标题与 base SHA 的脚本。
- freeze 吸收既有无关文件：freeze 与其 `git add -A` 副作用已整体移除，本行的行为与源码位置都是写作时点。
- 台账不承载放行证据：`init/done/issue/pr` 子命令不存在；现台账 451 行、7 个子命令（`skills/task-ledger/ledger.mjs:425-438`）；`scripts/task.mjs` 现为 `skills/task-ledger/ledger.mjs`，`scripts/task.test.mjs` 现为 `skills/task-ledger/ledger.test.mjs`。
- review 的过渡记录：写作时 `docs/agents/review.md:7,15` 的两条要求现由 `docs/agents/review.md:3`（独立性来自单独执行体、固定提交与直接检查证据）、`:5`（新鲜上下文，只接收原始证据）、`:9`（审查开始时记录 base/head 完整 SHA）、`:23`（持久报告字段）承载；「独立 reviewer 检查完整 PR diff」的现行权威在 [`docs/adr/0012-pr-review.md`](../adr/0012-pr-review.md) 的 `:12`。

### 方向结论

支持把 review 从 commit 前移至 PR/merge 边界，保留分支里的小步提交，让 required CI 核验实际将合并的内容。Changeset 检查使用 PR base/head commit，也比依赖临时 task baseline/index 更符合其发布职责。临时台账退出审查和验证的权威位置是合理的。本次自动 reviewer 暂缓仍可成立，工程正确性不要求先自建一个付费 AI workflow。

当前实现可以理解为过渡方案，我不建议不加区分地将其宣布为完整目标方案。建议按以下顺序收口：

1. **合并前补足强制政策的远端执行。** 如果四项现存规则仍被视为仓库硬约束，就让 required check 实际执行它们。能够删除或降级为提示的规则，则明确降级。不能同时称其为硬约束，又只依赖本地 hook。此调整不需要接入自动 AI review。（2026-10-30 核验：已落地——`pnpm run check-policy` 的 8 项在 `check` job 内执行（`.github/workflows/ci.yml:153-157`、`scripts/checks/check-policy.mjs:14-23`），而 `check` 是 main 保护里唯一的 required status context：当日只读查询 `gh api repos/pan-Z2l0aHVi/mono/rulesets/20240791` 返回 `required_status_checks=[{context:"check"}]`、`strict_required_status_checks_policy=true`。远端平台状态随时可变，本条只是当日快照。）
2. **合并前纠正 ADR 的机制前提，并明确过渡 review 的完成条件。** `docs/adr/0012-pr-review.md`「决策」段（原引 `ADR-0025`，该编号已悬空；现行 0012 无编号小节）将未来方案预设为新的 required check，选择过早。可选项还包括配置后的原生 approval 或人工启动的独立 agent review。保留“PR 作者不能同账号自批”的事实，但去掉“因此必须自建 check”的推论。review 报告需覆盖当前 head；有新提交就重新评估相应 diff。当前记录已有 PR/commit 链接要求，可在同一处收紧措辞，无需再造本地审批命令。（2026-10-30 核验：现行 [`docs/adr/0012-pr-review.md`](../adr/0012-pr-review.md) 的「决策」段只把 changeset 与政策检查归给 PR CI、远端规则集与回写/merge 授权按现行流程执行（`:16`），「后果」段明确 CI 只代表自动检查证据、不替代独立 review 或发布授权（`:22`），不再把「必须新建 required check」写成机制前提；review 报告的字段与完成条件由 `docs/agents/review.md:23` 承载。）
3. **下一步拆开归一化与 staging。** freeze 已不冻结快照，其名称和副作用仍来自旧体系。建议将通用 fixer 作为独立、明确的操作，默认不接管 index；整树 staging 若有实际价值，使用显式全量 option 或明确限定为专属 worktree 工具。兼容期可保留有清晰警告的旧入口，不必为了改名再扩大这次重构。（2026-10-30 核验：本条已随 freeze 移除而整体作废——freeze 与其 `git add -A` 副作用均已不存在。）
4. **用实际收益决定台账后续规模。** 若编排层依赖 owner/worktree 的占用查询，保留这部分；PR、CI、review 的状态仍以 GitHub 为准。短期 schema v1 到 v2 的兼容代码可以接受，避免把十个命令全部当成永久设计。观察重复录入、恢复失败和冲突案例后再删减，不用另一套状态机替换旧状态机。
5. **单独重新决定空 changeset 政策。** 官方自动化指南明确介绍了允许缺省和强制声明两种方式，且不建议普遍阻断所有无 changeset 的贡献；若偏好一致声明，也支持 --empty。当前政策可以是有意选择，但需说明它防的是遗漏发布判断，代价是每个无版本影响 PR 的额外文件。不要宣称这是工具要求，也不要在本次方向审查中擅改已有发布政策。[官方自动化指南](https://changesets.dev/guide/automating)

以上 1、2 是我建议当前变更合并前处理的最小收口；3 至 5 是后续取舍，不建议在没有实际需求时一并扩大重构。对自动 review 的具体产品、配额、可用开关或 required-check 设计，本次都未启用或实测，不能据文档存在就认定适合本仓。

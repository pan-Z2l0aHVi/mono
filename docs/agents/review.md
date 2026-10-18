# PR review 纪律

本文件规定 T0/T1 的 PR 独立审查、结果回写、复审和合并前核对。T2 按影响安排。独立性来自 reviewer 的单独执行体、固定提交和直接检查证据；实施者自查不能替代。GitHub 登录身份相同本身不抹去本地执行独立性，但作者不能在 GitHub 批准自己的 PR。会话选用的模型与推理强度由编排决定，不写入仓库政策。新 reviewer 优先使用独立或新鲜上下文，只接收任务验收条件、PR URL/base/head、相关规则和原始证据；实施者摘要可作待核线索，不能把其自评结论当审查依据。

GitHub MCP 可以替代 `gh` 读取 PR、文件、评论与 reviews，也可在具备该操作时发表绑定 `commit_id` 的 `COMMENT` review；缺字段、分页或截断时用 `gh`、REST API 或 Git 补足，并保留相同的 SHA、授权和响应核对。工具选择不改变审查证据要求。Task 台账不记录 review、approval、verify 或 CI 通过。required context `check` 只证明 CI 中的检查结果，不是 review 结论。当前规则集没有 required approving review；reviewer 完成审查后是否向 GitHub 回写由用户逐次授权。实施和恢复时不要把本地审查说成已发布的 GitHub review。

## 固定 PR 输入

由编排层提供 PR URL、仓库和单独的 reviewer worktree。先记录 PR 当前 base 与 head 的完整 SHA、目标分支、作者、状态、draft、文件数及合并对象：

```sh
repo=OWNER/REPO
pr=123
pr_url="https://github.com/$repo/pull/$pr"
gh pr view "$pr_url" --repo "$repo" --json number,url,state,isDraft,author,baseRefName,baseRefOid,headRefName,headRefOid,potentialMergeCommit,changedFiles,files,reviews,comments,statusCheckRollup
```

读取完整改动文件、已有 inline review、review 本身和普通 PR 评论，使用分页 REST 结果补足 CLI 展示：

```sh
gh api --paginate "repos/$repo/pulls/$pr/files?per_page=100" --jq '.[] | {filename,status,previous_filename,additions,deletions,patch}'
gh api --paginate "repos/$repo/pulls/$pr/reviews?per_page=100"
gh api --paginate "repos/$repo/pulls/$pr/comments?per_page=100"
gh api --paginate "repos/$repo/issues/$pr/comments?per_page=100"
gh pr diff "$pr_url" --repo "$repo"
```

比较文件接口返回数与 `changedFiles`。REST 文件列表最多返回 3000 个文件；二进制、重命名或过大的 diff 也可能缺少 patch。缺失内容不等于没有问题：在 reviewer worktree 直接读取 Git 对象并生成完整 diff。无法完整读取文件、评论或提交对象时，报告为覆盖不完整，不给出“无问题”或可合并结论。接口分页按 GitHub REST pulls、reviews 和 issue comments 文档执行。

## 固定代码与审查范围

由编排层分配独立 reviewer worktree；不得切换、覆盖或修改实施者 worktree。目标路径不存在时才用 `--worktree` 创建；先确认该路径未被占用。已有的专属 reviewer worktree 只在确认它的 origin 指向 PR base 仓库后复用，核验 HEAD 后继续，不对已有路径再次调用创建命令。新建后也要核对 `origin` 与 `gh repo view "$repo" --json nameWithOwner,url` 指向同一 base 仓库；fork PR 的 head 通过 PR 引用读取，origin 仍是 base 仓库。

```sh
reviewer_worktree=/absolute/path/assigned/by/orchestrator
# 仅当路径不存在时创建：
test ! -e "$reviewer_worktree"
gh pr checkout "$pr_url" --repo "$repo" --detach --worktree "$reviewer_worktree"
# 对新建或复用的 reviewer worktree，先核对远端仓库与初始快照，再 fetch：
git -C "$reviewer_worktree" remote get-url origin
gh repo view "$repo" --json nameWithOwner,url
git -C "$reviewer_worktree" fetch --no-tags origin "refs/heads/$base_branch"
git -C "$reviewer_worktree" fetch --no-tags origin "refs/pull/$pr/head"
test "$(git -C "$reviewer_worktree" rev-parse HEAD)" = "$head_sha"
git -C "$reviewer_worktree" cat-file -e "$base_sha^{commit}"
git -C "$reviewer_worktree" cat-file -e "$head_sha^{commit}"
merge_base=$(git -C "$reviewer_worktree" merge-base "$base_sha" "$head_sha")
git -C "$reviewer_worktree" diff --find-renames --stat "$merge_base" "$head_sha"
git -C "$reviewer_worktree" diff --find-renames "$merge_base" "$head_sha"
```

已有 worktree 应跳过 `gh pr checkout --worktree`，只执行远端、SHA 与对象校验。以上 SHA 从第一条 PR 快照人工核对后赋值；若 fetch、对象读取或 HEAD 校验不符，先重新读取 PR 状态，不审查漂移的工作树。`merge-base..head` 覆盖整个 PR，而不是只看最新 commit。先读完整 diff，再直接检查相关源码、测试、配置、文档及上下游调用。按变更选择真实验证，依赖安装与工具环境按 `docs/agents/worktree.md`、`docs/agents/verification.md` 办理；验证命令、退出结果和未运行项都要留证据。

GitHub `pull_request` 默认 workflow checkout 使用 base/head 的临时合并对象（`refs/pull/<number>/merge`）；代码 review 则固定在 PR head。不能把 Actions run/check 关联用的 PR head SHA 当作 runner 实际测试的 checkout SHA。`gh pr checks --json` 不提供 head SHA；先用它找到 required context `check` 的 run，再核实 run/check 对象关联到当前 PR head，并从 CI 输出检查实际 base/head 和 checkout：

```sh
gh pr checks "$pr_url" --repo "$repo" --required --json name,state,bucket,link,startedAt,completedAt,workflow,event
gh run view RUN_ID --repo "$repo" --json headSha,event,status,conclusion,jobs,url
gh run view RUN_ID --repo "$repo" --log
gh api --paginate "repos/$repo/commits/$head_sha/check-runs?per_page=100" --jq '.check_runs[] | {name,head_sha,status,conclusion,details_url}'
```

run 的 `headSha` 与 check-run 的 `head_sha` 应关联当前 `headRefOid`；run 的 `event` 应为 `pull_request`，required `check` job 必须完成且结论为 success。检查 `jobs` 中 `Record tested PR snapshot` 与 `Check repository policies` 两步都实际执行并成功。日志中的 snapshot 同时记录 PR base SHA、PR head SHA、`GITHUB_SHA` 和 `git rev-parse HEAD`；将 base/head 与最新 PR 快照核对，并把 `Checkout SHA` 记作实际 tested SHA。`GITHUB_SHA` 与 checkout SHA 不同、base/head 已变、step skipped/neutral/pending/cancelled/失败、链接打不开或关联 SHA 不符，都不能证明当前 PR 输入已通过 CI。不要要求 run/check 的 PR head SHA 与 merge checkout SHA 相等，也不要仅凭 `potentialMergeCommit.oid` 推断运行内容。`gh pr checks` 字段和 Actions run/check 对象以本机 `gh` 手册及 GitHub API 为准，不读取不存在的 `gh pr checks.headSha`。

检查需求和验收是否实现、行为与失败路径、公共契约、兼容性、测试质量、权限与用户输入安全、竞态、资源管理，以及文档与机检的一致性。对每个发现给 `Block`、`Should fix` 或 `Nit`，并列当前文件行、影响、复现条件和证据。Block 未处理时不能给可合并结论；Should fix 若不修，须由维护者留下处置理由；Nit 不冒充阻断问题。无发现也要记录审查范围、验证证据和未覆盖风险。

审查开始和提交报告前，重新读取 PR base/head SHA、改动文件数与 `potentialMergeCommit`。head 改变后旧报告只覆盖旧提交，需按新 SHA 检查完整 diff；普通追加提交可以聚焦新增及受影响区域，但最终报告覆盖当前完整 PR。force push、rebase、base 更新或改动范围变化时重新求 merge-base、检查完整受影响面，必要时全量重审。不得把新提交或更新后的 base 说成旧报告已覆盖。

## 报告、回写与修复复审

持久报告至少记录 PR URL、base/head SHA、reviewer 执行体、审查范围、发现及处置、验证命令与实际结果、未覆盖风险、结论，以及上一轮报告和本轮修复的对应关系。报告写入 PR review/comment 或编排器明确提供的持久交付记录；不得只留在 `$TMPDIR`，也不要提交到被审分支而无意改变 head。

没有用户对 PR 外部写入的明确授权时，只交付本地报告，不调用写 API。获得授权发表后，使用明确绑定 reviewed head 的 `COMMENT` review，不自动 `APPROVE` 或 `REQUEST_CHANGES`。调用前重新读取 PR base/head，并确认仍等于报告覆盖的 SHA；若已漂移，先补审并更新报告。将正文和 SHA 写入静态 JSON 文件，再提交：

```sh
cat > review-payload.json <<'JSON'
{
  "commit_id": "REVIEWED_HEAD_SHA",
  "event": "COMMENT",
  "body": "JSON_ESCAPED_REPORT_BODY"
}
JSON
gh api --method POST "repos/$repo/pulls/$pr/reviews" --input review-payload.json
```

将 `REVIEWED_HEAD_SHA` 替换为已重读确认的完整 SHA；`JSON_ESCAPED_REPORT_BODY` 必须由 JSON serializer 编码，正文中的换行写作 `\n`。不要把多行正文原样插进 JSON 或拼进 shell 命令。内联评论是可选项，只能落在当前 diff 有效行。检查 API 响应的 `commit_id`、state 与 `html_url`，随后重读远端 base/head；若响应失败、SHA 不符或 base/head 已变化，报告仍为待发布或旧版本，不宣称已回写当前 PR。若请求超时或会话中断，先分页读取现有 reviews 并核对 `commit_id`、正文和 `html_url`；确认没有已创建的同一 review 后才考虑重试，避免重复发表评论。GitHub review API 的 `commit_id` 用来固定被评审提交。

实施者修复 Block/Should fix 后运行相关验证并推送需另获用户授权。Reviewer 在新 head 上对照前一报告检查修复及受影响行为，更新完整 PR 结论和验证记录；未处理的 Block 不能靠 CI 变绿消除。

## 合并前与中断恢复

合并前重新读取当前 PR 状态、draft、base/head、冲突/mergeability、required checks、CI snapshot 记录的实际 checkout SHA、review 报告覆盖的 SHA、未决发现及 changeset 结果。`strict` 只要求 PR 跟上 base；squash 会产生新 commit，不能推断最终 main commit 与之前测试 SHA 或树恒等。若 base 更新，先确认新的 merge object 已通过 CI，再评估 review 范围。即使 `--match-head-commit` 固定 head，也不锁定 base；出现变化或 GitHub 拒绝时停止并重新核对。

只有在全部证据对应当前 base/head、没有未处置 Block、required CI 与硬约束成功、PR 非 draft 且可合并后，才向用户报告具体待合并 PR 和 SHA。每次 merge 需用户明确授权。获授权后执行 squash 并锁定已审查的 head：

```sh
gh pr merge "$pr_url" --repo "$repo" --squash --match-head-commit "$reviewed_head"
gh pr view "$pr_url" --repo "$repo" --json state,mergedAt,mergeCommit
```

不要用 `--admin` 绕过保护，也不要用无条件 `--auto` 代替当前证据。合并命令失败或中断时，重新查询 PR；成功后核实 `state`、`mergedAt` 与 `mergeCommit`，再按发布流程处理后续链。task 台账的 `closed` 不代表 review、CI、merge 或发布成功。

网络或权限不足、无 PR、diff/对象不全、required CI 尚未运行/挂起/取消/跳过、review 未获授权回写或 API 失败、PR base/head 漂移、merge 中断，对应步骤都记录为未完成并保留 PR URL、base/head SHA、reviewer worktree、已验证证据、未完成步骤和上一轮报告引用。下次从这些实际状态继续；PR 创建前的本地预审不构成 PR review，缺失证据也不构成通过。

外部操作参考：[gh pr view](https://cli.github.com/manual/gh_pr_view)、[gh pr diff](https://cli.github.com/manual/gh_pr_diff)、[gh pr checks](https://cli.github.com/manual/gh_pr_checks)、[gh pr checkout](https://cli.github.com/manual/gh_pr_checkout)、[gh pr merge](https://cli.github.com/manual/gh_pr_merge)、[gh run view](https://cli.github.com/manual/gh_run_view)、[pull_request 事件](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request)、[PR files API](https://docs.github.com/en/rest/pulls/pulls#list-pull-request-files)、[PR reviews API](https://docs.github.com/en/rest/pulls/reviews#create-a-review-for-a-pull-request) 与 [check runs API](https://docs.github.com/en/rest/checks/runs#list-check-runs-for-a-git-reference)。

# PR review 纪律

本文件规定 T0/T1 的 PR 独立审查、结果回写、复审和合并前核对。T2 按影响安排。独立性来自 reviewer 的单独执行体、固定提交和直接检查证据；实施者自查不能替代。GitHub 登录身份相同不抹去本地执行独立性，但作者不能在 GitHub 批准自己的 PR。会话选用的模型与推理强度由编排决定，不写入仓库政策。本文涉及的远端写操作都需用户逐次明确授权；机制见 [`workflow.md`](./workflow.md#怎么取得这个授权)。

新 reviewer 优先使用独立或新鲜上下文，只接收任务验收条件、PR URL/base/head、相关规则和原始证据；实施者摘要可作待核线索，不能把其自评结论当审查依据。GitHub MCP 可以替代 `gh` 读取 PR、评论与 reviews，也可以发表绑定 `commit_id` 的 `COMMENT` review；工具选择不改变 SHA、授权和响应核对要求。Task 台账（见 [`.agents/skills/task-ledger/SKILL.md`](../../.agents/skills/task-ledger/SKILL.md)）不记录 review、approval、verify 或 CI 通过。required context `check` 只证明 CI 中的检查结果，不是 review 结论。远端规则集的 required checks 与是否要求 approving review 属于平台状态，以仓库当前规则为准；平台是否强制 review 不改变本文的审查要求。reviewer 完成审查后是否向 GitHub 回写由用户逐次授权，机制见 [`workflow.md`](./workflow.md#怎么取得这个授权)。

## 固定输入与范围

由编排层提供 PR URL 与仓库，尽量附独立的 reviewer worktree；未提供时 reviewer 只读复用已有 worktree，核对要求不变。审查开始时记录 PR 当前 base 与 head 的完整 SHA、目标分支、作者、状态、draft、文件数及合并对象，并读取完整 diff、已有 inline review、review 和普通评论。文件、评论或提交对象无法完整读取时，报告覆盖不完整，不给出「无问题」或可合并结论。

reviewer 不得切换、覆盖或修改实施者 worktree，审查中不执行任何文件修改或 git 写操作。专属 reviewer worktree 与只读复用的已有 worktree 都核对 origin 指向 PR base 仓库、HEAD 等于 PR head、base/head 对象存在，并审查 merge-base..head 的完整改动，而不是只看最新 commit。审查开始和提交报告前都要重新读取 PR base/head；head 变化后旧报告只覆盖旧提交。force push、rebase、base 更新或范围变化后，重新求 merge-base 并检查完整受影响面。

GitHub `pull_request` 的 CI 默认 checkout 是 base/head 的临时合并对象，代码 review 固定在 PR head。不能把 Actions run/check 关联用的 PR head SHA 当作 runner 实际测试的 checkout SHA。`gh pr checks --json` 不提供 head SHA；改用 run/check 对象或 check-runs API 核对关联的 head。required `check` 必须关联当前 PR head，并在实际执行快照与政策检查后成功；关联 SHA、base/head 或 step 结果不符时，不能证明当前输入已通过 CI。

## 审查内容与发现

检查需求和验收是否实现、行为与失败路径、公共契约、兼容性、测试质量、权限与用户输入安全、竞态、资源管理，以及文档与机检的一致性。指令或 context 改动另核四问：这段是稳定不变量还是外部状态快照？这个 concern 是否只有一个权威？这个 chunk 单独被检索时是否自包含？是否写入了会漂移的命令、路径、版本或实现清单？对每个发现给 `Block`、`Should fix` 或 `Nit`，并列当前文件行、影响、复现条件和证据。Block 未处理时不能给可合并结论；Should fix 若不修，须由维护者留下处置理由；Nit 不冒充阻断问题。无发现也要记录审查范围、验证证据和未覆盖风险。

## 报告、回写与复审

持久报告至少记录 PR URL、base/head SHA、reviewer 执行体、审查范围、发现及处置、验证命令与实际结果、未覆盖风险、结论，以及上一轮报告和本轮修复的对应关系。报告写入 PR review/comment 或编排器明确提供的持久交付记录；不得只留在临时目录，也不要提交到被审分支。

没有用户对 PR 外部写入的明确授权时，只交付本地报告，不调用写 API；授权机制见 [`workflow.md`](./workflow.md#怎么取得这个授权)。获得授权后使用绑定 reviewed head 的 `COMMENT` review，不自动 `APPROVE` 或 `REQUEST_CHANGES`。调用前重新读取 PR base/head，确认仍等于报告覆盖的 SHA；已漂移则先补审。检查 API 响应的 `commit_id`、state 与 `html_url`，并重读远端 base/head；失败或漂移时报告仍为待发布或旧版本。请求超时或中断时，先分页读取现有 reviews 并核对 `commit_id`、正文和 `html_url`，确认没有重复 review 后才重试。

实施者修复 Block/Should fix 后运行相关验证并推送需另获用户授权，机制见 [`workflow.md`](./workflow.md#怎么取得这个授权)。Reviewer 在新 head 上对照前一报告检查修复及受影响行为，更新完整 PR 结论和验证记录；未处理的 Block 不能靠 CI 变绿消除。

## 合并前与恢复

合并前重新读取当前 PR 状态、draft、base/head、冲突/mergeability、required checks、CI snapshot 记录的实际 checkout SHA、review 报告覆盖的 SHA、未决发现及 changeset 结果。strict 只要求 PR 跟上 base；squash 会产生新 commit，不能推断最终 main commit 与已测试 SHA 或树恒等。只有全部证据对应当前 base/head、没有未处置 Block、required CI 与硬约束成功、PR 非 draft 且可合并后，才向用户报告具体待合并 PR 和 SHA。每次 merge 需用户明确授权，机制见 [`workflow.md`](./workflow.md#怎么取得这个授权)。

获授权后以 squash 锁定已审查的 head；它不锁定 base，base 变化或 GitHub 拒绝时停止并重新核对。合并后核实 `state`、`mergedAt` 与 `mergeCommit`。不要用 `--admin` 绕过保护，也不要用无条件 `--auto` 代替当前证据。task 台账（见 `task-ledger` skill）的 `closed` 不代表 review、CI、merge 或发布成功。

网络或权限不足、无 PR、diff/对象不全、required CI 尚未运行/挂起/取消/跳过、review 未获授权回写或 API 失败、PR base/head 漂移、merge 中断，对应步骤都记录为未完成并保留 PR URL、base/head SHA、reviewer worktree、已验证证据、未完成步骤和上一轮报告引用。下次从这些实际状态继续；PR 创建前的本地预审不构成 PR review，缺失证据也不构成通过。

具体命令、字段与分页语义以 `gh` 手册和 GitHub REST / Actions 文档为准。

# 开发与协作工作流

本文件拥有从方案到合并的工作顺序、用户授权边界与跨阶段恢复。任务分级由 `task-levels.md` 决定；本地登记命令、schema 与 Task Packet 见 [`task-ledger.md`](task-ledger.md)；PR 审查、报告与合并前核验见 [`review.md`](review.md)；验证选择见 [`verification.md`](verification.md)；提交规则见 [`commit.md`](commit.md)。需求拆分、owner 与 worktree 分配由编排层（herdr-projects）负责，仓库 CLI 不承担编排。

## 从方案到合并

工作顺序是方案 → 实施与测试 → commit、push 并创建 PR → 独立 review 与按影响选择的端到端验收 → 修复并在新提交推送后复审 → 核对合并前证据并经用户明确授权后合并。实施、测试与提交可以小步交错迭代；PR 阶段的独立 review 和端到端验收可以并行。端到端验收按变更影响选择，不要求 T2 或所有任务一律执行。

合并前的 review、测试和 CI 证据必须对应当前 PR base/head。这里描述的是工作顺序，不对应 task CLI 的相位，也不把 review、测试或 CI 结论写回本地台账。review 细节由 `review.md` 承担，验证深度由 `verification.md` 决定。

适用的单元/组件测试、全量 workspace 测试、仓库脚本测试与构建应在实施完成后、交付 PR 前通过；小步提交按影响重跑相关项，不要求每次完整重跑。PR CI 对当前 base/head 复检，不替代实施阶段的验证证据。需要的真实 E2E、探索式或真机验收可在 PR 阶段与独立 review 并行，必需项须在合并前完成。

## 预授权操作

以下操作无需逐次确认，可以直接执行；本次改动造成的失败也可以直接修复：

- 运行仓库既有测试和检查：`pnpm test`、`pnpm ci:test-scripts`、包级 `test`、`pnpm check-code`、`pnpm check-cspell`、`pnpm ci:validate-context`、`pnpm ci:check-policies`。
- 修复本次改动导致的失败并重跑受影响的测试。
- 包级 build 与 `pnpm run build`。
- 只读查询：contract-change-review skill 的 `repo-query.mjs`（`verify` / `contract` / `contract-diff`）、`pnpm agent:task-ledger status --task <id>`、`git status`、`git diff`、`git log`。
- 在目标 worktree 内读取任意文件。
- 删除 `/tmp` 等系统临时目录下的内容。

以下操作仍须逐次获得用户明确授权：

- 关键 Git 操作：commit、push、开 PR、merge、tag，以及删除分支或远端资源。
- Monorepo 架构，例如：新增或删除依赖（含 catalog、lockfile 的任何改动）、新增或删除根目录脚本、调整根目录配置文件（含 `.npmrc`、`.mise.toml` 与 Git 配置）、新增或删除 GitHub workflow。
- 发布：publish、release。
- 凭证、密钥和 `.env` 的读写。
- 破坏性操作：`reset --hard`、`push --force`、`clean`、`stash`、`rm -rf`（系统临时目录下的删除除外）。

### 怎么取得这个授权

**用交互式问答弹窗，不要用纯文本提问；先说明，再让用户选。** 本仓各客户端会话里用的是宿主提供的那个问答弹窗工具。若它已带推荐项标注与自定义输入框，直接用；否则按下面的形状自己补齐，不要因为工具没有内建就跳过其中一项。

弹窗正文先按顺序写清四项：

1. 一句话总结这次改了什么，或要执行什么操作；
2. 为什么要做（关联的 task、issue 或要解决的问题）；
3. 具体怎么执行（命令、影响范围、不可逆点）；
4. 预期效果；已有验证的给结论，未验证的明说。再列风险、隐患和可替代做法，没有就写「无」。

然后把待决事项做成选项，每一项标注哪一项是推荐项，并始终保留一个自定义输入项，让用户能给出上面清单之外的答案。说明四项齐全，且选项侧三个要求（选项化、推荐项有标注、自定义输入项存在）同时成立，才算合规。

弹窗只是把选择摆出来，不代替授权本身——用户点了推荐项才是授权，弹窗自己返回不算。环境不提供弹窗时（例如非交互式 harness），把四项说明、待决事项和推荐项写进正文，然后停下等指示；**没有回答不等于同意**，不得因为拿不到弹窗就把推荐项当成已授权。

这条是全文所有「需用户明确授权」「先询问用户」的唯一机制来源：其他文档只声明该处需要授权并指向这里，不复述这个形状。唯一的例外是操作系统的权限对话框——那种授权发生在系统设置里，不走本流程；`runtime-verification.md` 的 macOS 辅助功能与屏幕录制授权属于那一类。

## 跨阶段恢复

- 方案或范围变化时，先更新 Task Packet 的目标、非目标、验收与验证计划，再继续实施。
- 验证失败时保留真实输出，修复对应原因并重跑受影响的检查；实施阶段的证据与 PR 阶段的独立审查各自记录，不相互代替。
- PR 的 base/head 或内容发生变化后，重新核对对应的 CI 与 review 覆盖范围。新提交推送后，reviewer 按最新 diff 复审；具体 SHA、报告和并发变化处理见 `review.md`。
- session 中断时，先读取 Task Packet 和真实 Git 状态；本地 task 台账只辅助恢复 owner、worktree 和进度，不能补造已通过的验证、review 或 CI。
- 完成合并前核验后，仍须在会话里取得明确 merge 授权；授权前保留可检查的 diff 与证据。

release playbook、changeset 与发布链验证见 `release.md`。流程拆分、PR 跟进与 worktree 回收由编排层负责。

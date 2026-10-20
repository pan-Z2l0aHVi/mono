# 发布流程

本文件规定仓库侧的 changeset 与发布验证。PR review、required CI 和用户 merge 授权见 [`review.md`](./review.md) 与 [`workflow.md`](./workflow.md)。task 级别按实际改动影响判定，不因进入 release 流程而变化；分级与台账见 `task-ledger` skill。

## Changesets

Changesets 同时管理 npm 包、私有 app 与桌面端 release 驱动版本。按改动位置选择声明：

- 公共 npm 包：声明行为有变化的包与 `patch`、`minor` 或 `major`。
- 私有但参与版本管理的包：需要版本变化时声明；不进入 npm 发布。
- 桌面端应用：声明其版本驱动 release；被 ignore 的 frontend 或 demo 包永不声明。
- 只有 docs / test / chore 或根路径改动：写空壳 changeset。

不要声明 `.changeset/config.json` 的 `ignore` 表；被忽略的声明不会 bump 版本，也不会被版本 PR 删除。`private: true` 只关闭 npm 发布，不等于退出 Changesets 版本管理。Changeset 描述使用英文，因为它会进入面向 npm 用户的 CHANGELOG。空壳 changeset 只含两行 `---`；退役公开包时另用不声明包的正文点名。

PR CI 对 PR base/head 执行 changeset gate；main 已有的 changeset、删除的文件、staged 或未提交文件都不构成声明。版本分支由 workflow 豁免；本地 pre-commit 政策检查不运行该检查。

## 步骤

1. 确认 Task Packet（见 `task-ledger` skill）描述实际交付内容；需要本地仓库政策检查时按 [`commit.md`](./commit.md) 运行五项只读检查，pre-commit 会在提交时执行同一组。
2. 按 [`verification.md`](./verification.md) 选择并实际运行相关测试、构建、契约与必要的浏览器验证。
3. 创建 PR 后确认 required `check` 覆盖当前 base/head 且 changeset policy 通过；再按 [`review.md`](./review.md) 完成独立 review。CI 成功不能代替 review 报告。
4. merge 需用户明确授权，机制见 [`workflow.md`](./workflow.md#怎么取得这个授权)。合并后如需复检 main CI，手动触发；有版本变更时，再验证 changesets 版本 PR、合并与 npm / Wails 发布链。
5. 按 `task-ledger` skill 更新本地台账；`close` 不代替 CI、review 或发布证据。

PR CI 的机械性修复由对应 task owner 处理；逻辑、测试和契约问题由原 owner 修复。每次新提交都由 reviewer 按新 head 检查受影响 diff。

## npm 发布重跑与 release notes

`prepare` 从 merge commit 检测本次版本化的公共包，把包名、版本与目录作为 job 输出传给后续 job；不产生 receipt 或可复用的中间产物。`publish` 成功后 `release-notes` 才运行，逐个候选包查询官方 npm registry，用有限退避重试；仍查不到版本时整体失败，不创建 GitHub Release，也不把该版本当作已发布。已存在且指向当前 merge SHA 的 published release 直接跳过并记录；指向其它 SHA 或仍为 draft 时失败。新建 release 后重新读取并核对 draft 状态与 tag 指向。重跑按当前 merge commit 重新检测候选包，因此重复执行是幂等的，但不能据此推算历史上是否发布过。workflow 按仓库串行，后一次运行排队而非取消前一次。

## Wails desktop release 恢复

native build 前 `prepare` 只读检查 release 与 tag：release 已存在时直接失败并拒绝修改；release 不存在时，tag 不存在，或 tag 为 annotated 且指向当前 merge SHA，才继续构建。`publish` 组装两平台产物与 checksums，缺 tag 时创建 annotated tag，再以 `--verify-tag` 创建 release，随后核对 draft 状态、tag 类型与 SHA、资产集合、大小，以及 GitHub 提供的 digest 与本次构建产物一致。

流程不创建 draft，也没有 marker 或自动删除/恢复路径。build job 重跑会以 `overwrite` 覆盖同名 artifact；publish 若在 release 已创建后失败，重跑会因「已存在 release」被拒绝，需要人工核对 tag、release 与资产状态后决定处置，不能自动清理后重建。

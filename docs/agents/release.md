# 发布流程

本文件规定仓库侧的 changeset 与发布验证。PR review、required CI 和用户 merge 授权见 [`review.md`](review.md) 与 `workflow.md`。task 级别按实际改动影响判定，不因进入 release 流程而变化。

## Changesets

Changesets 同时管理 npm 包、私有 app 与桌面端 release 驱动版本。按改动位置选择声明：

- 公共 npm 包：声明行为有变化的包与 `patch`、`minor` 或 `major`。
- 私有但参与版本管理的包：需要版本变化时声明；不进入 npm 发布。
- 桌面端应用：声明其版本驱动 release；被 ignore 的 frontend 或 demo 包永不声明。
- 只有 docs / test / chore 或根路径改动：写空壳 changeset。

不要声明 `.changeset/config.json` 的 `ignore` 表；被忽略的声明不会 bump 版本，也不会被版本 PR 删除。`private: true` 只关闭 npm 发布，不等于退出 Changesets 版本管理。Changeset 描述使用英文，因为它会进入面向 npm 用户的 CHANGELOG。空壳 changeset 只含两行 `---`；退役公开包时另用不声明包的正文点名。

PR CI 对 PR base/head 执行 changeset gate；main 已有的 changeset、删除的文件、staged 或未提交文件都不构成声明。版本分支由 workflow 豁免；本地 `ci:check-policies` 不运行该检查。

## 步骤

1. 确认 Task Packet 描述实际交付内容；需要本地仓库政策检查时运行 `ci:check-policies`。
2. 按 [`verification.md`](verification.md) 选择并实际运行相关测试、构建、契约与必要的浏览器验证。
3. 创建 PR 后确认 required `check` 覆盖当前 base/head 且 changeset policy 通过；再按 [`review.md`](review.md) 完成独立 review。CI 成功不能代替 review 报告。
4. merge 需用户明确授权。合并后如需复检 main CI，手动触发；有版本变更时，再验证 changesets 版本 PR、合并与 npm / Wails 发布链。
5. 按 `task-ledger.md` 更新本地台账；`close` 不代替 CI、review 或发布证据。

PR CI 的机械性修复由对应 task owner 处理；逻辑、测试和契约问题由原 owner 修复。每次新提交都由 reviewer 按新 head 检查受影响 diff。

## npm 发布重跑与 release notes

发布前查询官方 npm registry 的精确包名和版本；receipt 只记录尚不存在的本地公共包版本，并绑定仓库、merge SHA 与 run ID。首次尝试上传 receipt，后续重跑只在 receipt 仍可读取时复用它。receipt 缺失或下载失败时安全失败，不重新计算候选集合；停止重试，人工核对发布日志与 registry 状态后审定恢复方式。release-notes 从 merge SHA、run ID 与 receipt 独立恢复候选包，因此可以单独重跑。publish 成功后对 registry 做有限重试；包没有出现在本次 receipt 中时，不创建 GitHub Release。整个 workflow 按仓库串行运行。

## Wails desktop release 恢复

native build 前先只读检查已发布 release：只有 annotated tag 指向当前 merge SHA，且资产与 checksums 完整并通过校验时，才跳过重建。新发布先创建带当前仓库、merge SHA 与 run ID marker 的 draft，上传本轮两平台产物及 checksums；发布前逐项核对 digest 或下载后的 SHA-256。重跑只自动删除 marker 完全匹配的本 run draft，删除前重读 Release 与 tag，删除后确认原 tag 仍指向 merge SHA。失败 job 重跑上传同名资产会覆盖该平台此前的成功产物；publish 使用各平台最近成功上传的文件并重新生成 checksums。

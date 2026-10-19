# 发布流程

本文件规定仓库侧的 changeset 与发布验证。PR review、required CI 和用户 merge 授权见 [`review.md`](review.md) 与 `docs/agents/workflow.md`。task 级别按实际改动影响判定，不因进入 release 流程而变化。

## Changesets

Changesets 同时管理 npm 包、私有 app 与桌面端 release 驱动版本。按改动位置选择声明：

| 改动位置                                                                                   | 是否发布                                                                                 | Changeset 写法                                                                                                                |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 公共 npm 包（`browser-kit`、`deps-reload`、`js-kit`、`unplugin-web-components`、`web-ui`） | 发布到 npm                                                                               | 声明行为有变化的对应包，选择 `patch`、`minor` 或 `major`。                                                                    |
| 私有基础包（`test-kit`、`tsconfig`、`md-to-comp`）                                         | 不发布到 npm；`privatePackages.version` 仍启用版本更新，且不创建 Changesets Git 版本标签 | 需要版本变化时声明对应包；私有包不进入 npm 发布。                                                                             |
| `apps/interweave`（不含下行 `frontend`）                                                   | 不发布到 npm；版本驱动桌面端 release                                                     | 声明 `@greypan/interweave`，选择版本级别。                                                                                    |
| `apps/interweave/frontend`                                                                 | 不发布到 npm；`@greypan/interweave-frontend` 在 ignore 表中，版本固定                    | 对 app 行为或产物有用户可感知影响的改动声明 `@greypan/interweave`；仅测试和测试助手改动写空壳。永不声明被忽略的 frontend 包。 |
| React/Vue Web UI demo app                                                                  | 不发布到 npm；包在 ignore 表中                                                           | 一律写空壳，不声明被忽略的 demo 包。                                                                                          |
| 其他根目录路径                                                                             | 不产生包版本                                                                             | 纯 test/docs/chore 改动写空壳。                                                                                               |

不要声明 `.changeset/config.json` 的 `ignore` 表中的包。被忽略的声明不会 bump 版本，版本 PR 也不会删除它，文件会永久滞留。`private: true` 只关闭 npm 发布，不等于退出 Changesets 版本管理；本仓库的 `privatePackages.version: true` 会继续更新私有包版本，`tag: false` 不为私有包创建 Changesets Git 版本标签。桌面端二进制的发布标签由 Wails 工作流创建。

Changeset 描述使用英文，因为它会进入面向 npm 用户的 CHANGELOG。纯 test/docs/chore 等无包版本影响的改动创建空壳：`.changeset/<kebab-name>.md` 仅含两行 `---`，frontmatter 不写包名或版本号。把既有公开包转为私有时也不 bump 版本，但应另用不声明包的 changeset 正文点名退役包，留下发布面变更记录。

PR CI 的 `Check changesets` 保留 `changeset status`，并调用 `.agents/checks/changeset-required --base "$PR_BASE_SHA" --head "$PR_HEAD_SHA"`。该检查验证 PR base/head 都是 commit，以 merge-base..head 的提交差集枚举新增、修改和重命名的 changeset，从 PR head tree 读取声明内容。main 已有的 changeset、PR 删除的文件、staged 或未提交文件都不构成 PR 声明。每条声明都校验文件名、成对 frontmatter、正文和 ignore 包；读取 head 的 changeset 配置失败会 fail closed。`changeset-release/main` 版本分支由 workflow 豁免；workflow_dispatch 没有 PR base/head 时会跳过 PR 专项检查。该政策只在 PR CI 中执行，不由 pre-commit 或本地 `ci:check-policies` 判断。

## 步骤

1. 确认 task 台账与 Task Packet 描述实际交付内容；需要本地仓库政策检查时运行 `mise exec -- pnpm ci:check-policies`。登记簿只记归属和进度，不执行 checks。
2. 按 [`verification.md`](verification.md) 选择并实际运行相关测试、构建、契约与必要的浏览器验证。
3. 创建 PR 后确认 required `check` 的 run snapshot 覆盖当前 PR base/head 且所有硬约束成功，并确认 changeset policy 对同一 base/head 通过；再按 [`review.md`](review.md) 完成独立 review。报告须覆盖当前 base/head SHA 且没有未处置的 Block；ruleset 不强制 review，不能以 CI 或台账代替报告。
4. merge 需用户明确授权。合并后如需复检 `main` CI，使用 `workflow_dispatch` 手动运行；有版本变更时，再验证 changesets 版本 PR、合并与 npm/Wails 发布链。
5. 完成相应交付后按 `task-ledger.md` 更新本地台账；`close` 不代替 CI、review 或发布证据。

PR CI 的机械性修复由对应 task owner 处理；逻辑、测试和契约问题由原 owner 修复。每次新提交都由 reviewer 按新 head 检查受影响 diff，并更新完整 PR 结论。

## npm 发布重跑与 release notes

`npm-publish.yml` 在发布前查询官方 npm registry 的精确包名和版本。receipt 只记录此时尚不存在的本地公共包版本，并绑定仓库、merge SHA 与 workflow run ID。首次尝试把 receipt 上传为该 run 的 artifact，设置 30 天 retention。

一次隔离 probe 中，prepare 首轮成功后，`rerun failed jobs` 复用了原 receipt；`release-notes` 单独重跑也要求原 receipt 仍可读取。同一 probe 的 `rerun all` 中，prepare 无法下载首轮 artifact；不能依赖 30 天 retention 保证全量重跑可恢复。首次上传前失败或重跑后 receipt 下载失败时，流程安全失败、不重新计算候选集合；应停止重试，人工核对原发布日志与官方 registry 状态后审定恢复方式。这样首次尝试发布过的补发包仍留在记录中，已存在的 diff 包不会被错误归到当前 merge。

release-notes job 从 PR merge SHA、run ID 与仍可读取的 receipt 独立恢复候选包，因此可以单独重跑；它不依赖 publish job outputs。若 `rerun all` 后原 receipt 已不可用，该 job 会安全失败，不重算候选集合。publish 成功后，job 对官方 registry 的精确版本查询做有限重试；仍未出现的版本会让记录 job 失败。publish 明确失败时，job 只为 registry 已确认存在的候选版本创建记录，原发布 job 仍保持失败。包没有出现在本次 receipt 中时，不创建虚假的 GitHub Release。

整个 npm publish workflow 按仓库串行运行，等待时不取消旧 run。`queue: max` 最多保留 100 个待运行项，GitHub 不承诺按事件先后顺序执行。

## Wails desktop release 恢复

`wails-release.yml` 在 native build 前读取版本对应的 GitHub Release 与 tag。只有 annotated tag 指向当前 merge SHA，且 Release 恰有预期 DMG、EXE 与 checksums 并通过校验时，prepare 才跳过 native build。已发布资产按 GitHub API digest 校验；缺少 digest 时下载对应二进制计算 SHA-256。published release 不与之后重建的本地文件比较。

新发布先创建包含当前仓库、merge SHA 与 run ID marker 的 draft，使用 GitHub 生成的 release notes 上传本轮两平台产物及 checksums。发布前必须将 API digest 或下载后的 SHA-256 与本轮本地文件逐项核对。重跑只自动删除 marker 完全匹配的本 run draft；删除前重读 Release 与 tag，删除后确认原 annotated tag 仍指向 merge SHA，再用本轮完整产物创建新 draft。缺失或错误 tag、未标记 draft、资产不完整的 published release 与非 404 API 错误都会失败，需人工处理后再运行。

两平台 artifact 使用固定名称并保留 30 天，均来自同一 run 与 merge SHA。失败 job 重跑上传同名 artifact 时会覆盖该平台此前的成功产物；publish 使用各平台最近成功上传的文件，并重新生成 checksums，不要求产物来自相同的 `run_attempt`。只有 draft asset 与本轮实际下载到的文件匹配后才发布。

# 发布流程

本文件规定仓库侧的 changeset 与发布验证。PR review、required CI 和用户 merge 授权见 [`review.md`](review.md) 与 `docs/agents/workflow.md`。task 级别按实际改动影响判定，不因进入 release 流程而变化。

## Changesets

Changesets 同时管理 npm 包、私有 app 与桌面端 release 驱动版本。按改动位置选择声明：

| 改动位置                                 | 是否发布                                                              | Changeset 写法                                                                                                                |
| ---------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `packages/*`                             | 发布到 npm                                                            | 声明行为有变化的对应包，选择 `patch`、`minor` 或 `major`。                                                                    |
| `apps/interweave`（不含下行 `frontend`） | 不发布到 npm；版本驱动桌面端 release                                  | 声明 `@greypan/interweave`，选择版本级别。                                                                                    |
| `apps/interweave/frontend`               | 不发布到 npm；`@greypan/interweave-frontend` 在 ignore 表中，版本固定 | 对 app 行为或产物有用户可感知影响的改动声明 `@greypan/interweave`；仅测试和测试助手改动写空壳。永不声明被忽略的 frontend 包。 |
| React/Vue Web UI demo app                | 不发布到 npm；包在 ignore 表中                                        | 一律写空壳，不声明被忽略的 demo 包。                                                                                          |
| 其他根目录路径                           | 不产生包版本                                                          | 纯 test/docs/chore 改动写空壳。                                                                                               |

不要声明 `.changeset/config.json` 的 `ignore` 表中的包。被忽略的声明不会 bump 版本，版本 PR 也不会删除它，文件会永久滞留。私有包不打 npm 发布标签；桌面端二进制的发布标签由 Wails 工作流创建。

Changeset 描述使用英文，因为它会进入面向 npm 用户的 CHANGELOG。无包版本影响的改动创建空壳：`.changeset/<kebab-name>.md` 仅含两行 `---`，frontmatter 不写包名或版本号。

PR CI 的 `Check changesets` 保留 `changeset status`，并调用 `.agents/checks/changeset-required --base "$PR_BASE_SHA" --head "$PR_HEAD_SHA"`。该检查验证 PR base/head 都是 commit，以 merge-base..head 的提交差集枚举新增、修改和重命名的 changeset，从 PR head tree 读取声明内容。main 已有的 changeset、PR 删除的文件、staged 或未提交文件都不构成 PR 声明。每条声明都校验文件名、成对 frontmatter、正文和 ignore 包；读取 head 的 changeset 配置失败会 fail closed。`changeset-release/main` 版本分支由 workflow 豁免；workflow_dispatch 没有 PR base/head 时会跳过 PR 专项检查。该政策只在 PR CI 中执行，不由 pre-commit 或本地 `ci:check-policies` 判断。

## 步骤

1. 确认 task 台账与 Task Packet 描述实际交付内容；需要本地仓库政策检查时运行 `mise exec -- pnpm ci:check-policies`。登记簿只记归属和进度，不执行 checks。
2. 按 [`verification.md`](verification.md) 选择并实际运行相关测试、构建、契约与必要的浏览器验证。
3. 创建 PR 后确认 required `check` 的 run snapshot 覆盖当前 PR base/head 且所有硬约束成功，并确认 changeset policy 对同一 base/head 通过；再按 [`review.md`](review.md) 完成独立 review。报告须覆盖当前 base/head SHA 且没有未处置的 Block；ruleset 不强制 review，不能以 CI 或台账代替报告。
4. merge 需用户明确授权。合并后如需复检 `main` CI，使用 `workflow_dispatch` 手动运行；有版本变更时，再验证 changesets 版本 PR、合并与 npm/Wails 发布链。
5. 完成相应交付后按 `task-ledger.md` 更新本地台账；`close` 不代替 CI、review 或发布证据。

PR CI 的机械性修复由对应 task owner 处理；逻辑、测试和契约问题由原 owner 修复。每次新提交都由 reviewer 按新 head 检查受影响 diff，并更新完整 PR 结论。

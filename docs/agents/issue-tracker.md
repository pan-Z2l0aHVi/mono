# Issue 跟踪器：GitHub

本仓库的 issue 和 PRD 以 GitHub issue 形式存储。所有操作使用 `gh` CLI 完成。

## 约定

- **创建 issue**：`gh issue create --title "..." --body "..."`。多行内容使用 heredoc。
- **查看 issue**：`gh issue view <number> --comments`，使用 `jq` 过滤评论并获取标签。
- **列出 issue**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，配合适当的 `--label` 和 `--state` 过滤器。
- **在 issue 上评论**：`gh issue comment <number> --body "..."`
- **添加/移除标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭**：`gh issue close <number> --comment "..."`

通过 `git remote -v` 推断仓库信息——`gh` 在 clone 目录内运行时会自动识别。

## Pull request 作为分诊入口

**PR 作为请求入口：否**。_（如果本仓库将外部 PR 视为功能请求，则设为 `yes`；`/triage` 会读取此标志。）_

设为 `yes` 时，PR 与 issue 使用相同的标签和状态，使用 `gh pr` 等效命令：

- **查看 PR**：`gh pr view <number> --comments` 和 `gh pr diff <number>` 查看差异。
- **列出待分诊的外部 PR**：`gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`，然后仅保留 `authorAssociation` 为 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR` 或 `NONE` 的记录（排除 `OWNER`/`MEMBER`/`COLLABORATOR`）。
- **评论/标签/关闭**：`gh pr comment`、`gh pr edit --add-label`/`--remove-label`、`gh pr close`。

GitHub 的 issue 和 PR 共享编号空间，因此裸 `#42` 可能是 issue 也可能是 PR——通过 `gh pr view 42` 解析，若不存在则回退到 `gh issue view 42`。

## 当技能说"发布到 issue 跟踪器"

创建一个 GitHub issue。

## 当技能说"获取相关工单"

运行 `gh issue view <number> --comments`。

## 导航操作

供 `/wayfinder` 使用。**地图**是一个 issue，其**子** issue 作为工单。

- **地图**：一个标记为 `wayfinder:map` 的 issue，包含备注 / 当前决策 / 迷雾内容。`gh issue create --label wayfinder:map`。
- **子工单**：链接到地图的 issue，作为 GitHub 子 issue（通过 `gh api` 调用子 issue 端点）。若子 issue 功能不可用，将子工单添加到地图正文的任务列表中，并在子工单正文顶部写上 `Part of #<map>`。标签：`wayfinder:<type>`（`research`/`prototype`/`grilling`/`task`）。认领后，工单分配给主导开发者。
- **阻塞**：GitHub 的**原生 issue 依赖关系**——这是规范的、UI 可见的表示方式。使用 `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>` 添加边，其中 `<blocker-db-id>` 是阻塞者数值型 **database id**（`gh api repos/<owner>/<repo>/issues/<n> --jq .id`，注意不是 `#number` 或 `node_id`）。GitHub 报告 `issue_dependencies_summary.blocked_by`（仅 open 的阻塞者——即实时门控）。在依赖功能不可用时，回退到在子工单正文顶部写 `Blocked by: #<n>, #<n>`。当所有阻塞者关闭后，工单解除阻塞。
- **前沿查询**：列出地图的 open 子 issue（`gh issue list --state open`，限定在地图的子 issue / 任务列表范围内），排除有 open 阻塞者的（`issue_dependencies_summary.blocked_by > 0`，或 `Blocked by` 行中有 open issue）或已分配的；按地图顺序优先。
- **认领**：`gh issue edit <n> --add-assignee @me`——会话中的第一次写入。
- **解决**：`gh issue comment <n> --body "<answer>"`，然后 `gh issue close <n>`，再在地图的"当前决策"部分追加上下文指针（gist + 链接）。

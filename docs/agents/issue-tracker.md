# Issue 跟踪器：GitHub

本仓库的 issue 和 PRD 以 GitHub issue 形式存储。所有操作使用 GitHub MCP 工具完成。

## 工具参考

MCP 工具命名空间：`mcp__github__`

| 操作 | 工具 | 关键参数 |
|------|------|----------|
| 创建 issue | `create_issue` | owner, repo, title, body?, labels? |
| 查看 issue | `get_issue` | owner, repo, issue_number |
| 列出 issue | `list_issues` | owner, repo, state?, labels?, sort? |
| 评论 | `add_issue_comment` | owner, repo, issue_number, body |
| 更新 issue | `update_issue` | owner, repo, issue_number, state?, labels?, assignees? |
| 创建 PR | `create_pull_request` | owner, repo, title, head, base, body? |
| 查看 PR | `get_pull_request` | owner, repo, pull_number |
| 列出 PR | `list_pull_requests` | owner, repo, state?, base? |
| PR 审查 | `create_pull_request_review` | owner, repo, pull_number, body, event |
| 合并 PR | `merge_pull_request` | owner, repo, pull_number, merge_method? |
| 搜索仓库 | `search_repositories` | query, perPage? |
| 搜索代码 | `search_code` | q |
| 搜索 issue | `search_issues` | q, sort? |

## 约定

- **创建 issue**：调用 `create_issue`，传入 owner、repo、title 和 body。labels 通过数组传入。
- **查看 issue**：调用 `get_issue`，返回 issue 详情（含标签、评论）。
- **列出 issue**：调用 `list_issues`，使用 state、labels、sort 过滤。
- **在 issue 上评论**：调用 `add_issue_comment`。
- **添加/移除标签**：调用 `update_issue`，传入 labels 数组。
- **关闭 issue**：调用 `update_issue`，设置 state="closed"。

仓库信息从 `git remote -v` 推断，格式为 `owner/repo`。

## Pull request 作为分诊入口

**PR 作为请求入口：否**。_（如果本仓库将外部 PR 视为功能请求，则设为 `yes`；`/triage` 会读取此标志。）_

设为 `yes` 时，PR 与 issue 使用相同的标签和状态：

- **查看 PR**：调用 `get_pull_request` 获取详情，调用 `get_pull_request_files` 查看变更文件。
- **列出待分诊的外部 PR**：调用 `list_pull_requests`，过滤外部贡献者。
- **评论/审查/关闭**：调用 `create_pull_request_review`、`update_issue`（设置 state）。

GitHub 的 issue 和 PR 共享编号空间，因此裸 `#42` 可能是 issue 也可能是 PR——通过 `get_pull_request` 尝试解析，若不存在则回退到 `get_issue`。

## 当技能说"发布到 issue 跟踪器"

调用 `create_issue` 创建 GitHub issue。

## 当技能说"获取相关工单"

调用 `get_issue` 获取 issue 详情（含评论）。

## 导航操作

供 `/wayfinder` 使用。**地图**是一个 issue，其**子** issue 作为工单。

- **地图**：一个标记为 `wayfinder:map` 的 issue，包含备注 / 当前决策 / 迷雾内容。调用 `create_issue` 并传入 labels=["wayfinder:map"]。
- **子工单**：链接到地图的 issue，作为 GitHub 子 issue（通过 MCP 工具创建）。若子 issue 功能不可用，将子工单添加到地图正文的任务列表中，并在子工单正文顶部写上 `Part of #<map>`。标签：`wayfinder:<type>`（`research`/`prototype`/`grilling`/`task`）。认领后，工单分配给主导开发者。
- **阻塞**：GitHub 的**原生 issue 依赖关系**——这是规范的、UI 可见的表示方式。在依赖功能不可用时，回退到在子工单正文顶部写 `Blocked by: #<n>, #<n>`。当所有阻塞者关闭后，工单解除阻塞。
- **前沿查询**：列出地图的 open 子 issue（调用 `list_issues`），排除有 open 阻塞者的或已分配的；按地图顺序优先。
- **认领**：调用 `update_issue`，设置 assignees=["@me"]——会话中的第一次写入。
- **解决**：调用 `add_issue_comment` 添加解答，然后调用 `update_issue` 设置 state="closed"，再在地图的"当前决策"部分追加上下文指针（gist + 链接）。

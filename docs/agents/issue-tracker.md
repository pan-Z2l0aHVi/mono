# Issue 跟踪器：GitHub

本仓库的 issue 和 PRD 以 GitHub issue 形式存储。所有操作使用 GitHub MCP 工具完成。

前置条件：客户端需已配置 GitHub MCP（工具命名空间 `mcp__github__`）；本仓库不提供该配置，缺失时本指南不适用。

## 工具参考

MCP 工具命名空间：`mcp__github__`

| 操作       | 工具                         | 关键参数                                               |
| ---------- | ---------------------------- | ------------------------------------------------------ |
| 创建 issue | `create_issue`               | owner, repo, title, body?, labels?                     |
| 查看 issue | `get_issue`                  | owner, repo, issue_number                              |
| 列出 issue | `list_issues`                | owner, repo, state?, labels?, sort?                    |
| 评论       | `add_issue_comment`          | owner, repo, issue_number, body                        |
| 更新 issue | `update_issue`               | owner, repo, issue_number, state?, labels?, assignees? |
| 创建 PR    | `create_pull_request`        | owner, repo, title, head, base, body?                  |
| 查看 PR    | `get_pull_request`           | owner, repo, pull_number                               |
| 列出 PR    | `list_pull_requests`         | owner, repo, state?, base?                             |
| PR 审查    | `create_pull_request_review` | owner, repo, pull_number, body, event                  |
| 合并 PR    | `merge_pull_request`         | owner, repo, pull_number, merge_method?                |
| 搜索仓库   | `search_repositories`        | query, perPage?                                        |
| 搜索代码   | `search_code`                | q                                                      |
| 搜索 issue | `search_issues`              | q, sort?                                               |

## 约定

- **创建 issue**：调用 `create_issue`，传入 owner、repo、title 和 body；必须传入至少一个有效 label，否则无法按需求类型或领域筛选。若创建时 label 缺失或写入失败，立即用 `update_issue` 补齐后再交付 issue 链接。labels 通过数组传入。
- **查看 issue**：调用 `get_issue`，返回 issue 详情（含标签、评论）。
- **列出 issue**：调用 `list_issues`，使用 state、labels、sort 过滤。
- **在 issue 上评论**：调用 `add_issue_comment`。
- **添加/移除标签**：调用 `update_issue`，传入 labels 数组。
- **关闭 issue**：调用 `update_issue`，设置 state="closed"。

仓库信息从 `git remote -v` 推断，格式为 `owner/repo`。

## Pull request 与 issue 的关系

本仓库不把外部 PR 作为功能请求入口，用户级命令 `/triage`（非仓库内资产）不在本仓库启用 PR 分诊。注意 GitHub 的 issue 和 PR 共享编号空间：裸 `#42` 可能是 issue 也可能是 PR——先用 `get_pull_request` 尝试解析，不存在再回退 `get_issue`。

## 当技能说「发布到 issue 跟踪器」

调用 `create_issue` 创建 GitHub issue。

## 当技能说「获取相关工单」

调用 `get_issue` 获取 issue 详情（含评论）。

## 导航操作

供用户级命令 `/wayfinder`（非仓库内资产）使用。**地图**是一个 issue，其**子** issue 作为工单。

- **地图**：一个标记为 `wayfinder:map` 的 issue，包含备注 / 当前决策 / 迷雾内容。调用 `create_issue` 并传入 labels=["wayfinder:map"]。
- **子工单**：链接到地图的 issue，作为 GitHub 子 issue（通过 MCP 工具创建）。若子 issue 功能不可用，将子工单添加到地图正文的任务列表中，并在子工单正文顶部写上 `Part of #<map>`。标签：`wayfinder:<type>`（`research`/`prototype`/`grilling`/`task`）。认领后，工单分配给主导开发者。
- **阻塞**：GitHub 的**原生 issue 依赖关系**——这是规范的、UI 可见的表示方式。在依赖功能不可用时，回退到在子工单正文顶部写 `Blocked by: #<n>, #<n>`。当所有阻塞者关闭后，工单解除阻塞。
- **前沿查询**：列出地图的 open 子 issue（调用 `list_issues`），排除有 open 阻塞者的或已分配的；按地图顺序优先。
- **认领**：调用 `update_issue`，设置 assignees=["@me"]——会话中的第一次写入。
- **解决**：调用 `add_issue_comment` 添加解答，然后调用 `update_issue` 设置 state="closed"，再在地图的「当前决策」部分追加上下文指针（gist + 链接）。

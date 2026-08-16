# ADR-0028: Interweave 标签操作仅作用于单个 Resource

- **Date**: 2026-08-16
- **Status**: 已接受

## 背景

PRD 早期基线提到了标签的全局重命名与全局删除。但 v1 是本地优先的轻量资源库，没有独立标签管理后台或知识图谱编辑器；用户主要在资源详情或 Map 展开节点中对单个 Resource 维护组织上下文。全局标签管理入口会增加不必要的控制面与状态协调成本。

## 决策

v1 不提供全局标签管理面板，不提供全局标签重命名、全局删除或标签合并入口。

所有对标签的操作均以具体 Resource 为作用域：用户只能在某个 Resource 上添加或移除标签（即创建或删除 `Tagging`）。若用户需要“改名”或“合并”，流程为：在目标 Resource 上移除旧标签，并添加标准化后的新标签。

Tag 实体自身在创建后其名称不可变。当一个 Tag 不再被任何 Resource 引用时，由后端在内部安全回收或保留为 0 引用孤立数据，不对外暴露管理接口。

## 后果

- Wails-facing API 与 frontend 无需暴露 `RenameTag`、`DeleteTagGlobally` 等全局维护接口。
- 标签写操作完全收敛为 `AddTagToResource` 与 `RemoveTagFromResource`（或对应的 Resource 标签集合更新）。
- ADR-0027 仍有效保证了 Tag 的稳定内部身份与 `Tagging` 关系，但“重命名”场景在 v1 不再存在。
- 任何未来引入的全局标签治理或批量重构功能均需单独评估并新增 ADR。

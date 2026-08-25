# ADR-0024: Interweave Resource 的 Source 基数与首选规则

- **Date**: 2026-08-16
- **Status**: 已接受

## 背景

Resource 通过 Source 连接外部内容。多个 Source 是同一 Resource 的备用或替代访问入口，而首选 Source 决定默认打开哪个入口。若允许 Resource 没有 Source，或在首选删除后不确定回退目标，Resource 的核心外部引用会失去明确语义。

## 决策

每个 Resource 必须始终至少拥有一个 Source，Source 是否 `available` 不影响这一基数约束。

新建 Resource 时，首个 Source 自动成为首选 Source。之后新增 Source 不自动改变首选 Source；用户可显式切换首选 Source。

删除首选 Source 且仍有其他 Source 时，按 Source 的添加顺位选择最早添加的剩余 Source 作为新的首选 Source。Source 添加顺位必须作为稳定的领域数据保存，不依赖查询结果的偶然排序。

产品为每个 Source 提供一个一键替换入口。替换必须是原子操作：先按新 Source 类型完成既有的纳入检查或 URL 抓取，再在一次写入事务中以替代数据更新被替换的 Source；整个过程中 Resource 始终至少拥有一个 Source，用户不需要手动执行“删除后再添加”。替换保留该 Source 的添加顺位及其首选角色，只影响该 Source 自身的路径或 URL、类型、可用性和展示元数据；Resource 的标题、备注、标签、其他 Source 与关系均不得改变。

## 后果

- Source 的不可用只影响访问状态，不会使 Resource 失去其 Source 或首选 Source。
- 所有修改 Source 的写操作都必须在同一事务内维持“至少一个 Source 且恰有一个首选 Source”的不变量。
- 删除最后一个 Source 的交互与 API 语义必须明确拒绝或经一键替换转化为原子替代，不能留下无 Source 的 Resource。
- frontend 必须为每个 Source 提供一键替换入口；Wails-facing API 不能把这一流程拆成要求前端自行协调的删除和新增。
- 实现可使用更新或内部替换记录的方式，但必须观察上保持原 Source 的顺位与首选角色，且不得改动 Resource 或其他 Source。

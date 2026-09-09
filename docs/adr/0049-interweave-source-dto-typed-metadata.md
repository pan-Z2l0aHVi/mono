# ADR-0049: Interweave Source DTO 元数据类型化

- **Date**: 2026-09-09
- **Status**: 已接受

## 背景

`SourceDTO` 自 ADR-0032 抽取 core 以来一直携带 `metadata_json: string`：`remote.URLMetadata`（title/site_name/description/favicon_url）在 ingest 时序列化为 JSON 字符串落库，DTO 原样透传。前端每个要渲染 favicon、站点名或描述的组件都必须知道三件事——字段是 JSON 字符串、JSON 的内部字段形态、以及解析失败如何兜底；这是零能力换三份 interface 知识。此外搜索路径对原始 JSON 文本做 LIKE 匹配，使前端展示语义与序列化细节耦合。

ADR-0032 §6 曾冻结 "Wails 公开方法签名与 DTO 保持不变"，目的是 core 抽取以零 diff 落地。该条款是重构期不变量，不是产品规则。当前前端消费面只有本批同步建立的 store（`src/stores/library.ts`），pages 均为占位，此刻调整 DTO 的迁移成本为零，错过窗口后则随页面增长变贵。

候选方案：

1. **维持字符串**：前端各处自行 parse，负担随消费面线性增长。
2. **storage/core 层去字符串化**：把 metadata 改为结构化存储。牵动 SQLite schema 与 ADR-0030 的持久化边界，超出本决策需要。
3. **仅在 service DTO 出口类型化**：存储仍为字符串，facade 在装配视图时解析一次，失败回退 nil。

## 决策

- 选择方案 3：`SourceDTO.MetadataJSON string` → `SourceDTO.Metadata *SourceMetadataDTO`（`json:"metadata,omitempty"`），`SourceMetadataDTO` 字段形态与 `remote.URLMetadata` 的序列化一致（title/site_name/description/favicon_url）。
- 解析恰好在 service facade 的转换 seam（`convert.go`）发生一次：空串或非法 JSON 一律返回 nil，解析失败不阻塞视图装配；storage、core 与 SQLite schema 不变。
- 视为对 ADR-0032 §6 DTO 冻结条款的首次显式修订：该条款在 core 抽取合入后完成使命，后续 DTO 演进按本 ADR 的模式处理——改动发生在前端消费面建立之前、并有 ADR 记录。

## 后果

- 前端渲染 favicon/站点名/描述不再依赖序列化细节；`bindings` 的 `SourceDTO.metadata` 为可空类型化对象，`metadata_json` 字段消失。
- service facade 新增一次 JSON 解析（每 Source 每次装配），量级为本地库视图装配的可忽略开销；换来 N 个前端消费点的解析删除。
- 搜索对原始 JSON 文本的 LIKE 匹配保持现状（storage 内部实现细节）；若未来要求结构化搜索，另走 ADR-0030 的持久化边界决策。
- `wails3 generate bindings` 的生成 diff 为本决策的可验证产物；后续新增 DTO 字段时沿用 "facade 出口类型化" 的先例。

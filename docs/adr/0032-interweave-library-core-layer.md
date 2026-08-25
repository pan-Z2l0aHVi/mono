# ADR-0032: Interweave library 分层与 core 产品规则层

- **Date**: 2026-08-22
- **Status**: 已接受

## 背景

ADR-0019 定义了 `backend/` 的能力模块边界，并规定 Wails-facing Service 只负责参数转换、调用所属能力与前端可见的错误/事件边界，不承载产品规则、SQL 或 HTTP 实现（§4）；同时明确不预先决定具体 Service 数量、Go interface 或依赖注入方式（§5）。

实际实现中，`service` 层曾直接承载 URL 抓取、10 秒超时、事务与裸 SQL。持久化已通过 typed store 收口到 `storage`（见 #1 重构），但产品规则仍停留在 Wails 外观内。需要把规则从外观中移出，形成稳定分层，并为未来 MCP 复用 `library` 能力提供独立接缝。

## 决策

1. `backend/library/` 内新增 `core` 包，承载产品规则与编排：Resource/Source/Tag/Map 的写入时序与事务边界、URL 元数据抓取与 10 秒总时限、`available` 判定、Source 至少一个/唯一首选/删除回退/替换保留顺位等不变量、标签同名复用与幂等、输入规范化。`core` 不感知 Wails 或前端。
2. `service` 包降级为纯 Wails 外观：只做参数直传、core 类型→DTO 映射与错误透传；不承载规则、不直接触碰 `storage`/`remote`。`MapService` 不再依赖 `ResourceService`，改为依赖 `core.MapService`。
3. 依赖方向保持单向：`service → core → storage/remote`；`core` 可复用 `internal/` 工具。
4. `core` 领域类型以 `storage` 模型类型别名暴露（`Resource`/`Source`/`Tag`/`TagAggregate`/`TagEdge`），并新增装配视图（`ResourceView`/`GlobalMap`/`LocalMap`），避免复制结构体；service 侧 DTO 仍为 Wails JSON 契约（`types.go` 保留对 `storage.SourceType` 的类型引用以维持 bindings 稳定）。
5. `core` 定义哨兵错误，其 Error() 文案即前端可见文案；service 透传。`storage.Err*` 在 `core` 边界归一为 `core.Err*`。
6. Wails 公开方法签名与 DTO 保持不变，frontend bindings 除模块 doc 注释外零 diff。

## 后果

- MCP 进入实现范围后可直接复用 `core` 能力，无需经过 Wails service。
- 规则、SQL 与 HTTP 各归其位：`core` 可独立测试，`service` 变薄后可读性提升。
- 现有 5 个 Wails Service 的注册与前端调用面不变。

## 替代方案

- **规则继续留在 `service`**：违背 ADR-0019 §4，且 MCP 无法复用；不采用。
- **`usecase`/`application` 命名**：语义等价，经设计对齐后选定 `core`；不采用其他命名。
- **`core` 复制独立领域模型**：与 `storage` 模型完全重复，v1 收益低；采用类型别名 + 装配视图，未来确有需要时再拆分独立领域模型。

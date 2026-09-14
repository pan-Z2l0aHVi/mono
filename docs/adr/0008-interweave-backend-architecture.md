# ADR-0008: Interweave Backend Architecture

- **Date**: 2026-08-15
- **Status**: 已接受

## 1. 能力模块边界

`apps/interweave/backend/` 按能力边界组织为四个一级模块：

- `library/`：Interweave 产品能力。拥有 Resource、Source、语义标签、派生 Map 及其业务规则；SQLite 持久化属于此模块的内部实现
- `native/`：受控的桌面操作系统能力（文件选择、打开本地或外部目标、系统对话框）
- `remote/`：Go 侧出站 HTTP 能力（URL 元数据读取及未来业务 API client）
- `internal/`：仅在后端多个模块之间复用的、与 Interweave 产品无关的 Go 工具

## 2. Wails 暴露面

- frontend 只可通过 Wails 生成的 **Interweave Go Service bindings** 直接调用来自 `library/` 和 `native/` 的 Service
- `main.go` 的 Wails Service 注册 allowlist 仅包含这两个模块；Wails runtime bindings 不属于业务 allowlist
- `remote/` 与 `internal/` 禁止注册 Wails Service，frontend 禁止消费其 bindings
- 前端的"添加 URL"等操作先调用 `library/`；`library/` 再按产品规则调用 `remote/`
- 不建立独立的 `bridge/` 目录；Wails-facing Service 就近置于 `library/` 或 `native/`

## 3. library 内部分层

`backend/library/` 内部分为三层，依赖方向单向：`service → core → storage/remote`。

### core 包

承载产品规则与编排：Resource/Source/Tag/Map 的写入时序与事务边界、URL 元数据抓取与超时、`available` 判定、Source 基数与首选回退等不变量、标签同名复用与幂等、输入规范化。`core` 不感知 Wails 或前端。

- `core` 领域类型以 `storage` 模型类型别名暴露，并新增装配视图（`ResourceView`/`GlobalMap`/`LocalMap`）
- `core` 定义哨兵错误，其 Error() 文案即前端可见文案；service 透传

### service 包

纯 Wails 外观：只做参数直传、core 类型→DTO 映射与错误透传；不承载规则、不直接触碰 `storage`/`remote`。

## 4. 领域模型

- `core` 领域类型：`Resource`/`Source`/`Tag`/`TagAggregate`/`TagEdge`
- 装配视图：`ResourceView`/`GlobalMap`/`LocalMap`
- service 侧 DTO 为 Wails JSON 契约（`types.go`）
- Wails 公开方法签名与 DTO 演进遵循"前端消费面建立之前、有 ADR 记录"的原则

## 后果

- frontend 的可见 Go API 收敛为产品操作与显式 OS 操作两类
- MCP 进入实现范围后可直接复用 `core` 能力，无需经过 Wails service
- 规则、SQL 与 HTTP 各归其位：`core` 可独立测试，`service` 变薄后可读性提升
- SQLite 被明确视为资源库的内部实现，而不是可被任意模块直接使用的全局数据库
- `internal/` 只能收纳真正跨模块复用的无领域工具

## 替代方案

- **独立 `bridge/` 层**：在仅有 Vue/Wails 一个入口的首版增加间接性；不采用
- **扁平 `backend` package**：不能表达 frontend 可见面与 Go 内部依赖的边界；不采用
- **允许 frontend 直接调用 `remote/`**：绕过产品规则；不采用
- **`usecase`/`application` 命名**：语义等价，选定 `core`

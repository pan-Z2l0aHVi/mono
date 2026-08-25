# ADR-0019: Interweave 后端能力边界与 Wails 暴露面

- **Date**: 2026-08-15
- **Status**: 已接受

## 背景

Interweave 将以空骨架重新实现。后端既要承载 Resource、Source、语义标签和 Map 的产品能力，也要为桌面前端提供受控的操作系统能力，并由 Go 统一完成 URL 元数据及未来业务接口的出站 HTTP 请求。

旧实现将数据库、文件监听、HTTP、MCP 与产品规则放在同一扁平 `backend` package 中，且以已废弃的 `Item`、Repair、自动扫描等模型组织。新实现需要让并行 agent 能直接从目录和 Wails 暴露面理解职责，避免前端绕过产品规则直接调用 HTTP 或后端内部工具。

## 决策

1. `apps/interweave/backend/` 按能力边界组织为四个一级模块：
   - `library/`：Interweave 产品能力。拥有 Resource、Source、语义标签、派生 Map 及其业务规则；SQLite 与其他本地资源库持久化属于此模块的内部实现。
   - `native/`：受控的桌面操作系统能力，例如文件选择、打开本地或外部目标、系统对话框。
   - `remote/`：Go 侧出站 HTTP 能力，例如 URL 元数据读取及未来业务 API client。
   - `internal/`：仅在后端多个模块之间复用、且与 Interweave 产品无关的 Go 工具。它不得成为通用杂物目录。
2. frontend 只可通过 Wails 生成的 **Interweave Go Service bindings** 直接调用来自 `library/` 和 `native/` 的 Service。`main.go` 的 Wails Service 注册 allowlist 仅包含这两个模块；Wails runtime bindings 不属于此业务 allowlist。
3. `remote/` 与 `internal/` 是 Go 内部模块：禁止注册 Wails Service，frontend 禁止消费其 Interweave Go Service bindings。前端的“添加 URL”与“刷新 URL”等操作先调用 `library/`；`library/` 再按产品规则调用 `remote/`。
4. 不建立独立的 `bridge/` 目录。Wails bindings 已承担 Vue 到 Go 的调用生成；Wails-facing Service 就近置于 `library/` 或 `native/`，且只负责参数转换、调用所属能力与前端可见的错误/事件边界，不承载产品规则、SQL 或 HTTP 实现。
5. `library/`、`native/`、`remote/` 与 `internal/` 当前只保留空模块骨架。此 ADR 只固定职责和暴露边界，不预先决定具体 Service 数量、Go interface、存储 schema、HTTP client 策略或依赖注入方式。

## 后果

- frontend 的可见 Go API 收敛为产品操作与显式 OS 操作两类；Pinia 不保存或复制 Go 内部规则。
- URL 访问、证书、重定向、超时、代理与未来业务 HTTP 可以统一在 Go 侧处理，且不会绕过 Resource/Source 的产品约束。
- SQLite 被明确视为资源库的内部实现，而不是可被任意模块直接使用的全局数据库。
- `internal/` 只能收纳真正跨模块复用的无领域工具；仅被一个能力模块使用的辅助代码应就近保留。
- MCP 进入实现范围后，应优先复用 `library/` 能力；若它带来独立 transport 或 DTO 需求，再重新评估是否需要额外边界，而不是提前创建 `bridge/`。

## 替代方案

- **独立 `bridge/` / `transport/` 层**：可集中 Wails Service，但在仅有 Vue/Wails 一个入口的首版增加了一层间接性；不采用。
- **将所有 Wails、HTTP、SQLite 与业务文件保持在扁平 `backend` package**：起步简单，但不能表达 frontend 可见面与 Go 内部依赖的边界，且容易重演旧实现的耦合；不采用。
- **允许 frontend 直接调用 `remote/`**：会使远程访问绕过 Resource/Source、手动刷新和错误呈现的产品规则；不采用。

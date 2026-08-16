# ADR-0030: Interweave 本地 SQLite 持久化与 WAL 并发模型

- **Date**: 2026-08-16
- **Status**: 已接受

## 背景

Interweave 是本地优先应用，每个设备独立维护一个资源库。后端需要可靠、轻量、无需外部进程的持久化引擎，并在 Wails 多前端调用或并发事件下保证 ACID 事务与一致性，避免 SQLite 的并发写锁冲突。

## 决策

`backend/library` 使用单个本地 SQLite 数据库文件作为持久化底层（位于操作系统标准 App 数据目录下，如 `library.db`）。

数据库初始化时必须强制启用：

1. `PRAGMA journal_mode = WAL;` 以提升并发读写吞吐；
2. `PRAGMA foreign_keys = ON;` 以在数据库层面保证 Resource、Source、Tag 与 Tagging 的引用完整性；
3. `PRAGMA busy_timeout = 5000;` 处理瞬时锁竞争。

在 Go 运行时层面，写操作使用受控的串行化写入池或互斥锁协调，避免多 goroutine 并发写引发 `SQLITE_BUSY`。读操作可并发执行。

## 后果

- 资源库完全自包含在单个 SQLite 文件中，备份与重置直观明确。
- 外键级联与事务保证了 ADR-0024（至少一个 Source）、ADR-0027（`Tagging` 引用不可变 Tag）与 ADR-0028（按 Resource 增删标签）的一致性。
- SQLite 为 `backend/library` 模块的私有实现细节，禁止被 `backend/native` 或 `frontend` 直接访问。

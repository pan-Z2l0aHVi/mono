# ADR-0020: Interweave v1 从新资源库开始

- **Date**: 2026-08-16
- **Status**: 已接受

## 背景

2026-08-15 之前的 Interweave 使用 `Item`、路径式层级标签、目录监听、Repair 和 MCP server 模型。它们与 v1 的 Resource/Source、扁平语义标签、手动纳入和首版无 MCP 边界不兼容。

## 决策

Interweave v1 始终创建新的本地资源库；不检测、读取、迁移、修改或删除旧库。不会提供自动兼容层、后台转换或首次启动导入。

## 后果

- 新 schema 可以直接表达 Resource、Source 与扁平语义标签，不承载旧模型兼容负担。
- 旧库数据保持原状但不被 v1 使用；未来若存在真实迁移需求，必须作为显式确认的独立导入项目重新设计。
- 旧 `Item`、路径标签、watch、Repair 与 MCP 数据不得在 v1 实现中被重新引入。

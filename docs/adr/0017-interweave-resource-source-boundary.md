# ADR-0017: Interweave Resource、Source 与外部内容边界

- **Date**: 2026-08-15
- **Status**: 已接受

## 背景

Interweave 需要同时管理本地文件、网页 URL 和未来的远程来源，但不应接管用户既有的文件系统或演变成内部内容工作台。产品必须区分用户希望长期管理的对象，与访问该对象的具体位置。

## 决策

1. 使用 **Resource** 作为库中的原子概念对象。Resource 保存独立标题、短备注、语义标签、Source 与 Source 状态；它不包含其他 Resource，也不承载原生 Markdown、富文本或版本历史。
2. 使用 **Source** 表示 Resource 的外部访问入口。v1 支持本地文件和 URL；一个 Resource 可拥有多个同类型或不同类型 Source，并由用户指定首选 Source。
3. 多个 Source 仅表示同一 Resource 的备用或替代访问入口，不用于表达版本。不同版本默认是独立 Resource；v1 不维护版本关系、内容快照、差异或回滚。
4. Interweave 引用而不托管外部内容：不复制、移动、重命名或删除原始文件与远程对象。移除 Resource 只移除库内记录。
5. Source 不可用时保留 Resource 及其上下文；用户手动添加、替换 Source 或切换首选 Source。v1 不自动扫描、寻找或修复失联来源。
6. 完全相同的 Source 只能归属一个 Resource。用户应从已有 Resource 补充 Source；v1 不支持合并两个既有 Resource。

## 后果

- Resource 的组织与标题可独立于文件路径和 URL 存续，来源失联不会删除用户已建立的上下文。
- 同一资料可拥有多条访问路径，但系统不需要在 v1 解决内容去重、版本判断或自动合并。
- 文件系统操作、内容托管、版本管理与自动修复不属于基础产品能力。
- 后续网盘、NAS 或其他连接器应新增 Source 类型，而不是改变 Resource 的身份语义。

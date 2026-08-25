# ADR-0027: Interweave Tag 的稳定内部身份

- **Date**: 2026-08-16
- **Status**: 已接受

## 背景

v1 将标签名称在创建时标准化，并对标准名称自动复用既有标签；但标签名称仍允许全局重命名。若 Resource 与标签名称直接关联，改名会把可编辑文本变成关联键，增加迁移、并发和引用一致性的风险。

## 决策

每个 Tag 创建时都获得一个用户不可见、创建后永不改变的 `tag_id`。标准化标签名称是全局唯一的可编辑属性，不是数据库主键，也不是 Resource 与 Tag 的关联键。

Resource 的标签归属一律引用 `tag_id`，其内部领域实体命名为 `Tagging`，表示“一个 Resource 被赋予一个 Tag”。`Tagging` 至少包含 `resource_id` 与 `tag_id`，不是特殊 Tag，也不对用户展示。标签重命名只改变名称属性，不改变 Tag 身份或既有 Tagging；Map 继续从 Resource 与 `tag_id` 的归属派生。

## 后果

- 标签名称的标准化唯一约束与稳定身份分离：同名复用由名称规则保证，重命名和关联完整性由 `tag_id` 保证。
- `tag_id` 不对用户展示，也不表达语义相近、别名或层级关系。
- Resource—Tag 关联在领域中命名为 `Tagging`；持久化表可对应为 `taggings`，但 frontend 仍只消费 Resource 的 `tags`，不需暴露这一内部实体。

# ADR-0021: Interweave Source 同一性与去重

- **Date**: 2026-08-16
- **Status**: 已被 ADR-0025 取代

## 背景

本 ADR 曾要求完全相同的本地文件路径或 URL 只能归属一个 Resource，并在重复添加时定位已有 Resource。该全局去重策略增加了添加和替换的心智负担，现由 ADR-0025 取代。

## 决策

本 ADR 的全局 `source_key` 与唯一约束不再适用；重复 Source 的当前策略以 ADR-0025 为准。

- 文件 Source：使用词法清理后的绝对路径；Windows 比较时大小写不敏感。不得解析 symlink，不得按 inode、内容 hash 或文件内容合并。
- URL Source：只接受绝对 `http`/`https` URL；去除输入两端空白，scheme 与 host 按大小写不敏感处理，移除默认端口并将空 path 规范为 `/`。保留 path 大小写、query 和 fragment。
- URL 抓取跟随响应重定向直至最终响应，不设重定向次数上限；整个重定向链与基础元数据抓取共享 ADR-0022 规定的 10 秒总时限。重定向仅是该次网络请求的过程，Source 始终保存用户输入并规范化后的初始 URL，绝不自动改写为最终 URL。
- 不得根据网页标题、canonical link、重定向最终 URL、页面内容或任何自动发现结果合并 Source。用户添加的不同 Source 即使最终指向相同 URL 或相同外部内容，仍保持为多个独立 Source。

## 后果

- 当前 v1 不建立全局唯一约束，不在添加或替换时定位、拒绝或合并重复 Source。
- 重定向后指向同一最终 URL 的不同初始 URL 仍是不同 Source；即使初始 URL 也相同，用户的多次添加仍可保留为不同 Source。
- 未来若增加用户主动触发的重复扫描或处理能力，必须以新的 ADR 定义，不得恢复添加时的隐式干预。

# ADR-0022: Interweave Source 布尔可用性与 URL 写入时序

- **Date**: 2026-08-16
- **Status**: 已接受

## 背景

Source 的可用性需要向用户表达当前已知的外部入口是否能够访问。对 URL 而言，产品要求在纳入时读取基础元数据，但即使网络、站点或解析失败也不得阻止 Resource 的创建。`unknown` 会把一次用户明确触发的抓取结果悬置为未定义状态，不能解释 URL 刚被添加后的实际结果；独立状态枚举也没有必要。

## 决策

v1 的持久化 Source 使用 `available: boolean` 表达可用性：`true` 表示 `available`，`false` 表示 `unavailable`；不设 `unknown` 或独立状态枚举。

新建 URL Source 时，`library` 必须先完成一次由该添加操作触发、总时限为 10 秒的 URL 基础元数据抓取，再写入 Resource 与 Source。抓取可跟随重定向直至最终响应，不设重定向次数上限，且整个链共享这 10 秒时限。元数据抓取成功即以 `available: true` 写入；任何抓取失败或超时即以 `available: false` 写入。两种结果都必须创建 Resource 与 Source，且都可继续由用户维护。

可用性只由本次基础元数据抓取决定，不必等待后续非元数据数据加载完成。只要 URL 最终得到可访问的 HTTP 成功响应且抓取流程正常完成，即使目标不是 HTML，或 HTML 缺少标题、站点名、图标、缩略图等任意展示字段，也以 `available: true` 写入；这些字段均为可缺失的展示元数据。用户显式刷新 URL 时，按该次基础元数据抓取结果更新 `available`。

新建本地文件 Source 时，`library` 必须在写入前执行一次轻量 `stat` 检查：检查成功以 `available: true` 写入，检查失败以 `available: false` 写入。两种结果都创建 Resource 与 Source；该检查不得读取文件内容或计算内容 hash。

## 后果

- 添加 URL 的 Wails 调用在基础元数据抓取完成或 10 秒总时限到达前不得返回成功结果；UI 的加载提示只属于该请求的短暂操作状态。
- 后续非元数据数据加载不阻塞 URL 的首次写入，也不得回溯改变本次基础元数据抓取已经确定的 `available`；展示元数据缺失不等同于 Source 不可用。
- v1 不做后台轮询、定期可用性检查、自动修复或状态历史。
- 文件路径的可用性检查不改变 ADR-0021 的同一性规则：路径仍按词法清理后的绝对路径去重，不因 `stat` 解析结果而合并。
- 其他未来 Source 类型也不得引入 `unknown`；它们的首次可用性判定流程在相应接入决策中定义。

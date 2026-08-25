# ADR-0023: Interweave Resource 标题的独立所有权

- **Date**: 2026-08-16
- **Status**: 已接受

## 背景

URL 的标题、站点名等属于某个外部 Source 的抓取结果，而 Resource 可拥有多个 Source，且 Resource 标题承载用户对原子概念对象的独立命名。若 Source 新增或刷新时自动覆盖标题，会让第三方页面变化或备用入口意外改变用户的资源组织语义。

## 决策

`Resource.title` 是独立于 Source 元数据的持久化字段。仅在新建 Resource 时，允许使用其首个 Source 的初次获取结果作为默认标题；之后只能由用户显式编辑 Resource 标题。首个 URL Source 没有可用页面标题时（包括抓取失败、非 HTML 响应或 HTML 缺少标题），以规范化 URL 的 hostname 作为默认标题；文件 Source 仍以文件名作为默认标题。

新增 Source、刷新 URL 元数据、URL 重定向结果或任何后续自动处理都不得改写 `Resource.title`。Source 的展示元数据归属于该 Source，可独立更新，但不拥有 Resource 标题的写权限。

## 后果

- Resource 标题在首次纳入后保持稳定，不会因第三方内容或备用 Source 改变而漂移。
- frontend 与 Wails Service 必须提供独立的用户标题编辑操作，不能把 URL 刷新实现为 Resource 更新。
- 新建 Resource 的默认标题回退规则属于首次纳入流程，不能借由后续刷新补写或覆盖标题；URL 的 hostname 回退标题也在创建时一次性确定。

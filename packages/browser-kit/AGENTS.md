# browser-kit

- 仅面向浏览器运行时；不得引入 Node-only API 或 UI/framework 运行时。

## tracker 词汇

**页面错误（Page Error）**：Tracker 收集的浏览器全局运行时失败，包含 uncaught error 与 unhandled promise rejection；不包含资源加载失败、console 消息或框架回调错误。
_Avoid_: JS error、异常监控、资源错误

## 历史导航词汇

**导航条目（Navigation Entry）**:
历史导航模块记录的一次同文档导航；每条具备栈内稳定 id、跨 replace 保持的 key、当前 index 与 URL。
_Avoid_: 历史记录点、页面快照、浏览记录

**同文档导航（Same-document Navigation）**:
不离开当前页面、仅通过 URL 片段变化或 history API 产生的导航（含浏览器前进/后退）；history-nav 只跟踪这一类，整页加载或跨文档跳转不在其职责内。
_Avoid_: 页面跳转、路由切换（避免与 router 概念混淆）

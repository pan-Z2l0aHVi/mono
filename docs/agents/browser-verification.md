# 浏览器验证指南

涉及 UI、UX、交互、响应式行为或浏览器运行时行为的变更，必须在真实浏览器中验证。chrome-devtools MCP 是唯一的 Agent 真实浏览器验证层：导航到本地 demo、与组件交互、检查 console/network 并截图。`agent-browser` 不属于自动 fallback；只有用户显式调用 `/agent-browser` 时才可使用。

## 验证要点

各变更类型的验证要点：

- **交互**：主要指针交互、键盘操作、焦点管理、禁用状态、关闭/取消路径
- **布局**：空白渲染、溢出、遮挡、错位、意外布局偏移（检查桌面和移动端视口）
- **无障碍**：语义化、accessible name、键盘可达性
- **运行时**：console 错误、页面异常、依赖浏览器特性的行为（jsdom 不是替代品）

## dev server 与浏览器约束

- 启动本地 dev server 前，检查目标端口是否已有响应的服务器。合适则复用；不要仅因验证任务启动就创建重复服务器。
- 仅在无合适服务器运行、现有服务器无法提供所需当前状态、或明确需要隔离环境时才启动新服务器。此时使用未占用端口并记录其 PID。
- 仅停止当前任务启动的服务器。不得终止用户或其他任务拥有的已有服务器。
- 目标端口上遇到无响应的 dev server 时，先询问用户再终止。仅在会话结束时清理当前任务启动的服务器。
- 不得附加或控制用户现有的 Chrome 会话。在 chrome-devtools MCP 或 `agent-browser` 拥有的浏览器上下文中验证，与用户工作的 Chrome 隔离。
- 仅对本地自签名 HTTPS demo 忽略证书错误；不得为外部站点放松证书验证。
- 验证完成后停止为验证启动的所有 dev server，除非用户要求保留。保留或报告本地 URL 供后续使用。

## 验证分层

- `pnpm run test`：运行 Turbo 编排的 package 测试；其中包含已配置的 Vitest Browser Mode / Playwright Chromium `*.browser.spec.ts` 回归。
- chrome-devtools MCP：验证 demo 集成、真实交互、键盘和焦点、布局、console、network 与桌面/移动视口。

这两层分别提供可重复回归与 Agent 的真实端到端证据，不能互相替代。没有自动 fallback：若 chrome-devtools MCP 在任务环境中不可用，必须报告环境阻塞，不得将构建、jsdom 或自定义浏览器脚本表述为完成了真实交互验证。

## 报告

最终报告必须声明验证 URL、检查内容和任何缺口。不得将构建成功或 jsdom 测试通过描述为浏览器交互验证。

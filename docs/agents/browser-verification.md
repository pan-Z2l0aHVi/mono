# 浏览器验证指南

涉及 UI、UX、交互、响应式行为或浏览器运行时行为的变更，必须在真实浏览器中验证。验证分两层：chrome-devtools MCP 是默认的 Agent 真实浏览器交互层（导航、交互、console/network、截图）；`pnpm agent:verify` 是引擎级取证补充层，覆盖 MCP 做不到的能力（真实 touch 管线、rAF/时钟推进检查、逐帧插值采样），用法见下节「引擎级验证工具链」。`agent-browser` 不属于自动 fallback；只有用户显式调用 `/agent-browser` 时才可使用。

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
- 验证结束后关闭本任务通过 chrome-devtools MCP 打开的浏览器页面；浏览器实例可能被多个 agent 共享，遗留页面会持续占用内存。

## 验证分层

- `pnpm run test`：运行 Turbo 编排的 package 测试；其中包含已配置的 Vitest Browser Mode / Playwright Chromium `*.browser.spec.ts` 回归。
- chrome-devtools MCP：验证 demo 集成、真实交互、键盘和焦点、布局、console、network 与桌面/移动视口。
- `pnpm agent:verify`：引擎级取证（真实 touch 管线、环境前置检查、插值采样），与 MCP 互补而非替代。

这三层分别提供可重复回归、Agent 的真实端到端证据与引擎级取证，不能互相替代。没有自动 fallback：若 chrome-devtools MCP 在任务环境中不可用，必须报告环境阻塞，不得将构建、jsdom 或自定义浏览器脚本表述为完成了真实交互验证。

## 引擎级验证工具链

`pnpm agent:verify <command>` 以 CDP 原语驱动专用 Chrome（一次性 profile、随机调试端口、非 headless；`--headless` 显式 opt-in，但 headless/隐藏窗口正是节流伪影域）。本会话实测踩过的三类伪影——后台窗口 rAF 停摆、计时器节流造成的插值假阴性、mouse-only 输入环境下的假触控结论——都由该工具链前置拦截。

浏览器验证前的三条硬前置检查（一条命令）：

```sh
pnpm agent:verify check-env --url https://127.0.0.1:5173/
```

`page is visible`、`rAF advancing`、`clock advancing normally` 任一 fail 时，验证结果不可采信，先修复环境（激活窗口、前台化、脱离节流域）再取证。

命令表：

| 命令          | 取证内容                                                                | 关键判定                                                      |
| ------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| `check-env`   | visibilityState / rAF 推进 / 时钟推进 / hasFocus / webdriver / 视口     | 页面不可见或 rAF 停摆 → fail，证据不可采信                    |
| `touch-flow`  | `Input.dispatchTouchEvent` 真实触控管线 + capture 非 passive 录制器回读 | 零事件 → fail（mouse-only 输入环境，触控结论作废）            |
| `interpolate` | 强制 reflow 固定起始帧 → 触发过渡 → 逐 rAF 采样 computed 样式           | `linear`（连续插值）/ `stepped`（离散跳变）/ `none`（无过渡） |

调试复杂手势（拖拽、滑动、pinch）时，先跑 `touch-flow` 确认真实 touch 事件流可达页面，再在目标组件上取证——合成 PointerEvent 不会触发真实手势识别（滚动接管、pointercancel），不能作为移动端手势结论的依据。

### 证据词汇三档

验证报告中的浏览器证据必须标注档位，不得混用：

1. **仿真无回归**：chrome-devtools MCP 桌面/移动视口下未发现问题——最弱一档，不能证明真实触控行为。
2. **引擎级复现**：`agent:verify` 在真实 touch 管线/插值采样上复现或排除——可定位根因，仍是桌面 Chrome。
3. **真机验收**：用户在真实设备上的验收结论——最高档，交互类变更的最终验收依据。

## 报告

最终报告必须声明验证 URL、检查内容和任何缺口。不得将构建成功或 jsdom 测试通过描述为浏览器交互验证。

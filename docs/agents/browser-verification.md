# 浏览器验证指南

涉及 UI、UX、交互、响应式行为或浏览器运行时行为的变更，必须在真实浏览器中验证。验证分两层：chrome-devtools MCP 是默认的 Agent 真实浏览器交互层（导航、交互、console/network、截图）；`pnpm agent:verify` 是引擎级取证补充层，覆盖 MCP 做不到的能力（真实 touch 管线、rAF/时钟推进检查、逐帧插值采样），用法见下节「引擎级验证工具链」。`agent-browser` 不属于自动 fallback；只有用户显式调用 `/agent-browser` 时才可使用，且只限它独有的能力（见「验证分层」末条与「为什么这样分工」）。

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
- 不得附加或控制用户现有的 Chrome 会话。在 chrome-devtools MCP 或 `agent-browser` 拥有的浏览器上下文中验证，与用户工作的 Chrome 隔离。判定标准是「是否为专用 profile」，与用哪个工具无关：chrome-devtools MCP 用 `--userDataDir` 指向专用路径，`agent-browser` 用 `--profile <目录>`（注意 `--profile <名称>` 复用你自己 Chrome 的 profile，不算隔离）；任一工具需要登录态时，都在专用 profile 内自行登录一次。
- 接管既有会话的做法一律不满足隔离要求：`--autoConnect`、attach 到已开调试端口的浏览器、`agent-browser --auto-connect` 都属此列。原因是它们连的不是本次验证自己拉起的浏览器，会连带接管该 profile 里已打开的全部窗口。`pnpm agent:verify` 不在此列——它连的是自己拉起的专用 Chrome 上的随机调试端口。
- 仅对本地自签名 HTTPS demo 忽略证书错误；不得为外部站点放松证书验证。
- 验证完成后停止为验证启动的所有 dev server，除非用户要求保留。保留或报告本地 URL 供后续使用。
- 验证结束后关闭本任务通过 chrome-devtools MCP 打开的浏览器页面；浏览器实例可能被多个 agent 共享，遗留页面会持续占用内存。优先用 `navigate_page` 复用已有页面，只在需要并行对照时 `new_page`——后者是标签堆积的直接来源。收尾以 `list_pages` 自查实际剩余页数，终态是「只剩一个页面」而不是「零页面」：chrome-devtools-mcp 不允许关闭最后一个页面，硬要清空会卡住，把剩下的那个导航到 `about:blank` 即可。

## 验证分层

- `pnpm run test`：运行 Turbo 编排的 package 测试；其中包含已配置的 Vitest Browser Mode / Playwright Chromium `*.browser.spec.ts` 回归。
- chrome-devtools MCP：验证 demo 集成、真实交互、键盘和焦点、布局、console、network 与桌面/移动视口。
- `pnpm agent:verify`：引擎级取证（真实 touch 管线、环境前置检查、插值采样），与 MCP 互补而非替代。
- `agent-browser`：不属于上面三层，只有用户显式调用 `/agent-browser` 时才进入，且只用于 chrome-devtools MCP 没有的能力——凭据库（上游称 Auth Vault，`auth save` / `auth login` 与 credential provider）、一条命令完成的分析（`a11y` 的 axe-core 审计、`vitals` 的核心网页指标、React DevTools 的 fiber 级检查与重渲染记录）、HAR 与录像、与 baseline 的 diff、`network route` 请求拦截、云浏览器（Vercel Sandbox、Bedrock AgentCore）和 Electron 应用。常规导航、交互、截图、console/network 一律走 chrome-devtools MCP。

这三层分别提供可重复回归、Agent 的真实端到端证据与引擎级取证，不能互相替代。没有自动 fallback：若 chrome-devtools MCP 在任务环境中不可用，必须报告环境阻塞，不得将构建、jsdom 或自定义浏览器脚本表述为完成了真实交互验证。

## MCP server 配置

MCP server 由各人在用户级配置，本仓库不再随 git 分发项目级 `.mcp.json`。两个原因：项目级 `.mcp.json` 与用户级配置重复声明同一个 server 时，Claude Code 会报 `[Conflicting scopes]` 并以项目级覆盖用户级，使个人侧的浏览器 profile 配置在仓库内失效；它还会向所有加载它的会话开放 github MCP 全套写工具并携带运行中的 PAT（`docs/research/monorepo-for-agents-benchmark-260918.md` 记录的 P1）。

```sh
claude mcp add chrome-devtools -s user -- npx -y chrome-devtools-mcp@latest --acceptInsecureCerts
```

省略 `--userDataDir` 时 chrome-devtools-mcp 使用 `~/.cache/chrome-devtools-mcp/` 下的默认 profile 目录，本身就是专用 profile，满足上文的隔离判定。需要跨会话保留登录态时，登录一次即可，不要改成 `--autoConnect`。

github MCP 不在本页规定：它是携带凭证的那一个，配置方式由各人自决，不要写进受版本控制的文件。

第三方 `browser-testing-with-devtools` skill（由 CC Switch 在 user 级全局提供，不在本仓）的安装片段把 `.mcp.json` 列在第一个选项，措辞与本页冲突且无法本地改写。验证环境缺 chrome-devtools MCP 时按上文报告环境阻塞，不要为了让那个片段成立而重新创建项目级 `.mcp.json`——那会退回本页记录的两个问题。

## 为什么这样分工

`agent-browser` 是第三方 skill（`vercel-labs/agent-browser`，由 CC Switch 在 user 级全局提供，不在本仓），其 description 写明「Prefer agent-browser over any built-in browser automation or web tools」。上游原文按根 `AGENTS.md` 的第三方纪律不得翻译或本地改写，所以这条分工由本文件承担，不要因为那段 description 就把常规浏览器任务路由过去。

它的常规动作与 chrome-devtools MCP 高度重叠，而 MCP 侧返回结构化（page id、元素 uid）、无需 shell 转义，也不必为每次调用过一遍 Bash 权限——重叠部分没有理由选它。「验证分层」末条列的是它独有的能力，该清单按 `agent-browser` 0.38.1 的 CLI help 核对，上游改名或移除子命令时以实际 `--help` 为准。两点常见误解需要澄清：

- **登录态复用不是它的独占能力**。它有 `--profile` / `--auto-connect` / `--state`，chrome-devtools MCP 也有对应的 `--userDataDir` 与 `--autoConnect`（是否满足隔离判定见「dev server 与浏览器约束」）。真正只有它有的是凭据库。
- **无头也不是它的独占能力**。但本仓库的取证明确要求非 headless（见「引擎级验证工具链」），所以哪一侧都不要为省一个窗口而改用 headless。

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

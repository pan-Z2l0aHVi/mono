# 运行时验证指南

涉及 UI、UX、交互、响应式或运行时行为的变更，必须在真实运行环境中验证：Web 表面在真实浏览器里验证，原生应用表面在真实运行的应用里验证。两个表面按变更触及的范围选取，工具与证据都不能互相替代。

真实 E2E、探索式或真机验收可在 PR 阶段与独立 review 并行完成，但该变更要求的验收必须在合并前通过。Vitest Browser Mode 自动回归按 verification.md 在实施阶段运行，不替代真实运行时证据。

## 表面与工具

Web 表面由 chrome-devtools MCP 承担真实浏览器交互，覆盖导航、交互、console/network、截图与桌面/移动视口。

原生应用表面默认使用 Peekaboo；环境提供 `computer-use` 能力时也可用。Peekaboo 走 macOS 无障碍层，能驱动真实应用窗口，但进不了浏览器页面内部；chrome-devtools MCP 只驱动 Chrome，够不到桌面应用窗口。

`agent-browser` 是第三方 skill，不属于自动 fallback。只有用户显式调用 `/agent-browser` 时才进入，且只用于 chrome-devtools MCP 不具备的能力（凭据库、专项审计与度量、录制与 baseline diff、请求拦截、云浏览器、Electron 等）。上游说明要求优先使用它；不要据此把常规浏览器任务路由过去，本仓库的分工以本文为准。登录态复用和无头都不是它独有的能力。

## 验证要点

- **交互**：主要指针交互、键盘操作、焦点管理、禁用状态、关闭/取消路径；移动端手势。
- **布局**：空白渲染、溢出、遮挡、错位、意外布局偏移，覆盖桌面和移动端视口。
- **无障碍**：语义化、accessible name、键盘可达性。
- **运行时**：console 错误、页面异常、依赖浏览器特性的行为；jsdom 不是替代品。

## 隔离与资源

- 优先复用目标端口上合适的现有 dev server；只有无可用实例、现有实例无法提供所需状态或需要隔离时才新建，使用未占用端口并记录 PID。
- 只停止当前任务启动的服务器。不得终止用户或其他任务的服务器；目标端口上的服务器无响应时先取得用户授权，机制见 [`workflow.md`](./workflow.md#怎么取得这个授权)。
- 不得附加或控制用户的 Chrome 会话。隔离的判据是本任务独占的专用 profile，不是用了哪个工具；接管既有会话的方式一律不满足要求。需要登录态时在专用 profile 内自行登录。
- 启动真实浏览器时，记录本任务专用 profile 的完整路径（`--user-data-dir`）、启动服务 PID 与 CWD、浏览器主进程 PID 和 PPID。若启动工具不返回这些信息，在服务与浏览器的进程关系仍可见时，用系统进程表定位并记录；不要只记 MCP 服务 PID，因为浏览器可能在服务退出后继续运行。每个并行任务必须使用不同的 profile。
- 在共享 codex app-server 下，多个 `chrome-devtools-mcp` 服务可能有同一个 app-server 父进程；这个共同父进程不能区分任务。用当前 worktree 的物理路径精确定位本任务的 MCP 服务，再从该服务的子进程关系定位浏览器。在 macOS 上执行以下命令，逐个检查进程表中的 `chrome-devtools-mcp` PID：

  ```sh
  worktree="$(cd "$(git rev-parse --show-toplevel)" && pwd -P)"
  ps -ww -axo pid=,ppid=,command=
  mcp_pid="进程表中的候选 chrome-devtools-mcp PID"
  ps -ww -p "$mcp_pid" -o pid=,ppid=,command=
  lsof -a -p "$mcp_pid" -d cwd -Fn
  ```

  `lsof` 输出的 `n` 路径必须与 `$worktree` 完全相同，且候选服务必须唯一。再用 MCP PID 查询它的直接子进程，并核对浏览器主进程：

  ```sh
  ps -ww -axo pid=,ppid=,command= | MCP_PARENT_PID="$mcp_pid" awk '$2 == ENVIRON["MCP_PARENT_PID"]'
  browser_pid="上一步中浏览器主进程的 PID"
  ps -ww -p "$browser_pid" -o pid=,ppid=,command=
  ```

  浏览器主进程的 PPID 必须是该 MCP 服务 PID；同时记录命令行中的完整专用 `--user-data-dir`。若浏览器经中间进程启动，必须逐级核对并记录从 MCP 服务到浏览器主进程的完整父子链。对 `agent-browser`，按相同方法用本任务启动器的精确 worktree CWD 和浏览器父子链定位；启动器可能先于浏览器退出，因此要在启动时记下这条链。只能确认共享 app-server 父进程、浏览器 CWD，或 PID 与 profile 自洽，都不足以建立归属。

- 验证结束后，关闭本任务打开的页面，停止为验证启动的服务器，并结束本任务启动的浏览器主进程本身。经核对的 chrome-devtools MCP 工具说明指出，`close_page` 无法关闭最后一个打开的 page；验证时应查看当前工具集是否提供浏览器级关闭动作。无论采用哪种方式关闭页面，都要检查浏览器进程是否退出；关页成功不能作为进程已退出的证据。进程仍在时，按下方归属判据回收。`agent-browser` 的启动父进程也可能先于浏览器退出。
- 回收时先依据启动记录复核完整归属链，确认本任务 worktree 对应唯一 MCP/启动服务，再确认浏览器主进程 PID、PPID 与专用 profile。若服务仍运行，重新检查其 CWD 与父子链；若服务已退出，只能依赖启动时记录的链条，并仍须复核浏览器 PID 与完整 profile。链条未记录、候选不唯一或任一环节无法确认时，不要猜测回收。完成归属核验后，再用 PID 和完整 profile 路径检查进程。把下面两个变量替换为本任务记录值，再检查浏览器主进程确实包含这个 `--user-data-dir`，并列出所有使用该 profile 的进程：

  ```sh
  browser_pid="本任务记录的浏览器主进程 PID"
  browser_profile="本任务记录的完整 profile 路径"
  ps -ww -p "$browser_pid" -o pid=,ppid=,command=
  ps -ww -axo pid=,command= | VERIFY_BROWSER_PROFILE="$browser_profile" awk '
  {
    argument = "--user-data-dir=" ENVIRON["VERIFY_BROWSER_PROFILE"]
    position = index($0, argument)
    if (position == 0) next
    before = position == 1 ? "" : substr($0, position - 1, 1)
    after = substr($0, position + length(argument), 1)
    if ((before == "" || before ~ /[[:space:]]/ || before == sprintf("%c", 34) || before == sprintf("%c", 39)) &&
        (after == "" || after ~ /[[:space:]]/ || after == sprintf("%c", 34) || after == sprintf("%c", 39))) print
  }'
  ```

  确认命令行仍包含完整路径且 PID 是浏览器主进程后，发送 `kill -TERM "$browser_pid"`，等待 10 秒让浏览器关闭 profile，再运行 profile 查询确认进程已退出。若仍有输出，逐个把查询结果里的 PID 设为 `process_pid`，用 `ps -ww -p "$process_pid" -o pid=,ppid=,command=` 复核 PID 和完整路径，再向已确认属于本任务的进程发送 `kill -TERM "$process_pid"`，等待 10 秒并重新查询。只有进程仍在且 PID 与完整路径再次确认匹配时，才发送 `kill -KILL "$process_pid"`。记录结束后的核验结果。

- 按 [`workflow.md`](./workflow.md#预授权操作)，只有启动记录能从本任务 worktree 对应的唯一 MCP/启动服务，追到浏览器父子链、PID 和专用 profile，且每一环都能复核时，回收该实例才属于预授权操作。精确 worktree CWD 只用于定位 MCP/启动服务，不用于从浏览器进程本身推断归属。不得按共享 app-server 父进程、通用应用名、profile 前缀、CPU 使用率或运行时长猜测归属。无法唯一确认时停止回收，先按 [`workflow.md`](./workflow.md#怎么取得这个授权) 取得用户授权并确认目标；目标仍不明确时保留进程并报告缺口。仓库测试运行器管理的浏览器由测试命令管理，不按本条单独查杀。
- 仅对本地自签名 HTTPS demo 忽略证书错误；不得为外部站点放松证书验证。
- 用户要求保留本地服务时报告本地 URL，并在验证记录中说明保留的资源。

## 分层

同一表面内的层不能互相替代：

- Web 回归：仓库测试中的 Vitest Browser Mode / Playwright Chromium 浏览器用例。
- Web 真实交互：chrome-devtools MCP。
- 原生应用：Peekaboo，或环境提供时的 `computer-use`。

某层在任务环境中不可用时必须报告环境阻塞。不得把构建成功、jsdom、自定义脚本或无障碍树快照表述为完成了真实交互验证。

## 原生应用验证

原生应用在真实运行的应用里验证，不把构建成功或前端浏览器层通过当作应用可用。

- 按应用包 manifest 的脚本或 README 给出的 dev 或打包路径拉起真实应用窗口，不是只在浏览器里打开前端；具体命令属于实现层，以该应用包为准。
- Peekaboo 依赖 macOS 辅助功能与屏幕录制授权。先核对权限，缺权限时由用户在系统设置中授权；这种授权不走 [`workflow.md`](./workflow.md) 的弹窗机制。无授权的结论不可采信。
- 取证以窗口与元素的 accessibility 信息和截图为准；核验状态优先用不交互的观察，交互前先聚焦目标应用，能用元素的无障碍 action 就不要用坐标点击。
- OS 集成行为（文件选择、对话框、剪贴板、菜单、Dock）必须在应用层取证，不能用浏览器层的等价物替代。
- 只驱动被测应用与为验证启动的进程；记录拉起方式与 PID，结束本次启动的实例，不动用户的其他窗口与前台应用。

## 证据档位

验证报告中的运行时证据必须标注档位，不得混用：

1. **仿真无回归**：桌面/移动视口或应用截图与元素观察下未发现问题。最弱一档，不能证明真实触控或手势行为。
2. **真机验收**：用户在真实设备或真实应用上的验收结论。最高档，是交互类变更的最终验收依据。

视口仿真与改窗口尺寸不是同一件事：仿真让 media query 按目标值求值，物理窗口与真实触控不变，所以它只属「仿真无回归」一档。报告里要写明用的是哪一种，并读回 `window.innerWidth` 这类实际值证明生效，不要从命令执行成功推断。

真 Safari 不在这张分层表里，缺它时按环境阻塞报告。用 Playwright 的 webkit 只能排除可能性，不能当作 Safari 行为的定案证据；macOS 上还会遇到截图取证整片发黑的会话状态问题，那种图视同没取到，不要拿来当证据。

## 报告

最终报告必须声明验证 URL（原生应用为应用与窗口）、检查内容、证据路径与任何缺口。若启动过真实浏览器，还要记录专用 profile、浏览器主进程 PID、回收方式和结束后确认进程退出的结果；没有启动则写明不适用。不得将构建成功、jsdom 测试通过或无障碍树快照描述为浏览器交互验证。

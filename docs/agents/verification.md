# 验证、运行时冒烟与浏览器资源

测试编写判据见 [`.agents/skills/test-authoring/SKILL.md`](../../.agents/skills/test-authoring/SKILL.md)，生成物清单见 [`generated-artifacts.md`](./generated-artifacts.md)。

## 推送前本地全量 check 门

请求推送分支或创建 PR 前，以 [`ci.yml`](../../.github/workflows/ci.yml) 的 `check` job 为清单，在本地**全量**跑通本机可执行的全部检查并退出 `0`（不做相关性裁剪）；修复后重跑至最终待推送状态全绿。

- **已跟踪面复跑**：`test-scripts` 与 `check-context` 依赖 `git ls-files`；新增脚本、测试或文档须暂存/提交进入跟踪面后重跑，未跟踪态通过不算数。
- **Changeset 本地预检**：`pre-commit` 不跑 `check-changeset`；推送前本地执行 `pnpm run check-changeset --base origin/main --head HEAD`。
- **稀疏检出先还原**：若启用过 [`apps-sparse-checkout`](../../.agents/skills/apps-sparse-checkout/SKILL.md)，推送前先 `--restore` 恢复全树再跑全量 `check`。
- **唯一跳过例外**：本机确实缺少某项 CI 专属运行时（如跨平台工具链或 Debian 12 上 GTK 4.10+ 缺失导致的 Wails CGO 包）时可跳过该单项，并在交付说明中列出未跑项与原因。

## 实施期命令与测试层边界

- **聚焦测试**：受影响包用 `pnpm exec turbo test --filter=@greypan/<name>`；单个 spec 用 `pnpm exec vp test run <路径>`（以 `Test Files 1 passed (1)` 核实收窄生效）。**禁止 `pnpm run test -- <路径>`**（参数透传全包，未匹配包会失败）。
- **仓库脚本测试**：`*.test.mjs` 由 `pnpm run test-scripts` 执行，不在 `pnpm run test` 内；未跟踪的新脚本测试在实施期直接用 `node <路径>` 运行。
- **CI 虚拟光标隔离**：无头浏览器虚拟光标默认停在视口左上角，易触发隐藏 overlay 的 phantom hover；不模拟真实指针的 `*.browser.spec.ts` 须隔离 `pointer-events`。
- **网格列数基线**：文档 demo 的网格列数由各自浏览器 spec 钉住，守护 Tailwind v4 自定义变体排序陷阱。

## 前端冒烟门

触及前端运行时的改动，进入创建 PR 与合并前须先在真实运行环境中通过冒烟：

- **Web 与文档 demo**：默认用 `agent-browser`（具体命令以 `agent-browser --help` 为准）。
- **原生应用（如 Interweave）**：在真实应用窗口用 Peekaboo（需 macOS 辅助功能与屏幕录制系统授权，无授权结论无效）或 `computer-use` 验证 OS 集成行为（文件选择、对话框、剪贴板、菜单、Dock）；也可在可独立运行的浏览器预览中用 `agent-browser` 辅助验证前端，两种表面不互替。
- **冒烟覆盖**：改动影响的主路径与失败/取消/空态、桌面与移动视口（无空白/溢出/遮挡/错位）、console 与页面无新增报错。
- **证据档位不混用**：明确标注**仿真无回归**（视口仿真/截图观察，不证明真实触控，且须读回 `window.innerWidth` 确认生效）或**真机验收**（真实设备/应用验收，最高档）。Playwright webkit 不能替代真 Safari 定案；macOS 整片发黑截图视同未取到。构建成功、jsdom 或无障碍树快照不等于真实交互验证。

## 浏览器与本地服务资源回收

任何启动浏览器或本地服务的任务（含非 UI 调研、截图、MCP/CLI 驱动）均遵守：

1. 默认 **headless**；仅需观察窗口或录屏时用 headed 并说明原因。
2. 单任务同时间保持单实例并复用专用 profile；隔离 cookie/storage 用隔离 context，不另起浏览器进程。
3. **严禁触碰用户日常浏览器或默认/命名持久 profile**；只清理本任务创建的临时专用 profile。
4. **只停止本任务启动的进程与 dev server**：关闭 tab 不等于关闭浏览器；退出前核验没有残留进程占用本任务专用 profile，绝不猜测终止共享服务或其他任务的进程（归属无法确认时先按 [`workflow.md`](./workflow.md#授权边界与-pr-自动跟进) 取得授权或记为未完成）。
5. 仅对本地自签名 HTTPS demo 忽略证书错误，不为外部站点放松校验。

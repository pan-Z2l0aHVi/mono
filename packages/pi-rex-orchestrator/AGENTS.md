# pi-rex-orchestrator

私有 Pi 扩展，由 Pi 的 jiti 直接加载 [`src/index.ts`](./src/index.ts)，不经 Vite 打包。

## 运行时与依赖边界

- **零运行时外部依赖**：只用 Node 内置模块与 Pi 扩展 API，不引入 `workspace:*` 或第三方运行时包，不写仅构建期注入的语法（如 `import.meta.env`）。
- **Pi 宿主类型**：声明维护在 [`src/pi-types.ts`](./src/pi-types.ts)（对照真实宿主 `dist/core/extensions/types.d.ts`），不安装 `@earendil-works/pi-coding-agent`（会拖入 provider 闭包并污染根 `allowBuilds`）。
- **脚本落点与退出序**：`scripts/run-headless.mjs` 须保持纯 JS 零外部依赖；放在 `scripts/` 而非 `bin/`（根 `.gitignore` 排除了 `bin/`）；子进程 `close` 真实退出码优先于信号合成码，且必须等 `eventsStream.end()` flush 回调后再 `process.exit`（否则截断末尾 JSONL 丢 `session_id`）。

## 安全护栏与防递归红线

- **防递归前缀**：激活条件为 `REX_SESSION` 且 `PI_REX_ORCH !== "0"`；派生命令必须带 `/usr/bin/env PI_REX_ORCH=0` 前缀（`rex run` 无 `--env` 且 `pi.exec` env 到不了子 PTY）。
- **双层护栏缺一不可**：`session_start` 设 `setActiveTools` 白名单 + `tool_call` 钩子硬拦 `bash`/`write`/`edit`/`powershell` 与 `destructiveHint` MCP 工具；有意移除 `bash`，`session_shutdown` 必须还原工具集否则 `/reload` 后工具永久消失。
- **`rex_cli` 路由边界**：`rex_cli` 只做只读或非改码 Rex 操作，改仓库代码必须走 `rex_spawn_agent`；拒绝长驻 `events`；未知前置 flag / 缺值 fail closed；CLI 参数注入清单、截断与超时边界以 [`src/`](./src/) 与测试为准，升级 Rex 后重枚举 `--help` 并同步测试。

## 非显然时序与防回归陷阱

- **Session 延迟初始化与 Stale Runtime**：工厂期拿不到 Pi session id，`HandoffStore` 与 `registry.json` 持久化在 `session_start` 初始化并全量对账；`session_shutdown` 必须停摆所有计时器与事件环，回调先检查 `active`（否则在 stale runtime 调 `pi.sendMessage`/`setActiveTools` 抛未捕获异常）。
- **Send-ACK 时序**：interactive 投递的 Send-ACK 监听必须在 `rex send` **之前**订阅，且投递只记 turn 不触发合成状态转移（否则自家转移抢先误判 ACK）。headless 续跑走 `replaceBlock` 原子替换（旧 Block 入 `retiredBlockIds`），提不到 `session_id` 直接报错不静默开新会话。
- **OSC 重放防误熔断**：断连对账会重放 OSC 状态，必须按 `updated_at` 严格单调（`<=` 拒）+ 按轮次（`errorTurn`）计错，不能见 error 就 +1。
- **保守 Worktree 清理**：全新 worktree 无独立提交，`git branch --merged` 会视其为已合并，对 `unconfirmed:` placeholder 的非 force 清理必须先经用户确认防误删；squash 落地探针只读 Git 引用、路径超 200 条或异常一律 `inconclusive` 保留，绝不退化为 `branch -D`。测试须用真实 `git init`/`git worktree add`（手写 fixture 会掩盖 `gitdir:` 布局差异）。
- **CLI 实测差异**：claude 位置参数 prompt 须在值型 flag（如 `--add-dir`）之前；`codex exec resume` 无 `--add-dir` 且 `--json` 在 `resume` 后；codex 按 `supportsOsc7501: false` 处理。
- **联调与环境变量坑**：在 claude-code shell 调 `pi` 做 E2E 前先清 `ANTHROPIC_AUTH_TOKEN`/`ANTHROPIC_BASE_URL`/`ANTHROPIC_API_KEY`（否则 pi 误用网关报 403）；删开发 worktree 前先跑 `link:pi -- --main` 切回主仓防软链悬空；端到端联调只在临时沙箱仓做。
- **多仓 Worker 规范加载**：worker 按 cwd 加载目标仓规范（`AGENTS.md` / `CLAUDE.md` / `.claude/`），被 gitignore 的本地配置（如 `.claude/settings.local.json`）靠 `scanIgnoredDeps` 与 brief 告知。

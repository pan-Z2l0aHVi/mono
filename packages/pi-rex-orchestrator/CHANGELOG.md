# @greypan/pi-rex-orchestrator

## 0.2.0

### Minor Changes

- b56249d: Add `rex_cli` as the model-only Rex operation surface, with session injection, guarded worker-agent routing, bounded output, and direct Rex control alongside agent coordination.
- dc7f1b4: Detect squash-merged worker branches against the base tree, preserve safe optional local merge for repositories without a PR flow, and make close prompts distinguish repository flow, local merge, and forced cleanup.

## 0.1.1

### Patch Changes

- 79da093: Fix `HandoffStore.saveRegistry` rejecting with `ENOENT` when concurrent writes raced over the shared fixed-name `.tmp` file: each write now uses a unique temporary name and cleans it up on failure. Concurrent snapshot writes are also serialized so the registry persists in call order and a later snapshot always wins.

## 0.1.0

### Minor Changes

- 9cfcb55: 新建私有 Pi 扩展 `@greypan/pi-rex-orchestrator`：Rex 会话内的只读协调者。零运行时外部依赖，由 Pi 的 jiti 直接加载 `src/index.ts`。
  
  - 条件激活（`REX_SESSION` 且 `PI_REX_ORCH !== "0"`），非 Rex 终端零副作用；派生命令统一 `/usr/bin/env PI_REX_ORCH=0` 前缀防递归。
  - 只读护栏两层：`setActiveTools` 白名单 + `tool_call` 硬拦 `bash`/`write`/`edit`/`powershell` 与 `destructiveHint` MCP 工具。
  - Profile 白名单（内置 `claude`/`codex`）与双模命令模板，参数形态经本机实测锁定；高危全自动标志检测告警。
  - 双模调度：interactive 短指令 + Send-ACK；headless 经 `scripts/run-headless.mjs` 无损落盘 JSONL、渲染摘要、转发信号并透传真实退出码；多轮续跑原子替换旧 Block。
  - Rex 事件流状态机：双层 JSON 解析、终态幂等合并、熔断器、断连重连全量对账。
  - `~/.cache/pi-rex-orch/`（0700）按轮次交接；`base_commit` 全量验收与 worktree 完整生命周期（零提交屏蔽、脏工作区提示、保守清理 + 分支回收）。
  - 工具集 `ask_user` + `rex_spawn_agent`/`rex_list_workers`/`rex_send_input`/`rex_inspect_output`/`rex_inspect_changes`/`rex_close_worker`；命令 `/rex-status`、`/rex-pause`、`/rex-resume`、`/rex-cleanup`。

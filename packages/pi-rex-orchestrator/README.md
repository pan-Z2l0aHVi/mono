# pi-rex-orchestrator

> Rex 会话内的 Pi 操作者 + agent 协调者：直接操作 Rex，把代码改动派发给 worker agent，跟踪状态并做全量验收。

私有 Pi 扩展，零运行时外部依赖（只用 Node 内置模块与 Pi 扩展 API）。Rex 之外的终端里输入 `pi` 保持 100% 原生 Coding Agent，不产生任何副作用。

## 激活

- 仅当 `REX_SESSION` 存在且 `PI_REX_ORCH !== "0"` 时激活协调者模式。
- 派生 worker 的命令统一带 `/usr/bin/env PI_REX_ORCH=0` 前缀：Rex 是 C/S 架构且 `rex run` 没有 `--env` 参数，环境变量必须经命令前缀透传，防止把 `pi` 配成 worker 时递归变协调者。

## 工具面（model-only）

直接 `rex_cli` 只做只读或不动仓库代码的操作；`rex run` 不是改码通道，仓库代码改动统一派 worker。

| 工具                  | 作用                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `ask_user`            | 弹窗向用户提问；Agent、运行模式或 Worktree 策略未指定时必须先问。                                                                          |
| `rex_cli`             | 以 argv 数组执行 Rex 操作；session 按 `--help` 白名单注入，覆盖 tab / window、pane / block、app、读取与命令控制。                          |
| `rex_spawn_agent`     | 从白名单 profile 派生 worker；长任务写入 `turn-001.brief.md`，只发短指针指令。                                                             |
| `rex_send_input`      | 追加轮次；interactive 走 `rex send` + Send-ACK，headless 走 `resume` 续跑并原子替换旧 Block。                                              |
| `rex_list_workers`    | 列出本会话全部 worker 与状态。                                                                                                             |
| `rex_inspect_output`  | 读 worker 最新输出：handoff 优先，缺失降级 events.jsonl 尾部或屏幕 capture，绝不读旧轮次文件。                                             |
| `rex_inspect_changes` | 以派生时 `base_commit` 为基线的全量验收（Committed + Staged + Unstaged + Untracked 预览）。                                                |
| `rex_close_worker`    | 关闭 worker；干净且分支已合入或内容已落地才自动清理；其余情况给出仓库流程 / 可选本地 merge / `force` 路径，详见 [AGENTS.md](./AGENTS.md)。 |

`rex_cli` 的语法以安装的 Rex 为准：先调 `rex_cli(["__internal", "skill"])` 或 `rex_cli(["--help"])` 自查，命令失败时按回传的 stderr 修正 argv。完整的命令注入、拒绝点、超时与输出边界见 [AGENTS.md](./AGENTS.md)。

## 命令

`/rex-status`（事件流健康度与 worker 列表）、`/rex-pause <worker>` / `/rex-resume <worker>`（人工接管保护）、`/rex-cleanup`（回收残留 Block 与已合并/确认废弃的 worktree）。

## Profile 白名单

默认内置 `claude` 与 `codex`，命令模板经本机实测锁定：

- claude 位置参数 prompt 必须放在 `--add-dir` 之前，否则被当作 flag 值吞掉。
- `codex exec resume` 不支持 `--add-dir`（父命令才有），`--json` 跟在 resume 之后。
- headless 命令经 `process.execPath` 调 `scripts/run-headless.mjs` 包装：原始 JSONL 无损落盘、PTY 摘要渲染、`SIGINT`/`SIGTERM` 转发、flush 后透传子进程真实退出码。

自定义或覆写 profile 放在 `~/.pi/agent/rex-orchestrator.json`（建议 `0600`）：

```json
{
  "profiles": {
    "claude": { "binary": "/opt/homebrew/bin/claude", "extraArgs": ["--model", "opus"] },
    "my-agent": { "binary": "/path/to/cli", "extraArgs": ["--fast"], "addDirFlag": "--add-dir" }
  },
  "worktreeSetupHook": "ln -sfn \"$MAIN_CWD/.env\" .env"
}
```

`worktreeSetupHook` 在 worktree 目录内经 shell 执行，环境里提供 `$MAIN_CWD`（主仓库绝对路径）。

## 仓库级 agent 配置

worker 按自己的 cwd 加载所在仓库的规范与配置（AGENTS.md、CLAUDE.md、`.claude/settings.json` 等，以各 CLI 的机制为准）：共享目录模式下天然生效；worktree 模式下**被跟踪的**配置随检出带过去，**被 ignore 的本地配置**（如 `.claude/settings.local.json`）不在 worktree 里——spawn 时会扫描这些常见项并在 brief 中告知，brief 也要求 worker 开工前先读仓库级规范。

## 交接区

```
~/.cache/pi-rex-orch/<pi-session-id>/        # 0700
├── worktrees/<worker-id>/                   # 可选独立 git worktree（branch pi-orch/<session>/<worker-id>）
└── workers/<worker-id>/                     # --add-dir 只授权给该 worker
    ├── turn-001.brief.md                    # 协调者写的任务说明
    ├── turn-001.handoff.md                  # worker 写的结构化交接结论
    └── turn-001.events.jsonl                # headless 原始事件流
```

## 安装与联调

```sh
pnpm --filter @greypan/pi-rex-orchestrator run link:pi      # 软链到 ~/.pi/agent/extensions/rex-orchestrator（指向当前 worktree）
pnpm --filter @greypan/pi-rex-orchestrator run link:pi -- --main   # 删除开发 worktree 前切回主仓库 main 常驻路径，防软链悬空
```

开发与验收在临时沙箱仓库做（`git worktree` 创建/回收与 diff 验收不要拿主力 monorepo 联调）；端到端验收清单见方案阶段 4。

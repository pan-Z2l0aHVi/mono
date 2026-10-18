# 客户端运行环境

这份文档只回答两个问题：agent 客户端跑在什么权限下，以及它往 shell 里注入了什么环境变量。工具链自身的机制（mise、turbo、Go 缓存）在 `docs/agents/worktree.md`，包级构建配置在 `docs/agents/build.md`，都不在这里重复。

## 权限

Codex 的权限由机器级 `~/.codex/config.toml` 决定，不属于仓库政策。仓库内没有 `.codex/config.toml`：`.gitignore` 把 `.codex/` 排除在版本控制之外，所以这份配置不随仓库分发，本地 task 台账也无法证明运行时权限配置。配置在会话启动时读取，改完只影响新开的线程。

当前这台机器上写的是：

```toml
sandbox_mode = "danger-full-access"
approval_policy = "on-request"
approvals_reviewer = "auto_review"
```

命令没有文件系统边界，残余的审批请求交给自动评审而不是人。

**为什么不用沙箱。** 线程的工作区是 git worktree，它自己的 admin 目录（`<主仓库>/.git/worktrees/<slug>/`）被 Codex 按**名字**保护，不按位置。所以无论怎么配可写根，`git add` 和 `git commit` 都会被拒，每次都要走 approval 提权，线程反复停在等待审批上。沙箱在这里守的是 `.agents/`、home 与 `~/Documents`，收益抵不上代价。

**代价。** 隔离退回到五项只读 checks、Git 禁令和目录纪律这些仓库机制，没有运行时保证。这是对官方推荐的主动偏离——官方建议可信仓库用 `workspace-write` + `on-request`，全访问只留给受控容器。

**不要用 `--approve-for-me`。** 它在 CLI 层注入 `sandbox_mode="workspace-write"`，而 CLI 层覆盖一切配置层，会把上面的决定顶掉。要自动评审就写 `approvals_reviewer = "auto_review"`：那是审批路由，不是沙箱的配套。

判断线程实际跑在什么权限下，看配置和线程的实际行为，不要凭 profile 名或记忆里的参数——参数值抄进记忆，只会在配置没生效时反过来骗人。

## 注入的环境变量

`[shell_environment_policy.set]` 曾经注入 `CHOKIDAR_USEPOLLING=1`，随沙箱一起移除。它不是 Codex 的推荐项，而是针对沙箱的变通：沙箱不允许 `mach-lookup com.apple.FSEvents`，Node 的 `fs.watch` 因此不可用，chokidar 回退到轮询时会耗尽文件描述符，monorepo 的构建会死在 watch 阶段。

## 改回沙箱时要一起恢复的东西

把 `sandbox_mode` 改回 `workspace-write` 时，下面两项必须同时恢复，否则工具链会在两个地方失败：

- `[sandbox_workspace_write]`：开 `network_access`，并把工具链缓存目录（mise、pnpm、npm、go、`Library/Caches`、`~/.cache`）和主仓库的 `.git` 列进 `writable_roots`。主仓库的 `.git` 覆盖共享的 Turbo 缓存目录；少了任何一类，worktree 里的 `pnpm` 会因为无法 lock `.git/config` 而失败。列的是 `.git` 本身而不是仓库根：Codex 按名字保护 `.git`，把整个根列进去也不生效。
- `[shell_environment_policy.set] CHOKIDAR_USEPOLLING=1`：成因见上一节。

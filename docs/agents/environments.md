# 客户端运行环境

这份文档只回答一个问题：agent 客户端跑在什么权限下。工具链自身的机制（mise、turbo、Go 缓存）在 worktree.md，包级构建配置在 [`build.md`](./build.md)，都不在这里重复。

## 权限

权限分两层。机器级配置决定本机默认（模型、provider、登录、全局 hooks、审批路由），不入库；仓级配置承载本仓库需要的偏离，入库。换机器、换账号时，机器级那层要自己配。

| 层     | 文件                                | 权限                                                                                                          |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 机器级 | `~/.codex/config.toml`（不入库）    | `workspace-write` 沙箱 + `on-request` + `auto_review`，等价于 CLI 的 `--approve-for-me`                       |
| 机器级 | `~/.claude/settings.json`（不入库） | `permissions.defaultMode = "auto"`                                                                            |
| 仓级   | `.codex/config.toml`（入库）        | `sandbox_mode = "danger-full-access"`、`approval_policy = "on-request"`、`approvals_reviewer = "auto_review"` |
| 仓级   | `.claude/settings.json`（入库）     | 只放 `permissions.deny`，没有 allow                                                                           |

项目层优先于机器层，所以本仓库跑全访问，其他仓库跑沙箱 + 自动评审。Codex 仓级配置只对受信任项目生效（详见下文前提）。

### Claude Code：auto 在机器级，仓级只留 deny

权限模式**不能由仓库授予**：把 `permissions.defaultMode = "auto"` 写进仓级或仓库本地设置，Claude Code 会忽略并告警——日志原文是 `settings defaultMode "auto" ignored — only policy/user/flag settings may grant auto mode (projectSettings and localSettings are repo-controllable)`。auto 只认 policy、用户设置或 CLI flag，所以它写在 `~/.claude/settings.json`，仓级没有可写的位置。

仓级 `.claude/settings.json` 因此只放 `deny`，把仓库已有的硬规则变成机器拦截：`.env` 不读，生成物不手改（清单见 [`generated-artifacts.md`](./generated-artifacts.md)）。`deny` 与 auto 模式不冲突——auto 决定「要不要问」，`deny` 是直接拒绝，实测在 auto 下仍然生效；`Edit(...)` 同时覆盖 Edit 与 Write 两个工具。

这些条目只挡工具调用，不挡 generator：产物由构建脚本直接写盘，所以「跑 generator 让工具产生 diff」的正常路径不受影响。`**/__screenshots__/` 与 `**/.vitest-attachments/` 故意没进 `deny`：视觉基线由测试运行器写盘，手改既拦不住也不值得为它牺牲显式更新基线的能力。

`deny` 是绊脚石，不是边界：它拦住直白写法（`cat README.md` 会被 `Read(./README.md)` 挡下），但 `node -e "readFileSync(...)"` 能绕过去。要真隔离得靠沙箱。

不要往仓级放 `allow`。auto 模式下 Claude 自己会丢弃那些「绕过分类器」的条目（日志原文 `Ignoring dangerous permission Bash(pnpm run *) ... (bypasses classifier)`），白名单与 auto 互斥。

### 不要用 `settings.local.json` 存命令白名单

Claude 按 git common dir 解析工程设置，不按目录：主仓库 `.claude/settings.local.json` 里的条目会被所有 worktree 会话读到。那里曾经堆了 20 多条 allow，已在本机清空并就地备份（备份目录属机器本地状态，不写进仓库）。要放宽权限就改机器级的权限模式，不要在这种「本地私货」文件里逐条堆命令。

### Codex：没有按路径的 deny，别指望仓级拦住文件

Codex 没有 Claude 的 `permissions.deny` 对应物。`[sandbox_workspace_write]` 只有反向的 `writable_roots`，写成 `read_only_paths`、`deny_paths`、`protected_paths` 都会被 `--strict-config` 判成 `unrecognized configuration setting`；而本仓库跑 `danger-full-access`，`writable_roots` 这个表根本不参与，所以仓级当前没有任何按路径的限制能力。

可编程的口子只有 hooks：`[[hooks.PreToolUse]]` 配 `matcher`，内层 `[[hooks.PreToolUse.hooks]]` 用 `type = "command"`，脚本从 stdin 读 `tool_name` 与 `tool_input`，回 `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny"}}`。`hooks` feature 在实测版本里已是 stable 且默认启用（版本以 `codex --version` 为准），这份配置被 `--strict-config` 接受，hook 来源里包含 `project`，所以能写在 `.codex/config.toml`。

不值得这么做：hooks 需要逐台机器在交互式会话里 `/hooks` 信任，未信任直接跳过（非交互只能 `--dangerously-bypass-hook-trust`）；hook 只拿到工具入参，路径匹配要自己写，且不覆盖所有 shell 调用；全访问下 agent 也能改 hook 脚本本身。生成物不手改这条约束交给 [`AGENTS.md`](../../AGENTS.md) 与代码评审，别在 Codex 侧伪造一个护栏。

## 为什么全访问

线程工作区是 git linked worktree，它自己的 admin dir（`.git/worktrees/<slug>/index.lock`）被 Codex 按名字保护，沙箱下 `git add` 与 `git commit` 每次都要提权，线程反复停在审批。代价是命令不再有文件系统边界，隔离退回到仓库 checks、Git 禁令和目录纪律，没有运行时保证。这是对官方推荐（可信仓库用 `workspace-write` + `on-request`，全访问仅限受控容器）的主动偏离，不是默认值。

## 为什么放在仓级而不是机器级

全访问是为本仓库的 monorepo 多 agent 开发设的，不是这台机器的通用策略。写在 `~/.codex/config.toml` 会让所有仓库一起失去文件系统边界；放到仓级后，只有本仓库跑全访问，其他仓库回落机器级（沙箱 + 自动评审）。

机器级不写全访问还有一个副作用值得记住：审批路由（`approvals_reviewer`）与沙箱是两个独立 toggle。审批可以交给自动 reviewer，但不能用它换取网络或文件系统权限——`workspace-write` 下网络仍是受限的，`pnpm install` 这类需要出网的命令在别的仓库里会失败，且自动评审无法放行，只能靠 `[sandbox_workspace_write] network_access = true` 或仓级全访问。

## 前提：Codex 只加载受信任项目的 `.codex/` 层

项目未受信任时，Codex 跳过整个 `.codex/` 层（config、hooks、rules），仓级配置静默失效并回落到默认沙箱——不报错，只是不生效。信任记在仓库身份上而不是某条路径，linked worktree 继承主仓库的信任状态，新增 worktree 不需要逐条登记。

判断线程实际跑在什么权限下，看配置与线程的实际行为，不要凭 profile 名或记忆里的参数推断：

```sh
codex doctor | sed -n '3,6p'   # 沙箱行是 unrestricted，才说明仓级配置真的加载了
```

## 约定

- 不要用在 CLI 层覆盖配置的参数改变沙箱；要自动评审就配置审批路由，不要把它当成沙箱的配套。
- 仓级只有 `.codex/config.toml` 与 `.claude/settings.json` 两个文件，都属共享配置，改动需要逐次授权（见 [`workflow.md`](./workflow.md#预授权操作)）。配置在会话启动时读取，改完只影响新开的线程。
- 仓级放宽不等于动作免授权：改变仓库历史、分支、远端状态（含 `git push`），以及发布、凭证、破坏性操作，仍按 [`workflow.md`](./workflow.md#怎么取得这个授权) 逐次取得授权。

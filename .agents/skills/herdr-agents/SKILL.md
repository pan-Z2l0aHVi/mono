---
name: herdr-agents
description: 用 Herdr 把一份需求编排成多个角色会话：建 task worktree、每个角色一个 pane、按绑定表启动 Claude Code 或 Codex CLI、初始化 Role、非阻塞派发并监听结果。仅在用户明确要求用 Herdr 做多 agent 编排时触发（/herdr-agents）。不用于 pane、tab、worktree 的命令语法（见 herdr skill），也不用于单个 subagent 的委派。
disable-model-invocation: true
---

# Herdr Agents

## 何时加载与来源

只在需要把实施工作分派给多个独立 CLI 会话（Lib Coder、Biz Coder、Reviewer 各占一个 pane）时加载。单会话实施、只改一个 workspace，或只需要一个后台终端跑命令时不要加载；后者用 `herdr pane run`。

本 skill 只承载编排时序。执行体绑定的唯一权威表在根 [`AGENTS.md`](../../../AGENTS.md) 的「多 Agent 编排」；级别、状态机、review 拓扑与非阻塞派发要求在 [`docs/agents/workflow.md`](../../../docs/agents/workflow.md)；worktree 路径约定在 [`docs/agents/worktrees.md`](../../../docs/agents/worktrees.md)；handoff 五个必填字段在 [`docs/agents/task-packet.md`](../../../docs/agents/task-packet.md)；角色初始化 prompt 的权威文案在 [`CONTRIBUTING.md`](../../../CONTRIBUTING.md)。pane、tab、workspace、agent 命令的语法与安全性边界以已安装的 `herdr` CLI 和上游 [`herdr` skill](../herdr/SKILL.md) 为权威，本文件不复述。

## 前置

```sh
test "${HERDR_ENV:-}" = 1 && herdr status
```

检查不通过说明当前会话不在 Herdr pane 内：报告这一点并停下，不要从会话外操控用户的 Herdr session。

## 流程

1. 一个可变 task 一个 worktree，`--path` 显式给出 `<仓库目录名>-worktrees/<task-id>`：

   ```sh
   herdr worktree create --cwd <repo> --branch <branch> --base <sha> --path ../mono-worktrees/<task-id> --no-focus
   ```

   它实际建立的 workspace 与 worktree 绝对路径都从返回 JSON 读，不要按分支名推导。

   `cd` 进这个新目录再跑 preflight（`pnpm task new`、`task assign`、`task start`，命令见 [`docs/agents/workflow.md`](../../../docs/agents/workflow.md)），并 `pnpm install && pnpm run build`；task state 记录的 worktree 必须是这个目录而不是 Manager 自己所在的目录，依赖未安装时后面第 6 步的 freeze 归一化跑不起来（见 [`docs/agents/worktrees.md`](../../../docs/agents/worktrees.md)）。

2. 每个角色一个 pane：`--current` 把新 pane 挂在 Manager 自己所在的 tab（不是第 1 步新建的 workspace），角色会话的工作目录只由 `--cwd` 决定；保持用户焦点：

   ```sh
   herdr pane split --current --direction right --cwd <第 1 步返回的 worktree 绝对路径> --no-focus
   ```

   从返回 JSON 的 `.result.pane.pane_id` 取新 pane id，供第 3 步的 `--pane` 使用。agent 名取 `<role>-<task 后缀>` 的小写形式，必须匹配 `[a-z][a-z0-9_-]{0,31}` 且未被占用（先查 `herdr agent list`）。tab label 只是给人看的别名，不决定角色。

3. 启动执行体。`--kind` 是绑定表里的执行体在 herdr 中的名字：Claude Code → `claude`，Codex CLI → `codex`。启动参数按 [`roles/manager.md`](./roles/manager.md) 的「Dispatch permissions」表逐角色给出：

   ```sh
   herdr agent start lib-coder-260919 --kind codex --pane <pane_id> -- <agent-args...>
   ```

   成功返回只代表 Herdr 检测到该 agent 就绪，不代表它读过任何角色文件。返回 `agent_not_ready` 说明它停在启动期的审批或提问界面：先 `herdr agent wait lib-coder-260919 --until idle` 等它空闲，再进入下一步。

4. 初始化 Role，等回执确认后再派任务：

   ```sh
   herdr agent prompt lib-coder-260919 "本会话担任 lib-coder。读取并遵循 .agents/skills/herdr-agents/roles/lib-coder.md，将其作为本会话的角色与协作规范。" --wait --timeout 120000
   ```

   复用已有会话前先 `herdr agent read <name> --source recent-unwrapped --lines 120` 核对它当前的 Role；不清楚或已漂移就重做本步。

5. 非阻塞派发：先把全部 handoff 提交出去，再逐个监听。

   ```sh
   herdr agent prompt lib-coder-260919 "<五字段 handoff>"
   herdr agent prompt biz-coder-260919 "<五字段 handoff>"
   herdr agent wait lib-coder-260919 --timeout 900000
   ```

   settled 状态只是生命周期信号。`timeout` 与 `agent_prompt_stalled` 都不能证明 prompt 未送达，`agent_blocked` 说明对方停在审批或提问界面；任何重发之前先 `herdr agent get` 和 `agent read` 看清现场。

6. 收敛：每个 task 各自走完 freeze → review → approve → done 再汇总。只关闭自己创建的 pane；`worktree remove`、`workspace close --group`、`server stop` 未经用户明确要求不执行。

## 完成定义

- 每个实施会话都有独立 worktree、唯一 owner 和已确认加载的 Role；`pnpm task status --task <task-id>` 的 `roles` 与实际派发的角色一致。
- 交接内容都是五字段 handoff，没有跨目录写入，也没有在共享工作区做 Git 改写。
- review 与 approval 绑定当前 `diffHash`；发生过重 freeze 就重新走过 review。

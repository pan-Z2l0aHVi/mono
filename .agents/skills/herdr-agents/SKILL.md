---
name: herdr-agents
description: 用 Herdr 把一份需求编排成多个角色会话：建 task worktree、每个角色一个 pane、按绑定表启动 Claude Code 或 Codex CLI、初始化 Role、非阻塞派发并监听结果。仅在用户明确要求用 Herdr 做多 agent 编排时触发（/herdr-agents）。不用于 pane、tab、worktree 的命令语法（见 herdr skill），也不用于单个 subagent 的委派。
disable-model-invocation: true
---

# Herdr Agents

## 何时加载与来源

只在需要把实施工作分派给多个独立 CLI 会话（Lib Coder、Biz Coder、Reviewer 各占一个 pane）时加载。单会话实施、只改一个 workspace，或只需要一个后台终端跑命令时不要加载；后者用 `herdr pane run`。

本 skill 只承载编排时序和本仓特有取值。执行体绑定的唯一权威表在根 [`AGENTS.md`](../../../AGENTS.md) 的「多 Agent 编排」；级别、状态机、review 拓扑与非阻塞派发要求在 [`docs/agents/workflow.md`](../../../docs/agents/workflow.md)；worktree 路径约定在 [`docs/agents/worktrees.md`](../../../docs/agents/worktrees.md)；handoff 五个必填字段在 [`docs/agents/task-packet.md`](../../../docs/agents/task-packet.md)；角色初始化 prompt 的权威文案在 [`CONTRIBUTING.md`](../../../CONTRIBUTING.md)。pane、tab、workspace、worktree、agent 的语法、JSON 字段路径、生命周期状态语义与安全性边界，以已安装的 `herdr` CLI 和上游 [`herdr` skill](../herdr/SKILL.md) 为权威，本文件不复述。

## 流程

0. 先按上游 skill 做前置检查：不在 Herdr pane 内就报告并停下，不要从会话外操控用户的 session。

1. 一个可变 task 一个 worktree。上游默认不建 worktree、不换 cwd，这里必须建，且 `--path` 显式给出 `<仓库目录名>-worktrees/<task-id>`：

   ```sh
   herdr worktree create --cwd <repo> --branch <branch> --base <sha> --path ../mono-worktrees/<task-id> --no-focus
   ```

   它实际建立的 workspace 与 worktree 绝对路径都从返回 JSON 读，不要按分支名推导。

   `cd` 进这个新目录再跑 preflight（`pnpm task new`、`task assign`、`task start`，命令见 [`docs/agents/workflow.md`](../../../docs/agents/workflow.md)），并 `pnpm install && pnpm run build`；task state 记录的 worktree 必须是这个目录而不是 Manager 自己所在的目录，依赖未安装时第 6 步的 freeze 归一化跑不起来（见 [`docs/agents/worktrees.md`](../../../docs/agents/worktrees.md)）。

2. 每个角色一个 pane。这里也与上游默认冲突：`--current` 把新 pane 挂在 Manager 自己所在的 tab（不是第 1 步新建的 workspace），角色会话的工作目录只由 `--cwd` 决定，保持用户焦点；tab label 只是给人看的别名，不决定角色：

   ```sh
   herdr pane split --current --direction right --cwd <第 1 步返回的 worktree 绝对路径> --no-focus
   ```

   agent 名取 `<role>-<task 后缀>` 的小写形式。

3. 启动执行体。`--kind` 是绑定表里的执行体在 herdr 中的名字：Claude Code → `claude`，Codex CLI → `codex`；启动参数按 [`roles/manager.md`](./roles/manager.md) 的「Dispatch permissions」表逐角色给出。成功返回只代表 Herdr 检测到该 agent 就绪，不代表它读过任何角色文件，所以 Role 必须单独初始化。

4. 用 [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) 的初始化 prompt 逐角色派发到对应 agent，等回执确认后再派任务。复用已有会话前先核对它当前的 Role；不清楚或已漂移就重做本步。

5. 非阻塞派发：先把全部 handoff 提交出去，再逐个监听，避免串行等一个角色做完才派下一个。实施会话一轮可能跑很久，监听显式给长超时（如 `--timeout 900000`）而不是无限等。

6. 收敛：每个 task 各自走完 freeze → review → approve → done 再汇总。

## 完成定义

- 每个实施会话都有独立 worktree、唯一 owner 和已确认加载的 Role；`pnpm task status --task <task-id>` 的 `roles` 与实际派发的角色一致。
- 交接内容都是五字段 handoff，没有跨目录写入，也没有在共享工作区做 Git 改写。
- review 与 approval 绑定当前 `diffHash`；发生过重 freeze 就重新走过 review。

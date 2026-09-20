---
name: herdr-agents
description: 用 Herdr 把一份需求编排成多个角色会话：建 task worktree、每个角色一个 pane、按绑定表启动 Claude Code 或 Codex CLI、初始化 Role、非阻塞派发并监听结果。仅在用户明确要求用 Herdr 做多 agent 编排时触发（/herdr-agents）。不用于 pane、tab、worktree 的命令语法（见 herdr skill），也不用于单个 subagent 的委派。
disable-model-invocation: true
---

# Herdr Agents

## 何时加载与来源

只在需要把实施工作分派给多个独立 CLI 会话（Lib Coder、Biz Coder、Reviewer 各占一个 pane）时加载。单会话实施、只改一个 workspace，或只需要一个后台终端跑命令时不要加载，这类需求直接归上游 `herdr` skill。

本 skill 只承载编排时序和本仓特有取值：谁先谁后、每个会话在哪个目录、派什么内容。它同时是本仓 Role 机制的唯一落点——角色契约、可用 Role 列表、初始化 prompt 都在这个目录内，普通单会话不承担 Role。执行体绑定的唯一权威表在根 [`AGENTS.md`](../../../AGENTS.md) 的「多 Agent 编排」；级别、状态机、review 拓扑与非阻塞派发要求在 [`docs/agents/workflow.md`](../../../docs/agents/workflow.md)；worktree 路径约定在 [`docs/agents/worktrees.md`](../../../docs/agents/worktrees.md)；handoff 五个必填字段在 [`docs/agents/task-packet.md`](../../../docs/agents/task-packet.md)。凡涉及 herdr 本身的操作——前置检查、pane、tab、workspace、worktree、agent 的命令与参数、返回 JSON 的字段、生命周期状态语义、焦点与安全边界——以已安装的 `herdr` CLI 和上游 [`herdr` skill](../herdr/SKILL.md) 为权威：每一步动手前先读它，再按它当前的语法执行，本文件不复述。

## 流程

1. 一个可变 task 一个 worktree，落在 `<仓库目录名>-worktrees/<task-id>`（路径约定见 [`docs/agents/worktrees.md`](../../../docs/agents/worktrees.md)）。`cd` 进这个新目录再跑 preflight（`pnpm task new`、`task assign`、`task start`，命令见 [`docs/agents/workflow.md`](../../../docs/agents/workflow.md)），并 `pnpm install && pnpm run build`：task state 记录的 worktree 必须是这个新目录而不是 Manager 自己所在的目录，依赖未安装时第 6 步的 freeze 归一化跑不起来。

2. 每个角色一个会话，agent 名取 `<role>-<task 后缀>` 的小写形式。这里唯一不可让的是工作目录：角色会话必须工作在它所属 task 的 worktree 里，不沿用 Manager 的目录，否则两个角色会写同一个目录，违反 `AGENTS.md` 的独立 worktree 与唯一 owner。挂在哪个 tab 或 workspace 都可以，按上游 skill 判断。

3. 启动执行体。herdr 里的 kind 名对应绑定表执行体：Claude Code → `claude`，Codex CLI → `codex`；启动参数按 [`roles/manager.md`](./roles/manager.md) 的「Dispatch permissions」表逐角色给出。

4. 初始化 Role。Harness 不会自动选择 Role，`<role>` 取 `roles/` 下的文件名；向每个新会话发一条消息，等回执确认 Role 已加载后再派任务：

   ```text
   本会话担任 <role>。读取并遵循 `.agents/skills/herdr-agents/roles/<role>.md`，将其作为本会话的角色与协作规范。
   ```

   Role 在该会话内持续生效，任务可在之后分次提供，不与某一个 task 绑定。复用已有会话前先核对它当前的 Role；不清楚或已漂移就重做本步。

5. 非阻塞派发：先把全部五字段 handoff 提交出去，再逐个监听，不要串行等一个角色做完才派下一个。实施会话一轮可能跑很久，监听给长超时而不是无限等。

6. 收敛：每个 task 各自走完 freeze → review → approve → done 再汇总。

## 完成定义

- 每个实施会话都有独立 worktree、唯一 owner 和已确认加载的 Role；`pnpm task status --task <task-id>` 的 `roles` 与实际派发的角色一致。
- 交接内容都是五字段 handoff，没有跨目录写入，也没有在共享工作区做 Git 改写。
- review 与 approval 绑定当前 `diffHash`；发生过重 freeze 就重新走过 review。

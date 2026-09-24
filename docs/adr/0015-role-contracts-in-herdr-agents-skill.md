# ADR-0015: Role Contract 落户 herdr-agents skill

- **Date**: 2026-09-19
- **Status**: 已接受
- **Amends**: [ADR-0004](0004-progressive-agent-context-architecture.md)（Session Role 层的落点）、[ADR-0010](0010-agent-role-orchestration.md) 与 [ADR-0011](0011-agent-model-binding-and-effort.md) 中 `.agents/agents/*` 的路径表述
- **Amended by**: [ADR-0016](0016-implementation-supervision.md)（新增 Supervisor，并移除 Role 到 task state 的写入）

## 背景

历史上的 `.claude/agents -> ../.agents/agents` symlink 曾让 Role Contract 被 Claude Code 注册成 subagent。角色层本来服务于 herdr 多 agent 编排，每个角色一个独立 CLI 会话；subagent 由执行体自行管理，不需要 Role 介入。这个 symlink 已删除。

当时仓库没有一份文件完整说明 herdr 多 agent 的启动流程：`manager.md` 没有 herdr 命令，第三方 `herdr/SKILL.md` 与角色无关，`docs/agents/workflow.md` 只做了外部链接。因此需要一个显式触发的 skill 来承载这套流程。

约束：客户端的 skill 发现只扫 skills 根的一层目录（`<root>/<name>/SKILL.md`），嵌套层级不会被发现。

## 决策

1. 删除 `.claude/agents` symlink，Role Contract 只由显式 herdr skill 加载；开发者自己的未跟踪 `.claude/agents/` 目录不属于本仓契约。
2. Role Contract 迁到 `.agents/skills/herdr-agents/roles/{manager,designer,lib-coder,biz-coder,supervisor,reviewer}.md`。Role 文档只描述各自职责。
3. 新增本仓自撰 skill `.agents/skills/herdr-agents/SKILL.md`，承载 Role 列表、默认绑定、启动参数、handoff、目录边界、Supervisor 协议和 Herdr 启动流程。task 状态机与 review gate 见 `docs/agents/workflow.md`，任务主合同见 `docs/agents/task-packet.md`，worktree 布局见 `docs/agents/worktrees.md`，pane 原语见第三方 `herdr` skill。该 skill 标记 `disable-model-invocation: true`，只由用户手动触发（`/herdr-agents`）。
4. `.agents/skills/` 保持扁平：自撰 skill 与第三方 skill 同级，不引入分组目录、不引入 symlink。出处以 `skills-lock.json` 为权威——登记在册的是第三方上游件，未登记的是本仓自撰；`scripts/validate-context.mjs` 要求每个 `SKILL.md` 的目录名恰好落在其中一侧（自撰侧是脚本内的 `repoAuthoredSkills`），两边都不在或都在即报错。第三方 skill 的正文字符与语言由上游维护，其 markdown 链接不作为本仓链接校验对象。
5. task 内核不保存 Role 列表，`pnpm task assign --roles` 明确失败；旧 v1 state 中的历史 Role 字段只保留兼容读取，不由 task 内核解释或重写。

## 后果

- Role 文档从 `vp check` 的格式化范围移入 `fmt.ignorePatterns` 的 `**/.agents/skills/**`，不再自动对齐表格与换行；`validate:context` 检查 skill 与 Role Contract frontmatter、Role 文件身份、客户端注册形态、出处和本地链接，不维护固定 Role 集合或执行体镜像。
- Claude Code 会话的 subagent 列表不再出现 Role 名；`herdr-agents` 只出现在手动斜杠命令中，不进入模型的自动调用面。
- herdr 启动流程有了单一落点，`workflow.md` 与 `CONTRIBUTING.md` 继续只链接它。（2026-09-20 修订：Role 机制整体收进本 skill，契约目录、可用 Role 列表与初始化 prompt 都在 `.agents/skills/herdr-agents/` 内，`CONTRIBUTING.md` 的「角色会话」节已删除，根 `AGENTS.md` 也不再向普通会话提供 Role 入口。本条对 `workflow.md` 仍成立。）
- 编排仍依赖 `HERDR_ENV=1` 的 pane 内执行前提；skill 的前置检查负责在会话外停下，不从会话外操控用户的 Herdr session。（2026-09-20 修订：前置检查与安全条已归上游 `herdr` skill，本 skill 只在每一步前要求先读它，不再自带 `HERDR_ENV` 判定与 herdr 命令行。）

## 被否决的方案

- **只删 symlink，保留 `.agents/agents/`**：改动面最小，但编排知识继续散在三处（Manager 契约、上游 herdr skill、`workflow.md` 的外指），且「角色目录」与「skill 目录」两套并行入口没有第二个消费者。
- **`.agents/skills/internal/` 分组 + 深度 1 symlink**：多两个 symlink 与两条不变量，收益只有视觉分组；且发现机制只扫一层，嵌套分组本身反而要靠 symlink 才能被读到。文件系统层的间接不是最小化。
- **把开机时序写进 `roles/manager.md`**：只有担任 Manager 的会话读得到，其他角色与人工起会话时无从得知；也会让 Manager 契约承担流程权威，与 `workflow.md` 的权威划分冲突。
- **为角色契约单独维护一份机器可读的 ignore/allowlist 例外**：与「按名字维护的反向命中」同类，代价高于收益。

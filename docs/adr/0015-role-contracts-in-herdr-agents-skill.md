# ADR-0015: Role Contract 落户 herdr-agents skill

- **Date**: 2026-09-19
- **Status**: 已接受
- **Amends**: [ADR-0004](0004-progressive-agent-context-architecture.md)（Session Role 层的落点）、[ADR-0010](0010-agent-role-orchestration.md) 与 [ADR-0011](0011-agent-model-binding-and-effort.md) 中 `.agents/agents/*` 的路径表述

## 背景

`.claude/agents -> ../.agents/agents` 这一个 symlink 是 5 份 Role Contract 被 Claude Code 注册成 subagent 的唯一原因。角色层的本意是服务 herdr 多 agent 编排——每个角色一个独立 CLI 会话；subagent 由执行体自行管理，不需要 Role 介入。当前形态让每次会话常驻一份它用不到的注册表。40 仓样本与业界惯例中也不存在「角色契约注册为 subagent」这一形态。

同时，仓库里没有任何文件写下 herdr 多 agent 的开机时序：`manager.md` 零 herdr 命令，第三方 `herdr/SKILL.md` 与角色无关，`docs/agents/workflow.md` 的相关条目只向外指。缺口需要一个显式触发的载体。

约束：客户端的 skill 发现只扫 skills 根的一层目录（`<root>/<name>/SKILL.md`），嵌套层级不会被发现。

## 决策

1. 删除 `.claude/agents` symlink，并在 `scripts/validate-context.mjs` 断言它既不是 symlink、其下也没有被 git 跟踪的文件，使删除动作不可被「顺手补回」。symlink 是这 5 份契约被注册的机制，且悬空 symlink 同样会被客户端当成 subagent 目录，故用 `lstatSync` 判定；被跟踪的路径才会随 clone 扩散。本地未跟踪的 `.claude/agents/` 普通目录是开发者自己的项目级 subagent 落点，`.gitignore` 已整体排除，gate 不予置错——否则 CI 看不见的东西会让本地校验无解失败。
2. Role Contract 迁到 `.agents/skills/herdr-agents/roles/{manager,designer,lib-coder,biz-coder,reviewer}.md`，正文不改写。`.agents/agents/` 目录随之消失。
3. 新增本仓自撰 skill `.agents/skills/herdr-agents/SKILL.md`，只承载开机时序（建 worktree → 建 shell pane → `agent start` → `agent prompt` 初始化 Role → 非阻塞派发与监听 → 收敛），命令面以已安装的 herdr CLI 为准。规则一律链接到权威文档，不复述：绑定表 → 根 `AGENTS.md`，状态机与 review 拓扑 → `docs/agents/workflow.md`，handoff 字段 → `docs/agents/task-packet.md`，worktree 布局 → `docs/agents/worktrees.md`，pane 原语 → 第三方 `herdr` skill。该 skill 标记 `disable-model-invocation: true`，只由用户手动触发（`/herdr-agents`）。
4. `.agents/skills/` 保持扁平：自撰 skill 与第三方 skill 同级，不引入分组目录、不引入 symlink。出处以 `skills-lock.json` 为权威——登记在册的是第三方上游件，未登记的是本仓自撰；`scripts/validate-context.mjs` 要求每个 `SKILL.md` 的目录名恰好落在其中一侧（自撰侧是脚本内的 `repoAuthoredSkills`），两边都不在或都在即报错。第三方 skill 的正文字符与语言由上游维护，其 markdown 链接不作为本仓链接校验对象。
5. `pnpm task assign --roles` 的取值来自契约目录本身：没有 Role Contract 的角色名不能写入 task state，未知值整条失败且不落盘。

## 后果

- 角色 markdown 从 `vp check` 的格式化范围移入 `fmt.ignorePatterns` 的 `**/.agents/skills/**`，不再自动对齐表格与换行；`validate:context` 仍校验其 frontmatter、`name` 与本地链接。理由与 `contract-change-review` 一致：不为 5 个 markdown 给 ignore 列表增加按名字维护的反向命中。
- Claude Code 会话的 subagent 列表不再出现 5 个角色名；`herdr-agents` 只出现在手动斜杠命令中，不进入模型的自动调用面。
- herdr 开机时序有了单一落点，`workflow.md` 与 `CONTRIBUTING.md` 继续只链接它。
- 编排仍依赖 `HERDR_ENV=1` 的 pane 内执行前提；skill 的前置检查负责在会话外停下，不从会话外操控用户的 Herdr session。

## 被否决的方案

- **只删 symlink，保留 `.agents/agents/`**：改动面最小，但编排知识继续散在三处（Manager 契约、上游 herdr skill、`workflow.md` 的外指），且「角色目录」与「skill 目录」两套并行入口没有第二个消费者。
- **`.agents/skills/internal/` 分组 + 深度 1 symlink**：多两个 symlink 与两条不变量，收益只有视觉分组；且发现机制只扫一层，嵌套分组本身反而要靠 symlink 才能被读到。文件系统层的间接不是最小化。
- **把开机时序写进 `roles/manager.md`**：只有担任 Manager 的会话读得到，其他角色与人工起会话时无从得知；也会让 Manager 契约承担流程权威，与 `workflow.md` 的权威划分冲突。
- **为角色契约单独维护一份机器可读的 ignore/allowlist 例外**：与「按名字维护的反向命中」同类，代价高于收益。

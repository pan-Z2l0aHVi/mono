# skills 包指令

- 本包是仓库自编写 agent skill 的唯一事实来源与 npm 发布载体：`skills/` 下的实体目录经相对软链暴露回 `.agents/skills/<name>`，供 agent 指令体系消费；skill 内容的修改直接落在本包。
- 第三方 skill 不进本包：它们以实体目录留在 `.agents/skills/`，出处由根 `skills-lock.json` 登记，上游原文纪律见根 `AGENTS.md`。`scripts/check-skills.mjs` 会双向校验这条边界（包内 skill 不得出现在 lock 中；`.agents/skills/` 下未登记的实体目录视为违规）。
- `skills/` 下的每个 skill 目录必须有 frontmatter 合法（`name` 与目录同名、`description` 非空）的 SKILL.md，`build`/`prepack` 与测试都会校验；新增 skill 不满足该形状时先修源头，不要放宽校验。
- 新增自编写 skill 的完整动作：在本包 `skills/` 下建目录，再在 `.agents/skills/` 建 `ln -s ../../packages/ai-skill/skills/<name> <name>` 软链，然后把名字加入 `scripts/validate-context.mjs` 的 `repoAuthoredSkills`。
- 自编写 skill 引用第三方 skill 时（如 herdr-agents → herdr）：相对链接按 `.agents/skills/` 消费面书写（`validate-context.mjs` 也按该面检查），但第三方件不随包分发，必须在 SKILL.md 里写明独立安装时的处理（单独 `npx skills add <owner/repo>`、缺位时如何退化）；新增这类依赖要同步更新 README 的「skill 依赖」节。

# ai-skill 包指令

- skill 实体分居三个表面，本包只是其中之一的发布载体（完整职责见 `scripts/check-skills.mjs` 头注释）：
  - 根 `skills/`：**GitHub 发现面**（`npx skills add pan-Z2l0aHVi/mono`），放自撰 skill 实体 + 被自撰 skill 依赖的第三方镜像（如 herdr）；
  - `.agents/skills-vendored/`：其余第三方 skill 的实体家（CLI 不扫描，不对外暴露）；
  - `.agents/skills/`：agent 指令面，全部是逐 skill 软链指向真实家；agent 客户端跟随软链，skills CLI 跳过。
- `packages/ai-skill/skills/` 是**构建产物**：`build`/`prepack` 由 `scripts/check-skills.mjs` 校验三层布局后从根 `skills/` 同步**仅自撰** skill（依赖镜像与 vendored 不进 npm 包）；不要手改，skill 内容的修改落在根 `skills/`。
- 依赖暴露是机器校验的规则：自撰 SKILL.md 里 `../<name>/SKILL.md` 形式的第三方同级链接，其目标必须镜像在根 `skills/` 且登记在根 `skills-lock.json`；未被引用的镜像同样 build 失败。新增第三方依赖 = 改 SKILL.md 链接 + 把实体放进根 `skills/`。
- **不要在仓库根直接跑 `npx skills update`**：它会把变更 skill 重装成实体目录覆盖 `.agents/skills/` 软链。更新第三方用 `pnpm agent:update-skills`（临时目录跑官方引擎再收割回真实家）；误跑后同样用它重放修复。
- npm 只走 changesets（首发 0.1.0，version 基 0.0.0），本包不用 `scripts/publish-new-pack.sh`。

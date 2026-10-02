# @greypan/ai-skill

以 npm 包形式分发的仓库自编写 agent skills，遵循 agent skills 工具链共享的 `skills/<name>/SKILL.md` 打包约定。同一批 skill 也可直接从本 GitHub 仓库安装。

## 安装与接入

包内是纯静态 markdown——没有可 import 的代码，也没有构建步骤。两条分发链路：

**GitHub 源（跟踪 main，可用 `npx skills update` 更新）：**

```sh
npx skills add pan-Z2l0aHVi/mono
```

**npm（changesets 版本化）：**

```sh
npm install -D @greypan/ai-skill
```

然后把 skill 接入 agent 的 skills 目录：

- **手动接入**：把需要的 skill 软链或复制到 agent 扫描的 skills 目录——Codex/Cursor 是 `.agents/skills/<name>`，Claude Code 是 `.claude/skills/<name>`（加 `~/.` 前缀为用户级全局），例如 `ln -s node_modules/@greypan/ai-skill/skills/<name> .agents/skills/<name>`。
- **`npx skills sync`**（实验性，[vercel-labs/skills](https://github.com/vercel-labs/skills)）：爬取 `node_modules` 中的 SKILL.md（本包的 `skills/` 布局正是扫描位置之一），软链装入探测到的 agent，并在消费侧 `skills-lock.json` 记录 `sourceType: 'node_modules'`。升级包后重跑即可。
- **skills-npm**：`npm i -D skills-npm && npx skills-npm setup` 是同一条 node_modules → agent 目录链路的另一个同步工具。
- `npx skills add` **不接受** npm 包名（`@scope/pkg` 会被解析成 GitHub `owner/repo` 简写）；它只从 Git 源安装。

接入后，agent 按 SKILL.md frontmatter 的 `name`/`description` 发现 skill 并按需加载。

## 各表面暴露什么

- **GitHub 源**（`npx skills add pan-Z2l0aHVi/mono`）：自撰 skill + 它们依赖的第三方镜像（如 `herdr-agents` 依赖的 `herdr`）。仅此而已。
- **npm 包**：只有自撰 skill。
- 对 mono 仓库只是本地工具的第三方 skill，vendor 在 `.agents/skills-vendored/`（skills CLI 不扫描），永不分发。

## skill 依赖

skills 生态本身没有依赖机制，所以依赖是「文档声明 + 机器校验」的约定：自撰 SKILL.md 链接到第三方同级（`../<name>/SKILL.md`）时，该 skill 必须镜像在仓库根 `skills/`（`npx skills add` 才会把它连同依赖者一起暴露），并登记在仓库根 `skills-lock.json`。`packages/ai-skill/scripts/check-skills.mjs` 在依赖未镜像或镜像无人引用时直接让 build 失败。每个依赖者 SKILL.md 同时写明独立路径——通常是 `npx skills add <owner/repo>` 装上游，缺位时优雅退化到已安装的 CLI。

## 校验方式

`scripts/check-skills.mjs`（在 `build`、`prepack` 与测试中执行）校验三层布局不变量：每个 skill 目录都有 frontmatter `name` 与目录同名、`description` 非空的 SKILL.md；GitHub 暴露面恰好是自撰 skill + 被引用的依赖镜像；`.agents/skills-vendored/` 覆盖其余 lock 条目；`.agents/skills/` 是全软链指令面（出现实体目录说明有人在本仓直接跑了 `skills update`，重跑 `pnpm agent:update-skills` 修复）。校验通过后把自撰子集同步成包产物。

## 许可

MIT。

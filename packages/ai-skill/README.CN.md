# @greypan/ai-skill

以 npm 包形式分发的仓库自编写 agent skills，遵循 agent skills 工具链共享的 `skills/<name>/SKILL.md` 打包约定。

## 安装与接入

包内是纯静态 markdown——没有可 import 的代码，也没有构建步骤。安装后把 skill 接入 agent 的 skills 目录即可：

```sh
npm install -D @greypan/ai-skill
```

- **手动接入**：把需要的 skill 软链或复制到 agent 扫描的 skills 目录——Codex/Cursor 是 `.agents/skills/<name>`，Claude Code 是 `.claude/skills/<name>`（加 `~/.` 前缀为用户级全局），例如 `ln -s node_modules/@greypan/ai-skill/skills/<name> .agents/skills/<name>`。
- **`npx skills sync`**（实验性，[vercel-labs/skills](https://github.com/vercel-labs/skills)）：`npm install -D @greypan/ai-skill` 后运行 `npx skills sync`——它会爬取 `node_modules` 中的 SKILL.md（本包的 `skills/` 布局正是其扫描位置之一），以软链方式装入探测到的 agent 的 skills 目录，并在消费侧 `skills-lock.json` 记录 `sourceType: 'node_modules'` 条目。升级包后重跑一次即可同步新版本。
- **skills-npm**：`npm i -D skills-npm && npx skills-npm setup` 是同一条 node_modules → agent 目录链路的另一个同步工具。
- `npx skills add` **不接受** npm 包名（`@scope/pkg` 会被解析成 GitHub `owner/repo` 简写）；它只从 Git 源安装。

接入后，agent 按 SKILL.md frontmatter 的 `name`/`description` 发现 skill 并按需加载。

## 目录结构

```
skills/
  <skill-name>/
    SKILL.md        # skill 入口，frontmatter 带 name/description
    ...             # skill 引用的可选辅助文件
```

本包是 [mono](https://github.com/pan-Z2l0aHVi/mono) 仓库自编写 skills 的唯一事实来源。仓库内部通过 `.agents/skills/<name>` 的相对软链把这些 skill 暴露给 agent 指令体系，软链指回 `packages/ai-skill/skills/<name>`。

引入 `.agents/skills/` 的第三方 skill **不在本包内**：它们以实体目录留在原处，由仓库根的 `skills-lock.json` 登记出处，内容保持上游原文。每个 skill 的用法见各自的 SKILL.md。

## skill 依赖

自编写 skill 可能通过相对同级链接引用第三方 skill（例如 `herdr-agents` 依赖上游 [`herdr`](https://github.com/herdrdev/herdr) skill）。这类依赖不随包分发：仓库内两边都在 `.agents/skills/` 下天然可用，但独立安装本包时只有自编写 skill。每个 SKILL.md 会写明此时的处理方式——通常是单独安装第三方 skill（如 `npx skills add herdrdev/herdr`），缺位时优雅退化到已安装的 CLI 输出。skills 生态本身没有依赖机制，所以依赖关系按 skill 逐个在文档中声明，而不是由包解析。

## 校验方式

本包没有运行时代码。`scripts/check-skills.mjs`（在 `build`、`prepack` 与测试中执行）校验布局不变量：每个 skill 目录都有 frontmatter `name` 与目录同名、`description` 非空的 SKILL.md；本包发布的 skill 都没有登记为第三方；`.agents/skills/` 下只允许 lock 登记的第三方实体目录和指向本包的软链。

## 许可

MIT。

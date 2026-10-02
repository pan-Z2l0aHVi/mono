# @greypan/ai-skill

以 npm 包形式分发的仓库自编写 agent skills，遵循 [`npx skills` 生态](https://github.com/vercel-labs/skills)识别的 `skills/<name>/SKILL.md` 打包约定。

## 安装

```sh
npm install @greypan/ai-skill
# 或通过 skills CLI
npx skills add @greypan/ai-skill
```

## 目录结构

```
skills/
  <skill-name>/
    SKILL.md        # skill 入口，frontmatter 带 name/description
    ...             # skill 引用的可选辅助文件
```

本包是 [mono](https://github.com/pan-Z2l0aHVi/mono) 仓库自编写 skills 的唯一事实来源。仓库内部通过 `.agents/skills/<name>` 的相对软链把这些 skill 暴露给 agent 指令体系，软链指回 `packages/ai-skill/skills/<name>`。

引入 `.agents/skills/` 的第三方 skill **不在本包内**：它们以实体目录留在原处，由仓库根的 `skills-lock.json` 登记出处，内容保持上游原文。每个 skill 的用法见各自的 SKILL.md。

## 校验方式

本包没有运行时代码。`scripts/check-skills.mjs`（在 `build`、`prepack` 与测试中执行）校验布局不变量：每个 skill 目录都有 frontmatter `name` 与目录同名、`description` 非空的 SKILL.md；本包发布的 skill 都没有登记为第三方；`.agents/skills/` 下只允许 lock 登记的第三方实体目录和指向本包的软链。

## 许可

MIT。

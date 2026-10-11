# 仓库自编写 agent skills

本目录是仓库专属 agent skills 的 GitHub 发现面，遵循 agent skills 工具链共享的 `skills/<name>/SKILL.md` 打包约定。GitHub 是唯一的分发通道。

## 安装与接入

```sh
npx skills add pan-Z2l0aHVi/mono
```

跟踪 main，之后可用 `npx skills update` 更新。skill 是纯静态 markdown——没有可 import 的代码，也没有构建步骤。接入后，agent 按 SKILL.md frontmatter 的 `name`/`description` 发现 skill 并按需加载。

`npx skills add` 只从 Git 源安装，不接受 npm 包名（`@scope/pkg` 会被解析成 GitHub `owner/repo` 简写）。

## 各表面暴露什么

- **GitHub 源**（`npx skills add pan-Z2l0aHVi/mono`）：自撰 skill + 它们依赖的第三方镜像。仅此而已。
- 仓库专属的第三方 skill 仍 vendor 在 `.agents/skills-vendored/`（skills CLI 不扫描），永不分发；它们靠 `skills-lock.json` 跟踪与刷新。
- 其余第三方 skill 不在本仓：通用流程类 skill 由 CC Switch 在 user 级全局管理（主副本在 `~/.cc-switch/skills/<name>`，各客户端侧是 symlink），任何会话任何仓库都可用，仓库再自带一份只是重复。

## skill 依赖

skills 生态本身没有依赖机制，所以依赖是「文档声明 + 机器校验」的约定：自撰 SKILL.md 链接到第三方同级（`../<name>/SKILL.md`）时，该 skill 必须镜像在仓库根 `skills/`（`npx skills add` 才会把它连同依赖者一起暴露），并登记在仓库根 `skills-lock.json`。`scripts/check-skills.mjs` 在依赖未镜像或镜像无人引用时直接失败。依赖者的 SKILL.md 还应写明独立安装路径——通常是 `npx skills add <owner/repo>` 装上游，缺位时优雅退化到已安装的 CLI。

## 校验方式

`scripts/check-skills.mjs`（由测试强制执行）校验三层布局不变量：每个 skill 目录都有 frontmatter `name` 与目录同名、`description` 非空的 SKILL.md；GitHub 暴露面恰好是自撰 skill + 被引用的依赖镜像（外加本 README）；`.agents/skills-vendored/` 覆盖其余 lock 条目；`.agents/skills/` 是全软链指令面（出现实体目录说明有人在本仓直接跑了 `skills update`，重跑 `pnpm agent:update-skills` 修复）。

## 许可

MIT。

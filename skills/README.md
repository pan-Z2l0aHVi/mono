# 仓库自编写 agent skills

本目录提供本仓库自写的 agent skills，通过 GitHub 分发。每个 skill 按 `skills/<name>/SKILL.md` 组织。

## 安装与更新

```sh
npx skills add pan-Z2l0aHVi/mono
```

安装后跟踪 `main`。之后可用下面的命令更新：

```sh
npx skills update
```

`npx skills add` 只从 Git 源安装，不接受 npm 包名。`@scope/pkg` 会被当作 GitHub 的 `owner/repo` 简写。

skill 以 `SKILL.md` 为入口，可附带只依赖 Node 内置模块的脚本，没有构建步骤。agent 通过 frontmatter 中的 `name` 和 `description` 发现并按需加载 skill。

## 分发范围

GitHub 源包含本仓库自写的 skill，以及它们引用的第三方 skill 副本。其他第三方 skill 不在本仓库分发，由各客户端自行管理。

## 依赖约定

skills 生态没有依赖机制，因此依赖通过文档声明和机器校验约定：

- 自写的 `SKILL.md` 引用第三方同级 skill 时，该 skill 必须同时放在本仓库的 `skills/` 下，并登记在 `skills-lock.json`。
- 校验器会检查依赖是否镜像齐全，以及镜像是否确实被引用。校验逻辑在 [`scripts/maintenance/update-skills.mjs`](../scripts/maintenance/update-skills.mjs)。
- 引用方应在 `SKILL.md` 中写明独立安装方式，通常是 `npx skills add <owner/repo>`。

运行 `pnpm agent:update-skills` 可刷新 skill 布局。

## 许可

MIT。

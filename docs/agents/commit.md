# 提交边界与 Git Commit

本文件规定提交授权、commit message、署名、pre-commit hook 与本地检查。任务分级与本地登记见 [`.agents/skills/task-ledger/SKILL.md`](../../.agents/skills/task-ledger/SKILL.md)，任务总流程与授权见 [`workflow.md`](./workflow.md)，PR 阶段 review 见 [`review.md`](./review.md)。commitlint 的类型、scope、字数、大小写与语言规则以 [`commitlint.config.js`](../../commitlint.config.js) 为准。

## 授权边界

改变仓库历史、分支、远端或发布状态都需用户逐次明确授权；完整边界与取得方式见 [`workflow.md`](./workflow.md#预授权操作)。task status 或本地检查通过都不构成提交授权。

## Message 与署名

scope 标识受影响的 workspace，不表示领域；跨 workspace 协作用逗号分隔多个 scope。仓库根非包改动（`scripts/`、根配置、CI workflow、指令系统文档）统一使用 `root` scope；`ci` 和 `docs` 是 commit type，不是 scope。

授权提交时先暂存预期文件并预览，再运行：

```bash
bash scripts/workflow/commit.sh <type> <scope> "<subject>" --dry
```

确认 message 和文件列表后去掉 `--dry`。`commit.sh` 每一行分别传给 `-m`，正文行间保留空行，不要用 `git commit -F` 绕开脚本。

由 agent 创建 commit 时，author 与 committer 使用实际执行体的官方名称和邮箱，以该 agent 的官方文档或客户端明确提供的署名为准。不得从产品名或模型名推造邮箱，也不得冒用其他 agent 的署名；用户显式指定身份时优先遵循。人类 author 保持本人身份；`Co-authored-by` 只记录实际参与该提交的 agent，并使用该 agent 的官方署名。提交前确认 author 与 committer 符合授权人的预期；不需要为实施变更修改 Git 配置。

## Pre-commit 与本地 checks

[`.vite-hooks/commit-msg`](../../.vite-hooks/commit-msg) 拒绝只有注释的 message，并通过 commitlint 检查。[`.vite-hooks/pre-commit`](../../.vite-hooks/pre-commit) 调用 `check-pre-commit`，只读取状态，不修复或暂存文件。具体检查集合以入口实现为准。

`pnpm install` 的 prepare 安装 hook dispatcher。用 `git hook run <hook>` 和 `pnpm run agent:env-doctor` 检查实际状态；缺少 dispatcher 时运行 `node scripts/maintenance/install-git-hooks.mjs`。不得修改 Git 配置或绕过 hook。

CI 使用 PR base 的 [`commitlint.config.js`](../../commitlint.config.js) 检查 PR 标题。修改远端 PR 元数据须按 [`workflow.md`](./workflow.md#怎么取得这个授权) 获得授权。

`fix-code` 是实施者显式运行的工作树修复命令；它可能改写多个文件，但不会自动暂存。运行后检查 diff，再只暂存预期文件。pre-commit 不调用 `fix-code`。

不得使用 `--no-verify`、`--no-gpg-sign`、`HUSKY=0`、`VP_GIT_HOOKS=0`、`VITE_GIT_HOOKS=0` 或将检查工具指向空实现来绕过检查与签名校验。

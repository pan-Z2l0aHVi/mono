# 提交边界与 Git Commit

本文件规定提交授权、commit message、署名、pre-commit hook 与本地检查。任务分级见 `docs/agents/task-levels.md`，任务总流程与授权见 `docs/agents/workflow.md`，本地登记簿见 `docs/agents/task-ledger.md`，PR 阶段 review 见 `review.md`。commitlint 的类型、scope、字数、大小写与语言规则以 `commitlint.config.js` 为准。

## 授权边界

改变仓库历史、分支、远端或发布状态都需用户逐次明确授权；完整边界与取得方式见 `docs/agents/workflow.md` 的「预授权操作」。task status 或本地检查通过都不构成提交授权。

## Message 与署名

scope 标识受影响的 workspace，不表示领域；跨 workspace 协作用逗号分隔多个 scope。仓库根非包改动（`scripts/`、根配置、CI workflow、指令系统文档）统一使用 `root` scope；`ci` 和 `docs` 是 commit type，不是 scope。

授权提交时先暂存预期文件并预览，再运行：

```bash
bash scripts/commit.sh <type> <scope> "<subject>" --dry
```

确认 message 和文件列表后去掉 `--dry`。`commit.sh` 每一行分别传给 `-m`，正文行间保留空行，不要用 `git commit -F` 绕开脚本。

由 agent 创建 commit 时，author 与 committer 使用实际执行体的官方名称和邮箱，以该 agent 的官方文档或客户端明确提供的署名为准。不得从产品名或模型名推造邮箱，也不得冒用其他 agent 的署名；用户显式指定身份时优先遵循。人类 author 保持本人身份；`Co-authored-by` 只记录实际参与该提交的 agent，并使用该 agent 的官方署名。提交前确认 author 与 committer 符合授权人的预期；无需为这次实施变更修改 Git 配置。

## Pre-commit 与本地 checks

受版本控制的 pre-commit hook 通过 `mise exec` 依次运行 `.agents/checks/` 下的五项只读仓库政策检查：`command-conventions`、`format-clean`、`no-mutual-links`、`turbo-cache-invariant`、`web-ui-docs-inputs`。这些检查从当前 Git worktree 运行，不读取 task state 或 `AGENT_TASK_*`；任一检查缺失、不可执行或非零退出时 hook 失败；它们不运行 fixer、不改写文件或 index。PR CI 的 changeset gate 不属于本地政策，见 `release.md`。

`fix-code` 是实施者显式运行的工作树修复命令；它可能改写多个文件，但不会自动暂存。运行后检查 diff，再只暂存预期文件。pre-commit 不调用 `fix-code`。

不得使用 `--no-verify`、`--no-gpg-sign`、`HUSKY=0`、`VP_GIT_HOOKS=0`、`VITE_GIT_HOOKS=0` 或将检查工具指向空实现来绕过检查与签名校验。

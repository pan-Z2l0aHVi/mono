# 提交边界与 Git Commit

本文件规定提交授权、commit message、署名、pre-commit hook 与本地检查。任务分级与本地登记见 [`.agents/skills/task-ledger/SKILL.md`](../../.agents/skills/task-ledger/SKILL.md)，任务总流程与授权见 [`workflow.md`](./workflow.md)，PR 阶段 review 见 [`review.md`](./review.md)。commitlint 的类型、scope、字数、大小写与语言规则以 `commitlint.config.js` 为准。

## 授权边界

改变仓库历史、分支、远端或发布状态都需用户逐次明确授权；完整边界与取得方式见 [`workflow.md`](./workflow.md#预授权操作)。task status 或本地检查通过都不构成提交授权。

## Message 与署名

scope 标识受影响的 workspace，不表示领域；跨 workspace 协作用逗号分隔多个 scope。仓库根非包改动（`scripts/`、根配置、CI workflow、指令系统文档）统一使用 `root` scope；`ci` 和 `docs` 是 commit type，不是 scope。

授权提交时先暂存预期文件并预览，再运行：

```bash
bash scripts/workflow/commit.sh <type> <scope> "<subject>" --dry
```

确认 message 和文件列表后去掉 `--dry`。`commit.sh` 每一行分别传给 `-m`，正文行间保留空行，不要用 `git commit -F` 绕开脚本。

由 agent 创建 commit 时，author 与 committer 使用实际执行体的官方名称和邮箱，以该 agent 的官方文档或客户端明确提供的署名为准。不得从产品名或模型名推造邮箱，也不得冒用其他 agent 的署名；用户显式指定身份时优先遵循。人类 author 保持本人身份；`Co-authored-by` 只记录实际参与该提交的 agent，并使用该 agent 的官方署名。提交前确认 author 与 committer 符合授权人的预期；无需为这次实施变更修改 Git 配置。

## Pre-commit 与本地 checks

受版本控制的 `.vite-hooks/commit-msg` 先运行 `git stripspace --strip-comments`，拒绝剥掉注释后没有提交内容的消息，再通过 `mise exec -- pnpm exec commitlint --edit "$1"` 检查消息。这个前置检查很重要：commitlint 会把只含 `#` 注释的消息解析为空并跳过所有规则。`.vite-hooks/pre-commit` 通过 `mise exec -- pnpm run check-pre-commit` 运行五项只读仓库政策检查：`command-conventions`、`format-clean`、`no-mutual-links`、`turbo-cache-invariant`、`web-ui-docs-inputs`；`mise` 不在 `PATH` 时它先打印可读原因并以非零退出，不会只留下一条 `exit 127`。`pnpm install` 的 `prepare` 脚本先调用 `vp config`，再运行 `scripts/maintenance/install-git-hooks.mjs`。若当前 `core.hooksPath` 指向 `.vite-hooks` 外的目录，`vp config` 只会打印一行跳过信息、不生成 `.vite-hooks/_` 下的 dispatcher，因此安装脚本为 `.vite-hooks` 里存在的每个 hook（`commit-msg` 与 `pre-commit`）各补一个托管 dispatcher；它从 Git 当前 worktree 找到受版本控制的 hook，并用 `sh` 调用，因此旧 worktree 的文件执行位也不会让检查静默失效。共用该 hooks 目录的仓库会各自运行当前 worktree 的 `.vite-hooks/<hook>`。已有的自定义 hook（不带托管 marker）会保留。若 hooks 通过 `/dev/null`、Vite+ 本地禁用偏好或安装环境变量关闭，安装脚本会跳过 dispatcher；已安装的 dispatcher 也会遵循 Vite+ 本地禁用偏好和环境设置。不要在任务中自行改写 Git 配置。`vp hooks status` 不认识这个自定义 dispatcher 时（`core.hooksPath` 指向外部目录会显示 `Dispatcher: missing`），用 `git hook run <hook>` 验证实际调用；`pnpm run agent:env-doctor` 的 `git-hooks` 项检查两个 dispatcher 是否都已装上且可执行；缺 dispatcher 时直接跑 `node scripts/maintenance/install-git-hooks.mjs`，依赖已就绪时普通 `pnpm install` 不会重跑 `prepare` 里的安装。这些检查从当前 Git worktree 运行，不读取 task state 或 `AGENT_TASK_*`；它们不运行 fixer、不改写文件或 index。PR CI 的 changeset gate 不属于本地政策，见 release.md。

CI 会使用 PR base 中 `commitlint.config.js` 的 `message-english-only` 规则检查 PR 标题，因为 squash commit 的 subject 来自 PR 标题。Herdr board 当前用任务标题创建 draft PR；若标题含中文，required check 会在安装依赖前快速失败。把标题改成英文需要写远端 PR 元数据，按 [`workflow.md` 的授权流程](./workflow.md#怎么取得这个授权)取得授权后再运行 `gh pr edit <number> --title "<English title>"`。`edited` 事件会触发完整 CI 重跑；若实施者不改标题，required check 会失败。任何其他 PR 元数据编辑也会触发完整重跑。

`fix-code` 是实施者显式运行的工作树修复命令；它可能改写多个文件，但不会自动暂存。运行后检查 diff，再只暂存预期文件。pre-commit 不调用 `fix-code`。

不得使用 `--no-verify`、`--no-gpg-sign`、`HUSKY=0`、`VP_GIT_HOOKS=0`、`VITE_GIT_HOOKS=0` 或将检查工具指向空实现来绕过检查与签名校验。

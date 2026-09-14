# 提交工作流

仅在用户明确授权提交后才阅读本指南。当前的 `commitlint.config.js` 是权威依据。

使用 Conventional Commits 格式，commit message 必须使用英文，允许的类型包括 `feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`chore` 或 `revert`。仓库级别的变更使用 `root`；包相关的变更使用包作为 scope，协调多个包的变更使用逗号分隔的 scope。`pnpm commit` 的交互 prompt 只提供 `root`/`apps`/`packages` 三个 scope（`allowCustomScopes: false`）；包名 scope 通过 `bash scripts/commit.sh` 或非交互提交使用。

标题使用祈使句式，小写，不超过 200 个字符，末尾不加句号。仅当标题无法清晰表达理由时才添加正文。

授权后，仅暂存预期的文件，使用以下命令预览：

```bash
bash scripts/commit.sh <type> <scope> "<subject>" --dry
```

然后使用相同命令去掉 `--dry` 进行提交。不要绕过 Git hooks 或签名检查。

## AI 署名与身份

署名规则以 [`CONTRIBUTING.md`](../../CONTRIBUTING.md) 的「AI 协作署名」节为准。commit 层面只有两条操作差异：

- `commit.sh` 不处理署名：agent 直接创建提交时，提交后用 `git commit --amend --author=…` 并配合 `GIT_COMMITTER_NAME` / `GIT_COMMITTER_EMAIL` 环境变量改为 agent 官方身份；为人类提交追加 AI 共同作者时，提交后 `git commit --amend --trailer 'Co-authored-by: …'` 追加。
- 提交前确认实际 author/committer 与意图一致：以人类身份提交时对应 `git config user.name` / `user.email`；以 agent 身份提交时使用其官方身份（见 [`CONTRIBUTING.md`](../../CONTRIBUTING.md) 的「AI 协作署名」）。

## Changesets 与 PR

CI 在每个 `pull_request` 上运行 `changeset status --since=origin/<base>`（`changeset-release/main` 分支除外），PR 不携带 changeset 会导致该检查失败。因此每个 PR 至少包含一个 changeset：

- 涉及公共包行为、导出或依赖变更：按正常 Changesets 流程写明 patch/minor/major 与变更描述。
- 纯 test/docs/chore 等不影响包版本的变更：创建空 changeset——只含两行 `---` 的 `.changeset/<kebab-name>.md`，frontmatter 内不写包与版本号，changesets 版本 PR 会原样消费它而不产生版本变更。

已填写 changeset 的描述统一使用英文：changesets 版本 PR 会把这些描述写入公共包 CHANGELOG，面向 npm 上的外部读者。空 changeset 没有包可归属，文件名不带包名前缀属于正常情况。

## Workflow commit gate

提交前必须先通过 [`workflow.md`](./workflow.md) 的 `check --phase commit`，并用 `--approver <manager-or-user-id>` 记录批准者。仓库已在受版本控制的 `.vite-hooks/pre-commit` 中接入 `pnpm agent:workflow guard-commit`：当前 worktree 存在 active task 时，hook 会拒绝未批准、冻结快照已过期或状态不一致的提交。不要使用 `--no-verify`、`HUSKY=0`、`VP_GIT_HOOKS=0` 或其他方式绕过该 gate。

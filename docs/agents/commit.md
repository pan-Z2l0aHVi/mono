# 提交工作流

仅在用户明确授权提交后才阅读本指南。当前的 `commitlint.config.js` 是权威依据。

使用 Conventional Commits 格式，commit message 必须使用英文，允许的类型包括 `feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`chore` 或 `revert`。仓库级别的变更使用 `root`；包相关的变更使用包作为 scope，协调多个包的变更使用逗号分隔的 scope。

标题使用祈使句式，小写，不超过 200 个字符，末尾不加句号。仅当标题无法清晰表达理由时才添加正文。

授权后，仅暂存预期的文件，使用以下命令预览：

```bash
bash scripts/commit.sh <type> <scope> "<subject>" --dry
```

然后使用相同命令去掉 `--dry` 进行提交。不要绕过 Git hooks 或签名检查。

## AI 署名与身份

署名规则以 [`CONTRIBUTING.md`](../../CONTRIBUTING.md) 的「AI 协作署名」节为准。commit 层面只有两条操作差异：

- `commit.sh` 不自动加尾注；提交后 `git commit --amend --trailer 'Co-authored-by: …'` 追加。
- 提交前确认 `git config user.name` / `user.email` 与实际 author/committer 一致。

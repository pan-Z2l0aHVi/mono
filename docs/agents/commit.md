# 提交工作流

仅在用户明确授权提交后才阅读本指南。当前的 `commitlint.config.js` 是权威依据。

使用 Conventional Commits 格式，commit message 必须使用英文，允许的类型包括 `feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`chore` 或 `revert`。仓库级别的变更使用 `root`；包相关的变更使用包作为 scope，协调多个包的变更使用逗号分隔的 scope。

scope 只标识受影响的 workspace，不表示领域，类别信息由 `type` 承载。历史提交里的 `docs(agents)`、`fix(ci)`、`feat(lint)` 是旧写法，不要照抄。CI 配置的改动用 `ci` 类型；指令系统文档（`AGENTS.md`、`docs/agents/`）的改动用 `docs` 类型；仓库根的非包改动（如 `scripts/`、根配置）用 `root` scope。

`pnpm commit` 的交互 prompt 的 scope 清单是 `root` 加各包名，清单外的名字通过它的「自定义输入 scope」项输入，或走非交互的 `bash scripts/commit.sh`；这份清单的权威是 [`commitlint.config.js`](../../commitlint.config.js) 的 `prompt.scopes`。

标题使用祈使句式，小写，不超过 200 个字符，末尾不加句号。仅当标题无法清晰表达理由时才添加正文。

授权后，仅暂存预期的文件，使用以下命令预览：

```bash
bash scripts/commit.sh <type> <scope> "<subject>" --dry
```

然后使用相同命令去掉 `--dry` 进行提交。不要绕过 Git hooks 或签名检查。

## AI 署名与身份

署名规则的权威是本节。仅当 AI agent 对某次变更有实质贡献时才记录署名；不要为展示署名创建空提交或伪造身份：

- Agent 直接创建提交时，author 与 committer 使用该 agent 的官方身份，不再叠加同名 `Co-authored-by` 尾注。
- AI agent 参与人类 author 的提交时，通过 Git trailers 机制追加共同作者尾注：

  ```text
  Co-authored-by: Codex <noreply@openai.com>
  Co-authored-by: Claude <noreply@anthropic.com>
  ```

- 以上规则约束提交层；合并层的署名由 GitHub 生成。squash 合并时，PR 内每个 author 与执行合并的人不同的 commit，都会在合并提交的正文末尾自动补上一条对应的 `Co-authored-by` 尾注。这条尾注是 GitHub 在合并时写入的，不是 agent 写入的——「不再叠加同名尾注」在提交层成立、在合并层不成立；在 `main` 上看到 `<agent> <邮箱>` 的 `Co-authored-by` 不要当作提交层违规去改。
- 人类提交者仍对需求、设计、审查、测试和最终合并承担全部责任。
- 共同作者尾注用于公开记录协作；GitHub 是否将其显示为独立 Contributors 条目取决于该邮箱能否被 GitHub 识别和归属。

commit 层面只有两条操作差异：

- `commit.sh` 不处理署名：agent 直接创建提交时，提交后用 `git commit --amend --author=…` 并配合 `GIT_COMMITTER_NAME` / `GIT_COMMITTER_EMAIL` 环境变量改为 agent 官方身份；为人类提交追加 AI 共同作者时，提交后 `git commit --amend --trailer 'Co-authored-by: …'` 追加。
- 提交前确认实际 author/committer 与意图一致：以人类身份提交时对应 `git config user.name` / `user.email`；以 agent 身份提交时使用其官方身份（见本节「AI 署名与身份」）。

## Changesets 与 PR

每个 PR 至少包含一个 changeset。这一条由 `.agents/checks/` 下的政策检查在 freeze 与提交两个边界强制（见下节「Workflow commit gate」）；不要指望 CI 兜底：`changeset status --since=origin/<base>`（`changeset-release/main` 分支除外）只在「被改动的包需要新版本却没带 changeset」时失败，纯 docs/test/chore 的 PR 不触碰发布包，一条 changeset 都不带也能绿。所以：

- 涉及公共包行为、导出或依赖变更：按正常 Changesets 流程写明 patch/minor/major 与变更描述。
- 纯 test/docs/chore 等不影响包版本的变更：创建空 changeset——只含两行 `---` 的 `.changeset/<kebab-name>.md`，frontmatter 内不写包与版本号，changesets 版本 PR 会原样消费它而不产生版本变更。

已填写 changeset 的描述统一使用英文：changesets 版本 PR 会把这些描述写入公共包 CHANGELOG，面向 npm 上的外部读者。空 changeset 没有包可归属，文件名不带包名前缀属于正常情况。

## Workflow commit gate

提交前必须先通过 [`workflow.md`](./workflow.md) 的提交 gate（T0 与 T1 需 approved；T2 需 active；T2 不要求 worktree 干净，所以它的提交内容就是当时的 index，不提供 diff 边界）。仓库已在受版本控制的 `.vite-hooks/pre-commit` 中接入 `pnpm agent:task guard`，它核对 task 的级别 gate、冻结快照是否过期与状态是否一致，并运行 `.agents/checks/` 政策检查。有哪些政策检查、各自的判定口径、覆盖范围与已登记的旁路，都以 `.agents/checks/` 下脚本自身的注释为权威，本节不复述。它管不到「只 add 了一半未归一化的改动」和「add 之后又删掉工作区文件」这两条分叉，那由 CI 的 `pnpm run check-code` 与 review 兜底。本文件是「禁止绕过 Git 检查」的唯一权威清单：不要使用 `--no-verify`、`--no-gpg-sign`、`HUSKY=0`、`VP_GIT_HOOKS=0`、`VITE_GIT_HOOKS=0` 或其他方式绕过提交 hook 与签名检查。`AGENT_VP_CMD` / `AGENT_STYLELINT_CMD` / `AGENT_GOFMT_CMD` 也被这条禁止项覆盖，形状不同于上面几个：把工具指向一个必定成功的程序，检查照样登记为「跑过」（覆盖度核对只看有没有执行，看不见它被掏空），guard 的输出与真通过不可分辨，而改动并没有被判定过。那三个变量是 `scripts/task.test.mjs` fixture 的测试入口，只在 fixture 里出现。

## Worktree 收尾

实施轮以提交为终点：提交之后 worktree 必须干净，`git status --porcelain --untracked-files=all` 不留下任何 tracked 改动，也不留下未跟踪文件。冻结中（`frozen` 相位、尚未提交）的 task worktree 带着本任务自己的 diff 躺在工作区里，那是它的正常形态，不算残留。

这条约束管的是操作的结束状态，不是过程中不许改文件。变异实验、对照实验、临时接线都允许，只要收尾还原；探针与临时脚本写 `/tmp`，不落在 worktree 里。残留不改变任何分支或 `main` 的树，但它会让下一个读它的人分不清这是实验残渣还是没做完的成果，还会被 `git add -A` 卷进冻结快照跟着提交出去；各起点的干净检查口径见 [`workflow.md`](workflow.md)。重切分支、清理、重置或删除 worktree 之前的前置检查，权威是根 [`AGENTS.md`](../../AGENTS.md) 的共享工作区 Git 改写禁令：先确认没有未提交变更、没有未合并独有提交，并把结果写入交接记录。

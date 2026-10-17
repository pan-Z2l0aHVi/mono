# 提交边界与 Git Commit

本文件拥有提交边界：什么必须逐次授权、message 怎么写、谁承担这次提交的身份、`.agents/checks/` 判定什么口径、提交 hook 在什么强制力上。它不拥有级别判据（见 `task-levels.md`）、相位顺序（见 `workflow.md`）与 review 独立性（见 `review.md`）——那三件事在这里只被引用，不被复述。

仅在用户明确授权提交后才阅读本指南。commitlint 的规则（类型、scope、字数与大小写）以 [`commitlint.config.js`](../../commitlint.config.js) 为准，这里只写它没覆盖的约定。

## 授权边界

commit、push、merge、tag、publish、release 一律需要你逐次明确授权，「本次改动造成的失败可以直接修复」这条不覆盖它们。完整清单见 `workflow.md` 的「预授权操作」。本文件讲这些是因为提交是其中最常被顺手做掉的一项，不是因为它另有一套边界。

## message 形状

- commit message 使用英文。
- scope 只标识受影响的 workspace，不表示领域，类别信息由 `type` 承载；跨包协调用逗号分隔多个 scope。历史提交里的 `docs(agents)`、`fix(ci)`、`feat(lint)` 是旧写法，不要照抄：CI 配置改动归类为 `ci`，指令系统文档（`AGENTS.md`、`docs/agents/`）归类为 `docs`，仓库根的非包改动（`scripts/`、根配置）用 `root` scope。

授权后仅暂存预期的文件，先预览再提交，确认无误后去掉 `--dry`：

```bash
bash scripts/commit.sh <type> <scope> "<subject>" --dry
```

`commit.sh` 逐行 `-m`，所以 body 的每一行之间会留一个空行——这是该脚本的既有形状，与历史提交一致，不要改用 `git commit -F` 绕过。

## AI 署名

署名规则以本节为准：仅当 agent 对某次变更有实质贡献时才记录，不要为空提交或伪造身份。

- Agent 直接创建提交时，author 与 committer 用该 agent 的官方身份，不再叠加同名 `Co-authored-by` 尾注。
- Agent 参与人类 author 的提交时，追加共同作者尾注：

  ```text
  Co-authored-by: Codex <noreply@openai.com>
  Co-authored-by: Claude <noreply@anthropic.com>
  ```

人类提交者对需求、设计、审查、测试与最终合并承担全部责任。

提交前确认实际 author/committer 与意图一致：人类身份对应 `git config user.name` / `user.email`，agent 身份用其官方身份。`commit.sh` 不处理署名，需要事后用 `git commit --amend` 调整：改身份用 `--author=…` 并配合 `GIT_COMMITTER_NAME` / `GIT_COMMITTER_EMAIL`，追加共同作者用 `--trailer 'Co-authored-by: …'`。只设 committer 环境变量是不够的——author 仍会取自 `git config`，两条都要给。

## 提交 gate

提交边界由受版本控制的 `.vite-hooks/pre-commit` 把关。它通过 `pnpm agent:task guard` 自动发现当前 worktree 的 active task，按 `task-levels.md` 级别表的 commit gate 放行，并在放行前跑 `.agents/checks/` 下的全部政策检查。有 active task 时目录下所有可执行检查都跑；没有 task 时只跑内核在 `alwaysOnChecks` 里登记的白名单。

两个时机的分工：政策检查在 freeze 取快照前、guard 放行提交前各跑一次，任一非零退出即中止并回显该检查的 stdout 与 stderr。挂在 guard 上是必要的——T2 一般不 freeze，只在 commit 边界出现，检查若只跟 freeze 走就对全部级别里的多数 task 形同不存在。

没有 active task 时 task gate 放行，政策检查仍跑——此时 `guard` 只跑白名单里的三项（`format-clean`、`turbo-cache-invariant`、`no-mutual-links`），其余检查在没有 task 上下文时无法判断，所以不跑。stderr 会写下 `task gate: not enforced` 并给出 `pnpm agent:task new` 的入口。检查清单回显在 `guard` 与 `freeze` 输出的 `checks` 里。

登记白名单的三项都与 task 上下文无关，都判的是工作区副本：`format-clean` 看格式，`turbo-cache-invariant` 看 `turbo.json` 里 dist 的缓存口径（`dependsOn`/`outputs`/`inputs`），`no-mutual-links` 扫指令面的链接图。它们的输入都在磁盘上，不读任何 `AGENT_TASK_*`，所以无 task 提交同样能得到这道保证。两点代价要一起知道：它们按「整棵工作区」判断而非只看 staged，所以指令面里任何未暂存的改动也会挡住无 task 提交；`no-mutual-links` 还硬依赖 `skills-lock.json` 与一份完整的指令面，缺了就 fail-closed——保留 `scripts/task.mjs` 与 `.agents/checks/` 但没有指令面的外来仓库会因此拦住每一次无 task 提交。退出码、判据与这套登记语义在复用内核时的失配后果，都以各脚本自身注释为准。

这道门禁的强制力止于留痕与拦下一次提交：它管不到没有 active task 的 worktree 要不要 task、改动归谁。上游还保留 `HUSKY=0` / `VP_GIT_HOOKS=0` / `VITE_GIT_HOOKS=0` 旁路。所以「不得绕过提交 hook」是本节的授权口径，不是机器保证；兜底的是 review 与 CI。CI 里 `changeset-version.yml` 的 `git commit` 也走这同一条 hook。

不得用 `--no-verify`、`--no-gpg-sign`、`HUSKY=0`、`VP_GIT_HOOKS=0`、`VITE_GIT_HOOKS=0` 或把检查工具指向空实现来绕过这些检查与签名校验。

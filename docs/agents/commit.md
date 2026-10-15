# Git Commit

仅在用户明确授权提交后才阅读本指南。commitlint 的规则（类型、scope、字数与大小写）以 [`commitlint.config.js`](../../commitlint.config.js) 为准，这里只写它没覆盖的约定。

Codex 沙箱对 Git 元数据的写入限制及 approval request 提权规则见 [`build.md`](build.md)「Codex 沙箱边界与提权」。

- commit message 使用英文。
- scope 只标识受影响的 workspace，不表示领域，类别信息由 `type` 承载；跨包协调用逗号分隔多个 scope。历史提交里的 `docs(agents)`、`fix(ci)`、`feat(lint)` 是旧写法，不要照抄：CI 配置改动归类为 `ci`，指令系统文档（`AGENTS.md`、`docs/agents/`）归类为 `docs`，仓库根的非包改动（`scripts/`、根配置）用 `root` scope。

授权后仅暂存预期的文件，先预览再提交，确认无误后去掉 `--dry`：

```bash
bash scripts/commit.sh <type> <scope> "<subject>" --dry
```

## AI 署名

署名规则以本节为准：仅当 agent 对某次变更有实质贡献时才记录，不要为空提交或伪造身份。

- Agent 直接创建提交时，author 与 committer 用该 agent 的官方身份，不再叠加同名 `Co-authored-by` 尾注。
- Agent 参与人类 author 的提交时，追加共同作者尾注：

  ```text
  Co-authored-by: Codex <noreply@openai.com>
  Co-authored-by: Claude <noreply@anthropic.com>
  ```

人类提交者对需求、设计、审查、测试与最终合并承担全部责任。

提交前确认实际 author/committer 与意图一致：人类身份对应 `git config user.name` / `user.email`，agent 身份用其官方身份。`commit.sh` 不处理署名，需要事后用 `git commit --amend` 调整：改身份用 `--author=…` 并配合 `GIT_COMMITTER_NAME` / `GIT_COMMITTER_EMAIL`，追加共同作者用 `--trailer 'Co-authored-by: …'`。

## 提交 gate

提交前必须通过 [`workflow.md`](workflow.md) 的提交 gate。`.vite-hooks/pre-commit` 已接入 `pnpm agent:task guard`，由它核对级别 gate、冻结快照是否过期与状态是否一致，并运行 `.agents/checks/` 政策检查（有哪些检查、各自的判定口径与已登记的旁路，以脚本自身注释为准）。不要用 `--no-verify`、`--no-gpg-sign`、`HUSKY=0`、`VP_GIT_HOOKS=0`、`VITE_GIT_HOOKS=0` 或把检查工具指向空实现来绕过这些检查与签名校验。

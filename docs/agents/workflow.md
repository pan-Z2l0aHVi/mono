# 开发工作流、提交与授权边界

本文件规定从方案到合并的流程、授权边界、PR 自动跟进闭环与 Git 提交规范。PR review 判据见 [`review.md`](./review.md)，发布与 Changeset 见 [`release.md`](./release.md)。

## 从方案到合并

流程顺序：方案 → 独立 worktree 实施与测试 → 前端改动过[`前端冒烟门`](./verification.md#前端冒烟门) → 推送前过[`推送前本地全量 check 门`](./verification.md#推送前本地全量-check-门) → 提交并推送 / 创建 PR → **自动跟进 CI workflow 与 PR review 闭环** → 全部证据覆盖当前 base/head 且无未决 `Block` 后，经用户授权合并。

## 授权边界与 PR 自动跟进

### 自主执行（预授权，无需逐次请示）

- 独立任务 worktree 内的只读调查、以及非破坏性本地构建、测试、lint、类型检查与源码修复闭环。
- 清理系统临时目录内容，以及回收归属已确认由本任务启动的浏览器进程与本地 dev server。
- **PR 自动跟进闭环**：PR 创建后，agent 应主动持续跟进 GitHub Actions workflow 状态与 PR 审查结果（如 `Codex review gate` 与评论）；一旦审查发现产出，对每条问题进行核实与分析：
  - **核实属实**：在当前 PR 分支修复、本地复验通过后直接提交并常规推送（非 force-push），继续跟进新一轮 workflow 与审查直至收敛；
  - **误判或无需修改**：在 PR 中直接补充 comment 说明核实依据、代码位置或规范出处，并标明不修改理由。
  - 该闭环仍受 [`review.md`](./review.md) 的三轮复审封顶与确定性验证先行纪律约束。

### 需逐次用户明确授权

以下外部或不可逆高风险操作执行前必须取得用户明确同意（说明操作内容、影响范围与风险，等待用户确认；无回复不等于同意）：

- 首次创建 PR、合并 PR（squash 锁定已审 head，不用 `--admin` 或无条件 `--auto`）、修改 PR 标题/base 等元数据。
- 改写已推送分支历史（`force-push` / `rebase` 已推分支）或改变远端分支/tag 状态。
- 发布或对外交付（npm / Wails release）。
- 变更依赖与供应链配置（`package.json` 依赖、`pnpm-workspace.yaml` 策略、`.npmrc`、`.mise.toml`）或 CI workflow 定义。
- 读写凭证/密钥、修改共享客户端权限配置，或不可逆删除非临时数据。

**反作弊红线**：禁止为让失败检查变绿而擅自调大任何 timeout、等待上限或重试上限；确需调整必须先查明根因并凭实测耗时证据取得用户授权。

## Git 提交与 Hooks

- **scope 规则**：`commitlint` 类型/字数/语言规则以 [`commitlint.config.js`](../../commitlint.config.js) 为准。scope 标识受影响 workspace（跨包用逗号分隔）；嵌套 workspace 归最近祖先（如 `apps/interweave/frontend` 用 `interweave`）；根非包改动（`scripts/`、根配置、CI、指令文档）用 `root`。
- **提交脚本**：先暂存预期文件并用 `git diff --staged` 核对，再用脚本预览并提交（不绕开脚本用 `git commit -F`）：
  ```bash
  bash scripts/workflow/commit.sh <type> <scope> "<subject>" --dry
  ```
- **署名**：由 agent 创建的 commit 使用实际执行体的官方名称与邮箱（用户显式指定时优先）；不推造邮箱、不冒用其他 agent、不改写 Git 配置。`Co-authored-by` 只记录实际参与的 agent。
- **Hooks 与 fixer**：pre-commit 只读（会先构建 `@greypan/monorepo-kit` 产物），不修复不暂存；`fix-code` 可能改写多文件但**不会自动暂存**，运行后核对 diff 再只暂存预期文件。缺 hook dispatcher 时运行 `node scripts/maintenance/install-git-hooks.mjs`。**严禁**使用 `--no-verify`、`--no-gpg-sign`、`HUSKY=0`、`VP_GIT_HOOKS=0`、`VITE_GIT_HOOKS=0` 绕过检查。

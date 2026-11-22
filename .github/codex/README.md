# Codex 审查运行手册

本文只做导航：结论怎么读、出故障时按什么顺序查、到哪里找当前事实。判据只在 [`review.md`](../../docs/agents/review.md) 定义，机制与安全不变量以 [ADR-0021](../../docs/adr/0021-codex-review-gate.md) 与脚本为准；本文不维护状态全集、错误码表、重试次数、并发数与计数字段。

## 结论怎么读

结论评论头部有被审 head 的 `sha`，结论只对那个 head 有效。红绿判据与三条判定见
[`review.md`](../../docs/agents/review.md#自动审查结论的效力)，本文不复述映射。

三类阅读语义，不是状态枚举：

- **有结论**：按 `review.md` 的三档处置；`coverage.uncovered` 非空时由人工逐项补位。
- **结论失效**：head 变了、没有可审结论、来自 fork 或 `empty_diff` 时，按 `review.md` 做完整独立审查。
- **运行失败**（`error`）：按下面顺序找原因。

## 故障码与重跑

故障码与 `状态轨迹` 的当前枚举以脚本常量为准，用稳定 grep 查，不在本文抄表；结论 marker 的 `status` 语义由
[`review.md`](../../docs/agents/review.md#自动审查结论的效力) 定义，本文不重复。

```bash
grep -n "AUTO_RETRY_ERROR_CODES\|coverage\|attempt" .github/scripts/codex-review.mjs
```

某类故障是否重跑、重跑几次、`状态轨迹` 保留几条，同样读该常量与判定逻辑；人工不要凭记忆加次数。

## 排查顺序

1. 先看 CI run 的 job 日志，定位失败 step 与原始错误。
2. 再看 `codex-review-findings` 产物是否存在，`review-scope.json` 与结论 JSON 能否解析。
3. 核对 `coverage` 是否满足 schema 与命中要求，以及 `attempt` 是否已用尽恢复额度。
4. 最后看写回 job：评论 API 权限、产物下载 token 与评论是否已存在。

## 复用路径（同 head 与零增量）

- `same_head`：同一 head 且配置指纹一致、旧结论为 `reviewed` 且带完整 `coverage` 时直接复用。
- `zero_incremental_diff`：同步 `main` 后三方合并无冲突且滤除生成物后净增量为 0 时，原样继承前次结论（含 `Block` 判定）并在评论中区分标注，不重复调用模型；安全性依赖 Merge 平面 `check` 在新合并树上全量重跑。
- 配置指纹同时绑定可信基目录下的 `codex/prompts/review.md` 模板与 `codex/schemas/review-findings.schema.json` 哈希，任一缺失则 fail-closed 拒绝复用；语义边界与设计取舍见 [`review.md`](../../docs/agents/review.md#审查范围与生成物) 与 [ADR-0021](../../docs/adr/0021-codex-review-gate.md)。

## 单仓 PR 自动推进队列（`pr-auto-update-queue`）

- 作用：在严格要求跟上 `main` 且并发合入多个 PR 时，以单头 FIFO 队列串行调用 `update-branch` 并触发后续 CI 与原生 auto-merge；详见 [ADR-0021](../../docs/adr/0021-codex-review-gate.md#2026-11-22-修订零增量短路复用与单头-pr-自动推进队列)。
- 仓库配置要求：
  1. 在仓库 Settings 开启 **Allow auto-merge**。
  2. 创建一个仅安装到本仓库的 GitHub App，最小权限设为 **Contents: Read and write** 与 **Pull requests: Read and write**。
  3. 在仓库 Secrets 配置 `PR_QUEUE_APP_ID`（App ID / Client ID）与 `PR_QUEUE_APP_PRIVATE_KEY`（私钥 PEM）。未配置时工作流会优雅跳过并在 Step Summary 输出提示（exit 0）。
- 安全围栏与状态机：仅纳入 `open`、base 为 `main`、非 `draft`、已开启 `auto-merge` 且同仓（`head.repo.full_name == base.repo.full_name`）的 PR，且只检出默认分支；存在正在运行 `check` 的 up-to-date PR 时立即 `noop`，跳过冲突或失败 PR。实现见 [`.github/scripts/pr-auto-update-queue.mjs`](../scripts/pr-auto-update-queue.mjs) 与 [`.github/workflows/pr-auto-update-queue.yml`](../workflows/pr-auto-update-queue.yml)。

## 文件级指针

- 判据、状态、恢复：`grep -n "AUTO_RETRY_ERROR_CODES\|coverage\|attempt" .github/scripts/codex-review.mjs`
- 自动修：`grep -n "autofix" .github/scripts/codex-autofix.mjs`
- 并发：`grep -n "concurrency" .github/workflows/codex-review-report.yml`
- 写回：`.github/workflows/codex-review-report.yml`

## 维护约定

改动相关文件时，必须同时核对下面三条，它们与脚本和测试一起构成同步断言：

1. 两条模型 job 固定 `ubuntu-24.04`，与其它 Linux job 的 `ubuntu-latest` 不同；迁移要等上游修复 `drop-sudo` 兼容后统一进行，不能单边改一个 workflow。
2. `.github/codex/prompts/review.md` 的判据分三段内嵌：审查维度、三档定义、无发现与覆盖要求；改动 `review.md` 的对应判据时同 PR 对齐。
3. 自动修豁免清单里「`Check changesets` 失败时新增顶层 `.changeset/*.md`」的例外必须保留；删掉它会让该类失败对自动修结构性无效。

本手册只做导航，新增判据改 `review.md` 与脚本，不新增门禁。

# PR Review 纪律与自动跟进

本文件是本仓 PR review 与 CI 自动审查门（`Codex review gate`）的判据权威；运维排查与故障码见 [`.github/codex/README.md`](../../.github/codex/README.md)，权限拆分与安全不变量见 [ADR-0021](../adr/0021-codex-review-gate.md)。授权边界与 PR 自动跟进许可见 [`workflow.md`](./workflow.md#授权边界与-pr-自动跟进)。

## 自动审查结论的效力

CI 的 `check` 之后运行 `Codex review gate`，按三档输出发现并写回 PR 持久评论。是否列为 required 以仓库 ruleset 为准（`gh api repos/<owner>/<repo>/rulesets`）。

- **结论绑定 head**：`reviewed` 仅覆盖对应 head SHA；head 变更后旧结论过期，`stale`、`unreviewed`、`error`、`not_applicable` 均不代表已审。`reviewed` + `Block > 0`（评论状态 `blocked`）、`error`、`unreviewed` 均判红。
- **结论即 review**：存在可审源码改动、生成物已核对、`coverage.uncovered` 为空、reviewed SHA 等于当前 head、`Block == 0` 且 required `check` 绿时，PR review 完成，无需人工逐行重看。
- **`coverage.uncovered` 补位**：`coverage.inspected` 只记实际读过的路径；`coverage.uncovered` 非空时结论有效且门不变红，但「结论即 review」不成立，列出的未覆盖位置**必须由人工逐项复核**。
- **无有效自动结论时**：出现 `error`、`unreviewed`、`stale`、`not_applicable`、fork PR 或未配 push token 的 autofix 新 head 时，须按本文做独立人工审查。

## 审查范围与生成物

- **生成物滤除**：自动审查与人工审查在 `git diff` 入口按 [`generated-artifacts.md`](./generated-artifacts.md#审查范围与编辑拦截的分工) 滤除入库生成物；被滤除路径不计入 `coverage.inspected` / `coverage.uncovered`。生成物正确性由 generator 重建、`check-generated` 与消费者类型检查证明，不由审查结论证明。仅改生成物的 PR 得到 `empty_diff: true`，不算「结论即 review」。
- **增量复审与零增量短路**：复审以前次已审 head 为基线，核查增量与前次发现处置。配置指纹一致、同步 `main` 无合并冲突且滤除生成物后净增量为 0（`zero_incremental_diff`）时，原样继承前次结论（含 `Block` 判定）并依赖 `check` 在新合并树全量复检；基线失效或冲突时重新完整审查。
- **调查预算按风险分配**：优先审公共契约、失败路径、权限/安全、并发/资源与跨包接口，证据足以定档即可收口，读不完处如实写入 `coverage.uncovered`。指令或 context 改动另核 [ADR-0026](../adr/0026-lean-agent-context-for-frontier-models.md) 四条判据（不写前沿模型已内化的通用常识、不抄可从代码/配置/workflow 直接推导的事实、唯一权威且有入口路由覆盖、删除内容有落点）。

## 发现分档与 PR 自动跟进闭环

- **三档定义**：`Block`（阻断合并：运行失败、回归、契约破坏、安全/权限漏洞、竞态/泄漏、假绿）、`Should fix`（偏离需求/规范、边界遗漏、测试或文档失步）、`Nit`（非阻断微调）。每条须带文件行、影响与证据。
- **提 PR 后自动跟进与处置闭环**：
  1. 创建 PR 后自动跟进 CI workflow 与 `Codex review gate` 状态，直至检查与审查结论产出。
  2. CI workflow 失败，或审查结果中出现 `Block` / `Should fix` 问题（`Nit` 不单独触发重推，仅可随同轮修复顺手处理）时，逐条回到当前代码、测试与规范进行**独立核实与分析**（不盲从也不忽略）：
     - **核实属实**：在当前 PR 分支根因修复、跑通受影响验证与推送前检查后再次常规推送（非 force-push），继续跟进新一轮 workflow 与审查；若修复触及 [`workflow.md`](./workflow.md#授权边界与-pr-自动跟进) 中的需逐次授权高风险边界，先暂停请示用户；
     - **误判或无需修改**：在 PR 中补充 comment，写明对应 finding、核实依据（源码/配置/规范路径）与不修改理由；若被判定为误判的属于 `Block` 级发现（导致 required gate 保持红灯），补充 comment 后停止自动循环并上报证据交用户决断。
- **收敛纪律**：
  - **三轮封顶**：人/agent 驱动的语义复审最多三轮，每轮只受理 `Block` 与 `Should fix`；第三轮结束仍有 `Block` 时如实上报证据交用户决断。
  - **复现即重设计**：同一 finding 跨轮第二次出现，回设计层简化或删掉脆弱机制，不叠第三个补丁。
  - **确定性验证先行**：类型、lint、单测与真实复现交给工具闭环；语义审查只审工具测不出的契约与竞态。

## 合并前核对

合并前重读 PR 的 `draft`、base/head、required `check`、前端冒烟结论（前端改动）与 `Codex review gate`（以 check-runs API 在当前 head 绿且早于合并时刻为单一判据；auto-merge 路径上持久评论允许落后一个 head）。经用户授权后以 squash 锁定已审 head 合并，不用 `--admin` 或无条件 `--auto`；涉及 `.github/workflows/ci.yml` 的 codex job、`.github/workflows/codex-review*.yml`、`pr-auto-update-queue.yml` 或 `.github/scripts/` 可信脚本改动时，另核 [ADR-0021](../adr/0021-codex-review-gate.md) 安全不变量。

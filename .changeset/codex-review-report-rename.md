---
---

CI 与文档变更，不涉及发包：写回 workflow 的显示名与文件名从 `Codex Review Publish` / `codex-review-publish.yml` 改为 `Codex Review Report` / `codex-review-report.yml`，因为它的产物是一份关于既有结论的报告，不改判结论。命名一并收敛到底：job `publish-review` → `report-conclusion`，步骤 `Publish conclusion comment` → `Post conclusion comment`，脚本子命令 `publish` → `report`。同时补上跳过的可观测性：没有 `codex-review-findings` 产物时在运行页 Summary 与 notice 里写明原因，产物存在却下载失败时该步骤判红，把「没有可写回的结论」和写回 job 自身故障分开；写回成功时也在 Summary 里记录评论 id、结论与档位统计。ADR 与 `docs/agents/review.md` 同步这条口径，拓扑断言钉住跳过必须留痕。

---
---

CI 与文档变更，不涉及发包：`missing_coverage` 空壳结论不再需要人工重跑。`Codex Review Report` 的 `report-conclusion` 持有 `actions: write`，在 CI 已判红、产物为 `unreviewed / missing_coverage` 且 `run_attempt=1` 时调用 `gh run rerun --failed` 一次；`run_attempt` 从 Actions REST API 读取，读不到就跳过，重跑完成后的新 `workflow_run` 因 attempt 大于上限自动停止并转人工。`unusable_output` 与 `error` 仍保留「重跑整条 run」。结论评论按 `triggered` / `exhausted` / `failed` 三档写明恢复状态，重跑调用失败时不会退回误导性的手动重跑指引。脚本单测钉住上限、分流与失败兜底，编排断言钉住权限、步骤连接和可信子命令；`docs/agents/review.md` 与 ADR-0021 同步恢复指引、权限扩张理由和未采用的方案。

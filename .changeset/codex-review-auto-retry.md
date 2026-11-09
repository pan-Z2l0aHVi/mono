---
---

CI 与文档变更，不涉及发包：`missing_coverage` 空壳结论不再需要人工重跑。`Codex Review Report` 的 `report-conclusion` 持有 `actions: write`，在 CI 已判红、产物为 `unreviewed / missing_coverage` 且 `run_attempt=1` 时调用 `gh run rerun --failed` 一次。`run_attempt` 与 run conclusion 由 `workflow_run` payload 注入，字段不可读就跳过；重跑完成会再次触发写回腿，此时 attempt 大于上限即停止并转人工。上限取 1 的依据是每次重跑都会再触发一次 `workflow_run` 与模型腿，超过一次就变成反复调用模型而非恢复。`unusable_output` 与 `error` 仍保留「重跑整条 run」。结论评论按 `triggered` / `exhausted` / `failed` 三档写明恢复状态；重跑或读取失败统一收敛成 `failed` 档并写进 step output、运行页 annotation 与 Summary，结论评论由步骤 outcome 兜底，不会退回误导性的手动重跑指引。脚本单测钉住上限、分流、编排层异常兜底与四态文案，编排断言钉住权限、步骤顺序、env 与可信子命令；`docs/agents/review.md` 与 ADR-0021 同步恢复指引、权限扩张理由和未采用的方案。

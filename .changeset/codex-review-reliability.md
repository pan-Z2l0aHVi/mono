---
---

CI 与文档变更，不涉及发包：审查结论的输出校验不再把空 `summary` 当致命错误，模型给空串时 findings 照常成立；`unreviewed` 从「保持绿色」改为让 `codex-gate` 变红并带故障码 `unusable_output`，绿色只留给有结论可读的 run；写回 job 的跳过提示不再挂在 `pull_number` 上，解析不到 PR 时也会在运行页 Summary 与 notice 里写明原因；ADR-0021 验收第 5 条的「未发布」改为与实现一致的「未写回」。

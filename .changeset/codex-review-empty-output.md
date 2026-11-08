---
---

CI 与文档变更，不涉及发包：补上模型「空壳结论」的编排层防线。此前模型可能在打开任何改动文件前就交出 `findings` 与 `coverage.inspected` 同时为空的 JSON，`run_codex` 和审查腿都标 success、只有门禁判红，于是 `gh run rerun --failed` 只重跑门禁、拿同一份空 artifact 再红一次。现在 `Reject empty review output` 会让审查腿一并判红，`--failed` 即可重跑模型腿；可信 prompt 增加「先实际打开至少一个改动文件才允许输出 JSON」的硬约束，并说明判据文档里的链接不是审查判据。恢复指引仅对 `missing_coverage` 改指 `gh run rerun --failed`（`unusable_output` / `error` 的审查腿仍是绿的，保留「重跑整条 run」）；上传产物补 `overwrite: true` 以兼容 `--failed` 重跑。ADR-0021 补记决策、输入可信来源边界与未采用的方案。

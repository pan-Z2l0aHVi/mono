---
---

CI 修复，不涉及发包：审查结论新增必填的 `coverage`（`inspected` / `uncovered`），把 `docs/agents/review.md` 里「无发现也要记录审查范围、验证证据和未覆盖风险」落成输出字段。diff 非空时缺 `coverage` 一律判 `missing_coverage`（有 findings 也不能省，findings 仍会展示），空 findings 时 `inspected` 还至少要命中一条本次改动过的路径（`prepare` 写进 `review-scope.json` 的 `changed_paths`），避免只读判据文档就收尾也能变绿。没有覆盖清单的旧结论不再复用（宁可重跑模型），复用 artifact 解到独立目录、不覆盖本轮的 `review-scope.json`；复用有清单的结论时沿用上一次的生成时间。评论同时新增「结论生成于」行，就地更新时也能看出结论是不是新的；人工抽查的前提加了「`coverage.uncovered` 为空」，未覆盖项必须逐项复核。

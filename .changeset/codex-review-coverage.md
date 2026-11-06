---
---

CI 修复，不涉及发包：审查结论新增必填的 `coverage`（`inspected` / `uncovered`），把 `docs/agents/review.md` 里「无发现也要记录审查范围、验证证据和未覆盖风险」落成输出字段。无 findings 又不交覆盖清单时判 `missing_coverage` 并让门变红，避免「没查就收尾」以绿色通过；评论同时新增「结论生成于」行，就地更新时也能看出结论是不是新的。

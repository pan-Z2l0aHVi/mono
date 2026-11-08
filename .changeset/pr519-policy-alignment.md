---
---

CI 契约调整，不涉及发包：#519 追 `origin/main`（#525 已合入）后，把两条审查口径对齐。`docs/agents/review.md` 的「结论即 review」要求 `coverage.uncovered` 为空，#525 的收口纪律允许 `uncovered` 非空作为合法出口；两者讲的是不同问题（结论有没有效 vs. review 算不算完成），补一句衔接明确非空时结论仍 `reviewed`、门不红，但完成条件不成立，仍须人工逐项复核。

同时修掉合并产生的悬空引用：#525 写的「不满足『核对式抽查』的前提」指向的是 #519 已经替换掉的旧术语，两处（review.md 与 ADR-0021「收口纪律」）改指「结论即 review」的完成条件。`.github/workflows/ci.yml` 的 120 分钟上限注释与 `check-policy` 串行注释经合并后各自保留，无需再改。

---
---

CI 契约调整，不涉及发包：给审查 prompt 补「调查与收口」纪律。`changed_paths` 此前被写成「逐个文件读」的任务清单，配合「再难的改动都要给出可执行的结论」，模型在 137 文件 PR 上跑满 60 分钟仍未收口（ADR-0021 同日第八次实测）。现在它是候选清单：按风险排序调查、证据够就交卷、没能判断的改动处逐条写进 `coverage.uncovered`（非空不判红、不使结论作废，但必须人工逐项复核，也不能套用核对式抽查），`coverage.inspected` 不许拿没读过的文件凑命中，空 findings 仍按 `missing_coverage` 作废。schema 的两条描述同步说明这两点，`docs/agents/review.md` 与 ADR-0021 补上同一口径和验收项。

这不是对上游 `429 model_failed` 的修复：那几次崩溃与运行时长、token 和模型进度没有稳定关系，属上游网关限速，另案处置。可信 prompt 与 schema 取自 PR base，本 PR 自身的审查腿仍读旧 prompt；`docs/agents/review.md` 不在可信输入清单里，由模型从工作区（本 PR head）读取、本 PR 即生效，所以这一轮是混合契约（旧 prompt 要求逐文件读、新判据授权早停），按 ADR-0021「输入可信来源」已接受的同类风险由人工 review 兜住。prompt / schema 的新行为要等合入 main 后的下一个 PR 才能验证，当前尚未在新契约上验证。

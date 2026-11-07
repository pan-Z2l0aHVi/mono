---
---

CI 修复，不涉及发包：把「生成物不需要 diff，也不需要 review」写成审查纪律，并让滤除真正落到审查输入里。此前 `REVIEW_EXCLUDE_PATHSPECS` 只排除 `**/generated/**`，`routeTree.gen.ts`、`typed-router.d.ts`、`auto-imports.d.ts`、`icons/index.ts` 与 Wails `bindings/**` 这些生成物仍进 `pr.diff` 与 `review-scope.json` 的 `changed_paths`：模型按「逐个文件读」的入口把它们当硬目标，纯属干扰信息；大 PR 的审查预算本就紧张，不该花在生成物上。这是预防性收敛范围，不是对某次故障的修复：实测 `git ls-files` 上六条 pathspec 共滤掉 2391 个入库生成物，`**/generated/**` 之外只有 19 个；#519 的 137 文件 diff 里一条生成物都没有，那次 `429 model_failed` 是上游网关限速，另案处理。现在按 `docs/agents/generated-artifacts.md` 的唯一判据「能否由 generator 完整重建」取最小路径集，六条 pathspec 覆盖清单全部入库生成物；生成物的正确性仍由 `check-generated` 与消费者类型检查证明，不由审查结论证明。

判定逻辑没有另造一份：清单、三层定性法与 `.claude/settings.json` 的 `deny` 名单仍以 `docs/agents/generated-artifacts.md` 为权威，`docs/agents/review.md` 与审查 prompt 只引用它。prompt 明确要求模型不读、不评注、不把生成物列进 `coverage.uncovered`；`review-scope.json` 继续记 `excluded_pathspecs` 供审计。过滤名单留在取自 PR base 的可信脚本里，不从 PR head 的工作树读取，避免作者改名单自定义审查范围。测试钉住六条 pathspec 与生成物判据文档的对应关系。

---
---

CI 与文档变更，不涉及发包：把结论评论的三处读感问题修掉。① 全 0 的「档位统计」只跟 `reviewed`、`stale` 或本身带非零档位的结论一起出现，`error`/`unreviewed` 里的全 0 会被读成「审过了、没问题」；带非零 findings 的空壳结论仍列档位。② `error` 档的恢复指引按故障码分流：`model_failed` 先看 `Codex review` job 里 `Run codex exec` 的日志、`artifact_missing` 查上传与下载、只有 `config_missing` 才改后台；写回 job 按需从那条 CI run 的 `Codex review` job 日志抄出第一条结构化错误（`gh api --allow-escape-sequences`，读不到就静默省略，诊断辅助不判红写回 job）。③ 就地更新会刷掉上一版，评论现在保留「状态轨迹」，最近 8 条 `时间 档位(故障码)/恢复档` 连续去重，用来回答「这是第几次空壳」；历史存在评论头部 marker 的 `traj=` 字段而不是可见正文，正文里的同前缀文本（哪怕形状完全合规）不会被读回续写。分流口径以 `docs/agents/review.md` 为准，ADR-0021 与 `docs/agents/review.md` 同步留痕语义；拓扑断言钉住新的 `WORKFLOW_RUN_ID` 注入，脚本单测钉住档位统计抑制、四档文案、假 spawn 下的日志端点与转义开关、日志解析、轨迹的读回与截尾，以及 `conclusionRenderExtras` 这条接线（env 名、门控故障码、上一版正文与档位判据各写错一笔都会在这里变红）。

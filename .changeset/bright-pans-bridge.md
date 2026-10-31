---
'@greypan/pi-orchestrator-memory-bridge': patch
---

新增 Pi 扩展：Herdr lead 会话的编排层记忆桥接与任务板同步。

- 激活门槛用 `herdr agent list` 的 `name` 字段区分 lead 与 worker/reviewer，worker pane 里零注册。
- 两个写入锚点：`herdr_plan` 获批写 decision 记忆，`herdr_review` 拒绝写 rejection 记忆，键名为 `project.<slug>.orchestration.<kind>.<slot>`，slot 取内容哈希，重放幂等。
- 回读 `slices/<slice>.review.md` 纠正 orchestrator 的 verdict 解析缺陷（模板枚举会被正则抢先命中，导致 `details.verdict` 恒为 APPROVE）。
- `herdr_dispatch` / `herdr_review` 同步进 `pi-task-board`：dispatch 建 `in_progress` 任务，APPROVE 移 `in_review`，REJECT 退回 `todo` 并记原因；同 slice 入队合并，避免重复任务。
- 注入走 `systemPromptOptions.sections.orchestration`，带 historical/untrusted 标记与 token 预算，不写 transcript，不覆盖 `pi-memory` 的 `sections.memory`。
- 零外部运行时依赖：Pi 宿主 API 的类型声明在本包内，`typebox` 由普通 JSON Schema 字面量替代。

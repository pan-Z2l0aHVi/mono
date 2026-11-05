---
---

CI 与文档变更，不涉及发包：Codex 审查的 `git diff` 用 exclude pathspec 剔掉 `**/generated/**` 生成产物并在 `review-scope.json` 留痕；`spawnSync` 统一放宽到 64 MiB，避免大 PR 的 diff 撑爆默认 1 MiB 缓冲让 `prepare` 在预检之前失败；两条模型腿固定 `ubuntu-24.04`，绕开 `openai/codex-action#188` 在 ubuntu-26.04 上让 `drop-sudo` 于模型启动前失败的缺陷，并由拓扑断言与 ADR 记录恢复条件。

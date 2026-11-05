---
---

CI 与文档变更，不涉及发包：Codex 审查的 `git diff` 用 exclude pathspec 剔掉 `**/generated/**` 生成产物并在 `review-scope.json` 留痕；`spawnSync` 统一放宽到 64 MiB，避免大 PR 的 diff 撑爆默认 1 MiB 缓冲让 `prepare` 在预检之前失败。

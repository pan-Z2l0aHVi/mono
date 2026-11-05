---
---

CI 与文档变更，不涉及发包：Codex 审查的 `git diff` 用 exclude pathspec 剔掉 `**/generated/**` 生成产物并在 `review-scope.json` 留痕；`spawnSync` 统一放宽到 64 MiB，避免大 PR 的 diff 撑爆默认 1 MiB 缓冲让 `prepare` 在预检之前失败；两条模型腿固定 `ubuntu-24.04`，绕开 `openai/codex-action#188` 在 ubuntu-26.04 上让 `drop-sudo` 于模型启动前失败的缺陷；三处跨 run `download-artifact@v7` 补 `github-token`，否则 `run-id` 被忽略、写回腿拿不到结论产物而无法发评论；审查 prompt 改为描述过滤后的源码 diff。agent 文档体系同步承载这条规则：`review.md` 新增「审查范围与生成物」条款（两份 diff 的分工、空 diff 不构成可合并结论），`generated-artifacts.md` 把排除清单与生成物名单的边界独立成节，`agent-context.md` 登记 concern 归属与同步义务。以上均由拓扑断言与 ADR 记录恢复/验收条件。

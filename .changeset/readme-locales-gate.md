---
'@greypan/monorepo-kit': patch
---

新增 `readme-locales` 门禁：发布包必须同时提供 `README.md` 与 `README.CN.md`，成对存在的两份必须互相链接；检查并入 `check-policy` 与 `check-pre-commit`。`format-clean` 改名为 `staged-clean`，`check-md-to-comp-artifacts` 入口从 `scripts/workflow/` 移到 `scripts/checks/`；`test-scripts` 的排除目录改由根入口传入，策略模块不再硬编码本包路径。

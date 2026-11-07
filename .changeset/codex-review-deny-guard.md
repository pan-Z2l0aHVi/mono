---
---

CI 契约调整，不涉及发包：`.claude/settings.json` 的 `permissions.deny` 编辑拦截名单与审查脚本的 `REVIEW_EXCLUDE_PATHSPECS` 不再只靠人工核对。此前脚本单测只把「文档过滤路径表 ↔ 常量」双向钉住，deny 新增一条生成物路径而审查侧没跟上时不会有人发现。现在单测解析 deny 里的 `Edit(...)` 条目，逐条映射到负责它的 pathspec，双向断言键集合与 pathspec 成员，并在临时 git 仓库里用样例路径验证这些 glob 真的把生成物滤出 `changed_paths`。两份名单允许「一条 deny 对多条 pathspec」（`icons/**` 由 `icons/index.ts` 与 `**/generated/**` 联合覆盖），但不允许静默漂移；两条 `.env` 读取拦截不属于生成物，显式排除在覆盖表之外。生成物清单文档与 ADR-0021 的同步清单、验收项一并补上这条护栏。

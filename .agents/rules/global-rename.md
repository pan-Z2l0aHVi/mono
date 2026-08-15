# 全局替换 / 重命名完整性约束

全局重命名、API 迁移、package/import rename 或用户明确要求的"全部替换"属于完整性敏感变更，必须执行 exhaustive search → modify → verify 闭环。详细工作流程见 [`docs/agents/global-rename.md`](../../docs/agents/global-rename.md)。

- 搜索边界必须是 repository root，不能只搜当前 package。
- 修改前穷举搜索旧名称的所有变体（exact、kebab-case、camelCase、PascalCase、snake_case、CSS selector 等），修改后必须再次搜索验证无残留。
- 批量替换不代替后续验证；测试通过不能替代 exhaustive search。
- 残留匹配必须逐项分类（有意保留/generated/external/遗漏），不能简单报告数量。
- 普通局部编辑不执行此流程，仅在全局替换、rename、migration、repository-wide API change 时强制执行。

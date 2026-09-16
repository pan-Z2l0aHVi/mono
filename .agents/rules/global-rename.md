# 全局替换 / 重命名完整性约束

全局重命名、API 迁移、package/import rename 或用户明确要求的“全部替换”属于完整性敏感变更，不能只做局部替换；exhaustive search → modify → verify 的完整流程见 [`docs/agents/global-rename.md`](../../docs/agents/global-rename.md)。

普通局部编辑、单文件改动，或只涉及少量引用的符号重命名不适用该流程。

# 全局替换 / 重命名工作流程

本指南为全局重命名、API 迁移、文件迁移等完整性敏感变更提供详细工作流程。约束摘要见 [`.agents/rules/global-rename.md`](../../.agents/rules/global-rename.md)。

## 适用任务类型

以下任务必须视为"完整性敏感"变更：

- 全局重命名 / 全局字符串替换
- API / symbol rename
- package / import rename
- CSS class / custom element / attribute rename
- 配置项 rename
- 文件名 / 路径迁移
- deprecated API migration
- 用户明确要求"全部替换""全局修改""整个 monorepo 修改"

## 工作流程

### 1. 仓库根目录发现

以 repository root 为搜索边界，确认 monorepo 结构和 workspace 范围：

- `apps/`、`packages/`、`scripts/`、`tests/`、`docs/`、`examples/`、`configs/`
- `package.json`、workspace configuration、TypeScript project references
- build/test/lint configuration

不得因为某个 package 是主要目标就跳过其他 workspace。

### 2. 穷举初始搜索

修改前进行全局穷举搜索。搜索形式包括但不限于：

- exact symbol / exact string
- import path / package name
- kebab-case / camelCase / PascalCase / snake_case
- CSS selector / class / custom element name
- attribute name / file path / directory path
- documentation references / configuration references

旧名称存在多种语法表示时，必须分别搜索。

### 3. 编辑前分类匹配项

不要直接批量替换。先区分：

- **必须修改**：源码、配置、文档中的有效引用
- **可能需要修改**：需要进一步确认的匹配
- **明确不修改**：generated files、vendored/external files、historical documentation、test fixtures、snapshots、examples

不修改的匹配必须能解释保留原因。

### 4. 执行修改

完成所有应该修改的匹配。简单确定的 rename 可用批量编辑工具，但批量替换不代替后续验证。

### 5. 强制修改后搜索

修改完成后，必须重新从 repository root 搜索旧名称。这是强制步骤，不得因以下原因省略：

- TypeScript 编译通过
- lint 通过
- tests 通过
- diff 看起来正确

### 6. 分析每个剩余匹配

post-change search 发现旧名称时，逐项判断：

- 有意保留
- generated
- external
- historical/documentation
- test fixture
- binary/uneditable
- 实际遗漏

存在实际遗漏则继续修改并再次搜索。最终目标：

> 所有预期修改范围内的旧名称均已消失，或所有剩余旧名称均已明确分类并说明保留原因。

### 7. 验证新形式

搜索新名称，确认：

- 新名称已覆盖预期位置
- import/reference 没有遗漏
- workspace/package references 一致
- 没有错误替换或 duplicate/malformed references

### 8. Diff 验证

检查 git diff：

- 是否修改了不相关文件
- 是否漏改文件
- 是否出现机械替换导致的错误
- 是否修改 generated files
- 是否出现路径/大小写错误
- 是否破坏 import/export

### 9. 验证

根据变更范围选择验证：

- typecheck / lint
- 测试（聚焦或根级别）
- 构建（如涉及发布产物）

测试通过不能替代 exhaustive search。

## 重要约束

### 工具选择

不强制 IDE 搜索。可使用 `rg`、`grep`、`git grep`、`find` 等 CLI 工具。重点是搜索范围完整，且修改后重新搜索验证。

### 语义边界

全局替换必须考虑语义边界。将 `foo` 替换成 `bar` 时，不能机械替换 `foobar`、`food`、`myFooComponent`。应根据语言、语法和任务意图决定匹配范围。

### 用户范围

用户明确要求只修改某些 package/目录/文件时，以用户范围为准。"全局"默认指当前 repository/workspace 范围，不包括 node_modules、缓存、构建产物或外部依赖。

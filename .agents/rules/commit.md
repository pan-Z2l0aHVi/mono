# Commit 规范

遵循 Conventional Commits 规范，由 commitlint 强制执行。**规则以根目录 `commitlint.config.js` 为准**，commit 前务必先读取该文件确认最新约束。

## 允许的 type

| type       | 使用场景                    | Emoji | 示例                                           |
| ---------- | --------------------------- | ----- | ---------------------------------------------- |
| `feat`     | 新功能                      | ✨    | `feat(js-kit): add url parser utility`         |
| `fix`      | 修复 bug                    | 🐛    | `fix(web-ui): resolve hydration mismatch`      |
| `docs`     | 仅文档变更                  | 📚    | `docs(readme): add setup instructions`         |
| `style`    | 格式调整，无逻辑变更        | 💎    | `style(js-kit): apply prettier formatting`     |
| `refactor` | 代码重构，无功能/修复变更   | 📦    | `refactor(browser-kit): simplify cache logic`  |
| `perf`     | 性能优化                    | 🚀    | `perf(web-ui): optimize lit element rendering` |
| `test`     | 添加或更新测试              | 🚨    | `test(js-kit): add url parser unit tests`      |
| `build`    | 构建系统或依赖变更          | 🛠    | `build(root): upgrade vite to v6`              |
| `ci`       | CI/CD 配置变更              | ⚙️    | `ci: add changeset release workflow`           |
| `chore`    | 维护性变更，不涉及 src/test | ♻️    | `chore(root): dedupe lockfile`                 |
| `revert`   | 回滚之前的 commit           | 🗑    | `revert(js-kit): remove url parser`            |

## Scope 规则

- **允许的 scope**：`root`、`apps`、`packages`、`js-kit`、`browser-kit`、`test-kit`、`web-ui`、`unplugin-web-components`、`deps-reload`、`react-app-demo`、`vue-app-demo`
- **多 scope**：跨包变更用逗号分隔：`fix(js-kit,browser-kit): resolve type mismatch`
- **跨模块变更**：使用 `root`，适用于 CI、配置、文档等全仓库变更

## Header 规则

- 最多 200 个字符
- 不能以 `.` 结尾
- 不能是 sentence-case、start-case、pascal-case 或 upper-case
- 使用**祈使语气**（"add feature" 而非 "added feature" 或 "adds feature"）

## Body（可选）

- 需要解释时通过 `-b` 参数添加 body
- body 说明**为什么**做这个变更，**是什么**由 header 说明
- 每行不超过 100 个字符

## Agent commit 工作流

**⚠️ Agent 提交前必须先询问用户确认，不得自动 commit。**

**步骤 1**：暂存变更

```bash
git add -A
# 或选择性暂存：
git add <file1> <file2>
```

**步骤 2**：预览 commit message（dry-run）

```bash
bash scripts/commit.sh feat js-kit "add url parser utility" --dry
```

**步骤 3**：提交

```bash
bash scripts/commit.sh feat js-kit "add url parser utility"
```

**带 body**（复杂变更）：

```bash
bash scripts/commit.sh fix web-ui,js-kit "resolve hydration mismatch" \
  -b "Fix race condition in SSR where component state diverged between server and client"
```

## 如何选择 type

问自己这几个问题：

1. **是否增加了用户可见的功能？** → `feat`
2. **是否修复了 bug 或回归问题？** → `fix`
3. **是否优化了性能？** → `perf`
4. **是否只修改了测试？** → `test`
5. **是否只修改了文档/注释/格式？** → `docs`/`style`
6. **是否重构了代码但行为不变？** → `refactor`
7. **是否影响了构建/CI 工具？** → `build`/`ci`
8. **以上都不是？** → `chore`

## 反模式（会被拒绝）

- ❌ `update js-kit`（太模糊，更新了什么？）
- ❌ `fix bug`（哪个 bug？哪个 scope？）
- ❌ `Feat: Add Feature`（大小写错误）
- ❌ `fix(js-kit): Fixed the bug.`（过去式，且以句号结尾）
- ❌ `refactor: Refactor code`（同义反复）

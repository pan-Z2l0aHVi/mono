# Commit 规范

Conventional commits enforced by commitlint. **规则以根目录 `commitlint.config.js` 为准**，commit 前务必先读取该文件确认最新约束。

## Allowed types

| Type       | When to use                        | Emoji | Example                                        |
| ---------- | ---------------------------------- | ----- | ---------------------------------------------- |
| `feat`     | New feature                        | ✨    | `feat(js-kit): add url parser utility`         |
| `fix`      | Bug fix                            | 🐛    | `fix(web-ui): resolve hydration mismatch`      |
| `docs`     | Documentation only                 | 📚    | `docs(readme): add setup instructions`         |
| `style`    | Formatting, no logic change        | 💎    | `style(js-kit): apply prettier formatting`     |
| `refactor` | Code restructuring, no feature/fix | 📦    | `refactor(browser-kit): simplify cache logic`  |
| `perf`     | Performance improvement            | 🚀    | `perf(web-ui): optimize lit element rendering` |
| `test`     | Adding/updating tests              | 🚨    | `test(js-kit): add url parser unit tests`      |
| `build`    | Build system or deps               | 🛠    | `build(root): upgrade vite to v6`              |
| `ci`       | CI/CD configuration                | ⚙️    | `ci: add changeset release workflow`           |
| `chore`    | Maintenance, no src/test changes   | ♻️    | `chore(root): dedupe lockfile`                 |
| `revert`   | Revert a previous commit           | 🗑    | `revert(js-kit): remove url parser`            |

## Scope rules

- **Allowed scopes**: `root`, `apps`, `packages`, `js-kit`, `browser-kit`, `test-kit`, `web-ui`, `unplugin-web-components`, `vite-plugin-full-reload`, `react-app-demo`, `vue-app-demo`
- **Multiple scopes**: Use comma separation for cross-package changes: `fix(js-kit,browser-kit): resolve type mismatch`
- **Cross-cutting changes**: Use `root` for repo-wide changes (CI, config, docs)

## Header rules

- Max 200 characters
- Must not end with `.`
- Must not be sentence-case, start-case, pascal-case, or upper-case
- Use **imperative mood** ("add feature" not "added feature" or "adds feature")

## Body (optional)

- Add body with `-b` flag when the change needs explanation
- Use body for **why** the change was made, not **what** (the header says what)
- Keep lines under 100 characters

## Agent commit workflow

**Step 1**: Stage your changes

```bash
git add -A
# or be selective:
git add <file1> <file2>
```

**Step 2**: Preview the commit message (dry-run)

```bash
bash scripts/commit.sh feat js-kit "add url parser utility" --dry
```

**Step 3**: Commit

```bash
bash scripts/commit.sh feat js-kit "add url parser utility"
```

**With body** (for complex changes):

```bash
bash scripts/commit.sh fix web-ui,js-kit "resolve hydration mismatch" \
  -b "Fix race condition in SSR where component state diverged between server and client"
```

## Choosing the right type

Ask yourself:

1. **Does it add user-facing functionality?** → `feat`
2. **Does it fix a bug or regression?** → `fix`
3. **Does it improve performance?** → `perf`
4. **Does it only change tests?** → `test`
5. **Does it only change docs/comments/formatting?** → `docs`/`style`
6. **Does it restructure code without changing behavior?** → `refactor`
7. **Does it affect build/CI tooling?** → `build`/`ci`
8. **Everything else** → `chore`

## Anti-patterns (will be rejected)

- ❌ `update js-kit` (too vague, what did you update?)
- ❌ `fix bug` (which bug? which scope?)
- ❌ `Feat: Add Feature` (wrong case)
- ❌ `fix(js-kit): Fixed the bug.` (past tense, ends with period)
- ❌ `refactor: Refactor code` (tautological)

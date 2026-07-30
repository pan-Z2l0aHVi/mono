# Commit Workflow

Read this guide only after the user explicitly authorizes a commit. The current `commitlint.config.js` is the source of truth.

Use Conventional Commits with an allowed type such as `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, or `revert`. Use `root` for repository-wide changes; use package scopes for package work and comma-separated scopes for coordinated package changes.

The header is imperative, lower case, no longer than 200 characters, and has no trailing period. Add a body only when the rationale is not clear from the header.

After authorization, stage only the intended files, preview with:

```bash
bash scripts/commit.sh <type> <scope> "<subject>" --dry
```

Then commit with the same command without `--dry`. Do not bypass Git hooks or signing checks.

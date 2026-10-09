---
---

Fix two repository agent checks: `commit.sh --dry` now previews the message it will
actually commit instead of an emoji-prefixed variant that commitlint rejects, and
`changeset-required` accepts changesets the branch brought in before a merge-commit
base instead of reporting them missing.

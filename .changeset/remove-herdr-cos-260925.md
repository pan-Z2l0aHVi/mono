---
---

Internal change: removes the repo-authored `herdr-cos` skill and the whole multi-agent orchestration layer it carried — role contracts, the `$TMPDIR/herdr-cos` ledger, the supervisor witness role, `scripts/cos.test.mjs`, the seven orchestration ADRs (0010/0011/0015/0016/0017/0019/0020) and every reference to them in `AGENTS.md`, `CONTRIBUTING.md`, `CONTEXT.md`, `docs/agents/*` and `scripts/validate-context.mjs`. Parallel worktree execution is now governed solely by `docs/agents/workflow.md` and `docs/agents/worktrees.md`; the `Task Packet` coordination area is removed outright.

The third-party `herdr` skill is no longer a dependency of a repo-authored skill, so it moves from the GitHub-distributed mirror in `skills/` to `.agents/skills-vendored/`. `scripts/update-vendored-skills.mjs` now skips the root `skills/README.md` install doc when rebuilding the `.agents/skills/` symlink surface — it is not a skill and linking it broke the "every symlink has a real home" invariant on the next update. No published package is affected.

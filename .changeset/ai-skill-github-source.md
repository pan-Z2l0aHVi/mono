---
'@greypan/ai-skill': minor
---

Add a GitHub source distribution surface and reset the version base to 0.0.0 (first release via changesets will be 0.1.0). Repo-authored skills now live at the repo root `skills/` directory, together with mirrors of the third-party skills they depend on (herdr), so `npx skills add pan-Z2l0aHVi/mono` exposes exactly the repo-authored skills plus their dependencies. Remaining third-party skills moved to `.agents/skills-vendored/` (not CLI-scanned); `.agents/skills/` is now an all-symlink instruction surface, and `pnpm agent:update-skills` updates third-party skills through the official `skills update` engine without breaking the layout.

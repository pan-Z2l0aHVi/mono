---
'@greypan/ai-skill': minor
---

Add @greypan/ai-skill, a new npm package publishing the repo-authored agent skills (contract-change-review, herdr-agents) under the skills/<name>/SKILL.md convention. The skills' canonical home is the repo-root skills/ directory, which doubles as the GitHub discovery surface for `npx skills add pan-Z2l0aHVi/mono` alongside mirrors of the third-party skills the repo-authored ones depend on; the npm package ships only the repo-authored subset. Third-party skills stay vendored in-repo (`.agents/skills-vendored/`) and are never published; third-party updates flow through `pnpm agent:update-skills`. Minor because the first release introduces the whole public package surface.

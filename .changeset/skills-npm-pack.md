---
'@greypan/ai-skill': minor
---

Add @greypan/ai-skill, a new npm package that publishes the repo-authored agent skills (contract-change-review, herdr-agents) under the skills/<name>/SKILL.md convention. The skills' source of truth moves from .agents/skills/ into packages/ai-skill/skills/ and is exposed back to the agent instruction system through relative symlinks at .agents/skills/<name>; third-party skills stay vendored in .agents/skills/ and are not published. Minor (not patch) because the first release introduces the whole public package surface.

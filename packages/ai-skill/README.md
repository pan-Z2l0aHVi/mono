# @greypan/ai-skill

Repo-authored agent skills distributed as an npm package, following the `skills/<name>/SKILL.md` packaging convention shared by the agent-skills tooling ecosystem. The same skills are also installable straight from this GitHub repository.

## Install

The package is static markdown — nothing to import, no build step. Two distribution channels:

**From GitHub (tracks `main`, updatable via `npx skills update`):**

```sh
npx skills add pan-Z2l0aHVi/mono
```

**From npm (versioned via changesets):**

```sh
npm install -D @greypan/ai-skill
```

Then wire the skills into your agent's skill directory:

- **Manual**: symlink or copy the skill you need into the skills directory your agent scans — `.agents/skills/<name>` for Codex/Cursor, `.claude/skills/<name>` for Claude Code (prefix `~/.` for user-global scope), e.g. `ln -s node_modules/@greypan/ai-skill/skills/<name> .agents/skills/<name>`.
- **`npx skills sync`** (experimental, [vercel-labs/skills](https://github.com/vercel-labs/skills)): crawls `node_modules` for `SKILL.md` files (this package's `skills/` layout is one of the scanned locations), installs what it finds into the detected agents' skill directories, and records them in the consumer-side `skills-lock.json` with `sourceType: 'node_modules'`. Re-run after upgrading the package.
- **skills-npm**: `npm i -D skills-npm && npx skills-npm setup` is an alternative sync tool with the same node_modules-to-agent-dir flow.
- `npx skills add` does **not** accept npm package names (`@scope/pkg` is parsed as a GitHub `owner/repo` shorthand); it installs from Git sources only.

Once wired in, the agent discovers each skill by its SKILL.md frontmatter (`name`/`description`) and loads it on demand.

## What is exposed where

- **GitHub source** (`npx skills add pan-Z2l0aHVi/mono`): the repo-authored skills plus mirrors of the third-party skills they depend on (e.g. `herdr` for `herdr-agents`). Nothing else.
- **npm package**: the repo-authored skills only.
- Third-party skills that are mere local tooling for the mono repo are vendored in `.agents/skills-vendored/` (not scanned by the skills CLI) and never distributed.

## Skill dependencies

The skills ecosystem has no dependency mechanism, so dependencies are a documented, machine-checked convention instead: when a repo-authored SKILL.md links to a third-party sibling (`../<name>/SKILL.md`), that skill must be mirrored under the repo-root `skills/` (so `npx skills add` exposes it alongside its dependent) and registered in the repo-root `skills-lock.json`. `packages/ai-skill/scripts/check-skills.mjs` fails the build if a dependency is not mirrored or a mirror is unreferenced. Each dependent SKILL.md also states the standalone path — typically `npx skills add <owner/repo>` of the upstream, falling back gracefully to the installed CLI when absent.

## How it is validated

`scripts/check-skills.mjs` (run on `build` and `prepack`, and enforced by the tests) validates the three-surface layout: every skill directory carries a SKILL.md whose frontmatter `name` matches its directory and has a non-empty `description`; the GitHub surface holds exactly the repo-authored skills plus referenced dependency mirrors; `.agents/skills-vendored/` accounts for the remaining lock entries; `.agents/skills/` is an all-symlink instruction surface (a real directory there means an in-repo `skills update` clobbered the layout — re-run `pnpm agent:update-skills`). The package artifact is then synced from the repo-authored subset.

## License

MIT.

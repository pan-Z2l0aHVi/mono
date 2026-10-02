# @greypan/ai-skill

Repo-authored agent skills distributed as an npm package, following the `skills/<name>/SKILL.md` packaging convention shared by the agent-skills tooling ecosystem.

## Install

The package is static markdown — nothing to import, no build step. Install it, then wire the skills into your agent's skill directory:

```sh
npm install -D @greypan/ai-skill
```

- **Manual**: symlink or copy the skill you need into the skills directory your agent scans — `.agents/skills/<name>` for Codex/Cursor, `.claude/skills/<name>` for Claude Code (prefix `~/.` for user-global scope), e.g. `ln -s node_modules/@greypan/ai-skill/skills/<name> .agents/skills/<name>`.
- **`npx skills sync`** (experimental, [vercel-labs/skills](https://github.com/vercel-labs/skills)): after `npm install -D @greypan/ai-skill`, run `npx skills sync` — it crawls `node_modules` for `SKILL.md` files (this package's `skills/` layout is one of the scanned locations), installs the skills it finds (symlink mode) into the detected agents' skill directories, and records them in the consumer-side `skills-lock.json` with `sourceType: 'node_modules'`. Re-run it after upgrading the package to pick up new versions.
- **skills-npm**: `npm i -D skills-npm && npx skills-npm setup` is an alternative sync tool with the same node_modules-to-agent-dir flow.
- `npx skills add` does **not** accept npm package names (`@scope/pkg` is parsed as a GitHub `owner/repo` shorthand); it installs from Git sources only.

Once wired in, the agent discovers each skill by its SKILL.md frontmatter (`name`/`description`) and loads it on demand.

## Layout

```
skills/
  <skill-name>/
    SKILL.md        # the skill entry, with name/description frontmatter
    ...             # optional supporting files referenced by the skill
```

This package is the single source of truth for the skills authored in the [mono](https://github.com/pan-Z2l0aHVi/mono) repository. Inside the repo, each skill is exposed to the agent instruction system through a relative symlink at `.agents/skills/<name>` pointing back into `packages/ai-skill/skills/<name>`.

Third-party skills vendored into `.agents/skills/` are **not** included here: they stay as real directories tracked by the repo-root `skills-lock.json` and remain verbatim upstream text. See each SKILL.md for its own usage instructions.

## Skill dependencies

A repo-authored skill may reference a third-party skill through a relative sibling link (for example, `herdr-agents` reads the upstream [`herdr`](https://github.com/herdrdev/herdr) skill). Such dependencies are not bundled: inside the repo both sides are present under `.agents/skills/`, but a standalone install of this package only ships the repo-authored skills. Each SKILL.md states what to do in that case — typically install the third-party skill separately (e.g. `npx skills add herdrdev/herdr`) and degrade gracefully to the installed CLI when it is absent. The skills ecosystem itself has no dependency mechanism, so this is documented per skill rather than resolved by the package.

## How it is validated

The package has no runtime code. `scripts/check-skills.mjs` (run on `build` and `prepack`, and enforced by the tests) validates the layout invariants: every skill directory carries a SKILL.md whose frontmatter `name` matches its directory and has a non-empty `description`; nothing published here is registered as third-party in `skills-lock.json`; and `.agents/skills/` contains only lock-registered third-party directories and symlinks into this package.

## License

MIT.

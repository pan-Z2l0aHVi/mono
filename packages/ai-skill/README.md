# @greypan/ai-skill

Repo-authored agent skills distributed as an npm package, following the `skills/<name>/SKILL.md` packaging convention understood by the [`npx skills` ecosystem](https://github.com/vercel-labs/skills).

## Install

```sh
npm install @greypan/ai-skill
# or with the skills CLI
npx skills add @greypan/ai-skill
```

## Layout

```
skills/
  <skill-name>/
    SKILL.md        # the skill entry, with name/description frontmatter
    ...             # optional supporting files referenced by the skill
```

This package is the single source of truth for the skills authored in the [mono](https://github.com/pan-Z2l0aHVi/mono) repository. Inside the repo, each skill is exposed to the agent instruction system through a relative symlink at `.agents/skills/<name>` pointing back into `packages/ai-skill/skills/<name>`.

Third-party skills vendored into `.agents/skills/` are **not** included here: they stay as real directories tracked by the repo-root `skills-lock.json` and remain verbatim upstream text. See each SKILL.md for its own usage instructions.

## How it is validated

The package has no runtime code. `scripts/check-skills.mjs` (run on `build` and `prepack`, and enforced by the tests) validates the layout invariants: every skill directory carries a SKILL.md whose frontmatter `name` matches its directory and has a non-empty `description`; nothing published here is registered as third-party in `skills-lock.json`; and `.agents/skills/` contains only lock-registered third-party directories and symlinks into this package.

## License

MIT.

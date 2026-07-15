---
'@greypan/web-ui': minor
'@greypan/unplugin-web-components': patch
'@greypan/browser-kit': patch
'@greypan/deps-reload': patch
'@greypan/test-kit': patch
'@greypan/js-kit': patch
---

Standardize externalization to regex patterns for workspace deps; move msw to package-level devDependencies

- `vite.config.ts` for `js-kit`, `browser-kit`, `web-ui`: replace hardcoded workspace dep names with `/^@greypan\//` regex; add missing external deps (`nanoid`, `msw`)
- `browser-kit`: move `msw` from peerDependencies to devDependencies
- `test-kit`: add `msw` to devDependencies for local type checking
- `web-ui`: replace `react` peer dep with `@types/react`; add React/Vue usage documentation to README
- `unplugin-web-components`: fix README import path to use `/vite` sub-path export
- Fix documentation in READMEs and AGENTS.md to reflect current externalization rules

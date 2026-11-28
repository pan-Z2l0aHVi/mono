# Dev Kit Demo

English | [简体中文](./README.CN.md)

Documentation and interactive playground for `@greypan/js-kit` and `@greypan/browser-kit`.

![Dev Kit Demo Preview](./docs/preview.jpg)

**Live Demo:** [Dev Kit Demo](https://pan-z2l0ahvi.github.io/mono/dev-kit-demo)

Public APIs and types are defined by the source code, docs, and tests in [`packages/js-kit`](../../packages/js-kit) and [`packages/browser-kit`](../../packages/browser-kit); demo behavior does not replace the public contract.

## Run

Start the demo and its workspace dependencies from the repository root:

```bash
pnpm dev:dev-kit-demo
```

## Localization and Corpus

- Supports `zh-CN` and `en`, sharing `localStorage['locale']` with the `web-ui` demos.
- Shell copy is authored in Chinese inside `.vue` files and extracted into `src/locales/*.po` by `@greypan/wuchale-vue`.
- Module docs, changelogs, and READMEs come from `packages/js-kit`, `packages/browser-kit`, `packages/deps-reload`, and `packages/unplugin-web-components`, generated into `src/generated/` (`exec: []`) by `@greypan/md-to-meta`—do not edit generated files by hand; in-site doc keys are namespaced by package.
- Custom interactive panels are mounted through `src/demos/registry.ts` by `${pkg}/${module}#${demoId}` (identifiers come from fenced code block `meta`, such as `demo=parse-url`); the `history-nav` sandbox lives in a standalone pure-TS multi-page entry at `sandbox/history-nav.html` (excluded from `wuchale` and `unplugin-auto-import`).

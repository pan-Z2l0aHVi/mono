# @greypan/tsconfig

> Shared TypeScript configuration profiles for the monorepo

English | [简体中文](./README.CN.md)

## Profiles

| Profile      | Layer | Used by                                                                                      | Extends                            |
| ------------ | ----- | -------------------------------------------------------------------------------------------- | ---------------------------------- |
| `base.json`  | 0     | All profiles internally                                                                      | —                                  |
| `core.json`  | 1     | Pure JS libraries (js-kit)                                                                   | `./base.json`                      |
| `node.json`  | 2     | Node.js packages (deps-reload, unplugin-web-components, test-kit) + all `tsconfig.node.json` | `@tsconfig/node24` + `./base.json` |
| `dom.json`   | 3     | Browser/DOM packages (browser-kit, web-ui)                                                   | `./base.json`                      |
| `react.json` | 4     | React app (react-app-demo)                                                                   | `./dom.json`                       |
| `vue.json`   | 4     | Vue app (vue-app-demo)                                                                       | `@vue/tsconfig` + `./dom.json`     |

## Why separate profiles?

TypeScript's built-in `lib` options map to runtime environments, not to project types:

- `ESNext` — pure ECMAScript (no `setTimeout`, `EventTarget`, `URL`)
- `webworker` — zero DOM, pure runtime APIs (`setTimeout`, `EventTarget`, `URL`, but also `postMessage`, `Cache`)
- `DOM` — full browser environment (includes `window`, `document`, `Storage`)
- `@types/node` — Node.js runtime (includes `process`, `Buffer`, `fs`)

### Why `webworker` for `core.json`?

Pure JavaScript libraries (like `js-kit`) need runtime APIs such as `setTimeout`, `EventTarget`, and `URL`. These are cross-platform—available in both browsers and Node.js—but TypeScript only ships them inside the `DOM` lib, alongside `window`, `document`, etc.

`webworker` is the closest fit: it provides these runtime APIs without exposing `window`/`document`, while the Worker-specific extras (`postMessage`, `Cache`) are niche enough that accidental misuse is unlikely. Neither `DOM` nor `@types/node` nor `ESNext` alone provides the right set without bringing in unwanted APIs.

This package organizes the libs into a progressive 4-layer hierarchy, matching packages to the runtime APIs they actually use.

## Usage

```json
// In any package's tsconfig.app.json:
{
  "extends": "@greypan/tsconfig/<profile>.json",
  "include": ["src/**/*"]
}
```

Add as devDependency:

```bash
pnpm add -D @greypan/tsconfig
```

## Inheritance

```
base.json (strict / module / bundler settings)
├── core.json (ESNext + webworker, types: [])
├── node.json (@tsconfig/node24 + base, types: [node])
└── dom.json (ESNext + DOM + DOM.Iterable, types: [])
    ├── react.json (+ JSX / React settings)
    └── vue.json (@vue/tsconfig + dom)
```

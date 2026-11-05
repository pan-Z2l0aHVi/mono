# @greypan/tsconfig

> Shared TypeScript configuration profiles for this workspace.

English | [简体中文](./README.CN.md)

## Profiles

| Profile      | Use for                                                    | Extends                            |
| ------------ | ---------------------------------------------------------- | ---------------------------------- |
| `base.json`  | Shared settings used by the other profiles.                | -                                  |
| `core.json`  | Libraries with no DOM and no Node.js APIs, such as js-kit. | `./base.json`                      |
| `node.json`  | Node.js packages and `tsconfig.node.json` files.           | `@tsconfig/node24` + `./base.json` |
| `dom.json`   | Browser packages, such as browser-kit and web-ui.          | `./base.json`                      |
| `react.json` | React apps.                                                | `./dom.json`                       |
| `vue.json`   | Vue apps, including the Interweave frontend.               | `@vue/tsconfig` + `./dom.json`     |

`core.json` enables `noUncheckedIndexedAccess`. An array or dictionary lookup is typed as possibly `undefined`, so handle the missing case before using the value.

## Internal use

This is a private configuration package for this workspace. Add it as a development dependency with the `workspace:*` protocol.

```json
// In a package's tsconfig.app.json:
{
  "extends": "@greypan/tsconfig/<profile>.json",
  "include": ["src/**/*"]
}
```

## Inheritance

```text
base.json
├── core.json
├── node.json
└── dom.json
    ├── react.json
    └── vue.json
```

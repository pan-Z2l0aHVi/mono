# @greypan/tsconfig

Monorepo 共享 TypeScript 配置

[English](./README.md) | 简体中文

## 配置清单

| 配置         | 层级 | 适用包                                 | 继承                               |
| ------------ | ---- | -------------------------------------- | ---------------------------------- |
| `base.json`  | 0    | 所有配置的内部基础                     | —                                  |
| `core.json`  | 1    | 纯 JS 库（js-kit）                     | `./base.json`                      |
| `node.json`  | 2    | Node.js 包 + 所有 `tsconfig.node.json` | `@tsconfig/node24` + `./base.json` |
| `dom.json`   | 3    | 浏览器/DOM 包（browser-kit, web-ui）   | `./base.json`                      |
| `react.json` | 4    | React 应用（react-app-demo）           | `./dom.json`                       |
| `vue.json`   | 4    | Vue 应用（vue-app-demo）               | `@vue/tsconfig` + `./dom.json`     |

## 为什么需要分层？

TypeScript 的 `lib` 选项是按运行环境分组的，而非按项目类型：

- `ESNext` — 纯 ECMAScript（不含 `setTimeout`、`EventTarget`、`URL`）
- `webworker` — 无 DOM，含纯运行时 API（有 `setTimeout`/`EventTarget`/`URL`，也有 `postMessage`/`Cache`）
- `DOM` — 完整浏览器环境（含 `window`、`document`、`Storage`）
- `@types/node` — Node.js 运行时（含 `process`、`Buffer`、`fs`）

### 为什么 `core.json` 用 `webworker`？

纯 JS 库（如 `js-kit`）需要 `setTimeout`、`EventTarget`、`URL` 等运行时 API。这些 API 跨平台可用（浏览器和 Node.js 都支持），但 TypeScript 只把它们放在 `DOM` lib 中，和 `window`/`document` 混在一起。

`webworker` 是最接近的选择：它提供这些运行时 API 但暴露 `window`/`document`，而 Worker 额外的 API（`postMessage`、`Cache`）足够冷门，误用概率极低。`DOM`、`@types/node`、`ESNext` 单独都无法提供合适的 API 集合而不带来多余的全局类型。

本包将其组织为渐进式 4 层结构，每个包只使用它实际需要的运行时 API。

## 使用方式

```json
// 任意包的 tsconfig.app.json：
{
  "extends": "@greypan/tsconfig/<profile>.json",
  "include": ["src/**/*"]
}
```

添加为 devDependency：

```bash
pnpm add -D @greypan/tsconfig
```

## 继承关系

```
base.json (严格/模块/bundler 设置)
├── core.json (ESNext + webworker, types: [])
├── node.json (@tsconfig/node24 + base, types: [node])
└── dom.json (ESNext + DOM + DOM.Iterable, types: [])
    ├── react.json (+ JSX / React 设置)
    └── vue.json (@vue/tsconfig + dom)
```

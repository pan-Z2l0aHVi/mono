# @greypan/tsconfig

> 本 workspace 共用的 TypeScript 配置。

[English](./README.md) | 简体中文

## 配置

| 配置         | 适用场景                                      | 继承                               |
| ------------ | --------------------------------------------- | ---------------------------------- |
| `base.json`  | 其他配置共用的基础设置。                      | -                                  |
| `core.json`  | 不依赖 DOM 和 Node.js API 的库，例如 js-kit。 | `./base.json`                      |
| `node.json`  | Node.js 包和 `tsconfig.node.json` 文件。      | `@tsconfig/node24` + `./base.json` |
| `dom.json`   | 浏览器包，例如 browser-kit 和 web-ui。        | `./base.json`                      |
| `react.json` | React 应用。                                  | `./dom.json`                       |
| `vue.json`   | Vue 应用，包括 Interweave 前端。              | `@vue/tsconfig` + `./dom.json`     |

`core.json` 启用了 `noUncheckedIndexedAccess`。数组或字典索引的结果会被推断为可能是 `undefined`，使用前需要处理不存在的情况。

## 内部使用

这是本 workspace 的私有配置包。通过 `workspace:*` 协议添加为 development dependency。

```json
// 在包的 tsconfig.app.json 中：
{
  "extends": "@greypan/tsconfig/<profile>.json",
  "include": ["src/**/*"]
}
```

## 继承关系

```text
base.json
├── core.json
├── node.json
└── dom.json
    ├── react.json
    └── vue.json
```

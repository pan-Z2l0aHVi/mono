# @greypan/browser-kit

[![npm version](https://img.shields.io/npm/v/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)
[![npm downloads](https://img.shields.io/npm/dm/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)
[![node version](https://img.shields.io/node/v/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)
[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)

> 面向浏览器的存储、埋点上报、环境检测、DOM、文件、剪贴板、事件与历史导航工具库。

[English](./README.md) | 简体中文 | [在线演示](https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/browser-kit/getting-started)

## 安装

```bash
# npm
npm install @greypan/browser-kit

# pnpm
pnpm add @greypan/browser-kit

# yarn
yarn add @greypan/browser-kit

# bun
bun add @greypan/browser-kit
```

## 快速开始

```ts
import { defineLocal } from '@greypan/browser-kit'

const storage = defineLocal('my-app')

storage.set('user', { name: 'Alice' })
storage.get('user') // { name: 'Alice' }

// 一小时后过期
storage.set('token', 'abc123', 3600_000)

// 监听其他标签页的变更
const unwatch = storage.watch('user', (newValue, oldValue) => {
  console.log('user changed', newValue, oldValue)
})
```

## 模块索引

| 模块         | 说明                                                                                                                      | 文档                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 存储         | 带命名空间、TTL 过期、配额清理与跨标签页 `watch` 的存储封装                                                               | [`docs/storage.CN.md`](./docs/storage.CN.md)         |
| 埋点上报     | 可组合的埋点 outbox（`defineTracker`、`defineBatchTrack`、`defineOfflineRestore`、`defineLastWords`、`definePageErrors`） | [`docs/tracker.CN.md`](./docs/tracker.CN.md)         |
| 环境检测     | SSR 安全的浏览器、系统、容器与输入检测（`env`）                                                                           | [`docs/env.CN.md`](./docs/env.CN.md)                 |
| DOM 工具     | 视口尺寸与根文档滚动偏移读取（`getViewportSize`、`getRootScrollTop`、`getRootScrollLeft`）                                | [`docs/dom.CN.md`](./docs/dom.CN.md)                 |
| 文件工具     | Base64 转换、图片尺寸、魔数类型校验与带进度下载                                                                           | [`docs/file.CN.md`](./docs/file.CN.md)               |
| 剪贴板       | 文本与 `Blob` 复制封装（`copyToClipboard`）                                                                               | [`docs/copy.CN.md`](./docs/copy.CN.md)               |
| 历史导航状态 | Navigation API 只读子集，跟踪当前文档前进/后退可用性（`defineHistoryNav`）                                                | [`docs/history-nav.CN.md`](./docs/history-nav.CN.md) |
| 事件简写     | 面向 `window` / `document` 的强类型 `on` / `off` 封装                                                                     | [`docs/shortcut.CN.md`](./docs/shortcut.CN.md)       |

> `getFileExtension`、`formatFileSize` 等跨运行时纯 JS 工具位于 [`@greypan/js-kit`](../js-kit/README.CN.md)。

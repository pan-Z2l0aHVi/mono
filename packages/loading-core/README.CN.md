# @greypan/loading-core

[![npm version](https://img.shields.io/npm/v/@greypan/loading-core)](https://www.npmjs.com/package/@greypan/loading-core)
[![node version](https://img.shields.io/node/v/@greypan/loading-core)](https://www.npmjs.com/package/@greypan/loading-core)
[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@greypan/loading-core)](https://www.npmjs.com/package/@greypan/loading-core)

> 与框架无关的加载基础能力：进度条、Splash 卸载、chunk 恢复与路由播报。

[English](./README.md) | 简体中文

## 安装

```bash
pnpm add @greypan/loading-core
```

先导入一次样式，再在任意框架中使用控制器：

```ts
import '@greypan/loading-core/progress.css'

import { globalProgress, setupChunkErrorRecovery } from '@greypan/loading-core'

const dispose = setupChunkErrorRecovery({ onNotify: reason => console.info(reason) })
const token = globalProgress.begin()
token.end()
dispose()
```

## 全局进度条

`globalProgress` 是 `GlobalProgressController` 的应用级单例。

| 方法                 | 说明                                                            |
| -------------------- | --------------------------------------------------------------- |
| `begin()`            | 开始一次任务并返回 `ProgressToken`。                            |
| `token.end()`        | 结束任务，幂等。                                                |
| `isNavigating()`     | 是否有 token 处于活动状态。                                     |
| `forceReset()`       | 中止全部任务并归零，不拉满 100%。                               |
| `configure(options)` | 设置 `delayMs`、`minVisibleMs`、`maxDurationMs` 与 `onMetric`。 |

进度条先等待 `delayMs`，出现后至少驻留 `minVisibleMs`，到达 100% 后淡出。
淡出窗口内开始新导航会先隐藏旧条并重新等待，避免 100% 僵死或二次启动倒退。
`maxDurationMs` 触发 `progress_failsafe_triggered` 并强制归零未完成任务。

## Splash 卸载

`dismissAppSplash(minVisibleMs, onDismiss?)` 移除 `#app-splash`，只调用一次
`window.__SPLASH_CLEANUP__`，并按 `performance.now()` 扣除已经过的时间。

## Chunk 恢复

`setupChunkErrorRecovery(options)` 监听 Vite 的 `vite:preloadError`。
只有确定整页刷新时才调用 `event.preventDefault()`；断网、脏表单、冷却期、
存储异常与后台预加载分支都放行默认行为，让懒加载缓存与错误边界正常恢复。

## 路由播报

`announceRouteChange(title)` 在下一帧把当前路由标题写入 polite 的
`aria-live` 区域。

## CSS

`@greypan/loading-core/progress.css` 是 `dist` 中的静态文件，不由 JavaScript
注入样式；严格 CSP 环境可通过常规样式管线导入。

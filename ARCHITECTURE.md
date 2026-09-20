# Mono 架构地图

> 这是面向开发者和 coding agent 的快速导航；它只描述稳定的仓库拓扑和定位入口。当前实现、公共 API 和验证结果以源码、manifest、配置和测试为准。

## 1. 一分钟概览

依赖方向是单向的：应用只消费公共包，公共运行时代码保持无环，不反向依赖应用实现。项目身份见根 [`AGENTS.md`](AGENTS.md)。

```text
@greypan/tsconfig       TypeScript 配置 profiles（构建时配置）
          │
@greypan/js-kit          平台无关工具、类型、plugin system
   ├──────┼──────────────┬──────────────┐
   │      │              │              │
 browser  test-kit      unplugin       deps-reload
   │
 web-ui                  Lit components + Shadow DOM + framework types
   ├──────────────┬──────────────┬────────────────┐
 React demo      Vue demo       interweave-frontend    interweave (Go/Wails host)
```

### 发布 / 私有边界

- `packages/*`：当前 manifests 中均为非 `private` workspace；除 `@greypan/tsconfig` 外通常发布运行时代码，`tsconfig` 发布 JSON profiles。最终发布范围以各 package 的 `files`、`exports` 和 `publishConfig` 为准。
- `apps/*`：当前 manifests 中均为 `private` 集成或交付应用，不是公共 API 的权威来源。
- `apps/interweave/frontend`：独立 private workspace，属于 Wails 前端集成面；Go host 位于 `apps/interweave`。

## 2. Workspace 目录索引

| 路径                                                                    | 角色                                             | 先看什么                                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| `packages/js-kit` (`@greypan/js-kit`)                                   | 运行时基础工具和 plugin system                   | `src/plugin-system/`、`README.md`、包级 `AGENTS.md`        |
| `packages/browser-kit` (`@greypan/browser-kit`)                         | 浏览器能力：DOM、storage、file、tracker          | `src/` 对应模块 README、包级 `AGENTS.md`                   |
| `packages/test-kit` (`@greypan/test-kit`)                               | Vitest browser mode + MSW 基础设施               | `docs/agents/testing.md`、`src/__tests__/`                 |
| `packages/unplugin-web-components` (`@greypan/unplugin-web-components`) | Vite/Webpack 模块转换和 Vite HTML 注入           | 包级 `AGENTS.md`、`src/transforms/`、两种 adapter          |
| `packages/deps-reload` (`@greypan/deps-reload`)                         | 开发期 workspace `dist` watcher                  | 包级 `AGENTS.md`、`src/vite.ts`、`src/webpack.ts`          |
| `packages/web-ui` (`@greypan/web-ui`)                                   | Lit components、tokens、icons、overlay、框架类型 | `docs/agents/web-ui.md`、组件 README、相关 ADR             |
| `packages/tsconfig` (`@greypan/tsconfig`)                               | 可被 `extends` 的 TypeScript profiles            | `*.json`、包级 `AGENTS.md`                                 |
| `apps/react-web-ui-demo` (`@greypan/react-web-ui-demo`)                 | React 集成和预览                                 | `src/routes/`、`src/components/`、包级 README              |
| `apps/vue-web-ui-demo` (`@greypan/vue-web-ui-demo`)                     | Vue 集成和预览                                   | `src/pages/`、`src/components/`、包级 README               |
| `apps/interweave` (`@greypan/interweave`)                               | Go/Wails 桌面 host、后端能力边界                 | `README.md`、`AGENTS.md`、`docs/product.md`、ADR-0008/0009 |
| `apps/interweave/frontend` (`@greypan/interweave-frontend`)             | Interweave Vue WebView                           | `src/pages/`、`src/stores/`、`apps/interweave/AGENTS.md`   |

## 3. 依赖和构建事实

- workspace 范围由 `pnpm-workspace.yaml` 的 `apps/**`、`packages/**` 决定；版本优先使用 workspace `catalog`。
- `turbo.json` 定义 `build` 的 `^build` 上游依赖、`test` 的 `^build` 依赖以及不可缓存的持久 `dev`。
- package 构建入口以各自 `package.json` 为准：常见为 `vp build` 或 `vp pack`；不要从 README 推断不存在的 script。
- 根 `tsconfig.json` 只声明 TypeScript project references；实际继承关系以 `packages/tsconfig/*.json` 和各 workspace tsconfig 为准。
- 发布边界以 package manifest 的 `files`、`exports`、`peerDependencies` 和 `publishConfig` 为准；README 不能替代这些字段。

## 4. 高频改动热点和影响面

| 改动区域                                   | 典型影响                              | 必须关注                                        |
| ------------------------------------------ | ------------------------------------- | ----------------------------------------------- |
| `js-kit/src/plugin-system`                 | 多个工具包的状态/组合方式             | `docs/adr/0007`、包级规则、公共测试             |
| `web-ui/src/components`                    | React、Vue、Interweave 前端和组件契约 | `docs/agents/web-ui.md`、ADR-0005/0006          |
| `web-ui/src/types`                         | React/Vue 类型推导和事件绑定          | ADR-0005、两个 demo 的 type fixtures            |
| `web-ui/src/components/theme`、`src/icons` | token、视觉一致性、生成导出           | ADR-0005、生成器和 manifest                     |
| `unplugin-web-components/src`              | Vite/Webpack 行为差异                 | 包级 `AGENTS.md`、两种 adapter 测试             |
| `tsconfig/*.json`、workspace catalog       | 所有 TypeScript workspace 或依赖版本  | `docs/agents/dependencies.md`、继承者           |
| `apps/interweave/*.go`、`frontend/src`     | Go/Wails API、领域状态和 MCP          | Wails 官方文档、产品基线、ADR-0008、Go/前端两侧 |

任务路由、按需查询工具与权威来源顺序以根 [`AGENTS.md`](AGENTS.md) 和 [`docs/agents/context.md`](docs/agents/context.md) 为权威，本文件不复制。

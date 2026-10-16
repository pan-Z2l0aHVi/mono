# Mono 架构地图

> 这份地图只描述稳定的仓库拓扑和定位入口；当前实现以源码、配置和测试为准。

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
 React demo      Vue demo       interweave-frontend    interweave (Wails APP)
```

## 1. Workspace 目录索引

| 路径                                                                                                         | 角色                                                                                                               | 先看什么                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`packages/js-kit`](packages/js-kit)（`@greypan/js-kit`）                                                    | 运行时基础工具和 plugin system                                                                                     | [`src/plugin-system`](packages/js-kit/src/plugin-system)、[`README.md`](packages/js-kit/README.md)                                                            |
| [`packages/browser-kit`](packages/browser-kit)（`@greypan/browser-kit`）                                     | 浏览器能力：DOM、storage、file、tracker                                                                            | [`src`](packages/browser-kit/src) 下各模块的 README                                                                                                           |
| [`packages/test-kit`](packages/test-kit)（`@greypan/test-kit`）                                              | Vitest browser mode 与 MSW 基础设施                                                                                | [`docs/agents/test-execution.md`](docs/agents/test-execution.md)                                                                                              |
| [`packages/unplugin-web-components`](packages/unplugin-web-components)（`@greypan/unplugin-web-components`） | Vite/Webpack 模块转换与 Vite HTML 注入                                                                             | [`src`](packages/unplugin-web-components/src) 的 Vite/Webpack adapter                                                                                         |
| [`packages/deps-reload`](packages/deps-reload)（`@greypan/deps-reload`）                                     | 开发期 workspace `dist` watcher                                                                                    | [`src/vite.ts`](packages/deps-reload/src/vite.ts)、[`src/webpack.ts`](packages/deps-reload/src/webpack.ts)                                                    |
| [`packages/web-ui`](packages/web-ui)（`@greypan/web-ui`）                                                    | Lit components、tokens、icons、overlay、框架类型                                                                   | [`docs/agents/web-ui.md`](docs/agents/web-ui.md)、[组件 README](packages/web-ui/README.md)、相关 ADR                                                          |
| [`packages/md-to-comp`](packages/md-to-comp)（`@greypan/md-to-comp`）                                        | 通用示例文档引擎：markdown → 示例数据 + 高亮 HTML + 可编译的示例组件文件，带 `/react` 与 `/vue` 两个 Vite 插件入口 | [`AGENTS.md`](packages/md-to-comp/AGENTS.md)、[`src/generate.ts`](packages/md-to-comp/src/generate.ts)、[`src/vite.ts`](packages/md-to-comp/src/vite.ts)      |
| [`packages/tsconfig`](packages/tsconfig)（`@greypan/tsconfig`）                                              | 可被 `extends` 的 TypeScript profiles                                                                              | 目录下的 `*.json`                                                                                                                                             |
| [`apps/react-web-ui-demo`](apps/react-web-ui-demo)（`@greypan/react-web-ui-demo`）                           | React 集成和预览                                                                                                   | [`src/routes`](apps/react-web-ui-demo/src/routes)、[`src/components`](apps/react-web-ui-demo/src/components)、[`README.md`](apps/react-web-ui-demo/README.md) |
| [`apps/vue-web-ui-demo`](apps/vue-web-ui-demo)（`@greypan/vue-web-ui-demo`）                                 | Vue 集成和预览                                                                                                     | [`src/pages`](apps/vue-web-ui-demo/src/pages)、[`src/components`](apps/vue-web-ui-demo/src/components)、[`README.md`](apps/vue-web-ui-demo/README.md)         |
| [`apps/interweave`](apps/interweave)（`@greypan/interweave`）                                                | Wails APP                                                                                                          | [`README.md`](apps/interweave/README.md)、ADR-0008/0009                                                                                                       |
| [`apps/interweave/frontend`](apps/interweave/frontend)（`@greypan/interweave-frontend`）                     | Interweave Vue WebView                                                                                             | [`src/pages`](apps/interweave/frontend/src/pages)、[`src/stores`](apps/interweave/frontend/src/stores)、[`AGENTS.md`](apps/interweave/AGENTS.md)              |

## 2. 依赖、构建与发布边界

- Workspace 只有 `apps/**` 和 `packages/**` 两类；版本尽量走 workspace `catalog`。
- `packages/*` 都是非 `private`，发布运行时代码；两个例外是 `@greypan/tsconfig`（发布 JSON profiles）与 `@greypan/md-to-comp`（`private` 的构建期引擎：被两个 demo 的 `vite.config.ts` 当 Vite 插件加载，不进任何 app 的运行时依赖图）。
- 自撰 agent skills 不走 npm，只在 GitHub 分发；实体在 [`skills/`](skills)，说明见 [`skills/README.md`](skills/README.md)。
- `apps/*` 都是 `private` 的集成或交付应用，不是公共 API 的权威来源。
- [`apps/interweave/frontend`](apps/interweave/frontend) 是独立 `private` workspace，属 Wails 前端集成面；Go host 在 [`apps/interweave`](apps/interweave)。

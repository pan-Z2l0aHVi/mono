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
| [`packages/test-kit`](packages/test-kit)（`@greypan/test-kit`）                                              | 私有的 Vitest browser mode 与 MSW 测试基础设施                                                                     | [`docs/agents/verification.md`](docs/agents/verification.md)                                                                                                  |
| [`packages/unplugin-web-components`](packages/unplugin-web-components)（`@greypan/unplugin-web-components`） | Vite/Webpack 模块转换与 Vite HTML 注入                                                                             | [`src`](packages/unplugin-web-components/src) 的 Vite/Webpack adapter                                                                                         |
| [`packages/deps-reload`](packages/deps-reload)（`@greypan/deps-reload`）                                     | 开发期 workspace `dist` watcher                                                                                    | [`src/vite.ts`](packages/deps-reload/src/vite.ts)、[`src/webpack.ts`](packages/deps-reload/src/webpack.ts)                                                    |
| [`packages/web-ui`](packages/web-ui)（`@greypan/web-ui`）                                                    | Lit components、tokens、icons、overlay、框架类型                                                                   | [`docs/agents/web-ui.md`](docs/agents/web-ui.md)、[组件 README](packages/web-ui/README.md)、[示例文档语料](packages/web-ui/docs)、相关 ADR                    |
| [`packages/md-to-comp`](packages/md-to-comp)（`@greypan/md-to-comp`）                                        | 通用示例文档引擎：markdown → 示例数据 + 高亮 HTML + 可编译的示例组件文件，带 `/react` 与 `/vue` 两个 Vite 插件入口 | [`AGENTS.md`](packages/md-to-comp/AGENTS.md)、[`src/generate.ts`](packages/md-to-comp/src/generate.ts)、[`src/vite.ts`](packages/md-to-comp/src/vite.ts)      |
| [`packages/tsconfig`](packages/tsconfig)（`@greypan/tsconfig`）                                              | 私有、供 workspace 内 `extends` 的 TypeScript profiles                                                             | 目录下的 `*.json`                                                                                                                                             |
| [`apps/react-web-ui-demo`](apps/react-web-ui-demo)（`@greypan/react-web-ui-demo`）                           | React 集成和预览                                                                                                   | [`src/routes`](apps/react-web-ui-demo/src/routes)、[`src/components`](apps/react-web-ui-demo/src/components)、[`README.md`](apps/react-web-ui-demo/README.md) |
| [`apps/vue-web-ui-demo`](apps/vue-web-ui-demo)（`@greypan/vue-web-ui-demo`）                                 | Vue 集成和预览                                                                                                     | [`src/pages`](apps/vue-web-ui-demo/src/pages)、[`src/components`](apps/vue-web-ui-demo/src/components)、[`README.md`](apps/vue-web-ui-demo/README.md)         |
| [`apps/interweave`](apps/interweave)（`@greypan/interweave`）                                                | Wails APP                                                                                                          | [`README.md`](apps/interweave/README.md)、ADR-0008/0009                                                                                                       |
| [`apps/interweave/frontend`](apps/interweave/frontend)（`@greypan/interweave-frontend`）                     | Interweave Vue WebView                                                                                             | [`src/pages`](apps/interweave/frontend/src/pages)、[`src/stores`](apps/interweave/frontend/src/stores)、[`AGENTS.md`](apps/interweave/AGENTS.md)              |

## 2. 依赖、构建与发布边界

- Workspace 只有 `apps/**` 和 `packages/**` 两类；版本尽量走 workspace `catalog`。
- `packages/browser-kit`、`deps-reload`、`js-kit`、`unplugin-web-components` 与 `web-ui` 是公开 npm 包；`test-kit`（测试基础设施）、`tsconfig`（配置 profiles）和 `md-to-comp`（构建期 Vite 插件引擎）是 workspace 内部私有包。私有包仍参与 Changesets 版本计算，发布边界见 [`docs/agents/release.md`](docs/agents/release.md)。
- 自撰 agent skills 不走 npm，只在 GitHub 分发；实体在 [`skills/`](skills)，说明见 [`skills/README.md`](skills/README.md)。
- `apps/*` 都是 `private` 的集成或交付应用，不是公共 API 的权威来源。
- [`apps/interweave/frontend`](apps/interweave/frontend) 是独立 `private` workspace，属 Wails 前端集成面；Go host 在 [`apps/interweave`](apps/interweave)。

## 3. Agent 工具与仓库政策

根 `scripts/` 中的本地 agent 工具不属于任何 workspace package，也不进入包图；仓库级命令面以根 `package.json` 为准。task 登记只写系统临时目录，政策检查只读，两者都不改写源码或 Git index；职责与恢复边界分别见 [`docs/agents/task-ledger.md`](docs/agents/task-ledger.md) 和 [`docs/agents/commit.md`](docs/agents/commit.md)。CI 拓扑以 `.github/scripts/ci-topology.mjs` 及其测试为权威，本文不复制命令、检查集合或 workflow 细节。

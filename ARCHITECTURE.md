# Mono 架构地图

> 稳定拓扑与发布/私有边界速查；具体依赖与脚本以各包 `package.json` 与源码为准。

## Workspace 索引

| 路径                                                                   | 包名                               | 发布面   | 角色                                                                     |
| ---------------------------------------------------------------------- | ---------------------------------- | -------- | ------------------------------------------------------------------------ |
| [`packages/js-kit`](packages/js-kit)                                   | `@greypan/js-kit`                  | 公开 npm | 平台无关运行时工具与 plugin system                                       |
| [`packages/browser-kit`](packages/browser-kit)                         | `@greypan/browser-kit`             | 公开 npm | 浏览器能力（DOM、storage、file、tracker、history-nav）                   |
| [`packages/web-ui`](packages/web-ui)                                   | `@greypan/web-ui`                  | 公开 npm | Lit Web Components、tokens、icons、overlay、框架类型                     |
| [`packages/unplugin-web-components`](packages/unplugin-web-components) | `@greypan/unplugin-web-components` | 公开 npm | Vite/Webpack 模块转换与 Vite HTML 注入                                   |
| [`packages/deps-reload`](packages/deps-reload)                         | `@greypan/deps-reload`             | 公开 npm | 开发期 workspace `dist` watcher                                          |
| [`packages/tsconfig`](packages/tsconfig)                               | `@greypan/tsconfig`                | 内部私有 | 共享 TypeScript profiles（无构建步骤）                                   |
| [`packages/test-kit`](packages/test-kit)                               | `@greypan/test-kit`                | 内部私有 | Vitest browser mode 与 MSW 测试基础设施                                  |
| [`packages/app-scrollbars`](packages/app-scrollbars)                   | `@greypan/app-scrollbars`          | 内部私有 | app 级 OverlayScrollbars 配置与 macOS 主题（与 `web-ui` 并列、互不依赖） |
| [`packages/md-to-meta`](packages/md-to-meta)                           | `@greypan/md-to-meta`              | 内部私有 | 通用 markdown 结构化引擎、Vite 插件与 headless CLI                       |
| [`packages/wuchale-vue`](packages/wuchale-vue)                         | `@greypan/wuchale-vue`             | 内部私有 | wuchale Vue SFC 国际化编译器适配                                         |
| [`packages/doc-demo-kit`](packages/doc-demo-kit)                       | `@greypan/doc-demo-kit`            | 内部私有 | 文档站共享状态机、语料契约与导航纯逻辑                                   |
| [`packages/route-progress`](packages/route-progress)                   | `@greypan/route-progress`          | 内部私有 | 框架无关路由进度与延迟显隐状态机                                         |
| [`packages/monorepo-kit`](packages/monorepo-kit)                       | `@greypan/monorepo-kit`            | 内部私有 | 门禁原子实现与仓库编排（`vp pack` 产出 `dist/` 供根脚本与 Vite 消费）    |
| [`packages/pi-rex-orchestrator`](packages/pi-rex-orchestrator)         | `@greypan/pi-rex-orchestrator`     | 内部私有 | Pi 扩展，由 Pi 的 jiti 直接加载 `src/`                                   |
| [`apps/react-web-ui-demo`](apps/react-web-ui-demo)                     | `@greypan/react-web-ui-demo`       | 私有应用 | `web-ui` React 文档与集成预览站                                          |
| [`apps/vue-web-ui-demo`](apps/vue-web-ui-demo)                         | `@greypan/vue-web-ui-demo`         | 私有应用 | `web-ui` Vue 文档与集成预览站                                            |
| [`apps/dev-kit-demo`](apps/dev-kit-demo)                               | `@greypan/dev-kit-demo`            | 私有应用 | `js-kit` / `browser-kit` / 构建插件文档与交互示例站                      |
| [`apps/interweave`](apps/interweave)                                   | `@greypan/interweave`              | 私有应用 | Wails 3 桌面应用 Go host                                                 |
| [`apps/interweave/frontend`](apps/interweave/frontend)                 | `@greypan/interweave-frontend`     | 私有应用 | Interweave Vue WebView 前端                                              |

## 边界分工

- **发布与版本**：仅上表标为「公开 npm」的 5 个包发布到 npm；Changesets 版本管理与 CHANGELOG 仅覆盖这 5 个公开 npm 包与桌面应用 `@greypan/interweave`，其余内部私有包与 demo 均位于 [`.changeset/config.json`](.changeset/config.json) 的 `ignore` 中，边界见 [`docs/agents/release.md`](docs/agents/release.md)。`apps/*` 均不是公共 API 权威来源。
- **脚本与门禁**：根 `scripts/` 只放薄入口与 Node 启动前 bootstrap helper，判定实现集中在 `packages/monorepo-kit`；政策检查只读，不改源码或 Git index。
- **自撰 Skills**：位于 [`skills/`](skills)，通过 GitHub 分发（不走 npm），见 [`skills/README.md`](skills/README.md)。

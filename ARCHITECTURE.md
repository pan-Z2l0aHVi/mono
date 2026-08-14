# Mono 架构地图

> 这是面向开发者和 coding agent 的快速导航；它只描述稳定的仓库拓扑和定位入口。当前实现、公共 API 和验证结果以源码、manifest、配置和测试为准。

## 1. 一分钟概览

Mono 是一个 `pnpm` workspace + `Turborepo` monorepo：发布 `@greypan/*` 工具包和 Lit Web Components，使用 React、Vue 和 Wails 应用验证真实集成。公共运行时代码保持无环依赖；应用只消费公共包，不反向成为公共包的实现依赖。

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
 React demo      Vue demo       weave-frontend    weave (Go/Wails host)
```

### 发布 / 私有边界

- `packages/*`：当前 manifests 中均为非 `private` workspace；除 `@greypan/tsconfig` 外通常发布运行时代码，`tsconfig` 发布 JSON profiles。最终发布范围以各 package 的 `files`、`exports` 和 `publishConfig` 为准。
- `apps/*`：当前 manifests 中均为 `private` 集成或交付应用，不是公共 API 的权威来源。
- `apps/weave/frontend`：独立 private workspace，属于 Wails 前端集成面；Go host 位于 `apps/weave`。

## 2. Workspace 目录索引

| 路径                                                                    | 角色                                             | 先看什么                                            |
| ----------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------- |
| `packages/js-kit` (`@greypan/js-kit`)                                   | 运行时基础工具和 plugin system                   | `src/plugin-system/`、`README.md`、包级 `AGENTS.md` |
| `packages/browser-kit` (`@greypan/browser-kit`)                         | 浏览器能力：DOM、storage、file、tracker          | `src/` 对应模块 README、包级 `AGENTS.md`            |
| `packages/test-kit` (`@greypan/test-kit`)                               | Vitest browser mode + MSW 基础设施               | `docs/agents/testing.md`、`src/__tests__/`          |
| `packages/unplugin-web-components` (`@greypan/unplugin-web-components`) | Vite/Webpack 模块转换和 Vite HTML 注入           | 包级 `AGENTS.md`、`src/transforms/`、两种 adapter   |
| `packages/deps-reload` (`@greypan/deps-reload`)                         | 开发期 workspace `dist` watcher                  | 包级 `AGENTS.md`、`src/vite.ts`、`src/webpack.ts`   |
| `packages/web-ui` (`@greypan/web-ui`)                                   | Lit components、tokens、icons、overlay、框架类型 | `docs/agents/web-ui.md`、组件 README、相关 ADR      |
| `packages/tsconfig` (`@greypan/tsconfig`)                               | 可被 `extends` 的 TypeScript profiles            | `*.json`、包级 `AGENTS.md`                          |
| `apps/react-web-ui-demo` (`@greypan/react-web-ui-demo`)                 | React 集成和预览                                 | `src/routes/`、`src/components/`、包级 README       |
| `apps/vue-web-ui-demo` (`@greypan/vue-web-ui-demo`)                     | Vue 集成和预览                                   | `src/pages/`、`src/components/`、包级 README        |
| `apps/weave` (`@greypan/weave`)                                         | Go/Wails 桌面 host、领域服务、MCP                | `README.md`、`AGENTS.md`、`docs/adr/0013-0016`      |
| `apps/weave/frontend` (`@greypan/weave-frontend`)                       | Weave Vue WebView                                | `src/pages/`、`src/stores/`、`apps/weave/AGENTS.md` |

## 3. 依赖和构建事实

- workspace 范围由 `pnpm-workspace.yaml` 的 `apps/**`、`packages/**` 决定；版本优先使用 workspace `catalog`。
- `turbo.json` 定义 `build` 的 `^build` 上游依赖、`test` 的 `^build` 依赖以及不可缓存的持久 `dev`。
- package 构建入口以各自 `package.json` 为准：常见为 `vp build` 或 `vp pack`；不要从 README 推断不存在的 script。
- 根 `tsconfig.json` 只声明 TypeScript project references；实际继承关系以 `packages/tsconfig/*.json` 和各 workspace tsconfig 为准。
- 发布边界以 package manifest 的 `files`、`exports`、`peerDependencies` 和 `publishConfig` 为准；README 不能替代这些字段。

## 4. 高频改动热点和影响面

| 改动区域                                   | 典型影响                             | 必须关注                                              |
| ------------------------------------------ | ------------------------------------ | ----------------------------------------------------- |
| `js-kit/src/plugin-system`                 | 多个工具包的状态/组合方式            | `docs/adr/0004`、包级规则、公共测试                   |
| `web-ui/src/components`                    | React、Vue、Weave 前端和组件契约     | `docs/agents/web-ui.md`、ADR-0003/0005/0006/0007/0011 |
| `web-ui/src/types`                         | React/Vue 类型推导和事件绑定         | ADR-0011、两个 demo 的 type fixtures                  |
| `web-ui/src/components/theme`、`src/icons` | token、视觉一致性、生成导出          | ADR-0008/0010、生成器和 manifest                      |
| `unplugin-web-components/src`              | Vite/Webpack 行为差异                | 包级 `AGENTS.md`、两种 adapter 测试                   |
| `tsconfig/*.json`、workspace catalog       | 所有 TypeScript workspace 或依赖版本 | `docs/agents/dependencies.md`、继承者                 |
| `apps/weave/*.go`、`frontend/src`          | Go/Wails API、领域状态和 MCP         | Wails 官方文档、ADR-0013-0016、Go/前端两侧            |

## 5. Agent 快速路由

- 任务路由与验证计划：`pnpm repo:verify -- <paths...>` 输出最小 context、受影响 workspace、风险、required evidence 和最小充分验证建议；公共 package 再用 `repo:contract`。
- Context 审计：`pnpm repo:context-audit -- --json`；它只报告重复和规则密度候选，不替代人工判断。
- 任务级状态：仅在跨会话、交接或需要保留验证缺口时使用 `pnpm agent:state -- <write|read|list> ...`；它写入 Git-ignore 的短期 receipt，不是常驻 context 或行为事实。

1. 先读根 `AGENTS.md`，再读目标目录最近的 `AGENTS.md`。
2. 只按任务读取命中的 `.agents/rules/*` 和 `docs/agents/*`；普通局部任务不预读全部 ADR。
3. 跨包、架构、术语或 instruction system 任务才读 `CONTEXT.md` 和相关 ADR；需要全局拓扑时先读本文件。
4. 变更影响、所需证据和验证建议优先使用 `repo:verify`；公共 package 变更再使用 `repo:contract` 或 `repo:contract-diff`。
5. 公共行为的最终证据来自源码、测试和配置；UI/交互还需要真实浏览器验证，构建成功不能替代它。

## 6. 生成物边界

生成代码、缓存和测试附件不属于架构 source of truth。其禁止手改边界以根/包级 `AGENTS.md` 为准；generator、验证命令和消费者闭环以 [`docs/agents/build.md`](docs/agents/build.md) 为准。遇到此类问题，应定位源文件、配置或 generator，而不是修补输出。

## 7. 权威来源顺序

1. 当前源码、测试、`package.json`、workspace 配置和构建配置：当前行为事实。
2. 最近的包级 `AGENTS.md`：目录特有的不可绕过约束。
3. 根 `AGENTS.md`：仓库边界和任务路由。
4. `docs/agents/*`、`.agents/rules/*`：按任务加载的流程和质量门槛。
5. `CONTEXT.md` 与 ADR：跨包架构、术语和长期决策背景。
6. README 和 changelog：消费者说明与历史记录；发现冲突时回到上面的权威来源。

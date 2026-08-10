# ADR 0008：构建时 Icon 系统

## 状态

已采纳

## 背景

`web-ui` 需要内置及面向使用者的图标能力，但不应引入运行时图标 Web Component、CDN 依赖，或削弱 Tree Shaking 的运行时名称查找。

## 决策

在构建时从 Iconify JSON 包生成带类型的图标数据模块。

- `packages/web-ui/icons.used.json` 是内置图标的清单文件。
- `pnpm --filter @greypan/web-ui generate-icons` 在 `src/icons/generated/` 下为每个图标生成一个模块，并生成图标 barrel 文件。
- Vite 构建自动运行生成流程，生成文件不可手动编辑。
- 内部组件从 `@/icons` 导入图标数据；使用者从 `@greypan/web-ui/icons` 导入，并通过 `<web-ui-icon>` 仅属性的 `.icon` API 传入。
- 图标名称和生成文件名称保留 Iconify 集合前缀以避免冲突。

实现流程文档见 [`docs/agents/web-ui.md`](../agents/web-ui.md)。

## 影响

- 图标是带类型的、可 Tree Shaking 的模块，无运行时查找依赖。
- 添加内置图标需要更新清单文件并重新生成产物。
- `iconify-icon` 不是 `web-ui` 的运行时依赖。

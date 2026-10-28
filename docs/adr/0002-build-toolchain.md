# ADR-0002: 构建工具链

- **Date**: 2026-07-21
- **Status**: 已接受
- **Amended by**: [ADR-0014](./0014-task-system-v2.md)（pre-commit 不再自动修复暂存文件）

2026-10-19 注记：task 分级与记账已迁出根 `scripts/`，现行入口见 task-ledger skill；ADR-0028 记录迁移。下文提到的历史命令名不再可执行。

2026-10-19 注记：构建模式划分已按包的实际产物需求调整；现行判据见 `docs/agents/build.md`，下文按入口数的分类不再作为选择依据。

2026-10-28 注记：`vp pack` 已支持 `unbundle` 多文件产物、子路径导出与 CSS 入口，`vite-plugin-dts` 已从仓库移除；js-kit、browser-kit、web-ui 与其余库包统一走 `vp pack` + `pack.dts`。下文的「子路径导出软件包用 `vp build`」分类不再适用。

## 背景

多个软件包具有不同的构建需求（单入口使用 tsdown、多入口使用 Vite lib 模式、应用需要完整打包），需要统一的构建接口。

## 决策

使用 `vite-plus`（`vp`）作为统一的构建 / 开发 / lint / 测试 / 格式化封装工具：

- **库包**（test-kit、unplugin-web-components、deps-reload、js-kit、browser-kit、web-ui 等）：`vp pack`（tsdown），声明文件走 `pack.dts`；需要子路径导出或 CSS 入口时配 `unbundle` + `root`，需要 `.js` / `.d.ts` 扩展名时配 `fixedExtension: false`
- **React 应用**：`vp build`
- **Vue 应用**：`vue-tsc --build && vp build`
- **工作区验证**：`pnpm run check-code` 运行 `vp check`（格式化/lint/类型检查）与 `check-go`（自动发现 Go 模块并运行 `go vet`）；提交 hook 自动修复暂存文件（2026-09-20 修订：pre-commit 已改为只跑 `agent:task guard`，格式修复由 `fix-code` 与 task `freeze` 承担，见 [ADR-0014](./0014-task-system-v2.md)。）

## 后果

- Web workspace 的构建、测试、lint 和格式化委托给 `vp`；Interweave 的 Go 静态检查与格式化使用 Go 工具链
- 工作区依赖必须外部化（推荐使用正则），以确保 dev watch 模式正常工作；`pack` 默认外部化 manifest 里的 `dependencies` 与 `peerDependencies`（`unbundle` 的包天然满足这条），真打包的包用 `deps.neverBundle` 补齐
- web-ui 中的 CSS 嵌套需要 LightningCSS 转译：`pack.css` 复用顶层 `target` 做特性降级，`css.minify` 与 Vite 管线的产物逐字节一致

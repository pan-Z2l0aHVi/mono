# ADR-0002: 统一构建工具链

- **Date**: 2026-07-21
- **Revised**: 2026-11-22，补记本地开发环境仅面向 POSIX（macOS / Linux）并以 `mise` 统一管理多语言工具链；CI 仍保留 Windows Wails 打包。
- **Status**: 已接受

## 背景

库包和应用需要不同的构建产物，但应共享开发、测试和代码质量工具。

## 决策

Web workspace 使用 Vite Plus（`vp`）作为构建、开发、测试、lint 和格式化的统一入口。库包使用 `vp pack` 生成 JavaScript 与声明文件，应用使用 `vp build`。Go 代码继续使用 Go 工具链。

库包的 workspace 依赖保持 external，使消费者加载各自的依赖实例，开发时也能观察依赖包的变化。构建模式与声明文件配置以各包配置和 `build-packaging.md` 为准，构建期 CSS 见 `build-browser.md`。

（2026-11-22 修订）本地开发环境仅面向 POSIX（macOS / Linux），并通过 [`.mise.toml`](../../.mise.toml) 以 `mise` 统一管理 Node、pnpm、Go 与 Wails CLI 等多语言工具链及共享缓存环境；仓库维护脚本、POSIX 软链布局与命令行包装约定（见 `environment.md`）均以 POSIX 为前提。CI 仍保留 Windows 平台的 Wails 应用打包产物（见 `ci.md`）。

## 后果

统一入口减少重复配置；不同产物仍需按包配置和验证，不能仅凭入口数量推断构建模式。本地工具链与脚本无需兼容 Windows 原生环境，跨平台交付差异集中在 CI 构建矩阵内验证。

# ADR-0002: 构建工具链

## 背景

多个软件包具有不同的构建需求（单入口使用 tsdown、多入口使用 Vite lib 模式、应用需要完整打包），需要统一的构建接口。

## 决策

使用 `vite-plus`（`vp`）作为统一的构建 / 开发 / lint / 测试 / 格式化封装工具：

- **单入口软件包**（test-kit、unplugin-web-components、deps-reload）：`vp pack`（tsdown）→ `.mjs` + `.d.mts`
- **子路径导出软件包**（js-kit、browser-kit、web-ui）：`vp build`（Vite lib 模式 + preserveModules + vite-plugin-dts）→ `.js` + `.d.ts`
- **React 应用**：`vp build`
- **Vue 应用**：`vue-tsc --build && vp build`
- **工作区验证**：`pnpm run check:code` 运行格式化、lint 和类型检查

## 后果

- 所有软件包脚本都委托给 `vp build` / `vp test` / `vp check` / `vp lint` / `vp fmt`
- 工作区依赖必须外部化（推荐使用正则），以确保 dev watch 模式正常工作
- web-ui 中的 CSS 嵌套需要 LightningCSS 转译（在 `vp build` 中配置）

# doc-demo-kit

web-ui 文档 demo 共享层：跨端状态机、语料契约与纯逻辑住在这里，宿主只保留框架绑定、视图组件与中文文案（wuchale 只扫宿主 `src`）。

- **防拖入 Node 依赖**：运行时入口不得 import `@greypan/md-to-meta` 根入口（会拖入 shiki/tinyglobby），纯契约一律走 `@greypan/md-to-meta/contract`。
- **Tailwind `@source`**：Tailwind 自动源检测止步于 workspace 边界，宿主须在各自 `global.css` 用 `@source` 显式登记本包 `src`。
- **纯逻辑与语料注入**：不直接读全局 DOM/window 或硬编码仓库路径；语料目录由各宿主注入 `./testing` 子入口，跨 demo 对齐由根 `pnpm run check-generated-parity` 持有。

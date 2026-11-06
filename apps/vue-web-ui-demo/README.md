# Vue Web UI Demo

这是 `@greypan/web-ui` 的 Vue 集成和预览应用。它展示组件在真实 Vue 应用中的用法，并提供可交互预览。

公共属性、slot、事件和类型以 [`packages/web-ui`](../../packages/web-ui) 的源码、README 和测试为准，demo 行为不替代公共契约。

## 运行

在仓库根目录启动该 demo 及其 workspace 依赖：

```bash
pnpm dev:vue-web-ui-demo
```

不要只运行包内 `pnpm dev` 来验证跨包集成，它不会构建和监听本地依赖包。环境准备见 [`CONTRIBUTING.md`](../../CONTRIBUTING.md)。

## 语言与文案

站点支持 `zh-CN` 和 `en`，不增加语言路由。语言选择器与 React demo 共用 `localStorage['locale']`：合法偏好优先，其次看浏览器语言，默认英文。

界面文案在 SFC 中写中文原文，由私有的 [`@greypan/wuchale-vue`](../../packages/wuchale-vue/README.md) 在编译前转换，无须手写翻译函数。增删壳文案后，在本应用目录提取并填写英文 PO：

```sh
mise exec -- pnpm exec wuchale --clean
```

PO 文件是入库的译文源。正文、API 和示例来自 `packages/web-ui/docs/*.md`，由 md-to-meta 生成到 `src/generated/`，不要手改。

## 开发须知

- 示例代码与 API 表由 `packages/web-ui/docs/*.md` 生成到 `src/generated/`，改完 markdown 后由 Vite 插件在 dev 或 build 时重新生成。
- 命名 handler 的事件类型统一使用 `WebUiEvent`，不要手写 host 类型。

更多说明见同目录 [`AGENTS.md`](./AGENTS.md)。
